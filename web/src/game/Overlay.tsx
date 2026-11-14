import { useEffect, useRef, useState } from 'react';
import {
  BarChart3,
  Crown,
  Gift,
  Heart,
  HelpCircle,
  LogIn,
  LogOut,
  MessageSquare,
  Radio,
  Repeat,
  Shield,
  Swords,
  Trophy,
} from 'lucide-react';
import type {
  BattleFeedItem,
  BattleStateView,
  BattleTeamView,
  CommandSheet,
  GameSettings,
  Locale,
  TeamDTO,
  WsNoticeCode,
} from '@shared/types';
import { liveUi } from '@shared/languages';
import { formatTimer } from '../lib/format';
import { TeamCrest } from '../components/ui';

export interface StageConfig {
  gameName: string;
  locale: Locale;
  teams: TeamDTO[];
  settings: GameSettings;
  commands: CommandSheet;
  slug?: string;
}

function feedMeta(kind: BattleFeedItem['kind']): { icon: typeof Gift; tone: string } {
  switch (kind) {
    case 'gift':
      return { icon: Gift, tone: 'text-amber-300 bg-amber-400/15' };
    case 'like':
      return { icon: Heart, tone: 'text-pink-300 bg-pink-400/15' };
    case 'comment':
      return { icon: MessageSquare, tone: 'text-sky-300 bg-sky-400/15' };
    case 'join':
      return { icon: LogIn, tone: 'text-brand-300 bg-brand-400/15' };
    case 'leave':
      return { icon: LogOut, tone: 'text-white/60 bg-white/10' };
    case 'switch':
      return { icon: Repeat, tone: 'text-violet-300 bg-violet-400/15' };
    case 'castle_down':
      return { icon: Swords, tone: 'text-orange-300 bg-orange-400/15' };
    case 'round_start':
      return { icon: Swords, tone: 'text-brand-300 bg-brand-400/15' };
    case 'round_end':
      return { icon: Trophy, tone: 'text-amber-300 bg-amber-400/15' };
    default:
      return { icon: Radio, tone: 'text-white/60 bg-white/10' };
  }
}

export function feedText(item: BattleFeedItem, locale: Locale): string {
  const ui = liveUi(locale);
  const player = item.playerName ?? '';
  switch (item.kind) {
    case 'join':
      return `${player} · ${item.teamName ?? ''} ${ui.joined}`;
    case 'leave':
      return `${player} ${ui.left}`;
    case 'switch':
      return `${player} · ${item.teamName ?? ''} ${ui.switched}`;
    case 'gift':
      return `${player} ${ui.giftAttack}${item.teamName ? ` (${item.teamName})` : ''}`;
    case 'like':
      return `${player} ${ui.likeShield}`;
    case 'comment':
      return `${player} ${ui.commentSoldiers}`;
    case 'castle_down':
      return `${item.teamName ?? ui.team} ${ui.castleDown}`;
    case 'round_start':
      return `${ui.roundStarted}${item.amount ? ` · ${item.amount}` : ''}`;
    case 'round_end':
      return item.code === 'DRAW' ? ui.draw : `${item.teamName ?? ''} ${ui.won}`;
    default:
      return player;
  }
}

interface OverlayProps {
  view: BattleStateView | null;
  config: StageConfig;
  mode: 'live' | 'preview';
  now: number;
  myTeamSlot: number | null;
  notice: { code: WsNoticeCode; message?: string } | null;
}

