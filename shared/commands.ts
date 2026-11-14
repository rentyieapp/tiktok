import {
  COMMAND_DICTIONARY,
  SYSTEM_COMMAND_ORDER,
  defaultPhrasesFor,
  systemCommandLabel,
} from './languages.js';
import {
  LOCALES,
  SYSTEM_COMMANDS,
  type CommandSheet,
  type Locale,
  type SystemCommand,
  type TeamConfig,
  type WsNoticeCode,
} from './types.js';

export const COMMAND_PREFIX = '!';

/**
 * Komut normalizasyonu.
 *
 * - Türkçe I / İ / ı ayrımı tek harfe indirilir (GİR, GIR, gir aynıdır).
 * - Aksanlar (é, ñ, ü ...) ayrıştırılıp atılır.
 * - Almanca ß, İskandinav ø/æ gibi özel harfler sadeleştirilir.
 * - Noktalama ve fazla boşluklar temizlenir.
 * - "!" veya "/" öneki kabul edilir.
 */
export function normalizePhrase(input: string): string {
  if (!input) return '';
  let value = input.normalize('NFKD').replace(/\p{M}+/gu, '');
  value = value
    .replace(/[İIı]/g, 'i')
    .replace(/ß/g, 'ss')
    .replace(/[Øø]/g, 'o')
    .replace(/[Łł]/g, 'l')
    .replace(/[Đđ]/g, 'd')
    .replace(/[Ææ]/g, 'ae')
    .replace(/[Œœ]/g, 'oe')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s_-]+/gu, ' ')
    .replace(/[\s_-]+/g, ' ')
    .trim();
  return value;
}

export function stripCommandPrefix(input: string): string {
  const trimmed = (input ?? '').trim();
  if (trimmed.startsWith('!') || trimmed.startsWith('/')) return trimmed.slice(1).trim();
  return trimmed;
}

export function tokenizeCommand(input: string): string[] {
  const normalized = normalizePhrase(stripCommandPrefix(input));
  return normalized.length ? normalized.split(' ') : [];
}

export type SystemOverrideMap = Partial<Record<SystemCommand, string>>;

export interface EffectiveSystemCommand {
  action: SystemCommand;
  label: string;
  command: string;
  phrases: string[];
  isCustom: boolean;
}

/**
 * Etkin sistem komutları: yayıncının özel yazımı varsa o, yoksa seçili dilin
 * varsayılan yazımları kullanılır. İşlem kimliği (action) asla değişmez.
 */
export function effectiveSystemCommands(
  language: Locale,
  overrides: SystemOverrideMap = {},
): Record<SystemCommand, EffectiveSystemCommand> {
  const result = {} as Record<SystemCommand, EffectiveSystemCommand>;
  for (const action of SYSTEM_COMMANDS) {
    const custom = overrides[action]?.trim();
    const defaults = defaultPhrasesFor(language, action);
    result[action] = {
      action,
      label: systemCommandLabel(language, action),
      command: custom && custom.length > 0 ? custom : defaults[0],
      phrases: custom && custom.length > 0 ? [custom] : [...defaults],
      isCustom: Boolean(custom && custom.length > 0),
    };
  }
  return result;
}

/** Tüm dillerdeki tüm varsayılan komutlar (rezerve kelimeler). */
export const ALL_DEFAULT_COMMANDS: ReadonlySet<string> = new Set(
  LOCALES.flatMap((locale) =>
    SYSTEM_COMMANDS.flatMap((action) =>
      COMMAND_DICTIONARY[locale][action].phrases.map((phrase) => normalizePhrase(phrase)),
    ),
  ),
);

export function buildCommandSheet(
  language: Locale,
  teams: Array<Pick<TeamConfig, 'slot' | 'name' | 'joinCommand' | 'primaryColor'>>,
  overrides: SystemOverrideMap = {},
): CommandSheet {
  const effective = effectiveSystemCommands(language, overrides);
  return {
    language,
    prefix: COMMAND_PREFIX,
    system: SYSTEM_COMMAND_ORDER.map((action) => ({
      action,
      label: effective[action].label,
      command: effective[action].command,
      isCustom: effective[action].isCustom,
    })),
    teams: teams.map((team) => ({
      slot: team.slot,
      teamName: team.name,
      color: team.primaryColor,
      command: team.joinCommand,
    })),
  };
}

