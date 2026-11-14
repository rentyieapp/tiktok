import type { z } from 'zod';
import type { AppContext } from '../context.js';
import type { DB } from '../db/index.js';
import {
  addConfigVersion,
  createGameTx,
  findConfigVersion,
  findGameById,
  findGameByUserId,
  findPackageById,
  findTeamById,
  listConfigVersions,
  listTeams,
  setGameLiveEnabled,
  syncTeamsTx,
  updateGameRow,
  type GameRow,
  type TeamRow,
  type UserRow,
} from '../db/repo.js';
import { nowIso } from '../db/index.js';
import { badRequest, conflict, forbidden, notFound } from '../lib/errors.js';
import type { createGameSchema, updateCommandsSchema, updateGameSchema } from '../lib/schemas.js';
import { randomId, randomToken } from '../lib/tokens.js';
import { canonicalCommand, validateCommandConfig, buildCommandSheet, effectiveSystemCommands, type SystemOverrideMap } from '../../../shared/commands.js';
import {
  clampSettings,
  composePublicSlug,
  makeDefaultTeams,
  TEAM_PRESETS,
  slugifyBase,
} from '../../../shared/defaults.js';
import type {
  GameDTO,
  GameVersionDTO,
  LiveBootstrapDTO,
  Locale,
  TeamConfig,
  TeamCount,
} from '../../../shared/types.js';
import {
  parseOverrides,
  rowToGame,
  safeJson,
  subscriptionIsActive,
} from '../game/mappers.js';
import { getAccountOverview, requirePanelAccess } from '../services/account.js';

type CreateGameInput = z.infer<typeof createGameSchema>;
type UpdateGameInput = z.infer<typeof updateGameSchema>;
type UpdateCommandsInput = z.infer<typeof updateCommandsSchema>;

export interface GameWithMeta {
  game: GameDTO;
  publicUrl: string;
  pendingApply: boolean;
}

function teamRowsFromConfigs(
  gameId: string,
  configs: TeamConfig[],
  now: string,
  existing: TeamRow[] = [],
): TeamRow[] {
  const existingBySlot = new Map(existing.map((team) => [team.slot, team]));
  return configs.map((config) => {
    const current = existingBySlot.get(config.slot);
    return {
      id: current?.id ?? randomId('team'),
      game_id: gameId,
      slot: config.slot,
      name: config.name,
      primary_color: config.primaryColor,
      secondary_color: config.secondaryColor,
      emblem_url: config.emblemUrl?.trim() ? config.emblemUrl.trim() : null,
      symbol: config.symbol,
      soldier_look: config.soldierLook,
      castle_look: config.castleLook,
      join_command: config.joinCommand.trim(),
      join_command_norm: canonicalCommand(config.joinCommand),
      description: config.description ?? '',
      configuration_json: JSON.stringify({ soldierLook: config.soldierLook, castleLook: config.castleLook }),
      created_at: current?.created_at ?? now,
      updated_at: now,
    };
  });
}

