import type {
  CastleLook,
  GameSettings,
  Locale,
  SoldierLook,
  TeamConfig,
  TeamCount,
  WinCondition,
} from './types.js';

/** Yayıncıya sunulan hazır takım paleti (tamamen değiştirilebilir, marka değildir). */
export interface TeamPreset {
  key: string;
  name: string;
  primaryColor: string;
  secondaryColor: string;
  symbol: string;
  soldierLook: SoldierLook;
  castleLook: CastleLook;
  joinCommand: string;
  description: string;
}

export const TEAM_PRESETS: TeamPreset[] = [
  {
    key: 'aslan',
    name: 'Aslan',
    primaryColor: '#f59e0b',
    secondaryColor: '#dc2626',
    symbol: '🦁',
    soldierLook: 'knight',
    castleLook: 'classic',
    joinCommand: 'ASLAN',
    description: 'Sahaya kükreyerek çıkan cesur taraftarlar.',
  },
  {
    key: 'kartal',
    name: 'Kartal',
    primaryColor: '#0f172a',
    secondaryColor: '#f8fafc',
    symbol: '🦅',
    soldierLook: 'guard',
    castleLook: 'tower',
    joinCommand: 'KARTAL',
    description: 'Gökyüzünden süzülen keskin pençeler.',
  },
  {
    key: 'kurt',
    name: 'Kurt',
    primaryColor: '#64748b',
    secondaryColor: '#0ea5e9',
    symbol: '🐺',
    soldierLook: 'warrior',
    castleLook: 'fortress',
    joinCommand: 'KURT',
    description: 'Sürü halinde avlanan soğukkanlı savaşçılar.',
  },
  {
    key: 'kaplan',
    name: 'Kaplan',
    primaryColor: '#f97316',
    secondaryColor: '#111827',
    symbol: '🐯',
    soldierLook: 'archer',
    castleLook: 'classic',
    joinCommand: 'KAPLAN',
    description: 'Saldırıdan bir an bile vazgeçmeyen avcılar.',
  },
  {
    key: 'ejder',
    name: 'Ejder',
    primaryColor: '#16a34a',
    secondaryColor: '#facc15',
    symbol: '🐉',
    soldierLook: 'knight',
    castleLook: 'fortress',
    joinCommand: 'EJDER',
    description: 'Alevler içinden yükselen efsanevi güç.',
  },
  {
    key: 'ayi',
    name: 'Ayı',
    primaryColor: '#92400e',
    secondaryColor: '#fde68a',
    symbol: '🐻',
    soldierLook: 'warrior',
    castleLook: 'tower',
    joinCommand: 'AYI',
    description: 'Kalesini asla terk etmeyen ağır ve güçlü savunmacılar.',
  },
  {
    key: 'kobra',
    name: 'Kobra',
    primaryColor: '#0d9488',
    secondaryColor: '#f0fdfa',
    symbol: '🐍',
    soldierLook: 'archer',
    castleLook: 'tower',
    joinCommand: 'KOBRA',
    description: 'Zehrini sabırla biriktiren sessiz avcılar.',
  },
  {
    key: 'akrep',
    name: 'Akrep',
    primaryColor: '#7c3aed',
    secondaryColor: '#f9a8d4',
    symbol: '🦂',
    soldierLook: 'guard',
    castleLook: 'fortress',
    joinCommand: 'AKREP',
    description: 'Kalesini zırh gibi ören mor savaşçılar.',
  },
];

export const SYMBOL_OPTIONS = [
  '🦁', '🐯', '🐺', '🦅', '🦈', '🐉', '🐻', '🦂', '🐍', '🦄',
  '🐎', '🦌', '🐗', '🦉', '🐙', '🔥', '⚡', '⚔️', '🛡️', '👑',
  '⭐', '💎', '🚀', '🌪️',
];

export const SOLDIER_LOOK_LABELS: Record<SoldierLook, string> = {
  knight: 'Şövalye',
  warrior: 'Savaşçı',
  archer: 'Okçu',
  guard: 'Muhafız',
};

export const CASTLE_LOOK_LABELS: Record<CastleLook, string> = {
  classic: 'Klasik kale',
  tower: 'Yüksek kule',
  fortress: 'Geniş hisar',
};

export const WIN_CONDITION_LABELS: Record<WinCondition, { title: string; description: string }> = {
  last_standing: {
    title: 'Son ayakta kalan',
    description: 'Rakip kaleleri yık; ayakta kalan son takım kazanır.',
  },
  highest_castle_hp: {
    title: 'En sağlam kale',
    description: 'Süre bitince kalesi en yüksek cana sahip takım kazanır.',
  },
  highest_score: {
    title: 'En yüksek skor',
    description: 'Süre boyunca en çok hasar veren takım kazanır.',
  },
};

