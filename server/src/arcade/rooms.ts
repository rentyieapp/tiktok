import type { AppConfig } from '../config.js';
import type { DB } from '../db/index.js';
import {
  createArcadeRoom,
  createPlatformConnection,
  deletePlatformConnection,
  findActiveGameLicense,
  findActiveSubscription,
  findArcadeRoomById,
  findArcadeRoomBySlug,
  findArcadeRoomByUserAndGame,
  findPlatformConnectionByRoom,
  findUserById,
  listArcadeRoomsByUser,
  listArcadeRoomsForUser,
  listArcadeRoomHosts,
  findArcadeRoomHost,
  addArcadeRoomHost,
  removeArcadeRoomHost,
  findUserByEmail,
  listArcadeSessions,
  listPlatformConnectionsByRoom,
  updateArcadeRoom,
  updatePlatformConnectionChannel,
  type ArcadeRoomRow,
  type PlatformConnectionRow,
} from '../db/repo.js';
import { nowIso } from '../db/index.js';
import { badRequest, conflict, forbidden, notFound } from '../lib/errors.js';
import { randomId } from '../lib/tokens.js';
import { slugifyBase } from '../../../shared/defaults.js';
import {
  ARCADE_GAMES,
  isArcadeKey,
  type ArcadeGameDef,
  sanitizeQuizQuestions,
  type ArcadeKey,
} from '../../../shared/arcade.js';
import type {
  ArcadeRoomDTO,
  ArcadeRoomPublicDTO,
  PlatformConnectionDTO,
  LivePlatform,
  PlatformConnectionStatus,
} from '../../../shared/types.js';
import type { ArcadeRuntime } from './runtime.js';

export function getArcadeGame(key: string): ArcadeGameDef {
  if (!isArcadeKey(key)) throw notFound('Oyun bulunamadı.');
  return ARCADE_GAMES[key];
}

export function activeGameLicenseOrThrow(db: DB, userId: string, gameKey: string) {
  const license = findActiveGameLicense(db, userId, gameKey, nowIso());
  if (!license) {
    throw forbidden('Bu oyun için aktif lisans gerekir. Önce oyunu satın al.');
  }
  return license;
}

export function roomToDTO(
  row: ArcadeRoomRow,
  config: AppConfig,
  hosts: Array<{ id: string; name: string }> = [],
  isOwner = true,
): ArcadeRoomDTO {
  const publicUrl = `${config.appUrl.replace(/\/$/, '')}/canli/${row.public_slug}`;
  return {
    id: row.id,
    gameKey: row.game_key,
    slug: row.public_slug,
    name: row.name,
    status: row.status,
    roundsPlayed: row.rounds_played,
    lastWinnerName: row.last_winner_name,
    lastPlayedAt: row.last_played_at,
    hosts,
    isOwner,
    settings: (() => {
      try {
        const value = JSON.parse(row.settings_json) as unknown;
        return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
      } catch {
        return {};
      }
    })(),
    createdAt: row.created_at,
    publicUrl,
    obsUrl: `${publicUrl}?obs=1`,
    overlayUrl: `${publicUrl}?overlay=1`,
  };
}

export function connectionToDTO(row: PlatformConnectionRow, config: AppConfig): PlatformConnectionDTO {
  return {
    id: row.id,
    platform: row.platform,
    channel: row.channel,
    status: row.status,
    lastEventAt: row.last_event_at,
    lastError: row.last_error,
    connectorUrl:
      row.platform === 'tiktok' && row.connector_token
        ? `${config.appUrl.replace(/\/$/, '')}/api/webhooks/tiktok/${row.connector_token}`
        : null,
    createdAt: row.created_at,
  };
}

export function assertRoomOwner(row: ArcadeRoomRow, userId: string): void {
  if (row.user_id !== userId) throw forbidden('Bu oda size ait değil.');
}

export function assertRoomManager(db: DB, row: ArcadeRoomRow, userId: string): void {
  if (row.user_id === userId) return;
  if (findArcadeRoomHost(db, row.id, userId)) return;
  throw forbidden('Bu oda size ait değil veya ortak yayıncı değilsin.');
}

export function createPublisherRoom(
  db: DB,
  config: AppConfig,
  user: { id: string; displayName: string },
  gameKey: string,
  requestedName?: string,
): ArcadeRoomDTO {
  const game = getArcadeGame(gameKey);
  activeGameLicenseOrThrow(db, user.id, game.key);
  const existing = findArcadeRoomByUserAndGame(db, user.id, game.key);
  if (existing) throw conflict('Bu oyun için zaten bir odanız var.');
  const name = (requestedName?.trim() || `${game.name} · ${user.displayName}`).slice(0, 60);
  let publicSlug = `${game.slug}-${slugifyBase(user.displayName).slice(0, 24)}-${randomId('o').replace('o_', '').slice(0, 6)}`;
  let guard = 0;
  while (findArcadeRoomBySlug(db, publicSlug) && guard < 8) {
    publicSlug = `${game.slug}-${slugifyBase(user.displayName).slice(0, 20)}-${randomId('o').replace('o_', '').slice(0, 8)}`;
    guard += 1;
  }
  const now = nowIso();
  const row: ArcadeRoomRow = {
    id: randomId('aroom'),
    user_id: user.id,
    game_key: game.key,
    public_slug: publicSlug,
    name,
    status: 'live',
    settings_json: '{}',
    rounds_played: 0,
    last_winner_name: null,
    last_played_at: null,
    created_at: now,
    updated_at: now,
  };
  createArcadeRoom(db, row);
  return roomToDTO(row, config);
}