function normalizeTeamInputs(
  teams: Array<z.infer<typeof import('../lib/schemas.js').teamSchema>>,
  teamCount: TeamCount,
  language: Locale,
  existing: TeamRow[],
): TeamConfig[] {
  const bySlot = new Map<number, TeamConfig>();
  for (const team of teams) {
    if (team.slot < 1 || team.slot > teamCount) {
      throw badRequest(`Takım sırası 1 ile ${teamCount} arasında olmalı.`);
    }
    if (bySlot.has(team.slot)) {
      throw badRequest(`Takım ${team.slot} birden fazla kez tanımlanmış.`);
    }
    bySlot.set(team.slot, {
      slot: team.slot,
      name: team.name,
      primaryColor: team.primaryColor,
      secondaryColor: team.secondaryColor,
      emblemUrl: team.emblemUrl ?? null,
      symbol: team.symbol,
      soldierLook: team.soldierLook,
      castleLook: team.castleLook,
      joinCommand: team.joinCommand,
      description: team.description ?? '',
    });
  }

  // Eksik slotları mevcut takımlardan veya güvenli varsayılanlardan tamamla.
  const existingBySlot = new Map(existing.map((team) => [team.slot, team]));
  const usedNames = new Set(Array.from(bySlot.values()).map((team) => canonicalCommand(team.name)));
  const usedCommands = new Set(
    Array.from(bySlot.values()).map((team) => canonicalCommand(team.joinCommand)),
  );
  for (let slot = 1; slot <= teamCount; slot += 1) {
    if (bySlot.has(slot)) continue;
    const current = existingBySlot.get(slot);
    if (current) {
      const config: TeamConfig = {
        slot,
        name: current.name,
        primaryColor: current.primary_color,
        secondaryColor: current.secondary_color,
        emblemUrl: current.emblem_url,
        symbol: current.symbol,
        soldierLook: current.soldier_look as TeamConfig['soldierLook'],
        castleLook: current.castle_look as TeamConfig['castleLook'],
        joinCommand: current.join_command,
        description: current.description,
      };
      bySlot.set(slot, config);
      usedNames.add(canonicalCommand(config.name));
      usedCommands.add(canonicalCommand(config.joinCommand));
      continue;
    }
    const fallback = makeDefaultTeams(teamCount, language)[slot - 1];
    let chosen = fallback;
    if (!chosen || usedNames.has(canonicalCommand(chosen.name)) || usedCommands.has(canonicalCommand(chosen.joinCommand))) {
      const preset = TEAM_PRESETS.find(
        (candidate) =>
          !usedNames.has(canonicalCommand(candidate.name)) &&
          !usedCommands.has(canonicalCommand(candidate.joinCommand)),
      );
      if (preset) {
        chosen = { ...preset, slot, emblemUrl: null, description: preset.description };
      } else {
        chosen = {
          slot,
          name: `Takım ${slot}`,
          primaryColor: '#334155',
          secondaryColor: '#e2e8f0',
          emblemUrl: null,
          symbol: '⭐',
          soldierLook: 'knight',
          castleLook: 'classic',
          joinCommand: `TAKIM${slot}`,
          description: '',
        };
      }
    }
    bySlot.set(slot, { ...chosen, slot, emblemUrl: chosen.emblemUrl ?? null });
    usedNames.add(canonicalCommand(chosen.name));
    usedCommands.add(canonicalCommand(chosen.joinCommand));
  }

  return Array.from(bySlot.values()).sort((a, b) => a.slot - b.slot);
}

function assertCommandConfig(
  language: Locale,
  overrides: SystemOverrideMap,
  teams: TeamConfig[],
): void {
  const issues = validateCommandConfig({ language, overrides, teams });
  if (issues.length > 0) {
    const details: Record<string, string[]> = {};
    for (const issue of issues) {
      details[issue.field] = [...(details[issue.field] ?? []), issue.message];
    }
    throw badRequest('Komut ayarlarında çakışma var. Lütfen komutları kontrol et.', details);
  }
}

function assertPackageTeamLimit(
  db: DB,
  userId: string,
  teamCount: TeamCount,
  nowIsoValue: string,
): void {
  const account = getAccountOverview(db, { id: userId } as UserRow, nowIsoValue);
  if (!account.hasPanelAccess || !account.packageRow) {
    throw forbidden('Aktif bir paket gerekiyor.');
  }
  if (teamCount > account.packageRow.max_teams) {
    throw forbidden(
      `${account.packageRow.name} paketi en fazla ${account.packageRow.max_teams} takım destekler. Daha fazla takım için paketini yükselt.`,
    );
  }
}

export function generateUniqueSlug(db: DB, gameName: string): string {
  const base = slugifyBase(gameName);
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const slug = composePublicSlug(base, randomToken(10));
    const exists = db.prepare('SELECT 1 FROM games WHERE public_slug = ?').get(slug);
    if (!exists) return slug;
  }
  // Teorik olarak buraya düşülmez; yine de benzersizliği garantile.
  return composePublicSlug(base, randomToken(16));
}

export function gameSnapshot(game: GameDTO): string {
  return JSON.stringify({
    gameName: game.gameName,
    language: game.language,
    teamCount: game.teamCount,
    settings: game.settings,
    teams: game.teams,
    configVersion: game.configVersion,
  });
}

export function loadGameForUser(db: DB, user: UserRow): { row: GameRow; teams: TeamRow[] } | null {
  const row = findGameByUserId(db, user.id);
  if (!row) return null;
  return { row, teams: listTeams(db, row.id) };
}

export function requireGameForUser(db: DB, user: UserRow): { row: GameRow; teams: TeamRow[] } {
  const game = loadGameForUser(db, user);
  if (!game) throw notFound('Henüz bir oyun oluşturmadın.');
  return game;
}

export function toGameDTO(row: GameRow, teams: TeamRow[]): GameDTO {
  return rowToGame(row, teams);
}

