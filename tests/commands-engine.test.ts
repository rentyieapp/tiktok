import { describe, expect, it } from 'vitest';
import {
  applyCommand,
  applyLiveEvent,
  createBattleState,
  startRound,
  tickBattle,
  toBattleStateView,
  type BattleState,
} from '../shared/battle';
import {
  canonicalCommand,
  normalizePhrase,
  parseCommand,
  validateCommandConfig,
} from '../shared/commands';
import type { GameSettings, TeamDTO } from '../shared/types';
import { DEFAULT_SETTINGS, makeDefaultTeams } from '../shared/defaults';

function teams(count = 2): TeamDTO[] {
  return makeDefaultTeams(count === 2 ? 2 : count === 4 ? 4 : 8, 'tr').map((team) => ({
    ...team,
    id: `team_${team.slot}`,
  }));
}

function makeState(overrides: Partial<GameSettings> = {}, teamCount = 2): BattleState {
  const configs = teams(teamCount);
  return createBattleState({
    gameId: 'game_test',
    gameName: 'Test',
    publicSlug: 'test-abc',
    locale: 'tr',
    teams: configs,
    settings: { ...DEFAULT_SETTINGS, ...overrides },
    seed: 42,
    now: 0,
  });
}

function joinedPlayer(state: BattleState, index = 1) {
  return applyCommand(state, {
    playerId: `player_${index}`,
    playerName: `Oyuncu ${index}`,
    text: `!gir ${state.teams[index % state.teams.length].joinCommand}`,
    now: 1000 + index * 5000,
  });
}

describe('komut normalizasyonu ve dil eşleştirme', () => {
  it('Türkçe I/İ, aksan ve boşlukları normalize eder', () => {
    expect(normalizePhrase('GİR')).toBe('gir');
    expect(normalizePhrase('GIR')).toBe('gir');
    expect(normalizePhrase('  GİR   ASLAN  ')).toBe('gir aslan');
    expect(normalizePhrase('Café')).toBe('cafe');
    expect(normalizePhrase('TAKIM-DEĞİŞTİR')).toBe('takim degistir');
    expect(normalizePhrase('!ŞİMDİ')).toBe('simdi');
  });

  it('aynı JOIN işlemini beş dilde de çözer', () => {
    const teamRefs = teams(2).map((team) => ({
      slot: team.slot,
      name: team.name,
      joinCommand: team.joinCommand,
    }));
    for (const [locale, command] of [
      ['tr', '!gir aslan'],
      ['en', '!join aslan'],
      ['es', '!entrar aslan'],
      ['de', '!beitreten aslan'],
      ['fr', '!rejoindre aslan'],
    ] as const) {
      const parsed = parseCommand(command, locale, teamRefs);
      expect(parsed.action).toBe('JOIN_TEAM');
      expect(parsed.teamToken).toBe('aslan');
    }
  });

  it('doğrudan takım komutunu JOIN_TEAM olarak çözer', () => {
    const teamRefs = teams(2).map((team) => ({
      slot: team.slot,
      name: team.name,
      joinCommand: team.joinCommand,
    }));
    const parsed = parseCommand('!ASLAN', 'tr', teamRefs);
    expect(parsed.action).toBe('JOIN_TEAM');
    expect(parsed.impliedTeamSlot).toBe(1);
  });

  it('özel sistem komutu eşleşmesi ve takım komutları çakışma kontrolü', () => {
    const configs = teams(2);
    const teamRefs = configs.map((team) => ({
      slot: team.slot,
      name: team.name,
      joinCommand: team.joinCommand,
    }));
    const parsed = parseCommand('!katil aslan', 'tr', teamRefs, { JOIN_TEAM: 'katil' });
    expect(parsed.action).toBe('JOIN_TEAM');

    expect(
      validateCommandConfig({
        language: 'tr',
        teams: configs.map((team) => ({
          slot: team.slot,
          name: team.name,
          joinCommand: team.slot === 1 ? 'skor' : team.joinCommand,
        })),
      }).some((issue) => issue.code === 'COMMAND_RESERVED'),
    ).toBe(true);

    expect(
      validateCommandConfig({
        language: 'en',
        teams: configs.map((team) => ({
          slot: team.slot,
          name: team.name,
          joinCommand: 'JOIN',
        })),
      }).length,
    ).toBeGreaterThan(0);
  });

  it('kanonik komut boşluk ve büyük harf farkını kaldırır', () => {
    expect(canonicalCommand('  Takım Bir ')).toBe('takimbir');
    expect(canonicalCommand('TAKIM_BIR')).toBe('takimbir');
  });
});

