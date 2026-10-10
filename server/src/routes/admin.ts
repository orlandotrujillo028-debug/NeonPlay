import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { db } from '../db.js';
import {
  auth,
  admin,
  ApiError,
  gameSchema,
  gameInclude,
  requestId,
  profileSchema,
  credentialsSchema,
  userFields,
  transaction,
} from '../lib.js';

export const adminRouter = Router();
adminRouter.use(auth, admin);
adminRouter.get('/dashboard', async (_req, res) => {
  const [games, users, orders, revenue, lowStock, recentOrders] = await Promise.all([
    db.game.count({ where: { archived: false } }),
    db.user.count({ where: { active: true } }),
    db.order.count(),
    db.order.aggregate({ where: { status: 'COMPLETED' }, _sum: { total: true } }),
    db.game.findMany({
      where: { archived: false, stock: { lte: 5 } },
      take: 5,
      orderBy: { stock: 'asc' },
    }),
    db.order.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { name: true, email: true } }, items: true },
    }),
  ]);
  res.json({ games, users, orders, revenue: revenue._sum.total || 0, lowStock, recentOrders });
});
adminRouter.get('/games', async (_req, res) =>
  res.json(await db.game.findMany({ include: gameInclude, orderBy: { createdAt: 'desc' } })),
);
async function checkRelations(categoryId: string, platformIds: string[]) {
  if (
    !(await db.category.findUnique({ where: { id: categoryId } })) ||
    (await db.platform.count({ where: { id: { in: platformIds } } })) !== platformIds.length
  )
    throw new ApiError(400, 'Selecciona una categoría y plataformas existentes.');
}
adminRouter.post('/games', async (req, res) => {
  const { platformIds, ...data } = gameSchema.parse(req.body);
  await checkRelations(data.categoryId, platformIds);
  const slug =
    data.name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') +
    '-' +
    randomBytes(3).toString('hex');
  res
    .status(201)
    .json(
      await db.game.create({
        data: {
          ...data,
          slug,
          platforms: { create: platformIds.map((platformId) => ({ platformId })) },
        },
        include: gameInclude,
      }),
    );
});
adminRouter.put('/games/:id', async (req, res) => {
  const id = requestId(req),
    { platformIds, ...data } = gameSchema.parse(req.body);
  await checkRelations(data.categoryId, platformIds);
  res.json(
    await db.game.update({
      where: { id },
      data: {
        ...data,
        platforms: { deleteMany: {}, create: platformIds.map((platformId) => ({ platformId })) },
      },
      include: gameInclude,
    }),
  );
});
adminRouter.post('/games/:id/restore', async (req, res) =>
  res.json(
    await db.game.update({
      where: { id: requestId(req) },
      data: { archived: false },
      include: gameInclude,
    }),
  ),
);
adminRouter.delete('/games/:id', async (req, res) => {
  const id = requestId(req);
  const result = await transaction(async (tx) => {
    if (!(await tx.game.findUnique({ where: { id } })))
      throw new ApiError(404, 'Videojuego no encontrado.');
    if (await tx.orderItem.count({ where: { gameId: id } })) {
      await tx.game.update({ where: { id }, data: { archived: true } });
      return { message: 'Videojuego archivado para conservar el historial de pedidos.' };
    }
    await tx.game.delete({ where: { id } });
    return { message: 'Videojuego eliminado.' };
  });
  res.json(result);
});
const nameSchema = z.object({ name: z.string().trim().min(2).max(60) });
for (const kind of ['categories', 'platforms'] as const) {
  adminRouter.get('/' + kind, async (_req, res) =>
    res.json(
      kind === 'categories'
        ? await db.category.findMany({ orderBy: { name: 'asc' } })
        : await db.platform.findMany({ orderBy: { name: 'asc' } }),
    ),
  );
  adminRouter.post('/' + kind, async (req, res) => {
    const data = nameSchema.parse(req.body);
    res
      .status(201)
      .json(
        kind === 'categories'
          ? await db.category.create({ data })
          : await db.platform.create({ data }),
      );
  });
  adminRouter.put('/' + kind + '/:id', async (req, res) => {
    const id = requestId(req),
      data = nameSchema.parse(req.body);
    res.json(
      kind === 'categories'
        ? await db.category.update({ where: { id }, data })
        : await db.platform.update({ where: { id }, data }),
    );
  });
  adminRouter.delete('/' + kind + '/:id', async (req, res) => {
    const id = requestId(req);
    const references =
      kind === 'categories'
        ? await db.game.count({ where: { categoryId: id } })
        : (await db.gamePlatform.count({ where: { platformId: id } })) +
          (await db.orderItem.count({ where: { platformId: id } }));
    if (references)
      throw new ApiError(
        409,
        'Este registro está asociado a videojuegos o pedidos y no puede eliminarse.',
      );
    if (kind === 'categories') await db.category.delete({ where: { id } });
    else await db.platform.delete({ where: { id } });
    res.status(204).end();
  });
}
adminRouter.get('/users', async (_req, res) =>
  res.json(await db.user.findMany({ select: userFields, orderBy: { createdAt: 'desc' } })),
);
const userUpdateSchema = profileSchema.extend({
  role: z.enum(['CUSTOMER', 'ADMIN']),
  active: z.boolean(),
});
adminRouter.post('/users', async (req, res) => {
  const { password, ...data } = credentialsSchema.merge(userUpdateSchema).parse(req.body);
  res
    .status(201)
    .json(
      await db.user.create({
        data: { ...data, passwordHash: await bcrypt.hash(password, 12) },
        select: userFields,
      }),
    );
});
async function changeUser(id: string, actorId: string, data: z.infer<typeof userUpdateSchema>) {
  return transaction(async (tx) => {
    const target = await tx.user.findUnique({ where: { id } });
    if (!target) throw new ApiError(404, 'Usuario no encontrado.');
    if (id === actorId && (!data.active || data.role !== 'ADMIN'))
      throw new ApiError(
        400,
        'No puedes desactivar ni quitar el rol de tu propia cuenta administrativa.',
      );
    if (
      target.active &&
      target.role === 'ADMIN' &&
      (!data.active || data.role !== 'ADMIN') &&
      (await tx.user.count({ where: { active: true, role: 'ADMIN' } })) <= 1
    )
      throw new ApiError(409, 'Debe existir al menos un administrador activo.');
    if (!data.active || target.role !== data.role)
      await tx.session.deleteMany({ where: { userId: id } });
    return tx.user.update({ where: { id }, data, select: userFields });
  });
}
adminRouter.put('/users/:id', async (req, res) =>
  res.json(await changeUser(requestId(req), req.user!.id, userUpdateSchema.parse(req.body))),
);
adminRouter.delete('/users/:id', async (req, res) => {
  const id = requestId(req),
    target = await db.user.findUnique({ where: { id } });
  if (!target) throw new ApiError(404, 'Usuario no encontrado.');
  await changeUser(id, req.user!.id, { ...target, active: false });
  res.json({ message: 'Usuario desactivado. Su historial permanece disponible.' });
});
adminRouter.get('/orders', async (_req, res) =>
  res.json(
    await db.order.findMany({
      include: { items: true, user: { select: { name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    }),
  ),
);
adminRouter.patch('/orders/:id', async (req, res) => {
  const id = requestId(req),
    { status } = z
      .object({ status: z.enum(['PENDING', 'COMPLETED', 'CANCELLED']) })
      .parse(req.body);
  const order = await transaction(async (tx) => {
    const current = await tx.order.findUnique({ where: { id }, include: { items: true } });
    if (!current) throw new ApiError(404, 'Pedido no encontrado.');
    if (current.status === status) return current;
    if (current.status === 'CANCELLED' || status === 'PENDING')
      throw new ApiError(409, 'Este cambio de estado no está permitido.');
    if (status === 'CANCELLED') {
      const quantities = new Map<string, number>();
      for (const line of current.items)
        quantities.set(line.gameId, (quantities.get(line.gameId) || 0) + line.quantity);
      for (const [gameId, quantity] of [...quantities].sort(([a], [b]) => a.localeCompare(b)))
        await tx.game.update({ where: { id: gameId }, data: { stock: { increment: quantity } } });
    }
    return tx.order.update({ where: { id }, data: { status }, include: { items: true } });
  });
  res.json(order);
});
