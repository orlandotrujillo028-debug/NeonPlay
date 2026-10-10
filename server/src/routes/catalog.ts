import { Router } from 'express';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { db } from '../db.js';
import { ApiError, gameInclude } from '../lib.js';

export const catalogRouter = Router();
catalogRouter.get('/meta', async (_req, res) => {
  const [categories, platforms] = await Promise.all([
    db.category.findMany({ orderBy: { name: 'asc' } }),
    db.platform.findMany({ orderBy: { name: 'asc' } }),
  ]);
  res.json({ categories, platforms });
});
catalogRouter.get('/games', async (req, res) => {
  const query = z
    .object({
      q: z.string().max(100).optional(),
      category: z.string().optional(),
      platform: z.string().optional(),
      sort: z.enum(['featured', 'newest', 'price-asc', 'price-desc']).default('featured'),
      offers: z.enum(['true', 'false']).optional(),
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(24),
    })
    .parse(req.query);
  const where: Prisma.GameWhereInput = { archived: false };
  if (query.q) where.name = { contains: query.q, mode: 'insensitive' };
  if (query.category) where.categoryId = query.category;
  if (query.platform) where.platforms = { some: { platformId: query.platform } };
  if (query.offers === 'true') where.originalPrice = { gt: db.game.fields.price };
  const orderBy: Prisma.GameOrderByWithRelationInput[] =
    query.sort === 'price-asc'
      ? [{ price: 'asc' }, { id: 'asc' }]
      : query.sort === 'price-desc'
        ? [{ price: 'desc' }, { id: 'asc' }]
        : query.sort === 'newest'
          ? [{ releaseDate: 'desc' }, { id: 'asc' }]
          : [{ featured: 'desc' }, { rating: 'desc' }, { createdAt: 'desc' }, { id: 'asc' }];
  const [games, total] = await Promise.all([
    db.game.findMany({
      where,
      include: gameInclude,
      orderBy,
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
    db.game.count({ where }),
  ]);
  res.json({ games, total, page: query.page, pages: Math.ceil(total / query.limit) });
});
catalogRouter.get('/games/:slug', async (req, res) => {
  const slug = z.string().max(200).parse(req.params.slug);
  const game = await db.game.findFirst({ where: { slug, archived: false }, include: gameInclude });
  if (!game) throw new ApiError(404, 'Este videojuego no está disponible.');
  res.json(game);
});
