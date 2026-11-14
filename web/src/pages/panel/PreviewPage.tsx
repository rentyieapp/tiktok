import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Gift,
  Heart,
  Info,
  MessageSquare,
  Pause,
  Play,
  Radio,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Terminal,
  TestTube2,
} from 'lucide-react';
import type { BattleStateView, GameDTO, Locale } from '@shared/types';
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
import { useStudio } from '../../lib/studio';
import { BattleStage } from '../../game/BattleStage';
import type { StageConfig } from '../../game/Overlay';
import { Button, PageHeader, SectionCard, Toggle } from '../../components/ui';

const DEMO_NAMES = ['Deniz', 'Ece', 'Mert', 'Selin', 'Can', 'Ada', 'Efe', 'Yaz'];

function createSimulation(game: GameDTO): BattleState {
  const state = createBattleState({
    gameId: game.id,
    gameName: game.gameName,
    publicSlug: game.publicSlug,
    locale: game.language,
    teams: game.teams,
    settings: game.settings,
    commandOverrides: {},
    testMode: true,
    seed: Date.now(),
  });
  const players: Array<{
    externalId: string;
    displayName: string;
    teamSlot: number;
    score: number;
  }> = [];
  game.teams.forEach((team, teamIndex) => {
    for (let index = 0; index < 3; index += 1) {
      players.push({
        externalId: `preview_${teamIndex}_${index}`,
        displayName: DEMO_NAMES[(teamIndex * 3 + index) % DEMO_NAMES.length] ?? 'İzleyici',
        teamSlot: team.slot,
        score: 0,
      });
    }
  });
  hydratePlayers(state, players);
  startRound(state, Date.now());
  return state;
}

