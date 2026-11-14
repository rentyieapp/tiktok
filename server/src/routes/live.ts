import type { FastifyInstance } from 'fastify';
import type { AppContext } from '../context.js';
import { findGameBySlug } from '../db/repo.js';
import { HttpError, badRequest, notFound } from '../lib/errors.js';
import { getPublicBootstrap } from '../game/service.js';

export async function liveRoutes(app: FastifyInstance, ctx: AppContext): Promise<void> {
  app.get('/api/live/:slug', async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const bootstrap = getPublicBootstrap(ctx.db, slug);
    if (!bootstrap) throw notFound('Yayın bulunamadı veya bağlantı devre dışı.');
    reply.header('Cache-Control', 'no-store');
    return reply.send(bootstrap);
  });

  app.post(
    '/api/live/:slug/events',
    { config: { rateLimit: { max: 120, timeWindow: '1 minute' } } },
    async (request, reply) => {
      const { slug } = request.params as { slug: string };
      const game = findGameBySlug(ctx.db, slug);
      if (!game || game.live_enabled !== 1) throw notFound('Yayın bulunamadı.');
      const rawBody = (request as typeof request & { rawBody?: string }).rawBody;
      if (typeof rawBody !== 'string' || rawBody.length === 0) {
        throw badRequest('Webhook gövdesi okunamadı.');
      }
      const verification = ctx.liveProvider.verify(request.headers, rawBody);
      if (!verification.valid || !verification.event) {
        throw new HttpError(
          401,
          'INVALID_LIVE_SIGNATURE',
          `Canlı yayın olayı doğrulanamadı: ${verification.reason ?? 'geçersiz imza'}`,
        );
      }
      const result = ctx.runtime.ingestLiveEventBySlug(slug, verification.event, verification.event.id);
      return reply.send({ received: true, ...result });
    },
  );
}
