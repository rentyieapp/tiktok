import { randomBytes } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import type { AppContext } from '../context.js';
import { listGameSessions } from '../db/repo.js';
import { conflict, notFound } from '../lib/errors.js';
import {
  createGameSchema,
  parseBody,
  testLiveEventSchema,
  toggleLiveSchema,
  updateCommandsSchema,
  updateGameSchema,
} from '../lib/schemas.js';
import { signLivePayload } from '../live/provider.js';
import { requireUser } from '../services/session.js';
import { requirePanelAccess } from '../services/account.js';
import { getPublisherStats } from '../services/stats.js';
import {
  buildGameResponse,
  createGame,
  getCommandSettings,
  listVersionsForUser,
  loadGameForUser,
  requireGameForUser,
  restoreVersion,
  toggleLive,
  updateCommandSettings,
  updateGame,
} from '../game/service.js';

export async function gameRoutes(app: FastifyInstance, ctx: AppContext): Promise<void> {
  const { db, config } = ctx;

  app.get('/api/game', async (request, reply) => {
    const user = requireUser(request, db, config);
    requirePanelAccess(db, user);
    const loaded = loadGameForUser(db, user);
    if (!loaded) {
      return reply.send({ game: null, publicUrl: null, pendingApply: false, live: null, commands: null });
    }
    const response = buildGameResponse(ctx, loaded.row, loaded.teams);
    return reply.send({
      ...response,
      live: ctx.runtime.getLiveSummary(loaded.row.id),
      commands: getCommandSettings(ctx, user),
    });
  });

  app.post('/api/game', async (request, reply) => {
    const user = requireUser(request, db, config);
    const body = parseBody(createGameSchema, request.body);
    const result = createGame(ctx, user, body);
    return reply.code(201).send(result);
  });

  app.put('/api/game', async (request, reply) => {
    const user = requireUser(request, db, config);
    const body = parseBody(updateGameSchema, request.body);
    const result = updateGame(ctx, user, body);
    return reply.send(result);
  });

  app.get('/api/game/commands', async (request, reply) => {
    const user = requireUser(request, db, config);
    requirePanelAccess(db, user);
    return reply.send(getCommandSettings(ctx, user));
  });

  app.put('/api/game/commands', async (request, reply) => {
    const user = requireUser(request, db, config);
    const body = parseBody(updateCommandsSchema, request.body);
    const result = updateCommandSettings(ctx, user, body);
    return reply.send({ ...result, commands: getCommandSettings(ctx, user) });
  });

  app.get('/api/game/versions', async (request, reply) => {
    const user = requireUser(request, db, config);
    requirePanelAccess(db, user);
    return reply.send({ versions: listVersionsForUser(db, user) });
  });

  app.post('/api/game/versions/:version/restore', async (request, reply) => {
    const user = requireUser(request, db, config);
    const { version } = request.params as { version: string };
    const versionNumber = Number(version);
    if (!Number.isInteger(versionNumber) || versionNumber < 1) {
      throw notFound('Geçersiz sürüm numarası.');
    }
    const result = restoreVersion(ctx, user, versionNumber);
    return reply.send(result);
  });

  app.post('/api/game/live', async (request, reply) => {
    const user = requireUser(request, db, config);
    requirePanelAccess(db, user);
    const body = parseBody(toggleLiveSchema, request.body);
    const result = toggleLive(ctx, user, body.enabled);
    return reply.send(result);
  });

  app.post('/api/game/session/start', async (request, reply) => {
    const user = requireUser(request, db, config);
    requirePanelAccess(db, user);
    const { row } = requireGameForUser(db, user);
    if (row.live_enabled !== 1) {
      throw conflict('Yayın bağlantısı kapalıyken tur başlatılamaz. Önce bağlantıyı etkinleştir.');
    }
    if (ctx.runtime.isRunning(row.id)) {
      throw conflict('Bu oyunda zaten devam eden bir tur var.');
    }
    try {
      const result = ctx.runtime.startRoundForGame(row.id);
      return reply.send({ ok: true, sessionId: result.sessionId, state: result.view });
    } catch (error) {
      throw conflict(error instanceof Error ? error.message : 'Tur başlatılamadı.');
    }
  });

  app.post('/api/game/session/stop', async (request, reply) => {
    const user = requireUser(request, db, config);
    requirePanelAccess(db, user);
    const { row } = requireGameForUser(db, user);
    const sessionId = row.active_session_id;
    const stopped = ctx.runtime.stopRound(row.id);
    if (!stopped) throw conflict('Devam eden bir tur yok.');
    return reply.send({ ok: true, sessionId });
  });

  app.get('/api/game/live-state', async (request, reply) => {
    const user = requireUser(request, db, config);
    requirePanelAccess(db, user);
    const { row } = requireGameForUser(db, user);
    return reply.send({
      live: ctx.runtime.getLiveSummary(row.id),
      state: ctx.runtime.getStateView(row.id),
    });
  });

  app.get('/api/game/stats', async (request, reply) => {
    const user = requireUser(request, db, config);
    requirePanelAccess(db, user);
    const { row } = requireGameForUser(db, user);
    return reply.send(getPublisherStats(db, row.id));
  });

  app.get('/api/game/sessions', async (request, reply) => {
    const user = requireUser(request, db, config);
    requirePanelAccess(db, user);
    const { row } = requireGameForUser(db, user);
    const sessions = listGameSessions(db, row.id, 30).map((session) => {
      const started = Date.parse(session.started_at);
      const ended = session.ended_at ? Date.parse(session.ended_at) : NaN;
      let summary: { winnerName?: string | null; winnerColor?: string | null } = {};
      try {
        summary = JSON.parse(session.summary_json) as typeof summary;
      } catch {
        summary = {};
      }
      return {
        id: session.id,
        roundIndex: session.round_index,
        startedAt: session.started_at,
        endedAt: session.ended_at,
        winnerTeamName: session.winner_name ?? summary.winnerName ?? null,
        winnerColor: session.winner_color ?? summary.winnerColor ?? null,
        isDraw: session.is_draw === 1,
        participantCount: session.participant_count,
        durationSec:
          Number.isFinite(started) && Number.isFinite(ended)
            ? Math.max(0, Math.round((ended - started) / 1000))
            : 0,
        endReason: session.end_reason,
      };
    });
    return reply.send({ sessions });
  });

  app.post(
    '/api/game/test-event',
    { config: { rateLimit: { max: 60, timeWindow: '1 minute' } } },
    async (request, reply) => {
      const user = requireUser(request, db, config);
      requirePanelAccess(db, user);
      const { row } = requireGameForUser(db, user);
      if (!ctx.runtime.isRunning(row.id)) {
        throw conflict('Test olayı göndermek için önce bir tur başlat.');
      }
      const body = parseBody(testLiveEventSchema, request.body);
      const playerName = body.playerName ?? 'Test İzleyici';
      const eventId =
        body.externalId ??
        `test_${Date.now()}_${randomBytes(6).toString('hex')}`;
      const rawBody = JSON.stringify({
        id: eventId,
        type: body.type,
        teamSlot: body.teamSlot,
        amount: body.amount,
        viewer: { id: `test_viewer_${row.id.slice(-10)}`, name: playerName },
        createdAt: new Date().toISOString(),
      });
      const response = await ctx.app.inject({
        method: 'POST',
        url: `/api/live/${row.public_slug}/events`,
        payload: rawBody,
        headers: {
          'content-type': 'application/json',
          'x-live-signature': signLivePayload(config.liveWebhookSecret, rawBody),
        },
      });
      let parsed: Record<string, unknown> = {};
      try {
        parsed = response.json() as Record<string, unknown>;
      } catch {
        parsed = {};
      }
      if (response.statusCode >= 400) {
        throw conflict('Test olayı webhook tarafından reddedildi.');
      }
      return reply.send({ eventId, webhookStatus: response.statusCode, ...parsed });
    },
  );


}