describe('oyuncu komutları', () => {
  it('katılma, tekrar katılma engeli, takım değiştirme ve ayrılma', () => {
    const state = makeState();
    startRound(state, 1000);
    const join = applyCommand(state, {
      playerId: 'p1',
      playerName: 'Ali',
      text: '!gir aslan',
      now: 2000,
    });
    expect(join.ok).toBe(true);
    expect(join.notice?.code).toBe('JOINED');
    expect(state.players[0].teamSlot).toBe(1);
    expect(state.teams[0].playerCount).toBe(1);

    const secondJoin = applyCommand(state, {
      playerId: 'p1',
      playerName: 'Ali',
      text: '!gir kartal',
      now: 4000,
    });
    expect(secondJoin.ok).toBe(false);
    expect(secondJoin.notice?.code).toBe('USE_CHANGE_TEAM');

    const switchTeam = applyCommand(state, {
      playerId: 'p1',
      playerName: 'Ali',
      text: '!takimdegistir kartal',
      now: 6000,
    });
    expect(switchTeam.ok).toBe(true);
    expect(switchTeam.notice?.code).toBe('SWITCHED');
    expect(state.players[0].teamSlot).toBe(2);
    expect(state.teams[0].playerCount).toBe(0);
    expect(state.teams[1].playerCount).toBe(1);

    const leave = applyCommand(state, {
      playerId: 'p1',
      playerName: 'Ali',
      text: '!cik',
      now: 8000,
    });
    expect(leave.ok).toBe(true);
    expect(leave.notice?.code).toBe('LEFT');
    expect(state.players[0].teamSlot).toBe(0);
    expect(state.teams[1].playerCount).toBe(0);
  });

  it('aynı oyuncunun aynı anda birden fazla takımda olmasını engeller', () => {
    const state = makeState();
    startRound(state, 1000);
    joinedPlayer(state, 1);
    joinedPlayer(state, 2);
    expect(new Set(state.players.map((player) => player.teamSlot)).size).toBe(
      state.players.length,
    );
    expect(state.players.every((player) => player.teamSlot > 0)).toBe(true);
  });

  it('komut bekleme süresi ve spam koruması çalışır', () => {
    const state = makeState({ commandCooldownMs: 1200 });
    startRound(state, 1000);
    const first = applyCommand(state, {
      playerId: 'p1',
      playerName: 'Ali',
      text: '!yardim',
      now: 2000,
    });
    expect(first.ok).toBe(true);
    const burst = applyCommand(state, {
      playerId: 'p1',
      playerName: 'Ali',
      text: '!skor',
      now: 2100,
    });
    expect(burst.ok).toBe(false);
    expect(burst.notice?.code).toBe('RATE_LIMITED');
    expect(burst.notice?.retryAfterMs).toBeGreaterThan(0);
  });

  it('aynı mesaj kimliği iki kez işlenmez', () => {
    const state = makeState();
    startRound(state, 1000);
    const input = {
      playerId: 'p1',
      playerName: 'Ali',
      text: '!gir aslan',
      msgId: 'same-msg',
      now: 2000,
    };
    const first = applyCommand(state, input);
    expect(first.ok).toBe(true);
    const second = applyCommand(state, { ...input, now: 5000 });
    expect(second.ok).toBe(false);
    expect(second.notice?.code).toBe('UNKNOWN_COMMAND');
  });

  it('yardım ve skor istekleri özel bildirim üretir, feed kirletmez', () => {
    const state = makeState();
    startRound(state, 1000);
    const help = applyCommand(state, {
      playerId: 'p1',
      playerName: 'Ali',
      text: '!yardim',
      now: 2000,
    });
    expect(help.notice?.code).toBe('HELP_SHEET');
    const score = applyCommand(state, {
      playerId: 'p1',
      playerName: 'Ali',
      text: '!skor',
      now: 4000,
    });
    expect(score.notice?.code).toBe('SCORE_SHEET');
    expect(state.feed.filter((item) => item.kind === 'system')).toHaveLength(0);
  });
});

