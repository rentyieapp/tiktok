import type { FastifyInstance } from 'fastify';
import type { AppContext } from '../context.js';
import { nowIso } from '../db/index.js';
import { findUserById, updateUserPassword, updateUserProfile } from '../db/repo.js';
import { unauthorized } from '../lib/errors.js';
import { changePasswordSchema, parseBody, profileSchema } from '../lib/schemas.js';
import { hashPassword, verifyPassword } from '../lib/password.js';
import { rowToUser } from '../game/mappers.js';
import { requireUser, setSessionCookie } from '../services/session.js';
import { buildMeDTO } from '../services/account.js';

export async function accountRoutes(app: FastifyInstance, ctx: AppContext): Promise<void> {
  const { db, config } = ctx;

  app.patch('/api/account/profile', async (request, reply) => {
    const user = requireUser(request, db, config);
    const body = parseBody(profileSchema, request.body);
    updateUserProfile(db, user.id, body.displayName, nowIso());
    const updated = findUserById(db, user.id)!;
    return reply.send({ user: rowToUser(updated) });
  });

  app.post(
    '/api/account/password',
    { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } },
    async (request, reply) => {
      const user = requireUser(request, db, config);
      const body = parseBody(changePasswordSchema, request.body);
      const valid = await verifyPassword(body.currentPassword, user.password_hash);
      if (!valid) throw unauthorized('Mevcut şifre hatalı.');
      const hash = await hashPassword(body.newPassword);
      updateUserPassword(db, user.id, hash, nowIso());
      setSessionCookie(reply, user.id, config);
      return reply.send({ ok: true, message: 'Şifren güncellendi.' });
    },
  );

  app.get('/api/account/overview', async (request, reply) => {
    const user = requireUser(request, db, config);
    return reply.send(buildMeDTO(db, user));
  });
}
