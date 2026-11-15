import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowRight,
  Check,
  Clock3,
  Gamepad2,
  Heart,
  MessageCircle,
  Play,
  Radio,
  Send,
  ShieldAlert,
  ShieldCheck,
  Twitch,
  Users,
  Youtube,
  Zap,
} from 'lucide-react';
import type { ArcadeRoomPublicDTO, LivePlatform } from '@shared/types';
import { api } from '../../lib/api';
import { useArcadeSocket } from '../../lib/useArcadeSocket';
import { ArcadeLiveStage } from '../../components/ArcadeLiveStage';
import { ArcadeOverlay } from '../../components/ArcadeOverlay';
import { useArcadeTTS } from '../../lib/useArcadeTTS';
import { sanitizeArcadeRoomSettings } from '@shared/arcadeSettings';
import { MarketingFooter, MarketingHeader } from '../../components/MarketingHeader';
import { Button } from '../../components/ui';

const PLATFORM_LABELS: Record<LivePlatform, string> = {
  twitch: 'Twitch',
  youtube: 'YouTube',
  tiktok: 'TikTok',
};

const FEED_COLORS: Record<string, string> = {
  join: 'text-brand-700',
  like: 'text-pink-600',
  gift: 'text-amber-700',
  answer: 'text-blue-700',
  system: 'text-ink-400',
  win: 'text-amber-700 font-semibold',
};