export function createGame(
  ctx: AppContext,
  user: UserRow,
  input: CreateGameInput,
): GameWithMeta {
  const { db, config } = ctx;
  const now = nowIso();
  const account = requirePanelAccess(db, user, now);
  if (!account.packageRow) throw forbidden('Aktif paket bulunamadı.');
  if (findGameByUserId(db, user.id)) {
    throw conflict('Zaten bir oyunun var. Mevcut oyununu düzenleyebilirsin.');
  }
  if (input.teamCount > account.packageRow.max_teams) {
    throw forbidden(
      `${account.packageRow.name} paketi en fazla ${account.packageRow.max_teams} takım destekler.`,
    );
  }
  if (input.teams && input.teams.length > input.teamCount) {
    throw badRequest('Takım listesi seçilen takım sayısından fazla olamaz.');
  }

  const language = input.language;
  const baseTeams = input.teams ?? makeDefaultTeams(input.teamCount, language);
  const teams = normalizeTeamInputs(baseTeams, input.teamCount, language, []);
  const overrides: SystemOverrideMap = {};
  assertCommandConfig(language, overrides, teams);
  const settings = clampSettings(input.settings ?? {});
  const slug = generateUniqueSlug(db, input.gameName);
  const gameId = randomId('game');

  const row: GameRow = {
    id: gameId,
    user_id: user.id,
    public_slug: slug,
    game_name: input.gameName,
    language,
    team_count: input.teamCount,
    settings_json: JSON.stringify(settings),
    command_overrides_json: JSON.stringify(overrides),
    status: 'ready',
    live_enabled: 1,
    wizard_completed: 1,
    config_version: 1,
    active_session_id: null,
    created_at: now,
    updated_at: now,
  };
  const teamRows = teamRowsFromConfigs(gameId, teams, now);
  createGameTx(db, row, teamRows);
  const game = toGameDTO(row, teamRows);
  addConfigVersion(db, {
    id: randomId('ver'),
    gameId,
    version: 1,
    reason: 'create',
    snapshotJson: gameSnapshot(game),
    now,
  });
  return {
    game,
    publicUrl: `${config.webOrigin}/live/${slug}`,
    pendingApply: false,
  };
}

export function updateGame(
  ctx: AppContext,
  user: UserRow,
  input: UpdateGameInput,
  reason = 'save',
): GameWithMeta {
  const { db, config } = ctx;
  const now = nowIso();
  const { row, teams: existingTeamRows } = requireGameForUser(db, user);
  const account = getAccountOverview(db, user, now);
  if (!account.packageRow || !account.hasPanelAccess) throw forbidden('Aktif paket bulunamadı.');

  const language: Locale = input.language ?? (row.language as Locale);
  const teamCount: TeamCount = (input.teamCount ?? row.team_count) as TeamCount;
  if (teamCount > account.packageRow.max_teams) {
    throw forbidden(
      `${account.packageRow.name} paketi en fazla ${account.packageRow.max_teams} takım destekler.`,
    );
  }
  if (input.teams && input.teams.length !== teamCount) {
    throw badRequest('Takım listesi seçilen takım sayısıyla aynı olmalı.');
  }

  const languageChanged = language !== row.language;
  const overrides = languageChanged ? {} : parseOverrides(row.command_overrides_json);

  let teamConfigs: TeamConfig[];
  if (input.teams) {
    teamConfigs = normalizeTeamInputs(input.teams, teamCount, language, existingTeamRows);
  } else {
    const existingConfigs = existingTeamRows.map((team) => ({
      slot: team.slot,
      name: team.name,
      primaryColor: team.primary_color,
      secondaryColor: team.secondary_color,
      emblemUrl: team.emblem_url,
      symbol: team.symbol,
      soldierLook: team.soldier_look as TeamConfig['soldierLook'],
      castleLook: team.castle_look as TeamConfig['castleLook'],
      joinCommand: team.join_command,
      description: team.description,
    }));
    teamConfigs = normalizeTeamInputs(existingConfigs, teamCount, language, existingTeamRows);
  }

  assertCommandConfig(language, overrides, teamConfigs);

  const currentSettings = clampSettings(safeJson(row.settings_json, {}));
  const settings = clampSettings({ ...currentSettings, ...(input.settings ?? {}) });
  const gameName = input.gameName ?? row.game_name;
  const configVersion = row.config_version + 1;
  const liveEnabled = row.live_enabled === 1;
  const status = liveEnabled ? (row.active_session_id ? 'live' : 'ready') : 'disabled';

  updateGameRow(db, row.id, {
    gameName,
    language,
    teamCount,
    settingsJson: JSON.stringify(settings),
    overridesJson: JSON.stringify(overrides),
    status,
    liveEnabled: row.live_enabled,
    wizardCompleted: 1,
    configVersion,
    now,
  });

  const teamRows = teamRowsFromConfigs(row.id, teamConfigs, now, existingTeamRows);
  syncTeamsTx(db, row.id, teamRows);

  const updatedRow = findGameById(db, row.id)!;
  const updatedTeams = listTeams(db, row.id);
  const game = toGameDTO(updatedRow, updatedTeams);
  addConfigVersion(db, {
    id: randomId('ver'),
    gameId: row.id,
    version: configVersion,
    reason,
    snapshotJson: gameSnapshot(game),
    now,
  });

  const running = ctx.runtime.isRunning(row.id);
  if (!running) ctx.runtime.refreshGame(row.id);
  return {
    game,
    publicUrl: `${config.webOrigin}/live/${game.publicSlug}`,
    pendingApply: running,
  };
}

