import express, { type ErrorRequestHandler } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { rateLimit } from 'express-rate-limit';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { config, allowedOrigins } from './config.js';
import { db } from './db.js';
import { ApiError } from './lib.js';
import { authRouter } from './routes/auth.js';
import { catalogRouter } from './routes/catalog.js';
import { ordersRouter } from './routes/orders.js';
import { adminRouter } from './routes/admin.js';

export const app = express();
app.disable('x-powered-by');
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        imgSrc: ["'self'", 'https:', 'data:'],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'", 'data:'],
      },
    },
  }),
);
app.use(
  cors({
    origin: (origin, callback) => callback(null, !origin || allowedOrigins.has(origin)),
    credentials: true,
  }),
);
app.use(express.json({ limit: '100kb' }), cookieParser());
app.use(
  '/api',
  rateLimit({
    windowMs: 60 * 1000,
    limit: 300,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { message: 'Demasiadas solicitudes. Inténtalo en un minuto.' },
  }),
);
app.use('/api', (req, _res, next) => {
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    const origin = req.get('origin');
    if (origin && !allowedOrigins.has(origin))
      return next(new ApiError(403, 'Origen de solicitud no permitido.'));
    if (req.get('sec-fetch-site') === 'cross-site')
      return next(new ApiError(403, 'Solicitud entre sitios no permitida.'));
    if (Number(req.get('content-length')) > 0 && !req.is('application/json'))
      return next(new ApiError(415, 'Envía los datos en formato JSON.'));
  }
  next();
});
app.get('/api/health', async (_req, res) => {
  await db.$queryRaw`SELECT 1`;
  res.json({ status: 'ok', database: 'PostgreSQL' });
});
app.use('/api/auth', authRouter);
app.use('/api', catalogRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/admin', adminRouter);
app.use('/api', (_req, _res, next) => next(new ApiError(404, 'Ruta no encontrada.')));
const here = path.dirname(fileURLToPath(import.meta.url));
const clientDist = [
  path.resolve(here, '../../client/dist'),
  path.resolve(here, '../../../client/dist'),
].find((dir) => existsSync(path.join(dir, 'index.html')));
if (clientDist) {
  app.use(express.static(clientDist));
  app.get('/{*path}', (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}
const errors: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof ApiError)
    return void res.status(error.status).json({ message: error.message });
  if (error instanceof ZodError)
    return void res
      .status(400)
      .json({ message: error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(' · ') });
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002')
      return void res
        .status(409)
        .json({ message: 'Ya existe un registro con ese nombre o correo.' });
    if (error.code === 'P2025')
      return void res.status(404).json({ message: 'Registro no encontrado.' });
    if (error.code === 'P2003' || error.code === 'P2014')
      return void res
        .status(409)
        .json({
          message: 'Este registro está asociado a videojuegos o pedidos y no puede eliminarse.',
        });
    if (error.code === 'P2034')
      return void res
        .status(409)
        .json({ message: 'Hubo un cambio simultáneo. Vuelve a intentarlo.' });
  }
  if (error.type === 'entity.parse.failed')
    return void res.status(400).json({ message: 'El JSON enviado no es válido.' });
  if (error.type === 'entity.too.large')
    return void res.status(413).json({ message: 'La solicitud excede el tamaño permitido.' });
  if (config.NODE_ENV !== 'test')
    console.error('Error de servidor:', error instanceof Error ? error.name : 'Unknown');
  res.status(500).json({ message: 'No pudimos completar la operación. Inténtalo nuevamente.' });
};
app.use(errors);
