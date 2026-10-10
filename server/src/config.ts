import dotenv from 'dotenv';
import { z } from 'zod';
dotenv.config({ quiet: true });
export const config = z
  .object({
    DATABASE_URL: z.string().url(),
    JWT_SECRET: z
      .string()
      .min(32)
      .refine(
        (s) => !s.includes('REEMPLAZAR'),
        'Genera un secreto propio o ejecuta npm run setup.',
      ),
    PORT: z.coerce.number().int().min(1).max(65535).default(4000),
    CLIENT_URL: z.string().url().default('http://localhost:5173'),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  })
  .parse(process.env);
export const allowedOrigins = new Set([new URL(config.CLIENT_URL).origin]);
if (config.NODE_ENV !== 'production') {
  const local = new URL(config.CLIENT_URL);
  if (['localhost', '127.0.0.1'].includes(local.hostname)) {
    for (const hostname of ['localhost', '127.0.0.1']) {
      local.hostname = hostname;
      allowedOrigins.add(local.origin);
    }
  }
}