export const DEFAULT_SETTINGS: GameSettings = {
  roundDurationSec: 90,
  startingSoldiers: 20,
  soldierProductionRate: 2,
  castleHp: 1000,
  attackPower: 5,
  defensePower: 5,
  joinSoldierBonus: 5,
  playerAttackBonusPercent: 4,
  giftAttackDamage: 120,
  likeShieldStrength: 0.08,
  likeShieldDurationSec: 12,
  commentSoldierBonus: 3,
  enableGifts: true,
  enableLikes: true,
  enableComments: true,
  winCondition: 'last_standing',
  commandCooldownMs: 1200,
  maxPlayersPerTeam: 100,
};

export interface SettingRange {
  min: number;
  max: number;
  step: number;
  unit?: string;
}

export const SETTING_RANGES: Record<string, SettingRange> = {
  roundDurationSec: { min: 30, max: 300, step: 5, unit: 'sn' },
  startingSoldiers: { min: 5, max: 100, step: 1 },
  soldierProductionRate: { min: 0.5, max: 10, step: 0.5, unit: 'asker/sn' },
  castleHp: { min: 200, max: 5000, step: 50 },
  attackPower: { min: 1, max: 20, step: 1 },
  defensePower: { min: 0, max: 20, step: 1 },
  joinSoldierBonus: { min: 0, max: 20, step: 1 },
  playerAttackBonusPercent: { min: 0, max: 10, step: 1, unit: '%' },
  giftAttackDamage: { min: 0, max: 500, step: 10 },
  likeShieldStrength: { min: 0, max: 0.5, step: 0.01 },
  likeShieldDurationSec: { min: 0, max: 30, step: 1, unit: 'sn' },
  commentSoldierBonus: { min: 0, max: 20, step: 1 },
  commandCooldownMs: { min: 0, max: 10000, step: 100, unit: 'ms' },
  maxPlayersPerTeam: { min: 0, max: 500, step: 10 },
};

export function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const number = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

/** DB'den/istemciden gelen ayarları güvenli sınırlara çeker. */
export function clampSettings(input: Partial<GameSettings> | null | undefined): GameSettings {
  const source = input ?? {};
  const bool = (value: unknown, fallback: boolean) => (typeof value === 'boolean' ? value : fallback);
  const result: GameSettings = {
    roundDurationSec: Math.round(
      clampNumber(source.roundDurationSec, SETTING_RANGES.roundDurationSec.min, SETTING_RANGES.roundDurationSec.max, DEFAULT_SETTINGS.roundDurationSec),
    ),
    startingSoldiers: Math.round(
      clampNumber(source.startingSoldiers, SETTING_RANGES.startingSoldiers.min, SETTING_RANGES.startingSoldiers.max, DEFAULT_SETTINGS.startingSoldiers),
    ),
    soldierProductionRate: clampNumber(
      source.soldierProductionRate,
      SETTING_RANGES.soldierProductionRate.min,
      SETTING_RANGES.soldierProductionRate.max,
      DEFAULT_SETTINGS.soldierProductionRate,
    ),
    castleHp: Math.round(clampNumber(source.castleHp, SETTING_RANGES.castleHp.min, SETTING_RANGES.castleHp.max, DEFAULT_SETTINGS.castleHp)),
    attackPower: Math.round(clampNumber(source.attackPower, SETTING_RANGES.attackPower.min, SETTING_RANGES.attackPower.max, DEFAULT_SETTINGS.attackPower)),
    defensePower: Math.round(clampNumber(source.defensePower, SETTING_RANGES.defensePower.min, SETTING_RANGES.defensePower.max, DEFAULT_SETTINGS.defensePower)),
    joinSoldierBonus: Math.round(
      clampNumber(source.joinSoldierBonus, SETTING_RANGES.joinSoldierBonus.min, SETTING_RANGES.joinSoldierBonus.max, DEFAULT_SETTINGS.joinSoldierBonus),
    ),
    playerAttackBonusPercent: Math.round(
      clampNumber(
        source.playerAttackBonusPercent,
        SETTING_RANGES.playerAttackBonusPercent.min,
        SETTING_RANGES.playerAttackBonusPercent.max,
        DEFAULT_SETTINGS.playerAttackBonusPercent,
      ),
    ),
    giftAttackDamage: Math.round(
      clampNumber(source.giftAttackDamage, SETTING_RANGES.giftAttackDamage.min, SETTING_RANGES.giftAttackDamage.max, DEFAULT_SETTINGS.giftAttackDamage),
    ),
    likeShieldStrength: clampNumber(
      source.likeShieldStrength,
      SETTING_RANGES.likeShieldStrength.min,
      SETTING_RANGES.likeShieldStrength.max,
      DEFAULT_SETTINGS.likeShieldStrength,
    ),
    likeShieldDurationSec: Math.round(
      clampNumber(source.likeShieldDurationSec, SETTING_RANGES.likeShieldDurationSec.min, SETTING_RANGES.likeShieldDurationSec.max, DEFAULT_SETTINGS.likeShieldDurationSec),
    ),
    commentSoldierBonus: Math.round(
      clampNumber(source.commentSoldierBonus, SETTING_RANGES.commentSoldierBonus.min, SETTING_RANGES.commentSoldierBonus.max, DEFAULT_SETTINGS.commentSoldierBonus),
    ),
    enableGifts: bool(source.enableGifts, DEFAULT_SETTINGS.enableGifts),
    enableLikes: bool(source.enableLikes, DEFAULT_SETTINGS.enableLikes),
    enableComments: bool(source.enableComments, DEFAULT_SETTINGS.enableComments),
    winCondition:
      source.winCondition === 'highest_castle_hp' ||
      source.winCondition === 'highest_score' ||
      source.winCondition === 'last_standing'
        ? source.winCondition
        : DEFAULT_SETTINGS.winCondition,
    commandCooldownMs: Math.round(
      clampNumber(source.commandCooldownMs, SETTING_RANGES.commandCooldownMs.min, SETTING_RANGES.commandCooldownMs.max, DEFAULT_SETTINGS.commandCooldownMs),
    ),
    maxPlayersPerTeam: Math.round(
      clampNumber(source.maxPlayersPerTeam, SETTING_RANGES.maxPlayersPerTeam.min, SETTING_RANGES.maxPlayersPerTeam.max, DEFAULT_SETTINGS.maxPlayersPerTeam),
    ),
  };
  return result;
}

