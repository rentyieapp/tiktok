import type { FastifyInstance } from 'fastify';
import type { AppContext } from '../context.js';
import { badRequest, notFound } from '../lib/errors.js';
import { processPaymentWebhook } from '../services/billing.js';
import { findPlatformConnectionByToken } from '../db/repo.js';

export async function paymentWebhookRoutes(app: FastifyInstance, ctx: AppContext): Promise<void> {
  app.post(
    '/api/webhooks/tiktok/:token',
    { config: { rateLimit: { max: 240, timeWindow: '1 minute' } } },
    async (request, reply) => {
      const { token } = request.params as { token: string };
      const connection = findPlatformConnectionByToken(ctx.db, token);
      if (!connection || connection.platform !== 'tiktok') {
        throw notFound('TikTok connector bulunamadı.');
      }
      const result = ctx.platformHub.handleTikTokWebhook(token, request.body);
      return reply.send({ received: true, ...result });
    },
  );

  app.post('/api/webhooks/payments/:providerId', async (request, reply) => {
    const { providerId } = request.params as { providerId: string };
    const provider = ctx.providers.get(providerId);
    if (!provider) throw notFound('Bilinmeyen ödeme sağlayıcısı.');
    const rawBody = (request as typeof request & { rawBody?: string }).rawBody;
    if (typeof rawBody !== 'string' || rawBody.length === 0) {
      throw badRequest('Webhook gövdesi okunamadı.');
    }
    const result = processPaymentWebhook(ctx.db, provider, request.headers, rawBody);
    return reply.send({
      received: true,
      duplicate: result.duplicate,
      handled: result.handled,
      paymentStatus: result.paymentStatus,
      subscriptionCreated: result.subscriptionCreated,
      licenseCreated: result.licenseCreated,
      message: result.message,
    });
  });
}