export function listPublisherRooms(
  db: DB,
  config: AppConfig,
  userId: string,
): ArcadeRoomDTO[] {
  return listArcadeRoomsForUser(db, userId).map((row) =>
    roomToDTO(
      row,
      config,
      listArcadeRoomHosts(db, row.id).map((host) => ({ id: host.user_id, name: host.display_name })),
      row.user_id === userId,
    ),
  );
}

export function updatePublisherRoom(
  db: DB,
  config: AppConfig,
  userId: string,
  roomId: string,
  fields: { name?: string; status?: 'live' | 'disabled'; settings?: Record<string, unknown> },
): ArcadeRoomDTO {
  const row = findArcadeRoomById(db, roomId);
  if (!row) throw notFound('Oda bulunamadı.');
  assertRoomManager(db, row, userId);
  const name = fields.name !== undefined ? fields.name.trim().slice(0, 60) : row.name;
  if (name.length < 2) throw badRequest('Oda adı en az 2 karakter olmalı.');
  const settingsJson = fields.settings
    ? JSON.stringify(fields.settings)
    : row.settings_json;
  updateArcadeRoom(db, row.id, {
    name,
    status: fields.status ?? row.status,
    settingsJson,
    now: nowIso(),
  });
  return roomToDTO(
    findArcadeRoomById(db, row.id)!,
    config,
    listArcadeRoomHosts(db, row.id).map((host) => ({ id: host.user_id, name: host.display_name })),
    row.user_id === userId,
  );
}

export function updateQuizQuestions(
  db: DB,
  config: AppConfig,
  userId: string,
  roomId: string,
  questions: unknown[],
): ArcadeRoomDTO {
  const row = findArcadeRoomById(db, roomId);
  if (!row) throw notFound('Oda bulunamadı.');
  assertRoomManager(db, row, userId);
  if (row.game_key !== 'quiz') throw badRequest('Sorular yalnızca Bilgi Arenası odalarında düzenlenir.');
  const clean = sanitizeQuizQuestions(questions);
  if (questions.length > 0 && clean.length === 0) {
    throw badRequest('En az bir geçerli soru ekle. Her soruda 4 seçenek ve doğru cevap olmalı.');
  }
  let settings: Record<string, unknown> = {};
  try {
    const parsed = JSON.parse(row.settings_json) as unknown;
    if (parsed && typeof parsed === 'object') settings = parsed as Record<string, unknown>;
  } catch {
    settings = {};
  }
  if (clean.length > 0) settings.quizQuestions = clean;
  else delete settings.quizQuestions;
  updateArcadeRoom(db, row.id, {
    name: row.name,
    status: row.status,
    settingsJson: JSON.stringify(settings),
    now: nowIso(),
  });
  return roomToDTO(
    findArcadeRoomById(db, row.id)!,
    config,
    listArcadeRoomHosts(db, row.id).map((host) => ({ id: host.user_id, name: host.display_name })),
    row.user_id === userId,
  );
}

export function getPublicRoom(
  db: DB,
  config: AppConfig,
  runtime: ArcadeRuntime,
  slug: string,
): ArcadeRoomPublicDTO {
  const row = findArcadeRoomBySlug(db, slug);
  if (!row) throw notFound('Yayın odası bulunamadı.');
  const game = getArcadeGame(row.game_key);
  const owner = findUserById(db, row.user_id);
  const license = owner ? findActiveGameLicense(db, owner.id, row.game_key, nowIso()) : undefined;
  const connections = listPlatformConnectionsByRoom(db, row.id).map((connection) => ({
    platform: connection.platform,
    channel: connection.channel,
    status: connection.status,
  }));
  const publicRoom = roomToDTO(
    row,
    config,
    listArcadeRoomHosts(db, row.id).map((host) => ({ id: host.user_id, name: host.display_name })),
  );
  // Cevaplar public DTO'ya sızmasın; yalnızca panelde görünür.
  delete publicRoom.settings.quizQuestions;
  return {
    room: publicRoom,
    game,
    licensed: Boolean(license) && row.status === 'live',
    connections,
    activePlayers: runtime.getRoomSummary(row)?.players ?? 0,
  };
}

export function publicRoomRow(db: DB, slug: string): ArcadeRoomRow {
  const row = findArcadeRoomBySlug(db, slug);
  if (!row) throw notFound('Yayın odası bulunamadı.');
  return row;
}

export function roomForConnection(
  db: DB,
  userId: string,
  roomId: string,
): ArcadeRoomRow {
  const row = findArcadeRoomById(db, roomId);
  if (!row) throw notFound('Oda bulunamadı.');
  assertRoomManager(db, row, userId);
  activeGameLicenseOrThrow(db, row.user_id, row.game_key);
  return row;
}