export function findTeamByToken(
  token: string | undefined,
  teams: Array<Pick<TeamConfig, 'slot' | 'name' | 'joinCommand'>>,
): Pick<TeamConfig, 'slot' | 'name' | 'joinCommand'> | undefined {
  if (!token) return undefined;
  const normalized = normalizePhrase(token);
  if (!normalized) return undefined;
  // "1" gibi sayısal token'lar takım sırasına da işaret edebilir.
  if (/^\d+$/.test(normalized)) {
    const bySlot = teams.find((team) => team.slot === Number(normalized));
    if (bySlot) return bySlot;
  }
  return teams.find(
    (team) =>
      normalizePhrase(team.joinCommand) === normalized || normalizePhrase(team.name) === normalized,
  );
}

export interface ParsedCommand {
  action: SystemCommand | 'UNKNOWN';
  /** JOIN_TEAM / CHANGE_TEAM için komuttan sonraki takım ifadesi. */
  teamToken?: string;
  /** Doğrudan takım komutu yazıldıysa (örn. "!aslan"). */
  impliedTeamSlot?: number;
  raw: string;
  /** Eşleşen sistem komutunun normalize edilmiş yazımı. */
  matchedPhrase?: string;
}

/**
 * Kullanıcı metnini sistem işlemine çevirir. Dil/komut yazımı yalnızca
 * eşleştirme katmanıdır; motor her zaman aynı işlemi çalıştırır.
 */
export function parseCommand(
  input: string,
  language: Locale,
  teams: Array<Pick<TeamConfig, 'slot' | 'name' | 'joinCommand'>>,
  overrides: SystemOverrideMap = {},
): ParsedCommand {
  const raw = stripCommandPrefix(input);
  const tokens = tokenizeCommand(raw);
  if (tokens.length === 0) return { action: 'UNKNOWN', raw };

  const first = tokens[0];
  const rest = tokens.slice(1).join(' ');
  const effective = effectiveSystemCommands(language, overrides);

  // 1) Sistem komutları her zaman önceliklidir.
  for (const action of SYSTEM_COMMANDS) {
    const phrases = effective[action].phrases.map(normalizePhrase);
    if (phrases.includes(first)) {
      if (action === 'JOIN_TEAM' || action === 'CHANGE_TEAM') {
        return { action, teamToken: rest || undefined, raw, matchedPhrase: first };
      }
      return { action, raw, matchedPhrase: first };
    }
  }

  // 2) Doğrudan takım komutu ("!aslan" gibi) JOIN_TEAM sayılır.
  const directTeam = teams.find((team) => normalizePhrase(team.joinCommand) === first);
  if (directTeam) {
    return { action: 'JOIN_TEAM', impliedTeamSlot: directTeam.slot, raw, matchedPhrase: first };
  }

  return { action: 'UNKNOWN', raw };
}

/* ------------------------------------------------------------------ */
/* Doğrulama                                                           */
/* ------------------------------------------------------------------ */

export interface CommandIssue {
  field: string;
  code: string;
  message: string;
}

const COMMAND_PATTERN = /^[\p{L}\p{N}][\p{L}\p{N}_-]{1,23}$/u;

function isValidCommandShape(original: string): boolean {
  const normalized = normalizePhrase(original);
  if (!normalized) return false;
  const compact = normalized.replace(/\s+/g, '-');
  return COMMAND_PATTERN.test(compact.replace(/\s/g, '')) && COMMAND_PATTERN.test(original.trim().replace(/\s+/g, ''));
}

/** Yayıncının girdiği komut yazımını güvenli/karşılaştırılabilir hale getirir. */
export function canonicalCommand(original: string): string {
  return normalizePhrase(original).replace(/\s+/g, '');
}

interface ValidateCommandConfigInput {
  language: Locale;
  overrides?: SystemOverrideMap;
  teams: Array<Pick<TeamConfig, 'slot' | 'name' | 'joinCommand'>>;
}

