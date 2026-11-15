import { useEffect, useRef, useState } from 'react';
import type { ArcadeGameDef, ArcadeStateView } from '@shared/arcade';
import type { ArcadeLocale } from '@shared/arcadeSettings';
import { createArcade3DRenderer, type Arcade3DHandle } from '../arcade/renderer3d';

export function Arcade3DStage({
  game,
  state,
  fitHeight = false,
  demo = true,
  locale = 'tr',
  onError,
}: {
  game: ArcadeGameDef;
  state: ArcadeStateView | null;
  fitHeight?: boolean;
  demo?: boolean;
  locale?: ArcadeLocale;
  onError?: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const handleRef = useRef<Arcade3DHandle | null>(null);
  const [now, setNow] = useState(Date.now());
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const handle = createArcade3DRenderer(canvas, game);
    if (!handle) {
      setFailed(true);
      onError?.();
      return;
    }
    const loseContext = (event: Event) => {
      event.preventDefault();
      setFailed(true);
      onError?.();
    };
    canvas.addEventListener('webglcontextlost', loseContext);
    handleRef.current = handle;
    if (state) handle.setState(state);
    return () => {
      canvas.removeEventListener('webglcontextlost', loseContext);
      handle.dispose();
      handleRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.key]);

  useEffect(() => {
    if (state) handleRef.current?.setState(state);
  }, [state]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, []);

  if (failed) return null;

  const targetTime = state?.phase === 'lobby' ? state?.lobbyEndsAt : state?.endsAt;
  const remaining = targetTime ? Math.max(0, Math.ceil((targetTime - now) / 1000)) : 0;
  const mm = Math.floor(remaining / 60);
  const ss = remaining % 60;
  const prompt = state?.prompt;
  const nameRail = [...(state?.players ?? [])].sort((a, b) => a.rank - b.rank).slice(0, 12);
  const copy = {
    tr: { live: 'CANLI', demo: 'DEMO', broadcast: 'YAYIN', players: 'oyuncu', round: 'Tur', remaining: 'kalan süre', lobby: 'lobi', lobbyTitle: 'Sahne hazırlanıyor', lobbySub: 'tur birazdan başlıyor', ready: 'Yayın hazır', wait: 'İlk izleyiciyi bekle', waitSub: 'Platform sohbeti bağlıysa ilk yorum, beğeni veya hediye turu otomatik başlatır.', winner: 'yeni tur birazdan', score: 'puan' },
    en: { live: 'LIVE', demo: 'DEMO', broadcast: 'LIVE', players: 'players', round: 'Round', remaining: 'time left', lobby: 'lobby', lobbyTitle: 'Stage is getting ready', lobbySub: 'round starts soon', ready: 'Ready to broadcast', wait: 'Wait for the first viewer', waitSub: 'Once chat is connected, the first comment, like or gift starts the round.', winner: 'next round soon', score: 'pts' },
    es: { live: 'EN VIVO', demo: 'DEMO', broadcast: 'EN VIVO', players: 'jugadores', round: 'Ronda', remaining: 'tiempo', lobby: 'lobby', lobbyTitle: 'Preparando escena', lobbySub: 'la ronda empieza pronto', ready: 'Listo para emitir', wait: 'Esperando al primer espectador', waitSub: 'El primer comentario, like o regalo inicia la ronda.', winner: 'nueva ronda pronto', score: 'pts' },
    de: { live: 'LIVE', demo: 'DEMO', broadcast: 'LIVE', players: 'Spieler', round: 'Runde', remaining: 'Zeit', lobby: 'Lobby', lobbyTitle: 'Bühne wird vorbereitet', lobbySub: 'Runde startet gleich', ready: 'Sendebereit', wait: 'Auf ersten Zuschauer warten', waitSub: 'Der erste Kommentar, Like oder Geschenk startet die Runde.', winner: 'nächste Runde gleich', score: 'Pkt' },
    fr: { live: 'EN DIRECT', demo: 'DÉMO', broadcast: 'EN DIRECT', players: 'joueurs', round: 'Tour', remaining: 'temps', lobby: 'salon', lobbyTitle: 'La scène se prépare', lobbySub: 'le tour commence bientôt', ready: 'Prêt à diffuser', wait: 'En attente du premier spectateur', waitSub: 'Le premier commentaire, like ou cadeau lance le tour.', winner: 'prochain tour bientôt', score: 'pts' },
  }[locale];

  return (
    <div
      className={`relative overflow-hidden bg-[#fffaf4] ${
        fitHeight ? 'h-full w-auto aspect-[9/16]' : 'aspect-[9/16] w-full'
      }`}
    >
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_20%,transparent_55%,rgba(50,35,45,0.12))]" />

      <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between gap-2 bg-white/80 px-3 py-2.5 backdrop-blur-md sm:px-4">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className="rounded-full px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-[0.12em] text-white"
            style={{ background: game.accent }}
          >
            {state?.phase === 'running' ? copy.live : demo ? copy.demo : copy.broadcast}
          </span>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-bold leading-tight text-ink-950">{game.name}</p>
            <p className="text-[8px] font-medium text-ink-400">
              {state?.players.length ?? 0} {copy.players} · {copy.round} {state?.round ?? 1}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-mono text-[15px] font-extrabold leading-tight text-ink-950">
            {targetTime ? `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}` : '—:—'}
          </p>
          <p className="text-[7px] font-semibold uppercase tracking-wider text-ink-400">
            {state?.phase === 'lobby' ? copy.lobby : copy.remaining}
          </p>
        </div>
      </div>

      {game.mode === 'tug' && state?.tug ? (
        <div className="absolute inset-x-3 top-[62px] z-10 sm:inset-x-4">
          <div className="rounded-2xl border border-white/80 bg-white/85 p-2.5 shadow-sm backdrop-blur-md">
            <div className="flex items-center justify-between text-[9px] font-extrabold">
              <span className="text-red-600">KIRMIZI · {Math.round(state.tug.red)}</span>
              <span className="text-ink-400">HALAT</span>
              <span className="text-blue-600">{Math.round(state.tug.blue)} · MAVİ</span>
            </div>
            <div className="mt-1.5 flex h-2 overflow-hidden rounded-full bg-ink-100">
              <div className="h-full bg-red-500 transition-[width] duration-300" style={{ width: `${((1 - state.tug.position) / 2) * 100}%` }} />
              <div className="h-full flex-1 bg-blue-500" />
            </div>
          </div>
        </div>
      ) : null}

      {game.mode === 'horse' && state?.horse ? (
        <div className="absolute inset-x-3 top-[62px] z-10 sm:inset-x-4">
          <div className="rounded-2xl border border-white/80 bg-white/85 px-3 py-2 shadow-sm backdrop-blur-md">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-bold uppercase tracking-wider text-ink-400">Jokey yarışı</span>
              <span className="text-[10px] font-bold text-ink-800">
                {(() => {
                  const leader = [...state.horse.lanes].sort((a, b) => b.progress - a.progress)[0];
                  return leader ? `${leader.name} · %${Math.round(leader.progress)}` : 'Hazır';
                })()}
              </span>
            </div>
            <div className="mt-1.5 flex gap-1">
              {[...state.horse.lanes]
                .sort((a, b) => b.progress - a.progress)
                .slice(0, 3)
                .map((lane) => (
                  <div key={lane.id} className="flex-1 rounded-md bg-[#fff8e7] px-1.5 py-1">
                    <div className="h-1 overflow-hidden rounded-full bg-ink-100">
                      <div className="h-full rounded-full" style={{ width: `${lane.progress}%`, background: lane.color }} />
                    </div>
                    <p className="mt-0.5 truncate text-[7px] font-semibold text-ink-500">{lane.id}. {lane.name}</p>
                  </div>
                ))}
            </div>
          </div>
        </div>
      ) : null}

      {game.mode === 'versus' && state?.wall ? (
        <div className="absolute inset-x-3 top-[62px] z-10 sm:inset-x-4">
          <div className="rounded-2xl border border-white/80 bg-white/85 p-2.5 shadow-sm backdrop-blur-md">
            <div className="flex items-center justify-between text-[9px] font-extrabold">
              <span className="text-pink-600">{game.key === 'clash' ? 'KIRMIZI' : 'KIZLAR'} · {Math.round(state.wall.girls)}m</span>
              <span className="text-ink-400">DUVAR</span>
              <span className="text-blue-600">{Math.round(state.wall.boys)}m · {game.key === 'clash' ? 'MAVİ' : 'ERKEKLER'}</span>
            </div>
            <div className="mt-1.5 flex h-2 overflow-hidden rounded-full bg-ink-100">
              <div className="h-full bg-pink-500 transition-[width] duration-300" style={{ width: `${((1 - state.wall.position) / 2) * 100}%` }} />
              <div className="h-full flex-1 bg-blue-500" />
            </div>
          </div>
        </div>
      ) : null}

      {game.mode === 'wheel' && state?.players.length ? (
        <div className="absolute inset-x-3 top-[62px] z-10 sm:inset-x-4">
          <div className="flex items-center justify-between rounded-2xl border border-white/80 bg-white/85 px-3 py-2 shadow-sm backdrop-blur-md">
            <span className="text-[9px] font-bold uppercase tracking-wider text-ink-400">Bilet sıralaması</span>
            <span className="text-[10px] font-bold text-ink-800">
              {[...state.players].sort((a, b) => b.score - a.score)[0]?.name} ·{' '}
              {Math.round([...state.players].sort((a, b) => b.score - a.score)[0]?.score ?? 0)}
            </span>
          </div>
        </div>
      ) : null}

      {state?.phase === 'lobby' && (state.players.length > 0 || demo) ? (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#fffaf4]/45">
          <div className="mx-6 rounded-3xl border border-white/80 bg-white/85 px-6 py-5 text-center shadow-float backdrop-blur-md">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: game.accent }}>
              Lobi
            </p>
            <p className="mt-1 text-lg font-bold text-ink-950">{copy.lobbyTitle}</p>
            <p className="mt-1 text-[10px] text-ink-500">
              {state.players.length} {copy.players} · {copy.lobbySub}
            </p>
          </div>
        </div>
      ) : null}

      {state?.phase === 'lobby' && state.players.length === 0 && !demo ? (
        <div className="absolute inset-0 z-20 flex items-center justify-center">
          <div className="mx-6 rounded-3xl border border-white/80 bg-white/85 px-6 py-5 text-center shadow-float backdrop-blur-md">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: game.accent }}>
              {copy.ready}
            </p>
            <p className="mt-1 text-lg font-bold text-ink-950">{copy.wait}</p>
            <p className="mt-1.5 max-w-[230px] text-[10px] leading-relaxed text-ink-500">
              {copy.waitSub}
            </p>
          </div>
        </div>
      ) : null}

      {state?.phase === 'finished' && state.winner ? (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#fffaf4]/35">
          <div className="mx-5 w-full max-w-[320px] rounded-[28px] border border-white/80 bg-white/90 p-6 text-center shadow-float backdrop-blur-md">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: game.accent }}>
              {state.winner.label}
            </p>
            <p className="mt-2 text-3xl font-extrabold tracking-tight text-ink-950">
              {state.winner.name}
            </p>
            <p className="mt-1 text-[11px] text-ink-500">
              {Math.round(state.winner.score)} {copy.score} · {copy.winner}
            </p>
            <div className="mt-4 text-3xl">🏆</div>
          </div>
        </div>
      ) : null}

      {(game.mode === 'quiz' || game.mode === 'word') && prompt && state?.phase === 'running' ? (
        <div className="absolute inset-x-3 bottom-[13%] z-20 sm:inset-x-4">
          <div className="rounded-[24px] border border-white/80 bg-white/92 p-4 shadow-float backdrop-blur-md">
            <div className="flex items-center justify-between gap-2">
              <span
                className="rounded-full px-2.5 py-1 text-[8px] font-extrabold uppercase tracking-[0.12em] text-white"
                style={{ background: game.accent }}
              >
                {prompt.title}
              </span>
              <span className="text-[9px] font-semibold text-ink-400">
                {prompt.reveal ? 'Cevap açıklandı' : 'Sohbetten cevapla'}
              </span>
            </div>
            <p className="mt-2.5 text-balance text-[14px] font-bold leading-snug text-ink-950">
              {prompt.question}
            </p>
            {prompt.kind === 'quiz' && prompt.options ? (
              <div className="mt-3 grid grid-cols-2 gap-1.5">
                {prompt.options.map((option, index) => {
                  const correct = prompt.reveal && prompt.answerIndex === index;
                  return (
                    <div
                      key={`${prompt.id}-${option}`}
                      className={`rounded-lg border px-2 py-1.5 text-[9px] font-semibold leading-tight ${
                        correct
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                          : 'border-[#eee7dc] bg-[#fffaf4] text-ink-600'
                      }`}
                    >
                      <span className="mr-1 text-brand-700">{['A', 'B', 'C', 'D'][index]}</span>
                      {option}
                    </div>
                  );
                })}
              </div>
            ) : null}
            {prompt.kind === 'word' ? (
              <div className="mt-3 flex items-center gap-3 rounded-xl bg-[#f7f0ff] p-2.5">
                <span className="grid h-10 w-10 place-items-center rounded-lg bg-white text-2xl font-black text-violet-700">
                  {prompt.letter}
                </span>
                <p className="text-[10px] leading-relaxed text-ink-500">
                  Bu harfle başlayan bir cevabı sohbete yaz. Kategori: <strong>{prompt.category}</strong>
                </p>
              </div>
            ) : null}
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-ink-100">
              <div
                className="h-full rounded-full transition-[width] duration-300"
                style={{
                  width: `${Math.max(0, Math.min(100, ((prompt.endsAt - now) / 16000) * 100))}%`,
                  background: game.accent,
                }}
              />
            </div>
          </div>
        </div>
      ) : null}

      {nameRail.length > 0 && state?.phase !== 'finished' ? (
        <div className="absolute inset-x-2 bottom-2 z-30 flex gap-1 overflow-x-auto pb-0.5 [scrollbar-width:none]">
          {nameRail.map((player, index) => (
            <span
              key={player.id}
              className="inline-flex shrink-0 items-center gap-1 rounded-full border border-white/90 bg-white/95 px-2.5 py-1.5 text-[10px] font-bold text-ink-800 shadow-md backdrop-blur sm:text-[11px]"
            >
              {player.avatar ? (
                <img
                  src={player.avatar}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="h-4 w-4 rounded-full object-cover"
                />
              ) : (
                <span
                  className="grid h-4 w-4 place-items-center rounded-full text-[7px] font-bold text-white"
                  style={{ background: player.color }}
                >
                  {index + 1}
                </span>
              )}
              <span className="max-w-[96px] truncate">{player.name}</span>
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