const FALLBACK_COLORS: Array<[string, string]> = [
  ['#f59e0b', '#dc2626'],
  ['#0f172a', '#f8fafc'],
  ['#64748b', '#0ea5e9'],
  ['#f97316', '#111827'],
  ['#16a34a', '#facc15'],
  ['#92400e', '#fde68a'],
  ['#0d9488', '#f0fdfa'],
  ['#7c3aed', '#f9a8d4'],
];

export function isHexColor(value: unknown): value is string {
  return typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value);
}

export function makeDefaultTeams(teamCount: TeamCount, locale: Locale = 'tr'): TeamConfig[] {
  const teams: TeamConfig[] = [];
  for (let index = 0; index < teamCount; index += 1) {
    const preset = TEAM_PRESETS[index % TEAM_PRESETS.length];
    const [primary, secondary] = FALLBACK_COLORS[index % FALLBACK_COLORS.length];
    teams.push({
      slot: index + 1,
      name: preset?.name ?? `Takım ${index + 1}`,
      primaryColor: preset?.primaryColor ?? primary,
      secondaryColor: preset?.secondaryColor ?? secondary,
      emblemUrl: null,
      symbol: preset?.symbol ?? '⭐',
      soldierLook: preset?.soldierLook ?? 'knight',
      castleLook: preset?.castleLook ?? 'classic',
      joinCommand: (preset?.joinCommand ?? `TAKIM${index + 1}`).toLocaleUpperCase(locale === 'tr' ? 'tr-TR' : 'en-US'),
      description: preset?.description ?? '',
    });
  }
  return teams;
}

/** Türkçe karakterleri koruyarak URL-güvenli slug üretir. */
export function slugifyBase(input: string): string {
  const replacements: Record<string, string> = {
    ı: 'i', İ: 'i', ş: 's', Ş: 's', ğ: 'g', Ğ: 'g', ü: 'u', Ü: 'u', ö: 'o', Ö: 'o', ç: 'c', Ç: 'c',
    â: 'a', î: 'i', û: 'u',
  };
  const ascii = (input ?? '')
    .split('')
    .map((char) => replacements[char] ?? char)
    .join('')
    .normalize('NFKD')
    .replace(/\p{M}+/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32)
    .replace(/-+$/g, '');
  return ascii || 'yayinci';
}

export function composePublicSlug(base: string, token: string): string {
  const cleanBase = slugifyBase(base);
  return `${cleanBase}-${token}`;
}

/** Panelde ve oyun ekranında kullanılan genel para biçimi. */
export function formatPrice(cents: number, currency = 'TRY', locale = 'tr-TR'): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency}`;
  }
}

export function formatDuration(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function defaultSettingsForTeamCount(_teamCount: TeamCount): GameSettings {
  return { ...DEFAULT_SETTINGS };
}
