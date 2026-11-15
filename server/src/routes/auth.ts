import type { FastifyInstance } from 'fastify';
import type { AppContext } from '../context.js';
import { createUser, findUserByEmail, findUserById, markUserEmailVerified, trackActivity, updateUserPassword } from '../db/repo.js';
import { nowIso } from '../db/index.js';
import { badRequest, conflict, forbidden, unauthorized } from '../lib/errors.js';
import { dummyVerify, hashPassword, verifyPassword } from '../lib/password.js';
import {
  emailRequestSchema,
  loginSchema,
  parseBody,
  registerSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from '../lib/schemas.js';
import { randomId } from '../lib/tokens.js';
import { rowToUser } from '../game/mappers.js';
import { requireUser, setSessionCookie, clearSessionCookie } from '../services/session.js';
import { buildMeDTO } from '../services/account.js';
import { consumeAuthToken, issueAuthToken } from '../services/authTokens.js';
import { resetMail, sendMail, verificationMail } from '../services/email.js';

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
      trackActivity(db, user.id, 'register', now);
      const token = issueAuthToken(db, user.id, 'verify_email', 24 * 60);
      const verificationUrl = `${config.appUrl}/eposta-dogrula?token=${encodeURIComponent(token)}`;
      const mail = verificationMail(user.display_name, verificationUrl);
      const delivery = await sendMail(config, { ...mail, to: user.email });
      return reply.code(201).send({
        user: rowToUser(user),
        verificationSent: delivery.sent,
        ...(config.isProduction ? {} : { debugVerificationUrl: verificationUrl }),
      });
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
      if (config.requireEmailVerification && !user.email_verified_at) {
        throw forbidden('E-posta adresin henüz doğrulanmadı. Gelen kutunu kontrol et.');
      }
      const valid = await verifyPassword(body.password, user.password_hash);
      if (!valid) throw unauthorized('E-posta veya şifre hatalı.');
      setSessionCookie(reply, user.id, config);
      trackActivity(db, user.id, 'login', nowIso());
      return reply.send({ user: rowToUser(user) });
    },
  );

  app.post('/api/auth/logout', async (_request, reply) => {
    clearSessionCookie(reply, config);
    return reply.send({ ok: true });
  });


  app.post(
    '/api/auth/verify-email',
    { config: { rateLimit: { max: 20, timeWindow: '1 minute' } } },
    async (request, reply) => {
      const body = parseBody(verifyEmailSchema, request.body);
      const consumed = consumeAuthToken(db, body.token, 'verify_email');
      if (!consumed) throw badRequest('Doğrulama bağlantısı geçersiz veya süresi dolmuş.');
      markUserEmailVerified(db, consumed.userId, nowIso());
      const user = findUserById(db, consumed.userId);
      if (!user) throw badRequest('Doğrulama bağlantısına ait kullanıcı bulunamadı.');
      // Doğrulama token'ı tek kullanımlık ve e-posta sahipliğini kanıtlar.
      // Kullanıcıyı yeniden şifre girmeye zorlamadan oturumu aç.
      setSessionCookie(reply, user.id, config);
      trackActivity(db, user.id, 'login', nowIso());
      return reply.send({ ok: true, user: rowToUser(user) });
    },
  );

  app.post(
    '/api/auth/resend-verification',
    { config: { rateLimit: { max: 5, timeWindow: '1 minute' } } },
    async (request, reply) => {
      const body = parseBody(emailRequestSchema, request.body);
      const user = findUserByEmail(db, body.email);
      if (user && !user.email_verified_at) {
        const token = issueAuthToken(db, user.id, 'verify_email', 24 * 60);
        const url = `${config.appUrl}/eposta-dogrula?token=${encodeURIComponent(token)}`;
        const mail = verificationMail(user.display_name, url);
        await sendMail(config, { ...mail, to: user.email });
      }
      return reply.send({ ok: true });
    },
  );

  app.post(
    '/api/auth/forgot-password',
    { config: { rateLimit: { max: 5, timeWindow: '1 minute' } } },
    async (request, reply) => {
      const body = parseBody(emailRequestSchema, request.body);
      const user = findUserByEmail(db, body.email);
      let debugResetUrl: string | undefined;
      if (user && user.status === 'active') {
        const token = issueAuthToken(db, user.id, 'reset_password', 60);
        const url = `${config.appUrl}/sifre-sifirla?token=${encodeURIComponent(token)}`;
        debugResetUrl = config.isProduction ? undefined : url;
        const mail = resetMail(user.display_name, url);
        await sendMail(config, { ...mail, to: user.email });
      }
      return reply.send({ ok: true, ...(debugResetUrl ? { debugResetUrl } : {}) });
    },
  );

  app.post(
    '/api/auth/reset-password',
    { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } },
    async (request, reply) => {
      const body = parseBody(resetPasswordSchema, request.body);
      const consumed = consumeAuthToken(db, body.token, 'reset_password');
      if (!consumed) throw badRequest('Şifre sıfırlama bağlantısı geçersiz veya süresi dolmuş.');
      let passwordHash: string;
      try {
        passwordHash = await hashPassword(body.password);
      } catch {
        throw badRequest('Şifre işlenemedi. Lütfen tekrar dene.');
      }
      updateUserPassword(db, consumed.userId, passwordHash, nowIso());
      return reply.send({ ok: true });
    },
  );

  app.get('/api/auth/me', async (request, reply) => {
    const user = requireUser(request, db, config);
    const me = buildMeDTO(db, user);
    return reply.send(me);
  });
}