export function PreviewPage() {
  const { game, commands } = useStudio();
  const [view, setView] = useState<BattleStateView | null>(null);
  const [paused, setPaused] = useState(false);
  const [autoSupport, setAutoSupport] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState(1);
  const [roundKey, setRoundKey] = useState(0);
  const stateRef = useRef<BattleState | null>(null);
  const pausedRef = useRef(false);
  const autoRef = useRef(true);
  const finishedAtRef = useRef<number | null>(null);
  const lastSupportRef = useRef(0);

  const reset = useCallback(() => {
    if (!game) return;
    const state = createSimulation(game);
    stateRef.current = state;
    finishedAtRef.current = null;
    lastSupportRef.current = Date.now();
    setView(toBattleStateView(state));
    setRoundKey((value) => value + 1);
  }, [game]);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);
  useEffect(() => {
    autoRef.current = autoSupport;
  }, [autoSupport]);

  useEffect(() => {
    if (!game) return;
    reset();
  }, [game, reset]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const state = stateRef.current;
      if (!state || pausedRef.current) return;
      const now = Date.now();
      if (state.phase === 'running') {
        tickBattle(state, now);
        if (autoRef.current && now - lastSupportRef.current > 3200) {
          lastSupportRef.current = now;
          const team = state.teams[Math.floor(Math.random() * state.teams.length)];
          if (team) {
            const types: LiveEventType[] = ['gift', 'like', 'comment'];
            const type = types[Math.floor(Math.random() * types.length)];
            applyLiveEvent(state, {
              externalId: `preview_${now}_${Math.random().toString(36).slice(2, 7)}`,
              type,
              teamSlot: team.slot,
              playerExternalId: `preview_supporter_${team.slot}`,
              playerName: `${team.name} Destekçisi`,
              amount: 1,
              at: now,
            });
          }
        }
        if ((state.phase as string) === 'finished') finishedAtRef.current = now;
      } else if (state.phase === 'finished') {
        if (finishedAtRef.current && now - finishedAtRef.current > 6000) {
          reset();
          return;
        }
      } else {
        startRound(state, now);
      }
      setView(toBattleStateView(state));
    }, 250);
    return () => window.clearInterval(timer);
  }, [reset, roundKey]);

  const sendSupport = (type: LiveEventType) => {
    const state = stateRef.current;
    if (!state || state.phase !== 'running') return;
    applyLiveEvent(state, {
      externalId: `preview_manual_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      type,
      teamSlot: selectedTeam,
      playerExternalId: `preview_manual_${selectedTeam}`,
      playerName: 'Test İzleyici',
      amount: 1,
      at: Date.now(),
    });
    setView(toBattleStateView(state));
  };

  if (!game) return null;

  const locale: Locale = game.language;
  const sheet =
    commands?.sheet ??
    buildCommandSheet(
      locale,
      game.teams.map((team) => ({
        slot: team.slot,
        name: team.name,
        joinCommand: team.joinCommand,
        primaryColor: team.primaryColor,
      })),
      {},
    );
  const config: StageConfig = {
    gameName: game.gameName,
    locale,
    teams: game.teams,
    settings: game.settings,
    commands: sheet,
    slug: game.publicSlug,
  };

  return (
    <div>
      <PageHeader
        eyebrow="Yayın"
        title="Oyun önizlemesi"
        description="Aynı 3D motor, aynı OBS sahnesi. Önizleme tamamen test modunda çalışır; gerçek canlı yayın olayları kullanılmaz."
        actions={
          <>
            <Button
              variant="secondary"
              icon={<RotateCcw size={15} />}
              onClick={() => reset()}
            >
              Sıfırla
            </Button>
            <Link to="/panel/yayin">
              <Button variant="primary" icon={<Radio size={15} />}>
                Yayın bağlantım
              </Button>
            </Link>
          </>
        }
      />

      <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-[12px] leading-relaxed text-amber-900">
        <TestTube2 size={15} className="mt-0.5 shrink-0 text-amber-600" />
        <span>
          <span className="font-semibold">Test modu.</span> Buradaki oyuncular, destekler ve tur
          sonuçları örnek veridir. Gerçek yayın verisi kullanılmaz; hiçbir sonuç istatistiklere
          yazılmaz.
        </span>
      </div>

      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_430px]">
        <div className="card overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-100 px-5 py-4">
            <div>
              <h2 className="flex items-center gap-2 text-[15px] font-semibold text-ink-900">
                <Sparkles size={15} className="text-brand-600" /> Canlı sahne
              </h2>
              <p className="mt-0.5 text-[11px] text-ink-500">
                {game.gameName} · {game.teams.length} takım · {game.settings.roundDurationSec} sn
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant={paused ? 'brand' : 'secondary'}
                size="sm"
                icon={paused ? <Play size={13} /> : <Pause size={13} />}
                onClick={() => setPaused((value) => !value)}
              >
                {paused ? 'Devam et' : 'Duraklat'}
              </Button>
              <Button variant="secondary" size="sm" icon={<RefreshCw size={13} />} onClick={() => reset()}>
                Yeni tur
              </Button>
            </div>
          </div>
          <div className="bg-ink-950 p-4 sm:p-6">
            <div className="mx-auto w-full max-w-[380px] overflow-hidden rounded-[26px] border-[5px] border-ink-800 bg-black shadow-float">
              <div className="aspect-[9/16] w-full">
                <BattleStage view={view} config={config} mode="preview" />
              </div>
            </div>
            <p className="mt-3 text-center text-[10px] text-white/35">
              Gerçek yayında bu alan 1080 × 1920 olarak OBS’e gider.
            </p>
          </div>
        </div>

        <aside className="min-w-0 space-y-4">
          <SectionCard
            title="Test kontrolleri"
            description="Sahneye anında destek gönder ve oyun dengesini dene."
            icon={<Terminal size={16} />}
          >
            <div className="space-y-4">
              <Toggle
                checked={autoSupport}
                onChange={setAutoSupport}
                label="Otomatik destekler"
                description="Her ~3 saniyede rastgele bir takıma hediye/beğeni/yorum simüle edilir."
              />
              <div>
                <label className="text-[11px] font-medium text-ink-600">
                  Destek gönderilecek takım
                  <select
                    className="select mt-1 text-xs"
                    value={selectedTeam}
                    onChange={(event) => setSelectedTeam(Number(event.target.value))}
                  >
                    {game.teams.map((team) => (
                      <option key={team.slot} value={team.slot}>
                        {team.symbol} {team.name} (!{team.joinCommand})
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant="secondary"
                  className="flex-col !py-3 text-[10px]"
                  icon={<Gift size={17} className="text-amber-500" />}
                  onClick={() => sendSupport('gift')}
                >
                  Hediye saldırısı
                </Button>
                <Button
                  variant="secondary"
                  className="flex-col !py-3 text-[10px]"
                  icon={<Heart size={17} className="text-pink-500" />}
                  onClick={() => sendSupport('like')}
                >
                  Savunma kalkanı
                </Button>
                <Button
                  variant="secondary"
                  className="flex-col !py-3 text-[10px]"
                  icon={<MessageSquare size={17} className="text-sky-500" />}
                  onClick={() => sendSupport('comment')}
                >
                  Asker desteği
                </Button>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Test verisi" description="Önizleme oyuncuları ve tur bilgisi." icon={<Info size={16} />}>
            <div className="space-y-2.5 text-[12px]">
              <div className="flex items-center justify-between">
                <span className="text-ink-500">Takım sayısı</span>
                <span className="font-semibold text-ink-900">{game.teams.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-500">Tur süresi</span>
                <span className="font-semibold text-ink-900">{game.settings.roundDurationSec} sn</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-500">Kale canı</span>
                <span className="font-semibold text-ink-900">{game.settings.castleHp}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-500">Kazanma koşulu</span>
                <span className="font-semibold text-ink-900">
                  {game.settings.winCondition === 'last_standing'
                    ? 'Son ayakta kalan'
                    : game.settings.winCondition === 'highest_castle_hp'
                      ? 'En sağlam kale'
                      : 'En yüksek skor'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-500">Dil</span>
                <span className="font-semibold uppercase text-ink-900">{game.language}</span>
              </div>
            </div>
          </SectionCard>

          <div className="rounded-2xl border border-brand-200/60 bg-brand-50/50 p-4">
            <p className="text-[11px] font-semibold text-brand-800">Gerçek yayına geçmeye hazır mısın?</p>
            <p className="mt-1 text-[11px] leading-relaxed text-brand-800/70">
              Ayarlarını kaydet, yayın bağlantını OBS’e ekle. İzleyiciler sohbetten komutla katılır;
              turlar otomatik başlar.
            </p>
            <Link to="/panel/yayin" className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-brand-700">
              Yayın bağlantısına git <Radio size={12} />
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
