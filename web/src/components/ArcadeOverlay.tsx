import { useEffect, useState } from 'react';
import type { ArcadeGameDef, ArcadeStateView } from '@shared/arcade';

export function ArcadeOverlay({
  game,
  state,
  roomName,
  accent,
  theme,
  botEnabled = false,
  pro = false,
}: {
  game: ArcadeGameDef;
  state: ArcadeStateView | null;
  roomName: string;
  accent: string;
  theme: 'full' | 'minimal';
  botEnabled?: boolean;
  pro?: boolean;
}) {
  const [flash, setFlash] = useState<{ id: string; text: string } | null>(null);
  const [botLine, setBotLine] = useState<{ id: string; text: string } | null>(null);
  const [lastAt, setLastAt] = useState(0);

  useEffect(() => {
    if (!state) return;
    const latest = [...state.feed].sort((a, b) => b.at - a.at)[0];
    if (!latest || latest.at <= lastAt) return;
    setLastAt(latest.at);
    if (latest.kind === 'gift' || latest.kind === 'win') {
      setFlash({ id: latest.id, text: latest.text });
      window.setTimeout(() => setFlash(null), 4200);
    }
    setBotLine({ id: latest.id, text: latest.text });
    window.setTimeout(() => setBotLine(null), 4200);
  }, [state, lastAt]);

  if (theme === 'minimal') return null;
  const leaders = [...(state?.players ?? [])].sort((a, b) => a.rank - b.rank).slice(0, 5);
  const goalPercent = (() => {
    if (!state) return 0;
    if (['kart', 'hill', 'grandprix', 'animal', 'crowd', 'balloon', 'town', 'brick'].includes(state.key)) {
      return Math.max(0, ...state.players.map((player) => player.progress));
    }
    if (state.key === 'melon' || state.key === 'egg') return state.melon?.tension ?? 0;
    if (state.key === 'gold' || state.key === 'chest') return state.gold?.pulled ?? 0;
    return Math.min(100, ((state.now - (state.startedAt ?? state.now)) / 1000) * 2);
  })();

  return (
    <div className="pointer-events-none absolute inset-0 z-30">
      <div className="absolute left-2 top-1/3 max-w-[145px]">
        <div
          className="rounded-xl border border-white/70 bg-white/85 px-2.5 py-2 shadow-sm backdrop-blur"
          style={{ borderLeftColor: accent, borderLeftWidth: 3 }}
        >
          <p className="text-[7px] font-bold uppercase tracking-[0.16em]" style={{ color: accent }}>
            {game.symbol} {game.shortName}
          </p>
          <p className="mt-0.5 truncate text-[9px] font-semibold text-ink-800">{roomName}</p>
          <p className="mt-0.5 text-[7px] text-ink-400">
            {state?.players.length ?? 0} izleyici · Tur {state?.round ?? 1}
          </p>
        </div>
      </div>

      {pro ? (
        <>
          <div className="absolute right-2 top-2 rounded-full border border-violet-200 bg-violet-50/95 px-2 py-1 text-[7px] font-extrabold uppercase tracking-[0.14em] text-violet-700 shadow-sm">
            ✦ Overlay Pro
          </div>
          <div className="absolute right-2 top-[14%] w-[155px] rounded-xl border border-white/80 bg-white/90 p-2 shadow-sm backdrop-blur">
            <p className="text-[7px] font-extrabold uppercase tracking-[0.14em] text-ink-400">Liderlik</p>
            <div className="mt-1 space-y-1">
              {leaders.map((player) => (
                <div key={player.id} className="flex items-center gap-1.5">
                  <span className="w-3 text-[7px] font-bold text-ink-400">{player.rank}</span>
                  <span className="h-2 w-2 rounded-full" style={{ background: player.color }} />
                  <span className="min-w-0 flex-1 truncate text-[8px] font-semibold text-ink-700">{player.name}</span>
                  <span className="text-[7px] font-bold text-ink-500">{Math.round(player.score)}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="absolute inset-x-3 bottom-3">
            <div className="flex items-center gap-1.5 rounded-full border border-white/80 bg-white/90 px-2 py-1 shadow-sm backdrop-blur">
              <span className="text-[7px] font-bold uppercase tracking-wider text-ink-400">Hedef</span>
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink-100">
                <span className="block h-full rounded-full" style={{ width: `${Math.min(100, goalPercent)}%`, background: accent }} />
              </span>
              <span className="text-[7px] font-bold text-ink-500">{Math.round(goalPercent)}%</span>
            </div>
          </div>
        </>
      ) : null}

      {flash ? (
        <div
          key={flash.id}
          className="absolute right-2 top-[28%] max-w-[150px] animate-[fadeIn_0.25s_ease-out] rounded-xl border border-amber-200 bg-[#fffaf0]/95 px-2.5 py-2 shadow-lg backdrop-blur"
        >
          <p className="text-[7px] font-bold uppercase tracking-[0.14em] text-amber-600">Son olay</p>
          <p className="mt-0.5 line-clamp-2 text-[9px] font-semibold leading-snug text-amber-950">
            {flash.text}
          </p>
        </div>
      ) : null}

      {botEnabled && botLine ? (
        <div
          key={`bot-${botLine.id}`}
          className="absolute bottom-12 left-2 right-2 mx-auto max-w-[180px] rounded-xl border border-violet-200 bg-violet-50/95 px-2.5 py-2 text-violet-950 shadow-md backdrop-blur"
        >
          <p className="text-[7px] font-extrabold uppercase tracking-[0.14em] text-violet-500">🤖 Meydan Bot</p>
          <p className="mt-0.5 line-clamp-2 text-[9px] font-semibold leading-snug">{botLine.text}</p>
        </div>
      ) : null}
    </div>
  );
}
