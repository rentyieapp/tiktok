import { SYSTEM_COMMANDS, type GameDTO, type GameProductDTO, type Locale, type PackageDTO, type PaymentDTO, type SubscriptionDTO, type TeamDTO, type UserDTO } from '../../../shared/types.js';
import { clampSettings } from '../../../shared/defaults.js';
import type { SystemCommand } from '../../../shared/types.js';
import type {
  GameProductRow,
  GameRow,
  PackageRow,
  PaymentRow,
  SubscriptionRow,
  TeamRow,
  UserRow,
} from '../db/repo.js';

export function safeJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function parseOverrides(value: string | null | undefined): Partial<Record<SystemCommand, string>> {
  const raw = safeJson<Record<string, unknown>>(value, {});
  const result: Partial<Record<SystemCommand, string>> = {};
  for (const action of SYSTEM_COMMANDS) {
    const candidate = raw[action];
    if (typeof candidate === 'string' && candidate.trim().length > 0 && candidate.length <= 32) {
      result[action] = candidate.trim();
    }
  }
  return result;
}

export function rowToTeam(row: TeamRow): TeamDTO {
  return {
    id: row.id,
    slot: row.slot,
    name: row.name,
    primaryColor: row.primary_color,
    secondaryColor: row.secondary_color,
    emblemUrl: row.emblem_url,
    symbol: row.symbol,
    soldierLook: row.soldier_look as TeamDTO['soldierLook'],
    castleLook: row.castle_look as TeamDTO['castleLook'],
    joinCommand: row.join_command,
    description: row.description,
  };
}

export function rowToGame(row: GameRow, teams: TeamRow[]): GameDTO {
  return {
    id: row.id,
    publicSlug: row.public_slug,
    gameName: row.game_name,
    language: row.language as Locale,
    teamCount: row.team_count,
    settings: clampSettings(safeJson(row.settings_json, {})),
    teams: teams.map(rowToTeam).sort((a, b) => a.slot - b.slot),
    configVersion: row.config_version,
    wizardCompleted: row.wizard_completed === 1,
    liveEnabled: row.live_enabled === 1,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function rowToUser(row: UserRow): UserDTO {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    role: row.role,
    status: row.status,
    emailVerified: Boolean(row.email_verified_at),
    createdAt: row.created_at,
  };
}

export function rowToPackage(row: PackageRow): PackageDTO {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    tagline: row.tagline,
    description: row.description,
    priceCents: row.price_cents,
    currency: row.currency,
    maxTeams: row.max_teams,
    durationDays: row.duration_days,
    features: safeJson<string[]>(row.features_json, []),
    highlight: row.highlight === 1,
    sortOrder: row.sort_order,
    shopierUrl: row.shopier_url,
    isActive: row.is_active === 1,
    gameKey: row.game_key,
  };
}

export function rowToGameProduct(row: GameProductRow): GameProductDTO {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    category: row.category,
    tagline: row.tagline,
    description: row.description,
    symbol: row.symbol,
    coverUrl: row.cover_url,
    status: row.status,
    engineKey: row.engine_key,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function rowToSubscription(row: SubscriptionRow, pkg: PackageRow): SubscriptionDTO {
  return {
    status: row.status,
    packageId: row.package_id,
    packageName: pkg.name,
    maxTeams: pkg.max_teams,
    startsAt: row.starts_at,
    expiresAt: row.expires_at,
  };
}

export function rowToPayment(row: PaymentRow, packageName: string): PaymentDTO {
  return {
    id: row.id,
    packageId: row.package_id,
    packageName,
    provider: row.provider as PaymentDTO['provider'],
    amountCents: row.amount_cents,
    currency: row.currency,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function subscriptionIsActive(row: SubscriptionRow | undefined, now = Date.now()): boolean {
  if (!row || row.status !== 'active') return false;
  const expires = Date.parse(row.expires_at);
  return Number.isFinite(expires) && expires > now;
}
