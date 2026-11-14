import type { FastifyInstance } from 'fastify';
import type { AppContext } from '../context.js';
import { findGameBySlug } from '../db/repo.js';

export async function websocketRoutes(app: FastifyInstance, ctx: AppContext): Promise<void> {
  app.get('/ws/game/:slug', { websocket: true }, (socket, request) => {
    const { slug } = request.params as { slug: string };
    const game = findGameBySlug(ctx.db, slug);
    if (!game || game.live_enabled !== 1) {
      socket.close(4004, 'Live link not found or disabled');
      return;
    }
    ctx.runtime.attachClient(game, socket);
  });
}