describe('canlı yayın etkileşimleri', () => {
  it('hediye hasar verir, aynı event ID ikinci kez işlenmez', () => {
    const state = makeState({ giftAttackDamage: 120 });
    startRound(state, 1000);
    const beforeHp = state.teams[1].castleHp;
    const event = {
      externalId: 'evt_gift_1',
      type: 'gift' as const,
      teamSlot: 1,
      playerExternalId: 'v1',
      playerName: 'Hediyeci',
      amount: 1,
    };
    const first = applyLiveEvent(state, event);
    expect(first.ok).toBe(true);
    expect(state.teams[1].castleHp).toBeLessThan(beforeHp);
    const second = applyLiveEvent(state, event);
    expect(second.duplicate).toBe(true);
    expect(state.feed.filter((item) => item.kind === 'gift')).toHaveLength(1);
  });

  it('beğeni kalkan, yorum asker desteği ekler', () => {
    const state = makeState();
    startRound(state, 1000);
    const soldierBefore = state.teams[0].soldiers;
    applyLiveEvent(state, {
      externalId: 'evt_like',
      type: 'like',
      teamSlot: 1,
      playerExternalId: 'v1',
      amount: 2,
    });
    expect(state.teams[0].shieldStrength).toBeGreaterThan(0);
    applyLiveEvent(state, {
      externalId: 'evt_comment',
      type: 'comment',
      teamSlot: 1,
      playerExternalId: 'v1',
      amount: 2,
    });
    expect(state.teams[0].soldiers).toBeGreaterThan(soldierBefore);
  });

  it('devre dışı etkileşimler uygulanmaz', () => {
    const state = makeState({ enableGifts: false });
    startRound(state, 1000);
    const result = applyLiveEvent(state, {
      externalId: 'evt_gift_disabled',
      type: 'gift',
      teamSlot: 1,
      playerExternalId: 'v1',
    });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('DISABLED');
  });
});

describe('sunucu simülasyonu', () => {
  it('tur süresi dolunca biter ve kazanan/berabere kararı üretir', () => {
    const state = makeState({ roundDurationSec: 30 }, 2);
    startRound(state, 0);
    expect(state.phase).toBe('running');
    for (let second = 1; second <= 31; second += 1) {
      tickBattle(state, second * 1000);
    }
    expect(state.phase).toBe('finished');
    expect(state.endReason === 'time' || state.endReason === 'elimination').toBe(true);
    expect(state.isDraw || state.winnerSlot !== null).toBe(true);
    expect(state.teams.every((team) => Number.isFinite(team.castleHp))).toBe(true);
  });

  it('oyuncu katılımı asker ve saldırı gücü kazandırır', () => {
    const state = makeState({ playerAttackBonusPercent: 4 }, 2);
    startRound(state, 0);
    applyCommand(state, {
      playerId: 'p1',
      playerName: 'Ali',
      text: '!gir aslan',
      now: 100,
    });
    expect(state.teams[0].playerCount).toBe(1);
    expect(state.teams[0].attackBonusPercent).toBe(4);
  });

  it('dışa aktarılan state yalnızca güvenli görünüm alanlarını taşır', () => {
    const state = makeState();
    startRound(state, 1000);
    const view = toBattleStateView(state);
    expect(view.phase).toBe('running');
    expect(view.teams[0].castleHp).toBeGreaterThan(0);
    expect(view.settings.roundDurationSec).toBe(DEFAULT_SETTINGS.roundDurationSec);
    expect(view).not.toHaveProperty('commandOverrides');
    expect(view).not.toHaveProperty('seenEventIds');
  });
});
