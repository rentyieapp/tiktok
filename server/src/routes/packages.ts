import type { FastifyInstance } from 'fastify';
import type { AppContext } from '../context.js';
import { listPackages } from '../db/repo.js';
import { rowToPackage } from '../game/mappers.js';
import { getCatalog } from '../services/admin.js';

export async function packageRoutes(app: FastifyInstance, ctx: AppContext): Promise<void> {
  app.get('/api/packages', async (_request, reply) => {
    const platformPackages = listPackages(ctx.db).filter((pkg) => !pkg.game_key);
    return reply.send({
      packages: platformPackages.map(rowToPackage),
      durations: Array.from(new Set(platformPackages.map((pkg) => pkg.duration_days))).sort(
        (a, b) => a - b,
      ),
    });
  });

  app.get('/api/arcade/offers', async (_request, reply) => {
    const offers = listPackages(ctx.db).filter((pkg) => Boolean(pkg.game_key));
    return reply.send({
      offers: offers.map((pkg) => ({
        ...rowToPackage(pkg),
        gameKey: pkg.game_key,
        isActive: pkg.is_active === 1,
      })),
    });
  });

  app.get('/api/catalog', async (_request, reply) => {
    return reply.send(getCatalog(ctx.db));
  });
}