export function updateCommandSettings(
  ctx: AppContext,
  user: UserRow,
  input: UpdateCommandsInput,
): GameWithMeta {
  const { db, config } = ctx;
  const now = nowIso();
  const { row, teams: existingTeamRows } = requireGameForUser(db, user);
  const account = getAccountOverview(db, user, now);
  if (!account.packageRow || !account.hasPanelAccess) throw forbidden('Aktif paket bulunamadı.');

  const language: Locale = input.language ?? (row.language as Locale);
  const languageChanged = language !== row.language;
  const currentOverrides = parseOverrides(row.command_overrides_json);
  const overrides: SystemOverrideMap =
    input.overrides !== undefined
      ? { ...input.overrides }
      : languageChanged
        ? {}
        : currentOverrides;

  if (input.overrides) {
    for (const [action, phrase] of Object.entries(input.overrides)) {
      if (!phrase || !phrase.trim()) delete overrides[action as keyof SystemOverrideMap];
    }
  }

  const commandBySlot = new Map(
    (input.teams ?? []).map((team) => [team.slot, team.joinCommand]),
  );
  const teamConfigs: TeamConfig[] = existingTeamRows.map((team) => ({
    slot: team.slot,
    name: team.name,
    primaryColor: team.primary_color,
    secondaryColor: team.secondary_color,
    emblemUrl: team.emblem_url,
    symbol: team.symbol,
    soldierLook: team.soldier_look as TeamConfig['soldierLook'],
    castleLook: team.castle_look as TeamConfig['castleLook'],
    joinCommand: commandBySlot.get(team.slot) ?? team.join_command,
    description: team.description,
  }));
  assertCommandConfig(language, overrides, teamConfigs);

  const configVersion = row.config_version + 1;
  updateGameRow(db, row.id, {
    gameName: row.game_name,
    language,
    teamCount: row.team_count,
    settingsJson: row.settings_json,
    overridesJson: JSON.stringify(overrides),
    status: row.status,
    liveEnabled: row.live_enabled,
    wizardCompleted: row.wizard_completed,
    configVersion,
    now,
  });
  syncTeamsTx(
    db,
    row.id,
    teamRowsFromConfigs(row.id, teamConfigs, now, existingTeamRows),
  );
  const updatedRow = findGameById(db, row.id)!;
  const updatedTeams = listTeams(db, row.id);
  const game = toGameDTO(updatedRow, updatedTeams);
  addConfigVersion(db, {
    id: randomId('ver'),
    gameId: row.id,
    version: configVersion,
    reason: 'commands',
    snapshotJson: gameSnapshot(game),
    now,
  });
  const running = ctx.runtime.isRunning(row.id);
  if (!running) ctx.runtime.refreshGame(row.id);
  return {
    game,
    publicUrl: `${config.webOrigin}/live/${game.publicSlug}`,
    pendingApply: running,
  };
}

export interface CommandSettingsResponse {
  language: Locale;
  overrides: SystemOverrideMap;
  teams: Array<{ slot: number; name: string; joinCommand: string }>;
  effective: Array<{ action: string; label: string; command: string; isCustom: boolean }>;
  sheet: ReturnType<typeof buildCommandSheet>;
}

export function getCommandSettings(
  ctx: AppContext,
  user: UserRow,
): CommandSettingsResponse {
  const { row, teams } = requireGameForUser(ctx.db, user);
  const language = row.language as Locale;
  const overrides = parseOverrides(row.command_overrides_json);
  const effective = effectiveSystemCommands(language, overrides);
  return {
    language,
    overrides,
    teams: teams.map((team) => ({ slot: team.slot, name: team.name, joinCommand: team.join_command })),
    effective: Object.values(effective).map((entry) => ({
      action: entry.action,
      label: entry.label,
      command: entry.command,
      isCustom: entry.isCustom,
    })),
    sheet: buildCommandSheet(
      language,
      teams.map((team) => ({
        slot: team.slot,
        name: team.name,
        joinCommand: team.join_command,
        primaryColor: team.primary_color,
      })),
      overrides,
    ),
  };
}

