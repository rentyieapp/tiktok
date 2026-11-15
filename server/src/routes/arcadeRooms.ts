import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { AppContext } from '../context.js';
import {
  addArcadeRoomBan,
  findActiveGameLicense,
  findArcadeRoomById,
  listArcadeRoomBans,
  listGameLicenses,
  removeArcadeRoomBan,
  listPublicLiveRooms,
} from '../db/repo.js';
import { nowIso } from '../db/index.js';
import { badRequest, forbidden, notFound } from '../lib/errors.js';
import { parseBody } from '../lib/schemas.js';
import { randomId } from '../lib/tokens.js';
import { ARCADE_GAMES, isArcadeKey, type ArcadeKey } from '../../../shared/arcade.js';
import { requireUser } from '../services/session.js';
import { getTrialStatus, startTrial } from '../services/trial.js';
import {
  activeGameLicenseOrThrow,
  assertRoomOwner,
  assertRoomManager,
  addPublisherRoomHost,
  removePublisherRoomHost,
  connectPlatform,
  connectionToDTO,
  createPublisherRoom,
  getPublicRoom,
  listPublisherRooms,
  listRoomConnections,
  publicRoomRow,
  removeConnection,
  roomForConnection,
  roomSessions,
  updatePublisherRoom,
  updateQuizQuestions,
} from '../arcade/rooms.js';
import type { NormalizedPlatformEvent } from '../arcade/runtime.js';

const roomCreateSchema = z
  .object({
    gameKey: z.string().min(2).max(40),
    name: z.string().trim().min(2).max(60).optional(),
  })
  .strict();

const roomUpdateSchema = z
  .object({
    name: z.string().trim().min(2).max(60).optional(),
    status: z.enum(['live', 'disabled']).optional(),
    settings: z.record(z.unknown()).optional(),
  })
  .strict();

const connectSchema = z
  .object({
    platform: z.enum(['twitch', 'youtube', 'tiktok']),
    channel: z.string().trim().min(1).max(80),
  })
  .strict();

const testSchema = z
  .object({
    kind: z.enum(['comment', 'like', 'gift', 'follow']).default('comment'),
    text: z.string().trim().max(120).default('test'),
  })
  .strict();

