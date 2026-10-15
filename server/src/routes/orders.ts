import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { db } from '../db.js';
import { auth, ApiError, checkoutSchema, transaction, gameInclude, orderInclude } from '../lib.js';

export const ordersRouter = Router();
type CheckoutLine = ReturnType<typeof checkoutSchema.parse>['items'][number];
type SavedOrder = Prisma.OrderGetPayload<{ include: typeof orderInclude }>;

function replayOrder(order: SavedOrder, items: CheckoutLine[]) {
  const savedItems = new Map(
    order.items.map((item) => [item.gameId + ':' + item.platformId, item]),
  );
  const matches =
    order.items.length === items.length &&
    items.every((item) => {
      const saved = savedItems.get(item.gameId + ':' + item.platformId);
      return saved && saved.quantity === item.quantity && saved.price.equals(item.expectedPrice);
    });
  if (!matches)
    throw new ApiError(
      409,
      'Esta solicitud de compra ya se utilizó con un carrito diferente. Revisa tus pedidos antes de volver a comprar.',
    );
  return order;
}

ordersRouter.use(auth);
ordersRouter.get('/', async (req, res) =>
  res.json(
    await db.order.findMany({
      where: { userId: req.user!.id },
      include: orderInclude,
      orderBy: { createdAt: 'desc' },
    }),
  ),
);
ordersRouter.post('/', async (req, res) => {
  const data = checkoutSchema.parse(req.body),
    userId = req.user!.id;
  const variants = new Map<string, (typeof data.items)[number]>();
  for (const item of data.items) {
    const key = item.gameId + ':' + item.platformId;
    const previous = variants.get(key);
    if (previous && previous.expectedPrice !== item.expectedPrice)
      throw new ApiError(400, 'Los precios del carrito son inconsistentes.');
    variants.set(key, { ...item, quantity: (previous?.quantity || 0) + item.quantity });
  }
  const items = [...variants.values()];
  if (items.some((i) => i.quantity > 99))
    throw new ApiError(400, 'Puedes comprar hasta 99 unidades por videojuego y plataforma.');
  const demand = new Map<string, number>();
  for (const item of items) demand.set(item.gameId, (demand.get(item.gameId) || 0) + item.quantity);
  const existing = await db.order.findUnique({
    where: { userId_idempotencyKey: { userId, idempotencyKey: data.idempotencyKey } },
    include: orderInclude,
  });
  if (existing) return res.json(replayOrder(existing, items));
  try {
    const order = await transaction(async (tx) => {
      const previous = await tx.order.findUnique({
        where: { userId_idempotencyKey: { userId, idempotencyKey: data.idempotencyKey } },
        include: orderInclude,
      });
      if (previous) return replayOrder(previous, items);
      const games = await tx.game.findMany({
        where: { id: { in: [...demand.keys()] }, archived: false },
        include: gameInclude,
      });
      const lines = items.map((item) => {
        const game = games.find((g) => g.id === item.gameId);
        const platform = game?.platforms.find((p) => p.platformId === item.platformId)?.platform;
        if (!game || !platform)
          throw new ApiError(409, 'Un videojuego o plataforma del carrito ya no está disponible.');
        if (!game.price.equals(new Prisma.Decimal(item.expectedPrice)))
          throw new ApiError(
            409,
            `El precio de ${game.name} cambió. Actualiza el carrito antes de comprar.`,
          );
        return {
          gameId: game.id,
          platformId: platform.id,
          gameName: game.name,
          platformName: platform.name,
          image: game.image,
          price: game.price,
          quantity: item.quantity,
        };
      });
      for (const [gameId, quantity] of [...demand].sort(([a], [b]) => a.localeCompare(b))) {
        const update = await tx.game.updateMany({
          where: { id: gameId, archived: false, stock: { gte: quantity } },
          data: { stock: { decrement: quantity } },
        });
        if (update.count !== 1)
          throw new ApiError(
            409,
            `Stock insuficiente para ${games.find((g) => g.id === gameId)?.name || 'un videojuego'}.`,
          );
      }
      const total = lines.reduce(
        (sum, line) => sum.plus(line.price.mul(line.quantity)),
        new Prisma.Decimal(0),
      );
      return tx.order.create({
        data: {
          userId,
          total,
          idempotencyKey: data.idempotencyKey,
          status: 'COMPLETED',
          items: { create: lines },
        },
        include: orderInclude,
      });
    });
    res.status(201).json(order);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const previous = await db.order.findUnique({
        where: { userId_idempotencyKey: { userId, idempotencyKey: data.idempotencyKey } },
        include: orderInclude,
      });
      if (previous) return res.json(replayOrder(previous, items));
    }
    throw error;
  }
});
