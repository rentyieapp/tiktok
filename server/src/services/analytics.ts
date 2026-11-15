import type { DB } from '../db/index.js';
import { ARCADE_GAME_LIST } from '../../../shared/arcade.js';

interface UserRowLite {
  id: string;
  email: string;
  role: string;
  created_at: string;
  email_verified_at: string | null;
}
interface PaymentLite {
  user_id: string;
  amount_cents: number;
  status: string;
  created_at: string;
}
interface SessionLite {
  game_key: string;
  started_at: string;
  player_count: number;
}
interface ActivityLite {
  user_id: string;
  event: string;
  created_at: string;
}

export interface AnalyticsDailyPoint {
  date: string;
  signups: number;
  activeUsers: number;
  revenueCents: number;
  sessions: number;
}

export interface AnalyticsRetentionRow {
  cohort: string;
  size: number;
  d1: number | null;
  d7: number | null;
  d30: number | null;
}

export interface AnalyticsDTO {
  rangeDays: number;
  totals: {
    users: number;
    verifiedUsers: number;
    publishers: number;
    payingUsers: number;
    revenueCents: number;
    activeSubscriptions: number;
    gameLicenses: number;
    rooms: number;
    sessions: number;
    avgSessionPlayers: number;
  };
  conversion: number;
  daily: AnalyticsDailyPoint[];
  retention: AnalyticsRetentionRow[];
  topGames: Array<{ gameKey: string; name: string; sessions: number; players: number }>;
  recentActivity: Array<{ event: string; createdAt: string }>;
}

function dateKey(value: string | Date): string {
  return new Date(value).toISOString().slice(0, 10);
}

function daysBetween(from: string, to: string): number {
  return Math.floor((Date.parse(to) - Date.parse(from)) / 86_400_000);
}

export function getAnalytics(db: DB, rangeDays = 30): AnalyticsDTO {
  const days = Math.min(365, Math.max(7, rangeDays));
  const since = new Date(Date.now() - days * 86_400_000);
  const sinceIso = since.toISOString();

  const users = db.prepare('SELECT id, email, role, created_at, email_verified_at FROM users').all() as UserRowLite[];
  const payments = db.prepare("SELECT user_id, amount_cents, status, created_at FROM payments WHERE status = 'succeeded'").all() as PaymentLite[];
  const sessions = db.prepare('SELECT game_key, started_at, player_count FROM arcade_sessions').all() as SessionLite[];
  const activity = db.prepare('SELECT user_id, event, created_at FROM activity_events').all() as ActivityLite[];
  const subscriptionCount = Number((db.prepare("SELECT COUNT(*) AS count FROM subscriptions WHERE status = 'active' AND expires_at > ?").get(new Date().toISOString()) as { count: number | string }).count);
  const gameLicenseCount = Number((db.prepare("SELECT COUNT(*) AS count FROM game_licenses WHERE status = 'active' AND expires_at > ?").get(new Date().toISOString()) as { count: number | string }).count);
  const roomCount = Number((db.prepare('SELECT COUNT(*) AS count FROM arcade_rooms').get() as { count: number | string }).count);

  const payingUserIds = new Set(payments.map((payment) => payment.user_id));
  const activeUserIds = new Set(activity.filter((event) => event.created_at >= sinceIso).map((event) => event.user_id));
  const revenueCents = payments
    .filter((payment) => payment.created_at >= sinceIso)
    .reduce((total, payment) => total + payment.amount_cents, 0);

  const dailyMap = new Map<string, AnalyticsDailyPoint>();
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = dateKey(new Date(Date.now() - offset * 86_400_000));
    dailyMap.set(date, { date, signups: 0, activeUsers: 0, revenueCents: 0, sessions: 0 });
  }
  const dayUsers = new Map<string, Set<string>>();
  for (const user of users) {
    const key = dateKey(user.created_at);
    const point = dailyMap.get(key);
    if (point) point.signups += 1;
  }
  for (const event of activity) {
    const key = dateKey(event.created_at);
    const point = dailyMap.get(key);
    if (point) {
      const set = dayUsers.get(key) ?? new Set<string>();
      set.add(event.user_id);
      dayUsers.set(key, set);
      point.activeUsers = set.size;
    }
  }
  for (const payment of payments) {
    const point = dailyMap.get(dateKey(payment.created_at));
    if (point) point.revenueCents += payment.amount_cents;
  }
  for (const session of sessions) {
    const point = dailyMap.get(dateKey(session.started_at));
    if (point) point.sessions += 1;
  }

  const cohortMap = new Map<string, { size: number; users: string[] }>();
  for (const user of users) {
    if (user.created_at < sinceIso) continue;
    const key = dateKey(user.created_at);
    const existing = cohortMap.get(key) ?? { size: 0, users: [] };
    existing.size += 1;
    existing.users.push(user.id);
    cohortMap.set(key, existing);
  }
  const activityByUser = new Map<string, number[]>();
  for (const event of activity) {
    const list = activityByUser.get(event.user_id) ?? [];
    list.push(Date.parse(event.created_at));
    activityByUser.set(event.user_id, list);
  }
  const now = Date.now();
  const retention: AnalyticsRetentionRow[] = [...cohortMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([cohort, entry]) => {
      const cohortStart = Date.parse(`${cohort}T00:00:00.000Z`);
      const retained = (day: number) => {
        if (now - cohortStart < day * 86_400_000) return null;
        const target = cohortStart + day * 86_400_000;
        return Math.round(
          (entry.users.filter((id) =>
            (activityByUser.get(id) ?? []).some((time) => Math.floor((time - target) / 86_400_000) === 0),
          ).length /
            Math.max(1, entry.size)) *
            100,
        );
      };
      return { cohort, size: entry.size, d1: retained(1), d7: retained(7), d30: retained(30) };
    })
    .slice(-30);

  const gameAgg = new Map<string, { sessions: number; players: number }>();
  for (const session of sessions) {
    const current = gameAgg.get(session.game_key) ?? { sessions: 0, players: 0 };
    current.sessions += 1;
    current.players += session.player_count;
    gameAgg.set(session.game_key, current);
  }
  const topGames = [...gameAgg.entries()]
    .map(([gameKey, value]) => ({
      gameKey,
      name: ARCADE_GAME_LIST.find((game) => game.key === gameKey)?.name ?? gameKey,
      ...value,
    }))
    .sort((a, b) => b.sessions - a.sessions)
    .slice(0, 10);

  return {
    rangeDays: days,
    totals: {
      users: users.length,
      verifiedUsers: users.filter((user) => Boolean(user.email_verified_at)).length,
      publishers: users.filter((user) => user.role === 'publisher').length,
      payingUsers: payingUserIds.size,
      revenueCents,
      activeSubscriptions: subscriptionCount,
      gameLicenses: gameLicenseCount,
      rooms: roomCount,
      sessions: sessions.length,
      avgSessionPlayers: sessions.length
        ? Math.round((sessions.reduce((total, session) => total + session.player_count, 0) / sessions.length) * 10) / 10
        : 0,
    },
    conversion: users.length ? Math.round((payingUserIds.size / users.length) * 1000) / 10 : 0,
    daily: [...dailyMap.values()],
    retention,
    topGames,
    recentActivity: activity.slice(0, 12).map((event) => ({ event: event.event, createdAt: event.created_at })),
  };
}
