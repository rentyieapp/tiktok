import { ARCADE_GAMES, type ArcadeKey } from './arcade.js';

export type ArcadeLocale = 'tr' | 'en' | 'es' | 'de' | 'fr';

export interface ArcadeCommandSettings {
  join: string;
  leave: string;
  red: string;
  blue: string;
  girls: string;
  boys: string;
  requireJoin: boolean;
}

export interface ArcadeRoomSettings {
  language: ArcadeLocale;
  commands: ArcadeCommandSettings;
}

export const ARCADE_LOCALES: Array<{ code: ArcadeLocale; label: string; flag: string }> = [
  { code: 'tr', label: 'Türkçe', flag: '🇹🇷' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
];

export const DEFAULT_ARCADE_COMMANDS: Record<ArcadeLocale, ArcadeCommandSettings> = {
  tr: { join: 'katıl', leave: 'ayrıl', red: 'kırmızı', blue: 'mavi', girls: 'kızlar', boys: 'erkekler', requireJoin: false },
  en: { join: 'join', leave: 'leave', red: 'red', blue: 'blue', girls: 'girls', boys: 'boys', requireJoin: false },
  es: { join: 'unirse', leave: 'salir', red: 'rojo', blue: 'azul', girls: 'chicas', boys: 'chicos', requireJoin: false },
  de: { join: 'beitreten', leave: 'verlassen', red: 'rot', blue: 'blau', girls: 'mädchen', boys: 'jungen', requireJoin: false },
  fr: { join: 'rejoindre', leave: 'quitter', red: 'rouge', blue: 'bleu', girls: 'filles', boys: 'garçons', requireJoin: false },
};

export const ARCADE_COMMAND_KEYS = ['join', 'leave', 'red', 'blue', 'girls', 'boys'] as const;
export type ArcadeCommandKey = (typeof ARCADE_COMMAND_KEYS)[number];

export function normalizeArcadeCommand(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase('tr')
    .replace(/^[!/#]+/, '')
    .replace(/\s+/g, ' ');
}

export function sanitizeArcadeRoomSettings(value: unknown): ArcadeRoomSettings {
  const raw = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  const locale = ARCADE_LOCALES.some((entry) => entry.code === raw.language)
    ? (raw.language as ArcadeLocale)
    : 'tr';
  const defaults = DEFAULT_ARCADE_COMMANDS[locale];
  const rawCommands =
    raw.commands && typeof raw.commands === 'object'
      ? (raw.commands as Record<string, unknown>)
      : {};
  const commands = { ...defaults };
  for (const key of ARCADE_COMMAND_KEYS) {
    const valueForKey = rawCommands[key];
    if (typeof valueForKey === 'string' && valueForKey.trim().length > 0) {
      commands[key] = valueForKey.trim().slice(0, 24);
    }
  }
  commands.requireJoin = rawCommands.requireJoin === true;
  return { language: locale, commands };
}

/** Yorum metnini yayıncının belirlediği komutlarla eşleştirir. */
export function matchArcadeCommand(
  text: string,
  commands: ArcadeCommandSettings,
): ArcadeCommandKey | null {
  const normalized = normalizeArcadeCommand(text);
  if (!normalized) return null;
  for (const key of ARCADE_COMMAND_KEYS) {
    if (normalizeArcadeCommand(commands[key]) === normalized) return key;
  }
  return null;
}

export function commandAppliesToGame(command: ArcadeCommandKey, gameKey: ArcadeKey): boolean {
  if (command === 'join' || command === 'leave') return true;
  if (command === 'red' || command === 'blue') {
    return ARCADE_GAMES[gameKey].mode === 'tug';
  }
  return ARCADE_GAMES[gameKey].mode === 'versus';
}