/**
 * Sistem komutları ve takım komutları arasında çakışma kontrolü.
 * Aynı normalize edilmiş yazım iki farklı işleve bağlanamaz.
 */
export function validateCommandConfig({
  language,
  overrides = {},
  teams,
}: ValidateCommandConfigInput): CommandIssue[] {
  const issues: CommandIssue[] = [];
  const effective = effectiveSystemCommands(language, overrides);

  // 1) Sistem komutu özelleştirmeleri.
  const systemOwners = new Map<string, SystemCommand>();
  for (const action of SYSTEM_COMMANDS) {
    const entry = effective[action];
    const phrase = entry.command;
    if (!phrase || !phrase.trim()) {
      issues.push({
        field: `system.${action}`,
        code: 'COMMAND_EMPTY',
        message: `${entry.label} komutu boş olamaz.`,
      });
      continue;
    }
    if (entry.isCustom && !isValidCommandShape(phrase)) {
      issues.push({
        field: `system.${action}`,
        code: 'COMMAND_INVALID',
        message: `${entry.label} komutu 2-24 karakter olmalı; harf, rakam, alt çizgi ve tire kullanabilirsin.`,
      });
      continue;
    }
    const canonical = canonicalCommand(phrase);
    if (ALL_DEFAULT_COMMANDS.has(canonical) && !defaultPhrasesFor(language, action).map(canonicalCommand).includes(canonical)) {
      issues.push({
        field: `system.${action}`,
        code: 'COMMAND_RESERVED',
        message: `"${phrase}" başka bir sistem komutuyla çakışıyor.`,
      });
      continue;
    }
    if (!entry.isCustom && !overrides[action]) {
      // Varsayılanlar kendi aralarında çakışmaz; yine de kaydet.
    }
    const owner = systemOwners.get(canonical);
    if (owner && owner !== action) {
      issues.push({
        field: `system.${action}`,
        code: 'COMMAND_CONFLICT',
        message: `"${phrase}" komutu hem ${effective[owner].label} hem ${entry.label} için kullanılamaz.`,
      });
      continue;
    }
    systemOwners.set(canonical, action);
  }

  // Farklı aksiyonların varsayılan yazımları arasında da çakışma olmasın.
  if (issues.length === 0) {
    const seen = new Map<string, SystemCommand>();
    for (const action of SYSTEM_COMMANDS) {
      for (const phrase of effective[action].phrases) {
        const canonical = canonicalCommand(phrase);
        const owner = seen.get(canonical);
        if (owner && owner !== action) {
          issues.push({
            field: `system.${action}`,
            code: 'COMMAND_CONFLICT',
            message: `"${phrase}" aynı anda iki sisteme bağlanamaz.`,
          });
        }
        seen.set(canonical, action);
      }
    }
  }

  // 2) Takım adları ve takım komutları.
  const teamNameSeen = new Map<string, number>();
  const teamCommandSeen = new Map<string, number>();

  for (const team of teams) {
    const label = `Takım ${team.slot}`;
    const name = (team.name ?? '').trim();
    if (!name) {
      issues.push({ field: `teams.${team.slot}.name`, code: 'TEAM_NAME_EMPTY', message: `${label} adı boş olamaz.` });
    } else {
      const canonicalName = canonicalCommand(name);
      if (teamNameSeen.has(canonicalName)) {
        issues.push({
          field: `teams.${team.slot}.name`,
          code: 'TEAM_NAME_DUPLICATE',
          message: `"${name}" adı başka bir takımda da kullanılıyor.`,
        });
      }
      teamNameSeen.set(canonicalName, team.slot);
      if (ALL_DEFAULT_COMMANDS.has(canonicalName) || systemOwners.has(canonicalName)) {
        issues.push({
          field: `teams.${team.slot}.name`,
          code: 'TEAM_NAME_RESERVED',
          message: `"${name}" bir sistem komutuyla çakışıyor. Takım adını değiştir.`,
        });
      }
    }

    const command = (team.joinCommand ?? '').trim();
    if (!command) {
      issues.push({
        field: `teams.${team.slot}.joinCommand`,
        code: 'COMMAND_EMPTY',
        message: `${label} için katılma komutu boş olamaz.`,
      });
      continue;
    }
    if (!isValidCommandShape(command)) {
      issues.push({
        field: `teams.${team.slot}.joinCommand`,
        code: 'COMMAND_INVALID',
        message: `"${command}" geçersiz. 2-24 karakter; boşluk yerine tire kullanabilirsin.`,
      });
      continue;
    }
    const canonical = canonicalCommand(command);
    if (ALL_DEFAULT_COMMANDS.has(canonical) || systemOwners.has(canonical)) {
      issues.push({
        field: `teams.${team.slot}.joinCommand`,
        code: 'COMMAND_RESERVED',
        message: `"${command}" sistem komutlarından biriyle çakışıyor. Başka bir komut seç.`,
      });
      continue;
    }
    if (teamNameSeen.has(canonical) && canonical !== canonicalCommand(name)) {
      issues.push({
        field: `teams.${team.slot}.joinCommand`,
        code: 'COMMAND_CONFLICT',
        message: `"${command}" başka bir takımın adıyla çakışıyor.`,
      });
    }
    if (teamCommandSeen.has(canonical)) {
      issues.push({
        field: `teams.${team.slot}.joinCommand`,
        code: 'COMMAND_DUPLICATE',
        message: `"${command}" komutu zaten Takım ${teamCommandSeen.get(canonical)} tarafından kullanılıyor.`,
      });
    } else {
      teamCommandSeen.set(canonical, team.slot);
    }
  }

  // Takım adları birbirinin komutuyla çakışmasın (takım adıyla katılım destekleniyor).
  for (const team of teams) {
    const canonicalName = canonicalCommand(team.name ?? '');
    const owner = teamCommandSeen.get(canonicalName);
    if (owner && owner !== team.slot) {
      issues.push({
        field: `teams.${team.slot}.name`,
        code: 'TEAM_NAME_CONFLICT',
        message: `"${team.name}" adı Takım ${owner} komutuyla çakışıyor.`,
      });
    }
  }

  return issues;
}

