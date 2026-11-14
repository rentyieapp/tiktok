import type { FastifyInstance } from 'fastify';
import type { AppContext } from '../context.js';
import { createUser, findUserByEmail } from '../db/repo.js';
import { nowIso } from '../db/index.js';
import { badRequest, conflict, unauthorized } from '../lib/errors.js';
import { dummyVerify, hashPassword, verifyPassword } from '../lib/password.js';
import { loginSchema, parseBody, registerSchema } from '../lib/schemas.js';
import { randomId } from '../lib/tokens.js';
import { rowToUser } from '../game/mappers.js';
import { requireUser, setSessionCookie, clearSessionCookie } from '../services/session.js';
import { buildMeDTO } from '../services/account.js';

export async function authRoutes(app: FastifyInstance, ctx: AppContext): Promise<void> {
  const { db, config } = ctx;

  app.post(
    '/api/auth/register',
    { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } },
    async (request, reply) => {
      const body = parseBody(registerSchema, request.body);
      if (findUserByEmail(db, body.email)) {
        throw conflict('Bu e-posta adresiyle zaten bir hesap var. Giriş yapmayı dene.');
      }
      let passwordHash: string;
      try {
        passwordHash = await hashPassword(body.password);
      } catch {
        throw badRequest('Şifre işlenemedi. Lütfen tekrar dene.');
      }
      const now = nowIso();
      const user = createUser(db, {
        id: randomId('usr'),
        email: body.email,
        passwordHash,
        displayName: body.displayName,
        now,
      });
      setSessionCookie(reply, user.id, config);
      return reply.code(201).send({ user: rowToUser(user) });
    },
  );

  app.post(
    '/api/auth/login',
    { config: { rateLimit: { max: 15, timeWindow: '1 minute' } } },
    async (request, reply) => {
      const body = parseBody(loginSchema, request.body);
      const user = findUserByEmail(db, body.email);
      if (!user) {
        await dummyVerify(body.password);
        throw unauthorized('E-posta veya şifre hatalı.');
      }
      if (user.status !== 'active') throw unauthorized('Hesabın askıya alınmış.');
      const valid = await verifyPassword(body.password, user.password_hash);
      if (!valid) throw unauthorized('E-posta veya şifre hatalı.');
      setSessionCookie(reply, user.id, config);
      return reply.send({ user: rowToUser(user) });
    },
  );

  app.post('/api/auth/logout', async (_request, reply) => {
    clearSessionCookie(reply, config);
    return reply.send({ ok: true });
  });

  app.get('/api/auth/me', async (request, reply) => {
    const user = requireUser(request, db, config);
    const me = buildMeDTO(db, user);
    return reply.send(me);
  });
}
