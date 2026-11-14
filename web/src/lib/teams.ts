import type { Locale, TeamConfig, TeamCount } from '@shared/types';
import { makeDefaultTeams, TEAM_PRESETS, type TeamPreset } from '@shared/defaults';
import { canonicalCommand } from '@shared/commands';

/**
 * Takım sayısı değiştiğinde mevcut düzenlemeleri koruyarak listeyi yeniden
 * boyutlandırır. Yeni slotlar için çakışmayan varsayılan takımlar üretir.
 */
export function resizeTeams(
  current: TeamConfig[],
  count: TeamCount,
  language: Locale,
): TeamConfig[] {
  const teams = current.slice(0, count).map((team, index) => ({ ...team, slot: index + 1 }));
  const defaults = makeDefaultTeams(8, language);
  const usedNames = new Set(teams.map((team) => canonicalCommand(team.name)));
  const usedCommands = new Set(teams.map((team) => canonicalCommand(team.joinCommand)));

  for (let slot = teams.length + 1; slot <= count; slot += 1) {
    const candidates = [
      defaults[slot - 1],
      ...TEAM_PRESETS.map((preset) => ({ ...preset, slot })),
    ].filter(Boolean) as TeamConfig[];
    const chosen =
      candidates.find(
        (candidate) =>
          !usedNames.has(canonicalCommand(candidate.name)) &&
          !usedCommands.has(canonicalCommand(candidate.joinCommand)),
      ) ?? {
        slot,
        name: `Takım ${slot}`,
        primaryColor: '#334155',
        secondaryColor: '#e2e8f0',
        emblemUrl: null,
        symbol: '⭐',
        soldierLook: 'knight' as const,
        castleLook: 'classic' as const,
        joinCommand: `TAKIM${slot}`,
        description: '',
      };
    teams.push({ ...chosen, slot, emblemUrl: chosen.emblemUrl ?? null });
    usedNames.add(canonicalCommand(chosen.name));
    usedCommands.add(canonicalCommand(chosen.joinCommand));
  }
  return teams;
}

export function applyPreset(team: TeamConfig, preset: TeamPreset): TeamConfig {
  return {
    ...team,
    name: preset.name,
    primaryColor: preset.primaryColor,
    secondaryColor: preset.secondaryColor,
    symbol: preset.symbol,
    soldierLook: preset.soldierLook,
    castleLook: preset.castleLook,
    joinCommand: preset.joinCommand,
    description: preset.description,
  };
}