function placeholders(config: StageConfig): BattleTeamView[] {
  return config.teams.map((team) => ({
    slot: team.slot,
    name: team.name,
    primaryColor: team.primaryColor,
    secondaryColor: team.secondaryColor,
    symbol: team.symbol,
    emblemUrl: team.emblemUrl,
    soldierLook: team.soldierLook,
    castleLook: team.castleLook,
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
}

function TeamScoreCard({
  team,
  joinCommand,
  compact,
  locale,
  myTeam,
}: {
  team: BattleTeamView;
  joinCommand?: string;
  compact: boolean;
  locale: Locale;
  myTeam: boolean;
}) {
  const ui = liveUi(locale);
  const hpPercent = team.maxCastleHp > 0 ? Math.max(0, (team.castleHp / team.maxCastleHp) * 100) : 0;
  return (
    <div
      className={`relative overflow-hidden rounded-[20px] border bg-black/45 backdrop-blur-md transition-opacity ${
        myTeam ? 'border-white/50' : 'border-white/10'
      } ${team.alive ? '' : 'opacity-45'}`}
      style={{ boxShadow: `inset 0 -3px 0 ${team.primaryColor}` }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{ background: `radial-gradient(120% 100% at 0% 0%, ${team.primaryColor}55, transparent 60%)` }}
      />
      <div className={`relative flex items-center gap-3 ${compact ? 'px-3.5 py-2.5' : 'px-4 py-3.5'}`}>
        <TeamCrest
          symbol={team.symbol}
          emblemUrl={team.emblemUrl}
          color={team.primaryColor}
          size={compact ? 38 : 52}
          className="shadow-lg"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <p
              className={`truncate font-bold tracking-tight text-white ${
                compact ? 'text-[17px]' : 'text-[22px]'
              }`}
            >
              {team.name}
            </p>
            <span className={`font-semibold text-white/70 ${compact ? 'text-[12px]' : 'text-[14px]'}`}>
              {team.playerCount} {ui.players.toLowerCase()}
            </span>
          </div>
          <div className="mt-1.5 flex items-center gap-2">
            <div className="h-[7px] flex-1 overflow-hidden rounded-full bg-white/15">
              <div
                className="h-full rounded-full transition-[width] duration-700"
                style={{ width: `${hpPercent}%`, background: team.primaryColor }}
              />
            </div>
            <span className={`tabular-nums font-semibold text-white/55 ${compact ? 'text-[10px]' : 'text-[12px]'}`}>
              {Math.round(hpPercent)}%
            </span>
          </div>
          {!compact ? (
            <div className="mt-1.5 flex items-center gap-3 text-[11px] text-white/45">
              <span className="inline-flex items-center gap-1">
                <Shield size={11} /> {team.soldiers} {ui.soldiers.toLowerCase()}
              </span>
              <span className="inline-flex items-center gap-1">
                <BarChart3 size={11} /> {team.score} {ui.points}
              </span>
              {joinCommand ? (
                <span className="ml-auto rounded-md bg-white/10 px-1.5 py-0.5 font-mono text-[10px] text-white/60">
                  !{joinCommand}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
      {team.shieldStrength > 0.01 ? (
        <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-sky-400/20 px-2 py-0.5 text-[9px] font-bold text-sky-200">
          <Shield size={9} /> {Math.round(team.shieldStrength * 100)}%
        </span>
      ) : null}
      {!team.alive ? (
        <span className="absolute bottom-1.5 right-2 rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-orange-300">
          Yıkıldı
        </span>
      ) : null}
    </div>
  );
}

export function LiveOverlay({ view, config, mode, now, myTeamSlot, notice }: OverlayProps) {
  const locale = view?.locale ?? config.locale;
  const ui = liveUi(locale);
  const teams = view?.teams ?? placeholders(config);
  const settings = view?.settings ?? config.settings;
  const phase = view?.phase ?? 'lobby';
  const compact = teams.length > 4;
  const joinCommands = new Map(config.teams.map((team) => [team.slot, team.joinCommand]));
  const remainingMs = view?.endsAt ? view.endsAt - now : settings.roundDurationSec * 1000;
  const progress = Math.max(0, Math.min(1, remainingMs / (settings.roundDurationSec * 1000)));
  const lobbyRemaining = view?.lobbyStartsAt ? Math.max(0, view.lobbyStartsAt - now) : null;
  const myTeam = myTeamSlot ? teams.find((team) => team.slot === myTeamSlot) : undefined;
  const winner = view?.winnerSlot ? teams.find((team) => team.slot === view.winnerSlot) : undefined;
  const feed = (view?.feed ?? []).filter((item) => item.kind !== 'round_start').slice(-5).reverse();
  const players = (view?.players ?? []).slice(0, 3);
  const isTest = mode === 'preview' || Boolean(view?.testMode);

  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex flex-col overflow-hidden text-white">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[780px] bg-gradient-to-b from-black/90 via-black/55 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[640px] bg-gradient-to-t from-black/90 via-black/50 to-transparent" />

      {/* Üst bilgi */}
      <header className="relative z-20 flex items-start justify-between px-10 pt-9">
        <div>
          <p className="flex items-center gap-3 font-display text-[26px] font-bold leading-none tracking-tight text-white">
            {config.gameName}
          </p>
          <p className="mt-2 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.22em] text-white/35">
            <Swords size={13} className="text-brand-400" />
            {ui.poweredBy} · {ui.roundLabel} {view?.roundIndex ?? 1}
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          {isTest ? (
            <span className="rounded-full border border-amber-300/30 bg-amber-400/15 px-3 py-1.5 text-[11px] font-bold tracking-[0.12em] text-amber-200">
              {ui.testMode}
            </span>
          ) : null}
          <span
            className={`flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[12px] font-bold tracking-[0.12em] ${
              phase === 'running'
                ? 'border border-red-400/40 bg-red-500/15 text-red-200'
                : 'border border-white/15 bg-white/5 text-white/50'
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                phase === 'running' ? 'live-dot bg-red-400' : 'bg-white/40'
              }`}
            />
            {phase === 'running' ? ui.live : ui.offline}
          </span>
        </div>
      </header>

      {/* Skorboard */}
      <div className={`relative z-20 mt-5 grid grid-cols-2 gap-2.5 px-8 ${compact ? '' : 'gap-3'}`}>
        {teams.map((team) => (
          <TeamScoreCard
            key={team.slot}
            team={team}
            joinCommand={joinCommands.get(team.slot)}
            compact={compact}
            locale={locale}
            myTeam={myTeamSlot === team.slot}
          />
        ))}
      </div>

      {/* Sayaç */}
      <div className="relative z-20 mt-4 flex flex-col items-center">
        {phase === 'running' ? (
          <>
            <div className="flex items-end gap-3 rounded-2xl border border-white/10 bg-black/45 px-6 py-2 backdrop-blur-md">
              <span className="font-display text-[46px] font-bold leading-none tracking-tight tabular-nums text-white">
                {formatTimer(remainingMs)}
              </span>
              <span className="pb-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/35">
                {ui.roundEndsIn}
              </span>
            </div>
            <div className="mt-2 h-[5px] w-[540px] max-w-[70%] overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-brand-500 via-brand-300 to-amber-300 transition-[width] duration-300"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
          </>
        ) : phase === 'lobby' ? (
          <div className="rounded-2xl border border-white/10 bg-black/45 px-6 py-2.5 text-center backdrop-blur-md">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-300">
              {lobbyRemaining !== null ? ui.startingSoon : ui.waitingForPlayers}
            </p>
            <p className="mt-1 font-display text-[28px] font-bold tabular-nums">
              {lobbyRemaining !== null ? `${Math.ceil(lobbyRemaining / 1000)} sn` : ui.lobbyTitle}
            </p>
          </div>
        ) : null}
      </div>

      <div className="relative z-20 mt-auto flex flex-col gap-3 px-8 pb-8">
        {/* Takımın */}
        {myTeam ? (
          <div className="flex items-center justify-center">
            <span
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/50 px-3.5 py-1.5 text-[11px] font-semibold text-white/70 backdrop-blur"
              style={{ boxShadow: `inset 0 -2px 0 ${myTeam.primaryColor}` }}
            >
              <span className="text-sm">{myTeam.symbol}</span>
              {ui.yourTeam}: {myTeam.name}
            </span>
          </div>
        ) : null}

        {/* Feed + liderlik */}
        <div className="flex items-end justify-between gap-4">
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            {feed.map((item) => {
              const meta = feedMeta(item.kind);
              const Icon = meta.icon;
              return (
                <div
                  key={item.id}
                  className="feed-in flex w-fit max-w-full items-center gap-2 rounded-xl border border-white/10 bg-black/55 px-2.5 py-1.5 backdrop-blur-md"
                >
                  <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-lg ${meta.tone}`}>
                    <Icon size={12} />
                  </span>
                  <span className="truncate text-[12px] font-medium text-white/75">
                    {feedText(item, locale)}
                  </span>
                </div>
              );
            })}
            {phase === 'lobby' && feed.length === 0 ? (
              <p className="rounded-xl border border-white/10 bg-black/45 px-3 py-2 text-[12px] text-white/45 backdrop-blur">
                {ui.noPlayersYet}
              </p>
            ) : null}
          </div>

          {players.length >= 3 && phase === 'running' ? (
            <div className="hidden w-[250px] shrink-0 rounded-2xl border border-white/10 bg-black/45 p-3 backdrop-blur-md min-[420px]:block">
              <p className="mb-2 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.18em] text-white/35">
                <Crown size={10} className="text-amber-300" /> {ui.topFans}
              </p>
              <div className="space-y-1.5">
                {players.map((player, index) => {
                  const team = teams.find((candidate) => candidate.slot === player.teamSlot);
                  return (
                    <div key={player.id} className="flex items-center gap-2">
                      <span className="w-3 text-[10px] font-bold text-white/30">{index + 1}</span>
                      <span
                        className="h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{ background: team?.primaryColor ?? '#94a3b8' }}
                      />
                      <span className="min-w-0 flex-1 truncate text-[11px] font-medium text-white/70">
                        {player.name}
                      </span>
                      <span className="text-[10px] font-bold tabular-nums text-white/45">{player.score}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>

        {/* Komut paneli */}
        {phase === 'lobby' ? (
          <div className="rounded-[24px] border border-white/10 bg-black/60 p-4 backdrop-blur-xl">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-300">
                  {ui.joinHint}
                </p>
                <p className="mt-1 text-[13px] text-white/45">{ui.lobbySubtitle}</p>
              </div>
              <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold text-white/40">
                {config.commands.prefix}
                {config.commands.system.find((row) => row.action === 'JOIN_TEAM')?.command ?? 'join'}{' '}
                {ui.team.toLowerCase()}
              </span>
            </div>
            <div className={`mt-3 grid gap-2 ${teams.length <= 2 ? 'grid-cols-2' : teams.length === 4 ? 'grid-cols-4' : 'grid-cols-4'}`}>
              {teams.map((team) => (
                <div
                  key={team.slot}
                  className="rounded-xl border border-white/10 bg-white/[0.04] px-2 py-2.5 text-center"
                  style={{ boxShadow: `inset 0 -2px 0 ${team.primaryColor}` }}
                >
                  <div className="mx-auto grid h-8 w-8 place-items-center rounded-lg text-lg" style={{ background: `${team.primaryColor}22` }}>
                    {team.emblemUrl ? (
                      <img src={team.emblemUrl} alt="" className="h-full w-full rounded-lg object-cover" />
                    ) : (
                      team.symbol
                    )}
                  </div>
                  <p className="mt-1.5 truncate text-[11px] font-bold text-white/80">{team.name}</p>
                  <p className="mt-0.5 truncate font-mono text-[9px] text-white/35">
                    !{joinCommands.get(team.slot)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-[22px] border border-white/10 bg-black/55 px-4 py-3 backdrop-blur-xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-1 text-[10px] font-bold uppercase tracking-[0.18em] text-brand-300">
                {ui.commands}
              </span>
              {teams.map((team) => (
                <span
                  key={team.slot}
                  className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-[11px] font-semibold text-white/60"
                >
                  <span className="text-[12px]">{team.symbol}</span>
                  <span className="font-mono text-white/75">!{joinCommands.get(team.slot)}</span>
                </span>
              ))}
              <span className="ml-auto flex flex-wrap items-center gap-1.5 text-[10px] text-white/35">
                <span className="inline-flex items-center gap-1 rounded-md bg-white/5 px-1.5 py-1">
                  <Repeat size={10} /> {config.commands.prefix}
                  {config.commands.system.find((row) => row.action === 'CHANGE_TEAM')?.command}
                </span>
                <span className="inline-flex items-center gap-1 rounded-md bg-white/5 px-1.5 py-1">
                  <LogOut size={10} /> {config.commands.prefix}
                  {config.commands.system.find((row) => row.action === 'LEAVE_TEAM')?.command}
                </span>
                <span className="inline-flex items-center gap-1 rounded-md bg-white/5 px-1.5 py-1">
                  <BarChart3 size={10} /> {config.commands.prefix}
                  {config.commands.system.find((row) => row.action === 'SHOW_SCORE')?.command}
                </span>
                <span className="inline-flex items-center gap-1 rounded-md bg-white/5 px-1.5 py-1">
                  <HelpCircle size={10} /> {config.commands.prefix}
                  {config.commands.system.find((row) => row.action === 'HELP')?.command}
                </span>
              </span>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between text-[9px] font-semibold uppercase tracking-[0.2em] text-white/20">
          <span>{config.gameName}</span>
          <span className="flex items-center gap-1.5">
            <Radio size={9} /> {ui.poweredBy}
          </span>
        </div>
      </div>

      {/* Tur sonu */}
      {phase === 'finished' ? (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/55 px-10 backdrop-blur-sm">
          <div className="winner-pop w-full max-w-[720px] rounded-[28px] border border-white/15 bg-ink-950/90 p-8 text-center shadow-2xl">
            <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-white/35">
              {ui.roundOver}
            </p>
            {winner ? (
              <>
                <div className="mx-auto mt-4 flex justify-center">
                  <TeamCrest
                    symbol={winner.symbol}
                    emblemUrl={winner.emblemUrl}
                    color={winner.primaryColor}
                    size={96}
                  />
                </div>
                <p className="mt-4 text-[12px] font-bold uppercase tracking-[0.24em] text-brand-300">
                  {ui.winner}
                </p>
                <h2 className="mt-1 font-display text-[54px] font-bold leading-none tracking-tight">
                  {winner.name}
                </h2>
                <div className="mt-5 flex items-center justify-center gap-6 text-[12px] text-white/45">
                  <span>{winner.playerCount} {ui.players.toLowerCase()}</span>
                  <span>{winner.soldiers} {ui.soldiers.toLowerCase()}</span>
                  <span>{winner.score} {ui.points}</span>
                </div>
              </>
            ) : (
              <h2 className="mt-4 font-display text-[54px] font-bold text-white">{ui.draw}</h2>
            )}
            <p className="mt-6 text-[11px] text-white/30">{ui.nextRoundSoon}</p>
          </div>
        </div>
      ) : null}

      {notice ? (
        <div className="absolute left-1/2 top-[62%] z-40 w-[min(720px,90%)] -translate-x-1/2">
          <div className="animate-fade-up flex items-center gap-3 rounded-2xl border border-amber-300/30 bg-ink-950/90 px-4 py-3 shadow-2xl backdrop-blur">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-amber-400/15 text-amber-300">
              <HelpCircle size={15} />
            </span>
            <p className="text-[13px] font-medium leading-snug text-white/80">{notice.message}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** Sunucu saatine göre canlı sayaç. */
export function useStageClock(view: BattleStateView | null): number {
  const offsetRef = useRef(0);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (view) offsetRef.current = view.serverTime - Date.now();
  }, [view?.serverTime]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, []);

  return now + offsetRef.current;
}