export function toggleLive(
  ctx: AppContext,
  user: UserRow,
  enabled: boolean,
): GameWithMeta {
  const { db, config, runtime } = ctx;
  const { row, teams } = requireGameForUser(db, user);
  const now = nowIso();
  setGameLiveEnabled(db, row.id, enabled, now);
  if (!enabled) runtime.disableGame(row.id);
  else runtime.refreshGame(row.id);
  const updated = findGameById(db, row.id)!;
  return {
    game: toGameDTO(updated, listTeams(db, row.id)),
    publicUrl: `${config.webOrigin}/live/${row.public_slug}`,
    pendingApply: false,
  };
}

export function listVersionsForUser(db: DB, user: UserRow): GameVersionDTO[] {
  const { row } = requireGameForUser(db, user);
  return listConfigVersions(db, row.id).map((version) => ({
    version: version.version,
    createdAt: version.created_at,
    reason: version.reason,
  }));
}

export function restoreVersion(
  ctx: AppContext,
  user: UserRow,
  versionNumber: number,
): GameWithMeta {
  const { db } = ctx;
  const { row } = requireGameForUser(db, user);
  const version = findConfigVersion(db, row.id, versionNumber);
  if (!version) throw notFound('Bu yapılandırma sürümü bulunamadı.');
  const snapshot = safeJson<{
    gameName?: string;
    language?: Locale;
    teamCount?: TeamCount;
    settings?: Record<string, unknown>;
    teams?: TeamConfig[];
  }>(version.snapshot_json, {});
  if (!snapshot.teamCount || !snapshot.teams) {
    throw badRequest('Bu sürüm geri yüklenemiyor.');
  }
  const result = updateGame(ctx, user, {
    gameName: snapshot.gameName ?? row.game_name,
    language: snapshot.language ?? (row.language as Locale),
    teamCount: snapshot.teamCount,
    teams: snapshot.teams.map((team) => ({
      slot: team.slot,
      name: team.name,
      primaryColor: team.primaryColor,
      secondaryColor: team.secondaryColor,
      emblemUrl: team.emblemUrl,
      symbol: team.symbol,
      soldierLook: team.soldierLook,
      castleLook: team.castleLook,
      joinCommand: team.joinCommand,
      description: team.description,
    })),
    settings: snapshot.settings as UpdateGameInput['settings'],
  }, `restore:${versionNumber}`);
  return result;
}

export function getPublicBootstrap(db: DB, slug: string): LiveBootstrapDTO | null {
  const row = db.prepare('SELECT * FROM games WHERE public_slug = ?').get(slug) as
    | GameRow
    | undefined;
  if (!row || row.live_enabled !== 1) return null;
  const teams = listTeams(db, row.id);
  const language = row.language as Locale;
  const overrides = parseOverrides(row.command_overrides_json);
  const game = toGameDTO(row, teams);
  return {
    slug: row.public_slug,
    gameName: row.game_name,
    locale: language,
    teamCount: row.team_count,
    teams: game.teams,
    settings: game.settings,
    commands: buildCommandSheet(language, teams.map((team) => ({
      slot: team.slot,
      name: team.name,
      joinCommand: team.join_command,
      primaryColor: team.primary_color,
    })), overrides),
    liveEnabled: true,
    gameStatus: row.status,
  };
}

export function buildGameResponse(ctx: AppContext, row: GameRow, teams: TeamRow[]): GameWithMeta {
  return {
    game: toGameDTO(row, teams),
    publicUrl: `${ctx.config.webOrigin}/live/${row.public_slug}`,
    pendingApply: ctx.runtime.isRunning(row.id),
  };
}

export function teamBelongsToGame(db: DB, teamId: string, gameId: string): boolean {
  const team = findTeamById(db, teamId);
  return Boolean(team && team.game_id === gameId);
}

export function ensureActiveSubscription(db: DB, user: UserRow): void {
  const now = nowIso();
  const account = getAccountOverview(db, user, now);
  if (!account.hasPanelAccess) throw forbidden('Aktif paket gerekli.');
  const pkg = findPackageById(db, account.subscriptionRow!.package_id);
  if (!pkg || !subscriptionIsActive(account.subscriptionRow!, Date.now())) {
    throw forbidden('Aboneliğin sona ermiş.');
  }
}