export function addPublisherRoomHost(
  db: DB,
  userId: string,
  roomId: string,
  email: string,
): Array<{ id: string; name: string }> {
  const row = findArcadeRoomById(db, roomId);
  if (!row) throw notFound('Oda bulunamadı.');
  assertRoomOwner(row, userId);
  const invitee = findUserByEmail(db, email.trim().toLocaleLowerCase('tr'));
  if (!invitee) throw notFound('Bu e-posta ile kayıtlı bir yayıncı yok.');
  if (invitee.id === row.user_id) throw conflict('Oda sahibi zaten odanın yöneticisi.');
  if (!findArcadeRoomHost(db, roomId, invitee.id)) {
    addArcadeRoomHost(db, { id: randomId('host'), roomId, userId: invitee.id, now: nowIso() });
  }
  return listArcadeRoomHosts(db, roomId).map((host) => ({ id: host.user_id, name: host.display_name }));
}

export function removePublisherRoomHost(
  db: DB,
  userId: string,
  roomId: string,
  hostUserId: string,
): Array<{ id: string; name: string }> {
  const row = findArcadeRoomById(db, roomId);
  if (!row) throw notFound('Oda bulunamadı.');
  assertRoomOwner(row, userId);
  removeArcadeRoomHost(db, roomId, hostUserId);
  return listArcadeRoomHosts(db, roomId).map((host) => ({ id: host.user_id, name: host.display_name }));
}

export function listRoomConnections(
  db: DB,
  config: AppConfig,
  userId: string,
  roomId: string,
): PlatformConnectionDTO[] {
  roomForConnection(db, userId, roomId);
  return listPlatformConnectionsByRoom(db, roomId).map((row) => connectionToDTO(row, config));
}

export function connectPlatform(
  db: DB,
  config: AppConfig,
  userId: string,
  roomId: string,
  platform: LivePlatform,
  rawChannel: string,
): { connection: PlatformConnectionDTO; row: PlatformConnectionRow } {
  const room = roomForConnection(db, userId, roomId);
  if (!['twitch', 'youtube', 'tiktok'].includes(platform)) {
    throw badRequest('Desteklenmeyen platform.');
  }
  const channel = normalizeChannel(platform, rawChannel);
  if (!channel) throw badRequest('Kanal adı geçersiz.');
  const existing = findPlatformConnectionByRoom(db, room.id, platform);
  const now = nowIso();
  let row: PlatformConnectionRow;
  if (existing) {
    const token =
      platform === 'tiktok'
        ? existing.connector_token ?? randomId('tt').replace('tt_', '')
        : null;
    updatePlatformConnectionChannel(db, existing.id, channel, '{}', token, now);
    row = findPlatformConnectionByRoom(db, room.id, platform)!;
  } else {
    const token = platform === 'tiktok' ? randomId('tt').replace('tt_', '') : null;
    row = {
      id: randomId('conn'),
      user_id: userId,
      room_id: room.id,
      platform,
      channel,
      status: 'connecting',
      config_json: '{}',
      connector_token: token,
      last_event_at: null,
      last_error: null,
      created_at: now,
      updated_at: now,
    };
    createPlatformConnection(db, row);
  }
  return { connection: connectionToDTO(row, config), row };
}

export function removeConnection(
  db: DB,
  userId: string,
  id: string,
): PlatformConnectionRow {
  const row = db
    .prepare('SELECT * FROM platform_connections WHERE id = ?')
    .get(id) as PlatformConnectionRow | undefined;
  if (!row) throw notFound('Bağlantı bulunamadı.');
  if (row.user_id !== userId) throw forbidden('Bu bağlantı size ait değil.');
  deletePlatformConnection(db, id);
  return row;
}

export function roomSessions(db: DB, userId: string, roomId: string) {
  const row = findArcadeRoomById(db, roomId);
  if (!row) throw notFound('Oda bulunamadı.');
  assertRoomManager(db, row, userId);
  return listArcadeSessions(db, roomId);
}

function normalizeChannel(platform: LivePlatform, raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  if (platform === 'twitch') {
    const channel = value
      .replace(/^#/, '')
      .replace(/^https?:\/\/[^/]+\//i, '')
      .replace(/\/.*$/, '')
      .toLowerCase();
    return /^[a-z0-9_]{3,25}$/.test(channel) ? channel : null;
  }
  if (platform === 'youtube') {
    if (value.length > 80) return null;
    if (/^UC[A-Za-z0-9_-]{10,}$/.test(value)) return value;
    if (/^@[A-Za-z0-9._-]{2,}$/.test(value)) return value;
    if (/^[A-Za-z0-9._-]{2,}$/.test(value)) return value;
    return null;
  }
  return value.replace(/^@/, '').slice(0, 40) || null;
}

export function gameForRoom(row: ArcadeRoomRow): ArcadeGameDef {
  return getArcadeGame(row.game_key);
}

export function keyForRoom(row: ArcadeRoomRow): ArcadeKey {
  return row.game_key as ArcadeKey;
}
