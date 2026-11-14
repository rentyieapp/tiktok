import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { BattleFeedItem, BattleStateView, WsNoticeCode } from '@shared/types';
import { createStageRenderer, type StageRendererHandle } from './renderer';
import { LiveOverlay, useStageClock, type StageConfig } from './Overlay';

interface BattleStageProps {
  view: BattleStateView | null;
  config: StageConfig;
  mode?: 'live' | 'preview';
  myTeamSlot?: number | null;
  notice?: { code: WsNoticeCode; message?: string } | null;
}

function useFitScale() {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.4);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const update = () => {
      const { width, height } = element.getBoundingClientRect();
      if (width <= 0 || height <= 0) return;
      setScale(Math.min(width / 1080, height / 1920));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    window.addEventListener('resize', update);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', update);
    };
  }, []);

  return { ref, scale };
}

export function BattleStage({ view, config, mode = 'live', myTeamSlot = null, notice = null }: BattleStageProps) {
  const { ref, scale } = useFitScale();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<StageRendererHandle | null>(null);
  const seenFeed = useRef<Set<string>>(new Set());
  const initialStateApplied = useRef(false);
  const [webglFailed, setWebglFailed] = useState(false);
  const now = useStageClock(view);

  useEffect(() => {
    if (!canvasRef.current) return;
    const handle = createStageRenderer(canvasRef.current);
    if (!handle) {
      setWebglFailed(true);
      return;
    }
    rendererRef.current = handle;
    return () => {
      handle.dispose();
      rendererRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!view) return;
    rendererRef.current?.setState(view);
    const feed = view.feed ?? [];
    if (!initialStateApplied.current) {
      initialStateApplied.current = true;
      for (const item of feed) seenFeed.current.add(`${item.id}-${item.at}`);
      return;
    }
    for (const item of feed) {
      const key = `${item.id}-${item.at}`;
      if (seenFeed.current.has(key)) continue;
      seenFeed.current.add(key);
      rendererRef.current?.applyFeed(item as BattleFeedItem);
    }
    if (seenFeed.current.size > 240) {
      seenFeed.current = new Set(Array.from(seenFeed.current).slice(-120));
    }
  }, [view]);

  useEffect(() => {
    if (!view) initialStateApplied.current = false;
  }, [view?.gameId, view?.roundIndex]);

  const visibleTeams = view?.teams ?? config.teams.map((team) => ({
    ...team,
    soldiers: 0,
    castleHp: config.settings.castleHp,
    maxCastleHp: config.settings.castleHp,
    score: 0,
    playerCount: 0,
    alive: true,
    shieldStrength: 0,
    shieldUntil: 0,
    attackBonusPercent: 0,
  }));

  return (
    <div
      ref={ref}
      className="live-root relative flex h-full w-full items-center justify-center overflow-hidden"
    >
      <div
        className="live-stage live-vignette relative shrink-0 overflow-hidden"
        style={{
          width: 1080,
          height: 1920,
          transform: `translate(-50%, -50%) scale(${scale})`,
          position: 'absolute',
          left: '50%',
          top: '50%',
        }}
      >
        <canvas ref={canvasRef} className={`absolute inset-0 h-full w-full ${webglFailed ? 'hidden' : ''}`} aria-hidden />
        {webglFailed ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 bg-ink-950 bg-[radial-gradient(80%_60%_at_50%_45%,rgba(16,185,129,0.22),transparent_65%)]">
            <p className="text-[18px] font-semibold text-white/40">3D sahne bu cihazda desteklenmiyor</p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              {visibleTeams.map((team) => (
                <span key={team.slot} className="text-6xl" aria-hidden>
                  {team.symbol}
                </span>
              ))}
            </div>
          </div>
        ) : null}
        <LiveOverlay
          view={view}
          config={config}
          mode={mode}
          now={now}
          myTeamSlot={myTeamSlot}
          notice={notice}
        />
      </div>
    </div>
  );
}
