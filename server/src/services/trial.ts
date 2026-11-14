import type { DB } from '../db/index.js';
import { nowIso } from '../db/index.js';
import {
  createGameLicense,
  createTrialUsage,
  findActiveGameLicense,
  findActiveTrialUsage,
  findPackageById,
  findTrialUsageForDay,
  type UserRow,
} from '../db/repo.js';
import { badRequest, conflict, notFound } from '../lib/errors.js';
import { randomId } from '../lib/tokens.js';
import { ARCADE_GAMES, isArcadeKey } from '../../../shared/arcade.js';

const TRIAL_PACKAGE_ID = 'pkg_trial';
const TRIAL_MINUTES = 30;

function istanbulDay(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Istanbul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

export interface TrialStatus {
  available: boolean;
  usedToday: boolean;
  active: boolean;
  gameKey: string | null;
  expiresAt: string | null;
  remainingSeconds: number;
  minutesPerDay: number;
}

export function getTrialStatus(db: DB, userId: string, now = nowIso()): TrialStatus {
  const time = Date.now();
  const usage = findTrialUsageForDay(db, userId, istanbulDay());
  const activeUsage = findActiveTrialUsage(db, userId, now);
  const expiresAt = activeUsage?.expires_at ?? null;
  return {
    available: !usage,
    usedToday: Boolean(usage),
    active: Boolean(activeUsage),
    gameKey: activeUsage?.game_key ?? null,
    expiresAt,
    remainingSeconds: expiresAt
      ? Math.max(0, Math.ceil((Date.parse(expiresAt) - time) / 1000))
      : 0,
    minutesPerDay: TRIAL_MINUTES,
  };
}

export function startTrial(db: DB, user: UserRow, gameKey: string): {
  license: { gameKey: string; startsAt: string; expiresAt: string };
  minutes: number;
} {
  if (!isArcadeKey(gameKey)) throw badRequest('Geçersiz oyun.');
  const now = nowIso();
  const existing = findActiveGameLicense(db, user.id, gameKey, now);
  if (existing) {
    return {
      license: { gameKey, startsAt: existing.starts_at, expiresAt: existing.expires_at },
      minutes: Math.max(0, Math.ceil((Date.parse(existing.expires_at) - Date.now()) / 60000)),
    };
  }
  const pkg = findPackageById(db, TRIAL_PACKAGE_ID);
  if (!pkg) throw notFound('Deneme paketi yapılandırılmamış.');

  const day = istanbulDay();
  const previous = findTrialUsageForDay(db, user.id, day);
  if (previous) {
    throw conflict('Bugünkü 30 dakikalık ücretsiz deneme hakkın kullanıldı. Yarın tekrar deneyebilirsin.');
  }
  const active = findActiveTrialUsage(db, user.id, now);
  if (active) {
    throw conflict(
      `Aktif deneme süren devam ediyor (${active.game_key}). Bitmesini bekle veya lisans al.`,
    );
  }

  const expiresAt = new Date(Date.now() + TRIAL_MINUTES * 60 * 1000).toISOString();
  db.transaction(() => {
    createGameLicense(db, {
      id: randomId('lic'),
      userId: user.id,
      gameKey,
      packageId: TRIAL_PACKAGE_ID,
      paymentId: null,
      startsAt: now,
      expiresAt,
      now,
    });
    createTrialUsage(db, {
      id: randomId('trial'),
      userId: user.id,
      gameKey,
      day,
      startedAt: now,
      expiresAt,
      now,
    });
  })();
  return {
    license: { gameKey, startsAt: now, expiresAt },
    minutes: TRIAL_MINUTES,
  };
}

export function trialGameName(gameKey: string): string {
  return isArcadeKey(gameKey) ? ARCADE_GAMES[gameKey].name : gameKey;
}
