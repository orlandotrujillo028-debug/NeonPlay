import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { rateLimit } from 'express-rate-limit';
import { db } from '../db.js';
import {
  auth,
  ApiError,
  credentialsSchema,
  profileSchema,
  createSession,
  clearSession,
  userFields,
} from '../lib.js';

export const authRouter = Router();
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'Demasiados intentos. Inténtalo dentro de unos minutos.' },
});
authRouter.post('/register', limiter, async (req, res) => {
  const data = credentialsSchema.merge(profileSchema).parse(req.body);
  const passwordHash = await bcrypt.hash(data.password, 12);
  const user = await db.user.create({
    data: { name: data.name, email: data.email, passwordHash },
    select: userFields,
  });
  await createSession(user.id, res);
  res.status(201).json(user);
});
authRouter.post('/login', limiter, async (req, res) => {
  const data = credentialsSchema.parse(req.body);
  const user = await db.user.findUnique({ where: { email: data.email } });
  // A fixed valid bcrypt hash keeps the missing-user branch comparable in cost.
  const valid = await bcrypt.compare(
    data.password,
    user?.passwordHash || '$2b$12$r9LxS.kqnUHB.zD1lhA7NOadUyFXDpC9MHAqp.lXESBlFVUF5clku',
  );
  if (!user?.active || !valid) throw new ApiError(401, 'Correo o contraseña incorrectos.');
  await createSession(user.id, res);
  res.json({ id: user.id, name: user.name, email: user.email, role: user.role });
});
authRouter.get('/me', auth, (req, res) => res.json(req.user));
authRouter.patch('/me', auth, async (req, res) => {
  const data = profileSchema.parse(req.body);
  res.json(await db.user.update({ where: { id: req.user!.id }, data, select: userFields }));
});
authRouter.post('/logout', auth, async (req, res) => {
  await db.session.deleteMany({ where: { id: req.sessionId } });
  clearSession(res);
  res.status(204).end();
});