/** Kullanıcıya gösterilecek, dil bazlı kısa bildirim metinleri. */
export function noticeText(
  code: WsNoticeCode,
  locale: Locale,
  ctx: { teamName?: string } = {},
): string {
  const team = ctx.teamName ?? '';
  const messages: Record<Locale, Partial<Record<WsNoticeCode, string>>> = {
    tr: {
      TEAM_REQUIRED: 'Hangi takıma katılmak istediğini yaz. Örnek: !gir Aslan',
      TEAM_NOT_FOUND: 'Böyle bir takım bulunamadı. Takım adını veya komutunu kontrol et.',
      ALREADY_IN_TEAM: `Zaten ${team} takımındasın.`,
      NOT_IN_TEAM: 'Şu anda bir takımda değilsin.',
      USE_CHANGE_TEAM: `Başka bir takıma geçmek için takım değiştir komutunu kullan.`,
      UNKNOWN_COMMAND: 'Komut anlaşılmadı. Tüm komutlar için !yardim yaz.',
      RATE_LIMITED: 'Çok hızlı komut gönderiyorsun. Biraz bekle.',
      TEAM_FULL: 'Bu takım doldu. Başka bir takım seç.',
      MATCH_NOT_RUNNING: 'Maç henüz başlamadı. Katılmak için lobide bekleyebilirsin.',
      JOINED: `${team} takımına katıldın!`,
      LEFT: 'Takımdan ayrıldın.',
      SWITCHED: `${team} takımına geçtin.`,
      COMMAND_DISABLED: 'Bu destek türü şu anda kapalı.',
    },
    en: {
      TEAM_REQUIRED: 'Tell me which team to join. Example: !join Lions',
      TEAM_NOT_FOUND: 'Team not found. Check the team name or command.',
      ALREADY_IN_TEAM: `You are already on ${team}.`,
      NOT_IN_TEAM: 'You are not on a team right now.',
      USE_CHANGE_TEAM: 'Use the switch team command to move to another team.',
      UNKNOWN_COMMAND: 'Command not understood. Type !help for all commands.',
      RATE_LIMITED: 'You are sending commands too fast. Wait a moment.',
      TEAM_FULL: 'That team is full. Pick another one.',
      MATCH_NOT_RUNNING: 'The match has not started yet. You can wait in the lobby.',
      JOINED: `You joined ${team}!`,
      LEFT: 'You left your team.',
      SWITCHED: `You switched to ${team}.`,
      COMMAND_DISABLED: 'This support type is currently disabled.',
    },
    es: {
      TEAM_REQUIRED: 'Dime a qué equipo unirte. Ejemplo: !entrar Leones',
      TEAM_NOT_FOUND: 'Equipo no encontrado. Revisa el nombre o el comando.',
      ALREADY_IN_TEAM: `Ya estás en ${team}.`,
      NOT_IN_TEAM: 'No estás en ningún equipo.',
      USE_CHANGE_TEAM: 'Usa el comando de cambio de equipo para moverte.',
      UNKNOWN_COMMAND: 'Comando no reconocido. Escribe !ayuda para ver todos.',
      RATE_LIMITED: 'Envías comandos demasiado rápido. Espera un momento.',
      TEAM_FULL: 'Ese equipo está lleno. Elige otro.',
      MATCH_NOT_RUNNING: 'La partida aún no ha comenzado.',
      JOINED: `¡Te uniste a ${team}!`,
      LEFT: 'Has salido de tu equipo.',
      SWITCHED: `Has cambiado a ${team}.`,
      COMMAND_DISABLED: 'Este tipo de apoyo está desactivado.',
    },
    de: {
      TEAM_REQUIRED: 'Sag mir, welchem Team du beitreten willst. Beispiel: !beitreten Löwen',
      TEAM_NOT_FOUND: 'Team nicht gefunden. Prüfe Name oder Befehl.',
      ALREADY_IN_TEAM: `Du bist bereits in ${team}.`,
      NOT_IN_TEAM: 'Du bist derzeit in keinem Team.',
      USE_CHANGE_TEAM: 'Nutze den Teamwechsel-Befehl, um zu wechseln.',
      UNKNOWN_COMMAND: 'Befehl nicht verstanden. Tippe !hilfe für alle Befehle.',
      RATE_LIMITED: 'Du sendest Befehle zu schnell. Warte kurz.',
      TEAM_FULL: 'Dieses Team ist voll. Wähle ein anderes.',
      MATCH_NOT_RUNNING: 'Das Match hat noch nicht begonnen.',
      JOINED: `Du bist ${team} beigetreten!`,
      LEFT: 'Du hast dein Team verlassen.',
      SWITCHED: `Du bist zu ${team} gewechselt.`,
      COMMAND_DISABLED: 'Diese Unterstützung ist derzeit deaktiviert.',
    },
    fr: {
      TEAM_REQUIRED: 'Indique l’équipe à rejoindre. Exemple : !rejoindre Lions',
      TEAM_NOT_FOUND: 'Équipe introuvable. Vérifie le nom ou la commande.',
      ALREADY_IN_TEAM: `Tu es déjà dans ${team}.`,
      NOT_IN_TEAM: 'Tu n’es dans aucune équipe.',
      USE_CHANGE_TEAM: 'Utilise la commande de changement d’équipe pour changer.',
      UNKNOWN_COMMAND: 'Commande non comprise. Tape !aide pour toutes les commandes.',
      RATE_LIMITED: 'Tu envoies des commandes trop vite. Attends un instant.',
      TEAM_FULL: 'Cette équipe est complète. Choisis-en une autre.',
      MATCH_NOT_RUNNING: 'Le match n’a pas encore commencé.',
      JOINED: `Tu as rejoint ${team} !`,
      LEFT: 'Tu as quitté ton équipe.',
      SWITCHED: `Tu es passé à ${team}.`,
      COMMAND_DISABLED: 'Ce type de soutien est désactivé.',
    },
  };
  return messages[locale]?.[code] ?? messages.tr[code] ?? code;
}