export async function arcadeRoomRoutes(app: FastifyInstance, ctx: AppContext): Promise<void> {
  const { db, config, arcade, platformHub } = ctx;

  app.get('/api/arcade/rooms', async (request, reply) => {
    const user = requireUser(request, db, config);
    return reply.send({
      rooms: listPublisherRooms(db, config, user.id),
      licenses: listGameLicenses(db, user.id)
        .filter((license) => license.status === 'active' && Date.parse(license.expires_at) > Date.now())
        .map((license) => ({ gameKey: license.game_key, expiresAt: license.expires_at })),
    });
  });

  app.get('/api/arcade/access', async (request, reply) => {
    const user = requireUser(request, db, config);
    const licenses = listGameLicenses(db, user.id)
      .filter((license) => license.status === 'active' && Date.parse(license.expires_at) > Date.now())
      .map((license) => ({ gameKey: license.game_key, expiresAt: license.expires_at }));
    return reply.send({ licenses });
  });

  app.get('/api/leaderboard', async (_request, reply) => {
    const publishers = db
      .prepare(
        `SELECT u.display_name AS name, COUNT(r.id) AS rooms,
                COALESCE(SUM(r.rounds_played), 0) AS rounds,
                MAX(r.last_played_at) AS lastPlayedAt
         FROM arcade_rooms r
         JOIN users u ON u.id = r.user_id
         WHERE r.status = 'live'
         GROUP BY u.id
         ORDER BY rounds DESC, rooms DESC, u.display_name ASC
         LIMIT 10`,
      )
      .all() as Array<{ name: string; rooms: number; rounds: number; lastPlayedAt: string | null }>;
    const games = db
      .prepare(
        `SELECT game_key AS gameKey, COUNT(*) AS rooms,
                COALESCE(SUM(rounds_played), 0) AS rounds
         FROM arcade_rooms
         WHERE status = 'live'
         GROUP BY game_key
         ORDER BY rounds DESC, rooms DESC
         LIMIT 10`,
      )
      .all() as Array<{ gameKey: string; rooms: number; rounds: number }>;
    const totals = db
      .prepare(
        `SELECT COUNT(*) AS rooms, COALESCE(SUM(rounds_played), 0) AS rounds
         FROM arcade_rooms WHERE status = 'live'`,
      )
      .get() as { rooms: number; rounds: number };
    return reply.send({
      publishers,
      games,
      totals: {
        rooms: Number(totals.rooms),
        rounds: Number(totals.rounds),
        publishers: publishers.length,
      },
    });
  });

  app.get('/api/arcade/trial', async (request, reply) => {
    const user = requireUser(request, db, config);
    return reply.send(getTrialStatus(db, user.id));
  });

  app.post(
    '/api/arcade/trial',
    { config: { rateLimit: { max: 6, timeWindow: '1 minute' } } },
    async (request, reply) => {
      const user = requireUser(request, db, config);
      const body = parseBody(
        z.object({ gameKey: z.string().trim().min(2).max(40) }).strict(),
        request.body,
      );
      const result = startTrial(db, user, body.gameKey);
      return reply.code(201).send({ ...result, trial: getTrialStatus(db, user.id) });
    },
  );

  app.post('/api/arcade/rooms', async (request, reply) => {
    const user = requireUser(request, db, config);
    const body = parseBody(roomCreateSchema, request.body);
    if (!isArcadeKey(body.gameKey)) throw badRequest('Geçersiz oyun.');
    const room = createPublisherRoom(db, config, { id: user.id, displayName: user.display_name }, body.gameKey, body.name);
    return reply.code(201).send({ room });
  });

  app.get('/api/arcade/rooms/:id/live', async (request, reply) => {
    const user = requireUser(request, db, config);
    const { id } = request.params as { id: string };
    const row = findArcadeRoomById(db, id);
    if (!row) throw notFound('Oda bulunamadı.');
    assertRoomManager(db, row, user.id);
    return reply.send({ players: arcade.livePlayers(id) });
  });

  app.get('/api/arcade/rooms/:id/bans', async (request, reply) => {
    const user = requireUser(request, db, config);
    const { id } = request.params as { id: string };
    const row = findArcadeRoomById(db, id);
    if (!row) throw notFound('Oda bulunamadı.');
    assertRoomManager(db, row, user.id);
    return reply.send({
      bans: listArcadeRoomBans(db, id).map((ban) => ({
        viewerId: ban.viewer_id,
        viewerName: ban.viewer_name,
        reason: ban.reason,
        createdAt: ban.created_at,
      })),
    });
  });

  app.delete('/api/arcade/rooms/:id/bans/:viewerId', async (request, reply) => {
    const user = requireUser(request, db, config);
    const { id, viewerId } = request.params as { id: string; viewerId: string };
    const row = findArcadeRoomById(db, id);
    if (!row) throw notFound('Oda bulunamadı.');
    assertRoomManager(db, row, user.id);
    removeArcadeRoomBan(db, id, decodeURIComponent(viewerId));
    return reply.send({ ok: true, bans: listArcadeRoomBans(db, id) });
  });

  app.post('/api/arcade/rooms/:id/kick', async (request, reply) => {
    const user = requireUser(request, db, config);
    const { id } = request.params as { id: string };
    const row = findArcadeRoomById(db, id);
    if (!row) throw notFound('Oda bulunamadı.');
    assertRoomManager(db, row, user.id);
    const body = parseBody(
      z
        .object({
          playerId: z.string().trim().min(1).max(120),
          ban: z.boolean().default(false),
          reason: z.string().trim().max(160).optional(),
        })
        .strict(),
      request.body,
    );
    const target = arcade.livePlayers(id).find((player) => player.id === body.playerId);
    if (body.ban) {
      addArcadeRoomBan(db, {
        id: randomId('ban'),
        roomId: id,
        viewerId: body.playerId,
        viewerName: target?.name ?? 'İzleyici',
        reason: body.reason ?? null,
        createdBy: user.id,
        now: nowIso(),
      });
    }
    const kicked = arcade.kickPlayer(id, body.playerId);
    return reply.send({
      ok: kicked,
      players: arcade.livePlayers(id),
      bans: listArcadeRoomBans(db, id).map((ban) => ({
        viewerId: ban.viewer_id,
        viewerName: ban.viewer_name,
        reason: ban.reason,
        createdAt: ban.created_at,
      })),
    });
  });

  app.post('/api/arcade/rooms/:id/hosts', async (request, reply) => {
    const user = requireUser(request, db, config);
    const { id } = request.params as { id: string };
    const body = parseBody(
      z.object({ email: z.string().trim().email().max(160) }).strict(),
      request.body,
    );
    const hosts = addPublisherRoomHost(db, user.id, id, body.email);
    return reply.code(201).send({ hosts });
  });

  app.delete('/api/arcade/rooms/:id/hosts/:userId', async (request, reply) => {
    const user = requireUser(request, db, config);
    const { id, userId: hostId } = request.params as { id: string; userId: string };
    const hosts = removePublisherRoomHost(db, user.id, id, hostId);
    return reply.send({ hosts });
  });

  app.put('/api/arcade/rooms/:id/quiz', async (request, reply) => {
    const user = requireUser(request, db, config);
    const { id } = request.params as { id: string };
    const body = parseBody(
      z.object({ questions: z.array(z.unknown()).max(50) }).strict(),
      request.body,
    );
    const room = updateQuizQuestions(db, config, user.id, id, body.questions);
    arcade.setQuizPool(id, body.questions);
    return reply.send({ room });
  });

  app.put('/api/arcade/rooms/:id', async (request, reply) => {
    const user = requireUser(request, db, config);
    const { id } = request.params as { id: string };
    const body = parseBody(roomUpdateSchema, request.body);
    const room = updatePublisherRoom(db, config, user.id, id, body);
    if (body.status === 'disabled') arcade.disconnectRoom(id);
    const updatedRow = findArcadeRoomById(db, id);
    if (updatedRow && body.status !== 'disabled') arcade.applyRoomSettings(updatedRow);
    return reply.send({ room });
  });

  app.get('/api/arcade/live', async (_request, reply) => {
    const rows = listPublicLiveRooms(db, 12);
    return reply.send({
      rooms: rows.map((row) => ({
        slug: row.public_slug,
        name: row.room_name,
        gameKey: row.game_key,
        gameName: ARCADE_GAMES[row.game_key as keyof typeof ARCADE_GAMES]?.name ?? row.game_key,
        publisherName: row.publisher_name,
        roundsPlayed: row.rounds_played,
        lastPlayedAt: row.last_played_at,
      })),
    });
  });

  app.get('/api/arcade/rooms/:slug/public', async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const room = publicRoomRow(db, slug);
    const owner = db.prepare('SELECT * FROM users WHERE id = ?').get(room.user_id) as
      | { id: string }
      | undefined;
    const licensed = Boolean(owner && findActiveGameLicense(db, owner.id, room.game_key, nowIso()));
    const overlayPro = Boolean(owner && findActiveGameLicense(db, owner.id, 'overlay_pro', nowIso()));
    const data = getPublicRoom(db, config, arcade, slug);
    return reply.send({ ...data, licensed: data.licensed && licensed, overlayPro });
  });

  app.get('/api/arcade/rooms/:id/sessions', async (request, reply) => {
    const user = requireUser(request, db, config);
    const { id } = request.params as { id: string };
    return reply.send({ sessions: roomSessions(db, user.id, id) });
  });

  app.get('/api/platforms/rooms/:roomId', async (request, reply) => {
    const user = requireUser(request, db, config);
    const { roomId } = request.params as { roomId: string };
    return reply.send({
      connections: listRoomConnections(db, config, user.id, roomId),
      youtubeConfigured: Boolean(config.youtubeApiKey),
    });
  });

  app.post('/api/platforms/rooms/:roomId/connect', async (request, reply) => {
    const user = requireUser(request, db, config);
    const { roomId } = request.params as { roomId: string };
    const body = parseBody(connectSchema, request.body);
    const result = connectPlatform(db, config, user.id, roomId, body.platform, body.channel);
    platformHub.startConnection(result.row);
    const updated = db
      .prepare('SELECT * FROM platform_connections WHERE id = ?')
      .get(result.row.id) as typeof result.row;
    return reply.code(201).send({ connection: connectionToDTO(updated, config) });
  });

  app.delete('/api/platforms/connections/:id', async (request, reply) => {
    const user = requireUser(request, db, config);
    const { id } = request.params as { id: string };
    const connection = removeConnection(db, user.id, id);
    platformHub.disconnect(connection.id);
    return reply.send({ ok: true });
  });

  app.post('/api/platforms/rooms/:roomId/test', async (request, reply) => {
    const user = requireUser(request, db, config);
    const { roomId } = request.params as { roomId: string };
    const body = parseBody(testSchema, request.body);
    const room = roomForConnection(db, user.id, roomId);
    if (room.status !== 'live') throw badRequest('Oda yayında değil.');
    const event: NormalizedPlatformEvent = {
      id: `test-${randomId('evt')}`,
      platform: 'twitch',
      kind: body.kind,
      viewer: { id: 'test_viewer', name: 'Test İzleyici' },
      text: body.text,
      giftName: body.kind === 'gift' ? 'Test hediyesi' : undefined,
    };
    const result = arcade.ingestPlatformEvent(room, event);
    return reply.send(result);
  });

  app.get('/ws/arcade/room/:slug', { websocket: true }, (socket, request) => {
    const { slug } = request.params as { slug: string };
    const room = db
      .prepare('SELECT * FROM arcade_rooms WHERE public_slug = ?')
      .get(slug) as ReturnType<typeof publicRoomRow> | undefined;
    if (!room || room.status !== 'live') {
      socket.close(4004, 'Room not found or disabled');
      return;
    }
    const owner = db.prepare('SELECT id FROM users WHERE id = ?').get(room.user_id) as
      | { id: string }
      | undefined;
    if (!owner || !findActiveGameLicense(db, owner.id, room.game_key, nowIso())) {
      socket.close(4003, 'Subscription expired');
      return;
    }
    arcade.attachChannel(room, socket);
  });
}
