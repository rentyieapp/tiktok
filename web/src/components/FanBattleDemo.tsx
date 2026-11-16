import { useEffect, useRef, useState } from 'react';
import type { BattleStateView, GameSettings, TeamDTO } from '@shared/types';
import { DEFAULT_SETTINGS, TEAM_PRESETS } from '@shared/defaults';
import { buildCommandSheet } from '@shared/commands';
import {
  applyLiveEvent,
  createBattleState,
  hydratePlayers,
  startRound,
  tickBattle,
  toBattleStateView,
  type BattleState,
  type LiveEventType,
} from '@shared/battle';
import { BattleStage } from '../game/BattleStage';
import type { StageConfig } from '../game/Overlay';

const DEMO_NAMES = ['Deniz', 'Ece', 'Mert', 'Selin', 'Can', 'Ada', 'Efe', 'Yaz', 'Kaan', 'Nil'];

const teams: TeamDTO[] = TEAM_PRESETS.slice(0, 4).map((preset, index) => ({
  ...preset,
  id: `demo-team-${index + 1}`,
  slot: index + 1,
  emblemUrl: null,
}));

const settings: GameSettings = {
  ...DEFAULT_SETTINGS,
  roundDurationSec: 75,
  castleHp: 900,
};

const config: StageConfig = {
  gameName: 'Taraftar Savaşı 3D',
  locale: 'tr',
  teams,
  settings,
  commands: buildCommandSheet('tr', teams),
  slug: 'taraftar-savasi-demo',
};

function createDemo(): BattleState {
  const state = createBattleState({
    gameId: 'demo-fan-battle',
    gameName: 'Taraftar Savaşı 3D',
    publicSlug: 'taraftar-savasi-demo',
    locale: 'tr',
    teams,
    settings,
    testMode: true,
    seed: Date.now(),
  });
  const players: Array<{ externalId: string; displayName: string; teamSlot: number; score: number }> = [];
  teams.forEach((team) => {
    for (let index = 0; index < 3; index += 1) {
      players.push({
        externalId: `demo_${team.slot}_${index}`,
        displayName: DEMO_NAMES[(team.slot * 3 + index) % DEMO_NAMES.length] ?? 'İzleyici',
        teamSlot: team.slot,
        score: 0,
      });
    }
  });
  hydratePlayers(state, players);
  startRound(state, Date.now());
  return state;
}

export function FanBattleDemo() {
  const [view, setView] = useState<BattleStateView | null>(null);
  const stateRef = useRef<BattleState | null>(null);
  const resetRef = useRef<() => void>(() => {});

  useEffect(() => {
    const reset = () => {
      const state = createDemo();
      stateRef.current = state;
      setView(toBattleStateView(state));
    };
    resetRef.current = reset;
    reset();
    let lastSupport = Date.now();
    let finishedAt: number | null = null;
    const timer = window.setInterval(() => {
      const state = stateRef.current;
      if (!state) return;
      const now = Date.now();
      if (state.phase === 'running') {
        tickBattle(state, now);
        if (now - lastSupport > 2600) {
          lastSupport = now;
          const team = state.teams[Math.floor(Math.random() * state.teams.length)];
          if (team) {
            const types: LiveEventType[] = ['gift', 'like', 'comment'];
            const type = types[Math.floor(Math.random() * types.length)]!;
            applyLiveEvent(state, {
              externalId: `demo_${now}_${Math.random().toString(36).slice(2, 6)}`,
              type,
              teamSlot: team.slot,
              playerExternalId: `demo_supporter_${team.slot}`,
              playerName: 'Demo İzleyici',
              amount: 1,
              at: now,
            });
          }
        }
        if ((state.phase as string) === 'finished') finishedAt = now;
      } else if (state.phase === 'finished') {
        if (finishedAt && now - finishedAt > 4500) {
          reset();
          finishedAt = null;
          lastSupport = now;
        }
      } else {
        startRound(state, now);
      }
      setView(toBattleStateView(state));
    }, 250);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="relative mx-auto w-full max-w-[370px]">
      <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-black/40 p-2 shadow-2xl">
        <div className="aspect-[9/16] w-full overflow-hidden rounded-[1.5rem]">
          <BattleStage view={view} config={config} mode="preview" />
        </div>
      </div>
      <div className="mt-7 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-brand-300">Canlı katılımcılar</p>
          <span className="text-[9px] text-white/35">{view?.players.length ?? 0} izleyici</span>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-1.5">
          {(view?.players ?? []).slice(0, 16).map((player) => {
            const team = teams.find((candidate) => candidate.slot === player.teamSlot);
            return (
              <div key={player.id} className="flex min-w-0 items-center gap-1.5 rounded-lg bg-white/[0.04] px-2 py-1.5">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: team?.primaryColor ?? '#94a3b8' }} />
                <span className="truncate text-[10px] font-medium text-white/75">{player.name}</span>
              </div>
            );
          })}
        </div>
      </div>
      <div className="mt-2 flex items-center justify-center gap-2 text-[9px] font-semibold text-white/45">
        <span className="relative flex h-1.5 w-1.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-60" /><span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand-400" /></span>
        Canlı 3D demo · kendi kendine oynuyor
      </div>
    </div>
  );
}
