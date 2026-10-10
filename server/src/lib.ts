import { Prisma, type User } from '@prisma/client';
import { z } from 'zod';
import type { RequestHandler, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { db } from './db.js';
import { config } from './config.js';

declare global {
  namespace Express {
    interface Request {
      user?: Pick<User, 'id' | 'name' | 'email' | 'role'>;
      sessionId?: string;
    }
  }
}
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export const userFields = {
  id: true,
  name: true,
  email: true,
  role: true,
  active: true,
  createdAt: true,
} as const;
export const gameInclude = { category: true, platforms: { include: { platform: true } } } as const;
export const orderInclude = { items: true } as const;
export const cookieName = 'neonplay_session';
const cookieOptions = {
  httpOnly: true,
  secure: config.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/',
};
export async function createSession(userId: string, res: Response) {
  const expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000);
  await db.session.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  const session = await db.session.create({ data: { userId, expiresAt } });
  const token = jwt.sign({ sid: session.id }, config.JWT_SECRET, {
    subject: userId,
    expiresIn: '7d',
    algorithm: 'HS256',
  });
  res.cookie(cookieName, token, { ...cookieOptions, expires: expiresAt });
}
export function clearSession(res: Response) {
  res.clearCookie(cookieName, cookieOptions);
}
export const auth: RequestHandler = async (req, _res, next) => {
  const token = req.cookies?.[cookieName];
  if (!token) return next(new ApiError(401, 'Inicia sesión para continuar.'));
  let payload: jwt.JwtPayload;
  try {
    const decoded = jwt.verify(token, config.JWT_SECRET, { algorithms: ['HS256'] });
    if (typeof decoded === 'string') throw new Error();
    payload = decoded;
  } catch {
    return next(new ApiError(401, 'Tu sesión expiró. Inicia sesión nuevamente.'));
  }
  const session = await db.session.findUnique({
    where: { id: String(payload.sid) },
    include: { user: true },
  });
  if (
    !session ||
    session.userId !== payload.sub ||
    session.expiresAt < new Date() ||
    !session.user.active
  )
    return next(new ApiError(401, 'Tu sesión ya no está disponible.'));
  req.user = {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    role: session.user.role,
  };
  req.sessionId = session.id;
  next();
};
export const admin: RequestHandler = (req, _res, next) =>
  req.user?.role === 'ADMIN'
    ? next()
    : next(new ApiError(403, 'Esta operación requiere acceso de administrador.'));
export const idSchema = z.string().cuid();
export function requestId(req: Request) {
  return idSchema.parse(req.params.id);
}
export const credentialsSchema = z.object({
  email: z
    .string()
    .trim()
    .email()
    .max(160)
    .transform((s) => s.toLowerCase()),
  password: z
    .string()
    .min(8)
    .max(72)
    .refine(
      (s) => Buffer.byteLength(s, 'utf8') <= 72,
      'La contraseña debe tener como máximo 72 bytes UTF-8.',
    ),
});
export const profileSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: credentialsSchema.shape.email,
});
export const gameSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    description: z.string().trim().min(20).max(5000),
    price: z.number().min(0.01).max(9999.99).multipleOf(0.01),
    originalPrice: z.number().min(0.01).max(9999.99).multipleOf(0.01).nullable().optional(),
    image: z
      .string()
      .max(2048)
      .refine(
        (s) => /^\/assets\/[\w.-]+$/.test(s) || /^https:\/\//.test(s),
        'Usa una imagen local /assets/ o una URL HTTPS.',
      ),
    stock: z.number().int().min(0).max(100000),
    featured: z.boolean(),
    rating: z.number().min(0).max(5).multipleOf(0.1),
    releaseDate: z.string().datetime(),
    categoryId: idSchema,
    platformIds: z
      .array(idSchema)
      .min(1)
      .max(10)
      .refine((a) => new Set(a).size === a.length),
  })
  .refine((g) => !g.originalPrice || g.originalPrice >= g.price, {
    message: 'El precio anterior debe ser mayor o igual al precio actual.',
    path: ['originalPrice'],
  });
export const checkoutSchema = z.object({
  idempotencyKey: z.string().uuid(),
  items: z
    .array(
      z.object({
        gameId: idSchema,
        platformId: idSchema,
        quantity: z.number().int().min(1).max(99),
        expectedPrice: z.number().min(0.01).max(9999.99).multipleOf(0.01),
      }),
    )
    .min(1)
    .max(100),
});
export async function transaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await db.$transaction(fn, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 10000,
        timeout: 15000,
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2034' && attempt < 2)
        continue;
      throw e;
    }
  }
  throw new ApiError(409, 'Hubo un cambio simultáneo. Vuelve a intentarlo.');
}