export function ArcadeRoomPage() {
  const { slug } = useParams<{ slug: string }>();
  const [data, setData] = useState<ArcadeRoomPublicDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const obs = new URLSearchParams(window.location.search).get('obs') === '1';

  useEffect(() => {
    if (!slug) return;
    api
      .get<ArcadeRoomPublicDTO>(`/api/arcade/rooms/${encodeURIComponent(slug)}/public`)
      .then(setData)
      .catch((caught) => setError(caught instanceof Error ? caught.message : 'Oda yüklenemedi.'))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#fbf7f0] text-sm text-ink-500">
        Oda bağlanıyor...
      </div>
    );
  }

  if (error || !data || !slug) {
    return (
      <div className="min-h-screen bg-[#fbf7f0]">
        {!obs ? <MarketingHeader /> : null}
        <div className="mx-auto max-w-lg px-5 py-24 text-center">
          <Gamepad2 size={36} className="mx-auto text-ink-300" />
          <h1 className="mt-4 text-2xl font-bold text-ink-950">Oda bulunamadı</h1>
          <p className="mt-2 text-sm text-ink-500">{error ?? 'Bağlantı geçersiz veya kapalı.'}</p>
          <Link to="/panel/arcade" className="mt-6 inline-flex">
            <Button variant="brand" icon={<ArrowRight size={14} />}>
              Oyun odalarına dön
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!data.licensed) {
    return (
      <div className="min-h-screen bg-[#fbf7f0]">
        {!obs ? <MarketingHeader /> : null}
        <div className="mx-auto max-w-xl px-5 py-20 text-center">
          <ShieldAlert size={38} className="mx-auto text-amber-500" />
          <h1 className="mt-4 text-3xl font-bold text-ink-950">Yayın odası kapalı</h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-500">
            Yayıncının lisansı sona ermiş veya oda devre dışı bırakılmış. Oyun bağlantısı
            yenilenince tekrar açılır.
          </p>
          <Link to="/satin-al" className="mt-6 inline-flex">
            <Button variant="brand" icon={<ArrowRight size={14} />}>
              Mağazayı gör
            </Button>
          </Link>
        </div>
        {!obs ? <MarketingFooter /> : null}
      </div>
    );
  }

  return (
    <RoomView
      data={data}
      slug={slug}
      obs={obs}
      onRefresh={() => {
        api
          .get<ArcadeRoomPublicDTO>(`/api/arcade/rooms/${encodeURIComponent(slug)}/public`)
          .then(setData)
          .catch(() => undefined);
      }}
    />
  );
}

function RoomView({
  data,
  slug,
  obs,
  onRefresh,
}: {
  data: ArcadeRoomPublicDTO;
  slug: string;
  obs: boolean;
  onRefresh: () => void;
}) {
  const game = data.game;
  const accent = String(data.room.settings.accent ?? game.accent);
  const welcomeText = String(data.room.settings.welcomeText ?? '');
  const overlayTheme = data.room.settings.overlayTheme === 'minimal' ? 'minimal' : 'full';
  const roomSettings = sanitizeArcadeRoomSettings(data.room.settings);
  const locale = roomSettings.language;
  const commandHints = roomSettings.commands;
  const ttsEnabled =
    data.room.settings.ttsEnabled === true ||
    new URLSearchParams(window.location.search).get('tts') === '1';
  const stageGame = useMemo(() => ({ ...game, accent }), [game, accent]);
  const {
    state,
    connected,
    playerId,
    notice,
    answerFeedback,
    isDemo,
    join,
    action,
    savedName,
  } = useArcadeSocket(game.key, slug);
  const [name, setName] = useState(savedName);
  const [message, setMessage] = useState('');
  useArcadeTTS(state, ttsEnabled);
  const me = useMemo(
    () => state?.players.find((player) => player.id === playerId) ?? null,
    [state, playerId],
  );
  const joined = Boolean(playerId && me);
  const isQuiz = game.mode === 'quiz';
  const isWord = game.mode === 'word';
  const prompt = state?.prompt;
  const canAnswer =
    joined &&
    state?.phase === 'running' &&
    (isQuiz || isWord) &&
    prompt &&
    !prompt.reveal &&
    me?.answeredPrompt !== prompt.id;

  if (obs) {
    return (
      <div className="flex h-screen w-screen items-center justify-center overflow-hidden bg-[#fbf7f0]">
        <div className="relative h-full aspect-[9/16]">
          <ArcadeLiveStage game={stageGame} state={state} fitHeight demo={false} locale={locale} />
          <ArcadeOverlay
            game={game}
            state={state}
            roomName={data.room.name}
            accent={accent}
            theme={overlayTheme}
            botEnabled={data.room.settings.botEnabled === true}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fbf7f0] text-ink-900">
      <MarketingHeader />
      <main className="container-page py-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-ink-400">
            <Link to="/panel/arcade" className="inline-flex items-center gap-1 hover:text-ink-800">
              <Gamepad2 size={12} /> Yayın odaları
            </Link>
            <span>/</span>
            <span className="font-medium text-ink-800">{data.room.name}</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {data.connections.length === 0 ? (
              <span className="badge bg-ink-100 text-ink-500">Platform bağlantısı yok</span>
            ) : (
              data.connections.map((connection) => (
                <span
                  key={`${connection.platform}-${connection.channel}`}
                  className={`badge ${
                    connection.status === 'connected'
                      ? 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200'
                      : 'bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-200'
                  }`}
                >
                  {connection.platform === 'twitch' ? <Twitch size={10} /> : null}
                  {connection.platform === 'youtube' ? <Youtube size={10} /> : null}
                  {connection.platform === 'tiktok' ? <Radio size={10} /> : null}
                  {PLATFORM_LABELS[connection.platform]} · {connection.channel}
                </span>
              ))
            )}
          </div>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,400px)_1fr] xl:grid-cols-[minmax(0,430px)_1fr]">
          <div className="mx-auto w-full max-w-[430px]">
            <div className="relative overflow-hidden rounded-[26px] border border-[#e5dccf] bg-white p-2 shadow-[0_25px_60px_-30px_rgba(48,38,25,0.35)]">
              <ArcadeLiveStage game={stageGame} state={state} demo={false} locale={locale} />
              <ArcadeOverlay
                game={game}
                state={state}
                roomName={data.room.name}
                accent={accent}
                theme={overlayTheme}
                botEnabled={data.room.settings.botEnabled === true}
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-[10px] text-ink-400">
              <span className="inline-flex items-center gap-1">
                <span className={`h-1.5 w-1.5 rounded-full ${connected ? 'bg-emerald-500' : 'bg-ink-300'}`} />
                {connected ? 'Canlı oda bağlı' : 'Bağlanıyor'}
              </span>
              <span>{state?.players.length ?? data.activePlayers} oyuncu</span>
            </div>
          </div>

          <div className="min-w-0 space-y-4">
            <div className="rounded-3xl border border-[#e9e1d5] bg-white p-5 shadow-card">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-ink-950">{game.name}</h1>
                  <p className="mt-1 text-[11px] text-ink-500">
                    {data.room.name} · {game.category} · {game.durationSec} sn
                  </p>
                  {data.room.hosts.length > 0 ? (
                    <p className="mt-1 text-[10px] text-violet-700">
                      Ortak yayın: {data.room.hosts.map((host) => host.name).join(', ')}
                    </p>
                  ) : null}
                  {welcomeText ? (
                    <p className="mt-2 max-w-md text-[11px] leading-relaxed text-ink-500">{welcomeText}</p>
                  ) : null}
                  <div className="mt-2 flex flex-wrap gap-1.5 text-[9px] text-ink-400">
                    <span className="rounded-full bg-[#f7f2e9] px-2 py-1">Katılım: <strong className="text-ink-700">!{commandHints.join}</strong></span>
                    {(game.mode === 'tug' || game.mode === 'versus') ? (
                      <span className="rounded-full bg-[#f7f2e9] px-2 py-1">
                        Takım: <strong className="text-ink-700">!{game.mode === 'versus' ? commandHints.girls : commandHints.red}</strong> / <strong className="text-ink-700">!{game.mode === 'versus' ? commandHints.boys : commandHints.blue}</strong>
                      </span>
                    ) : null}
                  </div>
                </div>
                <span className="badge" style={{ background: `${accent}18`, color: accent }}>
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: accent }} /> Yayında
                </span>
              </div>

              {!joined ? (
                <div className="mt-4 rounded-xl bg-[#fbf7f0] p-3.5">
                  <p className="text-[11px] leading-relaxed text-ink-500">
                    Platform sohbeti bağlıysa izleyiciler otomatik katılır. Web’den test etmek için
                    adını yaz.
                  </p>
                  <div className="mt-2 flex gap-2">
                    <input
                      className="input text-xs"
                      value={name}
                      maxLength={18}
                      onChange={(event) => setName(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') join(name);
                      }}
                      placeholder="Test adın"
                    />
                    <Button variant="brand" size="sm" onClick={() => join(name)}>
                      Katıl
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="mt-4">
                  <div className="flex items-center justify-between gap-2 rounded-xl bg-[#f7f2e9] px-3 py-2">
                    <span className="text-[11px] font-semibold text-ink-700">{me?.name}</span>
                    <span className="text-[10px] text-ink-400">
                      {me?.eliminated ? 'Elendi' : `Sıra ${me?.rank ?? '—'}`}
                    </span>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <Button variant="secondary" size="sm" icon={<Heart size={13} className="text-pink-500" />} onClick={() => action('like')}>
                      Beğen
                    </Button>
                    <Button variant="secondary" size="sm" icon={<Zap size={13} className="text-amber-500" />} onClick={() => action('gift')}>
                      Hediye
                    </Button>
                  </div>
                  {isQuiz && prompt?.options ? (
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {prompt.options.map((option, index) => (
                        <button
                          key={`${prompt.id}-${option}`}
                          type="button"
                          disabled={!canAnswer || me?.answeredPrompt === prompt.id}
                          onClick={() => action('comment', ['A', 'B', 'C', 'D'][index]!)}
                          className="rounded-lg border border-[#e8e1d6] bg-[#fffaf4] p-2 text-left text-[10px] text-ink-600 disabled:opacity-50"
                        >
                          <strong className="text-brand-700">{['A', 'B', 'C', 'D'][index]}</strong> {option}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-2 flex gap-2">
                      <div className="relative flex-1">
                        <MessageCircle size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
                        <input
                          className="input pl-8 text-xs"
                          value={message}
                          maxLength={80}
                          onChange={(event) => setMessage(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' && message.trim()) {
                              action('comment', message.trim());
                              setMessage('');
                            }
                          }}
                          placeholder="Test mesajı..."
                        />
                      </div>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => {
                          if (!message.trim()) return;
                          action('comment', message.trim());
                          setMessage('');
                        }}
                        aria-label="Gönder"
                      >
                        <Send size={13} />
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {answerFeedback ? (
                <p className={`mt-2 text-[10px] ${answerFeedback.correct ? 'text-emerald-700' : 'text-ink-500'}`}>
                  {answerFeedback.message}
                </p>
              ) : null}
              {notice ? <p className="mt-2 text-[10px] text-ink-400">{notice}</p> : null}
            </div>

            <div className="rounded-3xl border border-[#e9e1d5] bg-white p-4 shadow-card">
              <div className="flex items-center justify-between">
                <h2 className="text-[12px] font-bold text-ink-900">Canlı akış</h2>
                <button type="button" onClick={onRefresh} className="text-[10px] text-ink-400 hover:text-ink-700">
                  Yenile
                </button>
              </div>
              <div className="mt-3 h-[200px] space-y-1.5 overflow-y-auto">
                {state?.feed?.length ? (
                  state.feed.map((item) => (
                    <p key={item.id} className={`text-[11px] leading-relaxed ${FEED_COLORS[item.kind] ?? 'text-ink-500'}`}>
                      {item.text}
                    </p>
                  ))
                ) : (
                  <p className="text-[11px] leading-relaxed text-ink-400">
                    Henüz olay yok. Twitch, YouTube veya TikTok bağlantısından gelen yorumlar burada
                    görünür.
                  </p>
                )}
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <Link to={`/panel/baglantilar?room=${data.room.id}`}>
                <Button variant="secondary" className="w-full" icon={<Radio size={13} />}>
                  Platform bağlantıları
                </Button>
              </Link>
              <Link to={`/panel/arcade`}>
                <Button variant="secondary" className="w-full" icon={<Clock3 size={13} />}>
                  Oda yönetimi
                </Button>
              </Link>
            </div>

            <div className="flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50/70 p-3.5 text-[10px] leading-relaxed text-amber-900/80">
              <ShieldAlert size={14} className="mt-0.5 shrink-0 text-amber-600" />
              <span>
                TikTok resmî canlı sohbet API’si sunmaz; TikTok olayları TikFinity/TikTools gibi
                bir köprüden webhook ile gelir. Oyun ekranında hediye talebi gösterilmez.
              </span>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3 text-[10px] text-ink-400">
          <span className="inline-flex items-center gap-1">
            <ShieldCheck size={11} /> Yayıncı lisansı doğrulandı
          </span>
          <span className="inline-flex items-center gap-1">
            <Users size={11} /> {state?.players.length ?? 0} oyuncu
          </span>
          <span className="inline-flex items-center gap-1">
            <Check size={11} /> OBS: {data.room.obsUrl}
          </span>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
