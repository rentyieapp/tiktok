import type { FastifyReply, FastifyRequest } from 'fastify';
import type { AppConfig } from '../config.js';
import type { DB } from '../db/index.js';
import { findUserById, type UserRow } from '../db/repo.js';
import { forbidden, unauthorized } from '../lib/errors.js';
import { createSessionToken, verifySessionToken } from '../lib/tokens.js';

export const SESSION_COOKIE = 'tt_session';

export function setSessionCookie(
  reply: FastifyReply,
  userId: string,
  config: AppConfig,
  now = Date.now(),
): void {
  const token = createSessionToken(userId, config.sessionSecret, config.sessionTtlDays, now);
  reply.setCookie(SESSION_COOKIE, token, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: config.cookieSecure,
    maxAge: config.sessionTtlDays * 24 * 60 * 60,
  });
}

export function clearSessionCookie(reply: FastifyReply, config: AppConfig): void {
  reply.clearCookie(SESSION_COOKIE, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: config.cookieSecure,
  });
}

export function peekUserId(request: FastifyRequest, config: AppConfig): string | null {
  const token = request.cookies?.[SESSION_COOKIE];
  if (!token) return null;
  const payload = verifySessionToken(token, config.sessionSecret);
  return payload?.sub ?? null;
}

export function requireUser(request: FastifyRequest, db: DB, config: AppConfig): UserRow {
  const userId = peekUserId(request, config);
  if (!userId) throw unauthorized();
  const user = findUserById(db, userId);
  if (!user) throw unauthorized('Oturum bulunamadı. Lütfen yeniden giriş yap.');
  if (user.status !== 'active') throw unauthorized('Hesabın askıya alınmış.');
  if (config.requireEmailVerification && !user.email_verified_at) {
    throw forbidden('E-posta adresin henüz doğrulanmadı. Gelen kutunu kontrol et.');
  }
  return user;
}
