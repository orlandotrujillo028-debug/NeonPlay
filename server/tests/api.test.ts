import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { randomBytes, randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import type { Express } from 'express';

dotenv.config({ quiet: true });
const originalUrl = process.env.DATABASE_URL!;
const schema = 'neonplay_test_' + randomBytes(6).toString('hex');
const testUrl = new URL(originalUrl);
testUrl.searchParams.set('schema', schema);
process.env.DATABASE_URL = testUrl.toString();
process.env.NODE_ENV = 'test';
let app: Express,
  db: PrismaClient,
  admin: ReturnType<typeof request.agent>,
  customer: ReturnType<typeof request.agent>,
  categoryId: string,
  platformId: string,
  secondPlatformId: string,
  adminId: string,
  customerId: string;
const password = 'TestAccount!2026';

beforeAll(async () => {
  const migration = spawnSync(
    process.execPath,
    [
      path.resolve('../node_modules/prisma/build/index.js'),
      'migrate',
      'deploy',
      '--schema',
      'prisma/schema.prisma',
    ],
    { cwd: process.cwd(), env: process.env, encoding: 'utf8', windowsHide: true },
  );
  if (migration.status !== 0)
    throw new Error('No se pudo migrar el esquema de pruebas: ' + migration.stderr);
  ({ app } = await import('../src/app.js'));
  ({ db } = await import('../src/db.js'));
  adminId = (
    await db.user.create({
      data: {
        name: 'Test Admin',
        email: 'admin@test.local',
        passwordHash: await bcrypt.hash(password, 12),
        role: 'ADMIN',
      },
    })
  ).id;
  categoryId = (await db.category.create({ data: { name: 'Test RPG' } })).id;
  platformId = (await db.platform.create({ data: { name: 'Test PC' } })).id;
  secondPlatformId = (await db.platform.create({ data: { name: 'Test Xbox' } })).id;
  admin = request.agent(app);
  customer = request.agent(app);
  await admin.post('/api/auth/login').send({ email: 'admin@test.local', password }).expect(200);
  const registered = await customer
    .post('/api/auth/register')
    .send({ name: 'Test Player', email: 'player@test.local', password, role: 'ADMIN' })
    .expect(201);
  customerId = registered.body.id;
}, 60000);
afterAll(async () => {
  if (db) {
    await db.$disconnect();
  }
  // The only dropped schema is the random disposable schema created by this suite.
  if (!/^neonplay_test_[a-f0-9]{12}$/.test(schema))
    throw new Error('Nombre de esquema de pruebas inválido.');
  const cleanup = new PrismaClient({ datasources: { db: { url: originalUrl } } });
  try {
    await cleanup.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
  } finally {
    await cleanup.$disconnect();
  }
}, 30000);
async function game(stock = 10, price = 19.99, multi = false) {
  const id = randomBytes(5).toString('hex');
  return db.game.create({
    data: {
      name: 'Test Game ' + id,
      slug: 'test-' + id,
      description:
        'Un videojuego creado exclusivamente para verificar los flujos reales de la API.',
      price,
      image: '/assets/nexus.png',
      stock,
      categoryId,
      platforms: { create: [{ platformId }, ...(multi ? [{ platformId: secondPlatformId }] : [])] },
    },
  });
}
const line = (g: { id: string; price: unknown }, quantity = 1, platform = platformId) => ({
  gameId: g.id,
  platformId: platform,
  quantity,
  expectedPrice: Number(g.price),
});
const checkout = (items: ReturnType<typeof line>[], key = randomUUID()) =>
  customer.post('/api/orders').send({ items, idempotencyKey: key });

describe('API conectada a PostgreSQL', () => {
  it('consulta la salud de la base real', async () => {
    const r = await request(app).get('/api/health').expect(200);
    expect(r.body.database).toBe('PostgreSQL');
  });
  it('registra clientes sin aceptar escalación de rol', async () => {
    const r = await customer.get('/api/auth/me').expect(200);
    expect(r.body.role).toBe('CUSTOMER');
    expect(r.body.passwordHash).toBeUndefined();
  });
  it('bloquea correos duplicados y credenciales incorrectas', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ name: 'Duplicado', email: 'PLAYER@test.local', password })
      .expect(409);
    await request(app)
      .post('/api/auth/login')
      .send({ email: 'player@test.local', password: 'Incorrecto1' })
      .expect(401);
  });
  it('exige sesión y permisos para administrar', async () => {
    await request(app).get('/api/admin/games').expect(401);
    await customer.get('/api/admin/games').expect(403);
  });
  it('rechaza solicitudes con origen ajeno', async () => {
    await admin
      .post('/api/admin/categories')
      .set('Origin', 'https://otro-sitio.example')
      .send({ name: 'CSRF' })
      .expect(403);
  });
  it('acepta el alias IPv4 local usado por Vite en desarrollo', async () => {
    await admin
      .patch('/api/auth/me')
      .set('Origin', 'http://127.0.0.1:5173')
      .send({ name: 'Test Admin', email: 'admin@test.local' })
      .expect(200);
  });
  it('crea, consulta, actualiza y elimina categorías y plataformas', async () => {
    for (const kind of ['categories', 'platforms']) {
      const created = await admin
        .post('/api/admin/' + kind)
        .send({ name: 'Temporal ' + kind })
        .expect(201);
      const id = created.body.id;
      await admin
        .put('/api/admin/' + kind + '/' + id)
        .send({ name: 'Editado ' + kind })
        .expect(200);
      const all = await admin.get('/api/admin/' + kind).expect(200);
      expect(all.body.some((r: { id: string }) => r.id === id)).toBe(true);
      await admin.delete('/api/admin/' + kind + '/' + id).expect(204);
    }
  });
  it('valida y completa el CRUD de videojuegos', async () => {
    const payload = {
      name: 'CRUD Game',
      description: 'Descripción completa del videojuego para el CRUD de administración.',
      price: 25.99,
      originalPrice: 30,
      image: '/assets/nexus.png',
      stock: 5,
      featured: true,
      rating: 4.5,
      releaseDate: '2026-10-10T00:00:00.000Z',
      categoryId,
      platformIds: [platformId],
    };
    await admin
      .post('/api/admin/games')
      .send({ ...payload, stock: -1 })
      .expect(400);
    const r = await admin.post('/api/admin/games').send(payload).expect(201);
    await request(app)
      .get('/api/games/' + r.body.slug)
      .expect(200);
    await admin
      .put('/api/admin/games/' + r.body.id)
      .send({ ...payload, name: 'CRUD Game Editado', price: 24.99 })
      .expect(200);
    const catalog = await request(app)
      .get('/api/games?q=CRUD&platform=' + platformId)
      .expect(200);
    expect(catalog.body.games[0].name).toBe('CRUD Game Editado');
    await admin.delete('/api/admin/games/' + r.body.id).expect(200);
    await request(app)
      .get('/api/games/' + r.body.slug)
      .expect(404);
  });
  it('crea pedidos con importe exacto y conserva precios al archivar', async () => {
    const g = await game(10, 19.99);
    const r = await checkout([line(g, 3)]).expect(201);
    expect(Number(r.body.total)).toBe(59.97);
    expect((await db.game.findUniqueOrThrow({ where: { id: g.id } })).stock).toBe(7);
    await db.game.update({ where: { id: g.id }, data: { price: 29.99 } });
    await admin.delete('/api/admin/games/' + g.id).expect(200);
    expect((await db.game.findUniqueOrThrow({ where: { id: g.id } })).archived).toBe(true);
    const orders = await customer.get('/api/orders').expect(200);
    const historical = orders.body.find((o: { id: string }) => o.id === r.body.id);
    expect(Number(historical.items[0].price)).toBe(19.99);
    await request(app)
      .get('/api/games/' + g.slug)
      .expect(404);
    await admin.post('/api/admin/games/' + g.id + '/restore').expect(200);
  });
  it('revierte toda la compra si cualquier juego no tiene stock', async () => {
    const a = await game(5),
      b = await game(0);
    await checkout([line(a, 2), line(b)]).expect(409);
    expect((await db.game.findUniqueOrThrow({ where: { id: a.id } })).stock).toBe(5);
  });
  it('suma la demanda del mismo juego en diferentes plataformas', async () => {
    const g = await game(1, 19.99, true);
    await checkout([line(g, 1), line(g, 1, secondPlatformId)]).expect(409);
    expect((await db.game.findUniqueOrThrow({ where: { id: g.id } })).stock).toBe(1);
  });
  it('evita sobreventa con dos compras simultáneas', async () => {
    const g = await game(1);
    const responses = await Promise.all([checkout([line(g)]), checkout([line(g)])]);
    expect(responses.map((r) => r.status).sort()).toEqual([201, 409]);
    expect((await db.game.findUniqueOrThrow({ where: { id: g.id } })).stock).toBe(0);
    expect(await db.orderItem.count({ where: { gameId: g.id } })).toBe(1);
  });
  it('repetir una solicitud crea un solo pedido y descuenta una sola vez', async () => {
    const g = await game(5),
      key = randomUUID();
    const responses = await Promise.all([checkout([line(g, 2)], key), checkout([line(g, 2)], key)]);
    expect(responses.every((r) => [200, 201].includes(r.status))).toBe(true);
    expect(responses[0].body.id).toBe(responses[1].body.id);
    expect((await db.game.findUniqueOrThrow({ where: { id: g.id } })).stock).toBe(3);
    expect(await db.order.count({ where: { userId: customerId, idempotencyKey: key } })).toBe(1);
  });
  it('rechaza precios desactualizados sin descontar inventario', async () => {
    const g = await game(3);
    await checkout([{ ...line(g), expectedPrice: 0.01 }]).expect(409);
    expect((await db.game.findUniqueOrThrow({ where: { id: g.id } })).stock).toBe(3);
  });
  it.each(['quantity', 'price', 'platform', 'game'] as const)(
    'rechaza reutilizar una clave de compra si cambia %s',
    async (change) => {
      const g = await game(5, 19.99, true),
        other = await game(5),
        key = randomUUID();
      const original = await checkout([line(g)], key).expect(201);
      const changed =
        change === 'quantity'
          ? line(g, 2)
          : change === 'price'
            ? { ...line(g), expectedPrice: 29.99 }
            : change === 'platform'
              ? line(g, 1, secondPlatformId)
              : line(other);
      await checkout([changed], key).expect(409);
      expect((await db.game.findUniqueOrThrow({ where: { id: g.id } })).stock).toBe(4);
      expect((await db.game.findUniqueOrThrow({ where: { id: other.id } })).stock).toBe(5);
      expect(await db.order.count({ where: { userId: customerId, idempotencyKey: key } })).toBe(1);
      expect(
        (await db.order.findUniqueOrThrow({ where: { id: original.body.id } })).total.toNumber(),
      ).toBe(19.99);
    },
  );
  it('reconoce el mismo carrito aunque se reordenen o agrupen sus líneas', async () => {
    const a = await game(5),
      b = await game(5),
      key = randomUUID();
    const original = await checkout([line(a, 2), line(b)], key).expect(201);
    const replay = await checkout([line(b), line(a), line(a)], key).expect(200);
    expect(replay.body.id).toBe(original.body.id);
    expect((await db.game.findUniqueOrThrow({ where: { id: a.id } })).stock).toBe(3);
    expect((await db.game.findUniqueOrThrow({ where: { id: b.id } })).stock).toBe(4);
  });
  it('resuelve compras simultáneas con una misma clave y carritos distintos sin confirmar el incorrecto', async () => {
    const g = await game(5),
      key = randomUUID();
    const responses = await Promise.all([checkout([line(g)], key), checkout([line(g, 2)], key)]);
    expect(responses.map((r) => r.status).sort()).toEqual([201, 409]);
    const order = responses.find((r) => r.status === 201)!.body;
    expect((await db.game.findUniqueOrThrow({ where: { id: g.id } })).stock).toBe(
      5 - order.items[0].quantity,
    );
    expect(await db.order.count({ where: { userId: customerId, idempotencyKey: key } })).toBe(1);
  });
  it('cancelar varias veces devuelve el stock una sola vez', async () => {
    const g = await game(5),
      order = await checkout([line(g, 2)]).expect(201);
    for (let i = 0; i < 2; i++)
      await admin
        .patch('/api/admin/orders/' + order.body.id)
        .send({ status: 'CANCELLED' })
        .expect(200);
    expect((await db.game.findUniqueOrThrow({ where: { id: g.id } })).stock).toBe(5);
    await admin
      .patch('/api/admin/orders/' + order.body.id)
      .send({ status: 'COMPLETED' })
      .expect(409);
  });
  it('protege categorías y plataformas asociadas', async () => {
    await game();
    await admin.delete('/api/admin/categories/' + categoryId).expect(409);
    await admin.delete('/api/admin/platforms/' + platformId).expect(409);
  });
  it('cada cliente consulta únicamente sus pedidos', async () => {
    const visitor = request.agent(app);
    const r = await visitor
      .post('/api/auth/register')
      .send({ name: 'Otro cliente', email: 'other@test.local', password })
      .expect(201);
    const own = await visitor.get('/api/orders').expect(200);
    expect(own.body).toEqual([]);
    await admin.delete('/api/admin/users/' + r.body.id).expect(200);
    await visitor.get('/api/auth/me').expect(401);
  });
  it('gestiona usuarios y protege al administrador actual', async () => {
    const u = await admin
      .post('/api/admin/users')
      .send({
        name: 'Gestionado',
        email: 'managed@test.local',
        password,
        role: 'CUSTOMER',
        active: true,
      })
      .expect(201);
    await admin
      .put('/api/admin/users/' + u.body.id)
      .send({
        name: 'Nombre actualizado',
        email: 'managed@test.local',
        role: 'CUSTOMER',
        active: true,
      })
      .expect(200);
    await admin.delete('/api/admin/users/' + u.body.id).expect(200);
    await admin.delete('/api/admin/users/' + adminId).expect(400);
    const listing = await admin.get('/api/admin/users').expect(200);
    expect(listing.body.every((user: { passwordHash?: string }) => !user.passwordHash)).toBe(true);
  });
  it('rechaza contraseñas que bcrypt truncaría', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ name: 'Prueba', email: 'bytes@test.local', password: '😀'.repeat(20) })
      .expect(400);
  });
  it('cierra y revoca la sesión del cliente', async () => {
    await customer.post('/api/auth/logout').expect(204);
    await customer.get('/api/auth/me').expect(401);
  });
});
