import type { FastifyInstance } from 'fastify';
import type { AppContext } from '../context.js';
import {
  ARCADE_GAME_LIST,
  ARCADE_GAMES,
  isArcadeKey,
  type ArcadeKey,
} from '../../../shared/arcade.js';

export async function arcadeRoutes(app: FastifyInstance, ctx: AppContext): Promise<void> {
  app.get('/api/arcade/games', async (_request, reply) => {
    return reply.send({
      games: ARCADE_GAME_LIST,
      online: ctx.arcade.getOnlineCounts(),
    });
  });

  app.get('/api/arcade/games/:key', async (request, reply) => {
    const { key } = request.params as { key: string };
    if (!isArcadeKey(key)) {
      return reply.code(404).send({ error: 'NOT_FOUND', message: 'Oyun bulunamadı.' });
    }
    return reply.send({
      game: ARCADE_GAMES[key],
      snapshot: ctx.arcade.getSnapshot(key),
    });
  });

  app.get('/ws/arcade/:key', { websocket: true }, (socket, request) => {
    const { key } = request.params as { key: string };
    if (!isArcadeKey(key)) {
      socket.close(4004, 'Game not found');
      return;
    }
    ctx.arcade.attachClient(key as ArcadeKey, socket);
  });
}
