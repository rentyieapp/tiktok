import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Copy,
  ExternalLink,
  Gamepad2,
  Link2,
  ListChecks,
  LockKeyhole,
  Pause,
  Play,
  Plus,
  Radio,
  RefreshCw,
  Save,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Trophy,
  Users,
  Zap,
} from 'lucide-react';
import type { ArcadeRoomDTO, PackageDTO } from '@shared/types';
import { findArcadeGameBySlug, ARCADE_GAME_LIST } from '@shared/arcade';
import {
  ARCADE_LOCALES,
  DEFAULT_ARCADE_COMMANDS,
  sanitizeArcadeRoomSettings,
  type ArcadeCommandSettings,
  type ArcadeLocale,
} from '@shared/arcadeSettings';
import { api, ApiError } from '../../lib/api';
import { useToast } from '../../lib/toast';
import { startCheckout } from '../../lib/checkout';
import { formatDate, formatPrice } from '../../lib/format';
import { GameArt } from '../../components/GameArt';
import type { OverlayPositions } from '../../components/ArcadeOverlay';
import { OVERLAY_THEMES } from '@shared/overlayThemes';
import { Button, Field, PageHeader, Spinner } from '../../components/ui';

export function ArcadeGamePanelPage() {
  const { gameKey } = useParams<{ gameKey: string }>();
  const game = gameKey ? findArcadeGameBySlug(gameKey) : undefined;
  if (!game) return <Navigate to="/panel" replace />;
  return <ArcadeGamePanel key={game.key} game={game} />;
}

function ArcadeGamePanel({ game }: { game: NonNullable<ReturnType<typeof findArcadeGameBySlug>> }) {
  const { success, error: toastError } = useToast();
  const [room, setRoom] = useState<ArcadeRoomDTO | null>(null);
  const [license, setLicense] = useState<{ gameKey: string; expiresAt: string } | null>(null);
  const [offers, setOffers] = useState<PackageDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [welcome, setWelcome] = useState('');
  const [accent, setAccent] = useState(game.accent);
  const [overlayTheme, setOverlayTheme] = useState<'full' | 'minimal'>('full');
  const [overlayThemeId, setOverlayThemeId] = useState('meydan');
  const [overlayLayout, setOverlayLayout] = useState<'auto' | 'bottom'>('auto');
  const [overlayScale, setOverlayScale] = useState<'sm' | 'md' | 'lg'>('md');
  const [showGoal, setShowGoal] = useState(true);
  const [showLeaderboard, setShowLeaderboard] = useState(true);
  const [showBot, setShowBot] = useState(true);
  const [showWinner, setShowWinner] = useState(true);
  const [positions, setPositions] = useState<OverlayPositions>({
    room: { x: 2, y: 8 },
    leaderboard: { x: 72, y: 8 },
    goal: { x: 2, y: 26 },
    bot: { x: 25, y: 86 },
  });
  const [dragging, setDragging] = useState<keyof OverlayPositions | null>(null);
  const dragArea = useRef<HTMLDivElement>(null);
  const [tts, setTts] = useState(false);
  const [botEnabled, setBotEnabled] = useState(false);
  const [language, setLanguage] = useState<ArcadeLocale>('tr');
  const [commands, setCommands] = useState<ArcadeCommandSettings>(DEFAULT_ARCADE_COMMANDS.tr);

  const load = async () => {
    setLoading(true);
    try {
      const [roomResult, offerResult] = await Promise.all([
        api.get<{ rooms: ArcadeRoomDTO[]; licenses: Array<{ gameKey: string; expiresAt: string }> }>(
          '/api/arcade/rooms',
        ),
        api.get<{ offers: PackageDTO[] }>('/api/arcade/offers'),
      ]);
      const foundRoom = roomResult.rooms.find((entry) => entry.gameKey === game.key) ?? null;
      setRoom(foundRoom);
      setLicense(roomResult.licenses.find((entry) => entry.gameKey === game.key) ?? null);
      setOffers(offerResult.offers.filter((offer) => offer.isActive !== false));
      if (foundRoom) {
        setName(foundRoom.name);
        setWelcome(String(foundRoom.settings.welcomeText ?? ''));
        setAccent(String(foundRoom.settings.accent ?? game.accent));
        setOverlayTheme(foundRoom.settings.overlayTheme === 'minimal' ? 'minimal' : 'full');
        setOverlayThemeId(typeof foundRoom.settings.overlayThemeId === 'string' ? foundRoom.settings.overlayThemeId : 'meydan');
        setOverlayLayout(foundRoom.settings.overlayLayout === 'bottom' ? 'bottom' : 'auto');
        setOverlayScale(foundRoom.settings.overlayScale === 'sm' ? 'sm' : foundRoom.settings.overlayScale === 'lg' ? 'lg' : 'md');
        setShowGoal(foundRoom.settings.overlayGoal !== false);
        setShowLeaderboard(foundRoom.settings.overlayLeaderboard !== false);
        setShowBot(foundRoom.settings.overlayBot !== false);
        setShowWinner(foundRoom.settings.overlayWinner !== false);
        const savedPositions = foundRoom.settings.overlayPositions as OverlayPositions | undefined;
        if (savedPositions && typeof savedPositions === 'object') {
          setPositions((current) => ({ ...current, ...savedPositions }));
        }
        setTts(foundRoom.settings.ttsEnabled === true);
        setBotEnabled(foundRoom.settings.botEnabled === true);
        const parsed = sanitizeArcadeRoomSettings(foundRoom.settings);
        setLanguage(parsed.language);
        setCommands(parsed.commands);
      }
    } catch (caught) {
      toastError('Oyun paneli yüklenemedi', caught instanceof ApiError ? caught.message : 'Tekrar dene.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [game.key]);

  const createRoom = async () => {
    setCreating(true);
    try {
      await api.post('/api/arcade/rooms', { gameKey: game.key });
      success('Oyun odası açıldı', 'Şimdi özelleştirip yayına alabilirsin.');
      await load();
    } catch (caught) {
      toastError('Oda açılamadı', caught instanceof ApiError ? caught.message : 'Tekrar dene.');
    } finally {
      setCreating(false);
    }
  };

  const toggle = async () => {
    if (!room) return;
    setWorking(true);
    try {
      await api.put(`/api/arcade/rooms/${room.id}`, { status: room.status === 'live' ? 'disabled' : 'live' });
      success(room.status === 'live' ? 'Oda duraklatıldı' : 'Oda yayına alındı');
      await load();
    } catch (caught) {
      toastError('Durum değiştirilemedi', caught instanceof ApiError ? caught.message : 'Tekrar dene.');
    } finally {
      setWorking(false);
    }
  };

  const save = async () => {
    if (!room) return;
    setWorking(true);
    try {
      await api.put(`/api/arcade/rooms/${room.id}`, {
        name,
        settings: {
          ...room.settings,
          welcomeText: welcome,
          accent,
          overlayTheme,
          overlayThemeId,
          overlayLayout,
          overlayScale,
          overlayGoal: showGoal,
          overlayLeaderboard: showLeaderboard,
          overlayBot: showBot,
          overlayWinner: showWinner,
          overlayPositions: positions,
          ttsEnabled: tts,
          botEnabled,
          language,
          commands: { ...commands, requireJoin: Boolean(commands.requireJoin) },
        },
      });
      success('Oyun paneli güncellendi');
      await load();
    } catch (caught) {
      toastError('Kaydedilemedi', caught instanceof ApiError ? caught.message : 'Tekrar dene.');
    } finally {
      setWorking(false);
    }
  };

  const movePart = (part: keyof OverlayPositions, clientX: number, clientY: number) => {
    const rect = dragArea.current?.getBoundingClientRect();
    if (!rect) return;
    const x = Math.max(0, Math.min(92, ((clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(92, ((clientY - rect.top) / rect.height) * 100));
    setPositions((current) => ({ ...current, [part]: { x: Math.round(x), y: Math.round(y) } }));
  };

  const startTrial = async () => {
    setWorking(true);
    try {
      await api.post('/api/arcade/trial', { gameKey: game.key });
      success('30 dakikalık deneme açıldı');
      await load();
    } catch (caught) {
      toastError('Deneme başlatılamadı', caught instanceof ApiError ? caught.message : 'Tekrar dene.');
    } finally {
      setWorking(false);
    }
  };

  const copyObs = async () => {
    if (!room) return;
    try {
      await navigator.clipboard.writeText(room.obsUrl);
      success('OBS bağlantısı kopyalandı');
    } catch {
      toastError('Kopyalanamadı', 'Bağlantıyı manuel seçebilirsin.');
    }
  };

  const copyOverlay = async () => {
    if (!room) return;
    try {
      await navigator.clipboard.writeText(room.overlayUrl);
      success('Overlay bağlantısı kopyalandı');
    } catch {
      toastError('Kopyalanamadı', 'Bağlantıyı manuel seçebilirsin.');
    }
  };

  const buy = async (offer: PackageDTO) => {
    setWorking(true);
    try {
      await startCheckout(offer.id);
    } catch (caught) {
      toastError('Ödeme başlatılamadı', caught instanceof ApiError ? caught.message : 'Tekrar dene.');
      setWorking(false);
    }
  };

  const gameOffers = useMemo(
    () => offers.filter((offer) => offer.gameKey === game.key).sort((a, b) => a.durationDays - b.durationDays),
    [offers, game.key],
  );
  const bundleOffers = useMemo(
    () => offers.filter((offer) => offer.gameKey === '*').sort((a, b) => a.durationDays - b.durationDays),
    [offers],
  );

  if (loading) return <Spinner label={`${game.name} paneli yükleniyor...`} />;

  return (
    <div>
      <div className="mb-3">
        <Link to="/panel" className="inline-flex items-center gap-1 text-[10px] font-medium text-ink-400 hover:text-ink-800">
          <ArrowLeft size={11} /> Oyun portföyü
        </Link>
      </div>
      <PageHeader
        eyebrow={`${game.category} · Oyun paneli`}
        title={game.name}
        description={game.tagline}
        actions={
          <>
            <Link to="/panel/arcade">
              <Button variant="secondary" size="sm" icon={<Gamepad2 size={13} />}>Tüm oyunlar</Button>
            </Link>
            {room ? (
              <Link to={`/canli/${room.slug}`} target="_blank">
                <Button variant="brand" size="sm" icon={<Play size={13} />}>Canlı odayı aç</Button>
              </Link>
            ) : null}
          </>
        }
      />

      <div className="mb-5 overflow-hidden rounded-2xl border border-ink-100 bg-white">
        <div className="grid gap-0 lg:grid-cols-[300px_1fr]">
          <div className="relative h-44 overflow-hidden lg:h-full">
            <GameArt game={game} />
            <div className="absolute inset-x-3 bottom-3 flex items-center justify-between">
              <span className="rounded-full bg-white/85 px-2 py-1 text-[9px] font-bold text-ink-700 backdrop-blur">
                {game.category}
              </span>
              {license ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500 px-2 py-1 text-[9px] font-bold text-white">
                  <ShieldCheck size={9} /> Lisanslı
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-ink-950/80 px-2 py-1 text-[9px] font-bold text-white">
                  <LockKeyhole size={9} /> Lisans yok
                </span>
              )}
            </div>
          </div>
          <div className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-ink-950">
                  {room ? room.name : license ? 'Oda henüz açılmadı' : 'Oyun lisansı gerekli'}
                </h2>
                <p className="mt-1 text-[11px] leading-relaxed text-ink-500">
                  {room
                    ? `${room.roundsPlayed} tur oynandı · ${room.lastWinnerName ? `son kazanan ${room.lastWinnerName}` : 'henüz kazanan yok'}`
                    : license
                      ? 'Lisansın aktif. Kendi yayın odanı oluşturup özelleştir.'
                      : '30 dakikalık ücretsiz denemeyi başlat veya oyun lisansını satın al.'}
                </p>
              </div>
              {license ? (
                <span className="rounded-full bg-[#f3ede3] px-2.5 py-1 text-[9px] font-semibold text-ink-500">
                  Bitiş: {formatDate(license.expiresAt)}
                </span>
              ) : null}
            </div>

            {!license ? (
              <div className="mt-4">
                <div className="flex flex-wrap gap-2">
                  <Button variant="brand" size="sm" icon={<Zap size={13} />} loading={working} onClick={() => void startTrial()}>
                    Günde 30 dk ücretsiz dene
                  </Button>
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {gameOffers.map((offer) => (
                    <button
                      key={offer.id}
                      type="button"
                      disabled={working}
                      onClick={() => void buy(offer)}
                      className="flex items-center justify-between rounded-xl border border-[#e4dccf] bg-[#fffaf4] px-3 py-2.5 text-left transition hover:border-brand-300 hover:bg-brand-50/40 disabled:opacity-60"
                    >
                      <span>
                        <span className="block text-[10px] font-bold text-ink-800">{offer.durationDays === 1 ? '1 Günlük' : offer.durationDays === 365 ? 'Yıllık' : `${offer.durationDays} Günlük`}</span>
                        <span className="block text-[9px] text-ink-400">{game.name} lisansı</span>
                      </span>
                      <span className="text-[12px] font-bold text-brand-700">{formatPrice(offer.priceCents, offer.currency)}</span>
                    </button>
                  ))}
                </div>
                {bundleOffers.length > 0 ? (
                  <div className="mt-4 rounded-xl border border-amber-200 bg-[#fffaf0] p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Tüm Oyunlar paketi</p>
                    <div className="mt-2 grid gap-1.5 sm:grid-cols-3">
                      {bundleOffers.map((offer) => (
                        <button
                          key={offer.id}
                          type="button"
                          disabled={working}
                          onClick={() => void buy(offer)}
                          className="flex items-center justify-between rounded-lg border border-amber-200 bg-white px-2.5 py-2 text-left disabled:opacity-60"
                        >
                          <span className="text-[9px] font-semibold text-ink-600">
                            {offer.durationDays === 1 ? 'Günlük' : offer.durationDays === 30 ? 'Aylık' : 'Yıllık'}
                          </span>
                          <span className="text-[10px] font-bold text-amber-800">{formatPrice(offer.priceCents, offer.currency)}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : !room ? (
              <Button variant="brand" size="sm" className="mt-4" icon={<Plus size={13} />} loading={creating} onClick={() => void createRoom()}>
                Yayın odası oluştur
              </Button>
            ) : (
              <div className="mt-4 flex flex-wrap gap-2">
                <Button variant="brand" size="sm" icon={room.status === 'live' ? <Pause size={13} /> : <Play size={13} />} loading={working} onClick={() => void toggle()}>
                  {room.status === 'live' ? 'Odayı duraklat' : 'Yayına al'}
                </Button>
                <Button variant="secondary" size="sm" icon={<Copy size={13} />} onClick={() => void copyObs()}>
                  OBS linkini kopyala
                </Button>
                <Link to="/panel/baglantilar">
                  <Button variant="secondary" size="sm" icon={<Link2 size={13} />}>Platform bağlantıları</Button>
                </Link>
                {game.key === 'quiz' ? (
                  <Link to="/panel/arcade">
                    <Button variant="secondary" size="sm" icon={<ListChecks size={13} />}>Soruları düzenle</Button>
                  </Link>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </div>

      {room ? (
        <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
          <div className="rounded-2xl border border-ink-100 bg-white p-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-ink-950">Oda özelleştirme</h3>
                <p className="mt-0.5 text-[10px] text-ink-400">Ad, karşılama, renk ve overlay ayarları.</p>
              </div>
              <Sparkles size={16} className="text-brand-600" />
            </div>
            <div className="mt-4 space-y-3">
              <Field label="Oda adı">
                <input className="input" value={name} maxLength={60} onChange={(event) => setName(event.target.value)} />
              </Field>
              <Field label="Karşılama metni">
                <textarea className="textarea" rows={3} maxLength={180} value={welcome} onChange={(event) => setWelcome(event.target.value)} />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Vurgu rengi">
                  <div className="flex items-center gap-2">
                    <input type="color" value={accent} onChange={(event) => setAccent(event.target.value)} className="h-9 w-12 cursor-pointer rounded-lg border border-ink-200 bg-white p-1" />
                    <span className="text-[10px] text-ink-500">{accent}</span>
                  </div>
                </Field>
                <Field label="Overlay">
                  <select className="input" value={overlayTheme} onChange={(event) => setOverlayTheme(event.target.value as 'full' | 'minimal')}>
                    <option value="full">Tam overlay</option>
                    <option value="minimal">Sade sahne</option>
                  </select>
                </Field>
                <Field label="Tema">
                  <select className="input" value={overlayThemeId} onChange={(event) => setOverlayThemeId(event.target.value)}>
                    {OVERLAY_THEMES.map((theme) => <option key={theme.id} value={theme.id}>{theme.pro ? 'PRO · ' : ''}{theme.name}</option>)}
                  </select>
                </Field>
                <Field label="Overlay konumu">
                  <select className="input" value={overlayLayout} onChange={(event) => setOverlayLayout(event.target.value as 'auto' | 'bottom')}>
                    <option value="auto">Üst köşeler</option>
                    <option value="bottom">Alt köşeler</option>
                  </select>
                </Field>
                <Field label="Overlay boyutu">
                  <select className="input" value={overlayScale} onChange={(event) => setOverlayScale(event.target.value as 'sm' | 'md' | 'lg')}>
                    <option value="sm">Küçük</option>
                    <option value="md">Orta</option>
                    <option value="lg">Büyük</option>
                  </select>
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-2 rounded-xl border border-ink-100 bg-white p-3 text-[10px] text-ink-600 sm:grid-cols-4">
                <p className="col-span-full text-[9px] leading-relaxed text-ink-400">Overlay değişiklikleri yayındaki OBS kaynağına 8 saniye içinde otomatik yansır; OBS’i yenilemen gerekmez.</p>
                <label className="flex items-center gap-1.5"><input type="checkbox" checked={showBot} onChange={(event) => setShowBot(event.target.checked)} className="h-3.5 w-3.5 accent-violet-600" /> Bot</label>
                <label className="flex items-center gap-1.5"><input type="checkbox" checked={showLeaderboard} onChange={(event) => setShowLeaderboard(event.target.checked)} className="h-3.5 w-3.5 accent-violet-600" /> Liderlik</label>
                <label className="flex items-center gap-1.5"><input type="checkbox" checked={showGoal} onChange={(event) => setShowGoal(event.target.checked)} className="h-3.5 w-3.5 accent-violet-600" /> Hedef barı</label>
                <label className="flex items-center gap-1.5"><input type="checkbox" checked={showWinner} onChange={(event) => setShowWinner(event.target.checked)} className="h-3.5 w-3.5 accent-violet-600" /> Kazanan</label>
              </div>
              <div className="rounded-xl border border-ink-100 bg-[#fbf7f0] p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-ink-400">Oyun dili ve komutları</p>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <Field label="Dil">
                    <select className="input" value={language} onChange={(event) => {
                      const next = event.target.value as ArcadeLocale;
                      setLanguage(next);
                      setCommands((current) => ({ ...DEFAULT_ARCADE_COMMANDS[next], requireJoin: current.requireJoin }));
                    }}>
                      {ARCADE_LOCALES.map((locale) => (
                        <option key={locale.code} value={locale.code}>{locale.flag} {locale.label}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Katılım komutu">
                    <input className="input" value={commands.join} maxLength={24} onChange={(event) => setCommands((current) => ({ ...current, join: event.target.value }))} placeholder="katıl" />
                  </Field>
                  <Field label="Ayrılma komutu">
                    <input className="input" value={commands.leave} maxLength={24} onChange={(event) => setCommands((current) => ({ ...current, leave: event.target.value }))} placeholder="ayrıl" />
                  </Field>
                  {game.mode === 'tug' || game.mode === 'versus' ? (
                    <Field label={game.mode === 'tug' ? 'Kırmızı takım komutu' : 'Kızlar takım komutu'}>
                      <input className="input" value={game.mode === 'tug' ? commands.red : commands.girls} maxLength={24} onChange={(event) => setCommands((current) => game.mode === 'tug' ? { ...current, red: event.target.value } : { ...current, girls: event.target.value })} />
                    </Field>
                  ) : null}
                  {game.mode === 'tug' || game.mode === 'versus' ? (
                    <Field label={game.mode === 'tug' ? 'Mavi takım komutu' : 'Erkekler takım komutu'}>
                      <input className="input" value={game.mode === 'tug' ? commands.blue : commands.boys} maxLength={24} onChange={(event) => setCommands((current) => game.mode === 'tug' ? { ...current, blue: event.target.value } : { ...current, boys: event.target.value })} />
                    </Field>
                  ) : null}
                </div>
                <label className="mt-2 flex cursor-pointer items-start gap-2 text-[10px] text-ink-500">
                  <input type="checkbox" checked={commands.requireJoin} onChange={(event) => setCommands((current) => ({ ...current, requireJoin: event.target.checked }))} className="mt-0.5 h-4 w-4 accent-emerald-600" />
                  Sohbetten oynamak için önce katılım komutu yazılsın
                </label>
                <p className="mt-1 text-[9px] leading-relaxed text-ink-400">
                  Dil; OBS’teki durum etiketlerini ve varsayılan komutları belirler. Katılım
                  komutu yorumda <strong>!</strong> olmadan da çalışır. “Önce katılım” açıksa
                  izleyici önce <strong>!{commands.join}</strong> yazmalı; takım oyunlarında
                  <strong> !{commands.red || commands.girls}</strong> ile taraf seçer. Quiz ve
                  kelime içerikleri yayıncının girdiği dilde kalır.
                </p>
              </div>
              <label className="flex cursor-pointer items-center gap-2 text-[11px] text-ink-600">
                <input type="checkbox" checked={tts} onChange={(event) => setTts(event.target.checked)} className="h-4 w-4 accent-emerald-600" />
                Türkçe sesli sunucu (TTS)
              </label>
              <label className="flex cursor-pointer items-start gap-2 text-[11px] text-ink-600">
                <input type="checkbox" checked={botEnabled} onChange={(event) => setBotEnabled(event.target.checked)} className="mt-0.5 h-4 w-4 accent-violet-600" />
                <span>Meydan Bot overlay duyuruları <span className="block text-[9px] text-ink-400">Katılım, hediye ve kazanan olaylarını OBS overlay’inde bot kartı olarak gösterir.</span></span>
              </label>
              <div className="rounded-xl border border-violet-100 bg-violet-50/40 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-violet-700">Overlay yerleşimi</p>
                <p className="mt-1 text-[9px] leading-relaxed text-ink-400">Kutuları sürükleyerek konumlandır. Yayındaki overlay’e 8 saniye içinde yansır.</p>
                <div ref={dragArea} className="relative mx-auto mt-3 aspect-[9/16] w-full max-w-[230px] overflow-hidden rounded-xl border-2 border-dashed border-violet-200 bg-white">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_25%,#eef7ff,transparent_65%)]" />
                  {([
                    ['room', 'Oda'],
                    ['leaderboard', 'Liderlik'],
                    ['goal', 'Hedef'],
                    ['bot', 'Bot'],
                  ] as const).map(([part, label]) => (
                    <button
                      key={part}
                      type="button"
                      onPointerDown={(event) => {
                        setDragging(part);
                        event.currentTarget.setPointerCapture(event.pointerId);
                      }}
                      onPointerMove={(event) => {
                        if (dragging === part) movePart(part, event.clientX, event.clientY);
                      }}
                      onPointerUp={() => setDragging(null)}
                      onPointerCancel={() => setDragging(null)}
                      className={`absolute cursor-grab touch-none rounded-lg border px-2 py-1 text-[8px] font-bold shadow-sm active:cursor-grabbing ${
                        part === 'leaderboard' ? 'border-violet-300 bg-violet-100 text-violet-700' : 'border-ink-200 bg-white/95 text-ink-700'
                      }`}
                      style={{ left: `${positions[part]?.x ?? 0}%`, top: `${positions[part]?.y ?? 0}%` }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <Button variant="brand" size="sm" icon={<Save size={13} />} loading={working} onClick={() => void save()}>
                Değişiklikleri kaydet
              </Button>
            </div>
          </div>

          <div className="min-w-0 space-y-4">
            <div className="min-w-0 rounded-2xl border border-ink-100 bg-white p-4">
              <h3 className="text-sm font-bold text-ink-950">OBS bağlantısı</h3>
              <p className="mt-1 text-[10px] leading-relaxed text-ink-400">Bu URL yayın boyunca sabit kalır.</p>
              <p className="mt-2 text-[9px] font-bold uppercase tracking-wider text-ink-400">Tam sahne</p>
              <code className="mt-1 block max-w-full overflow-hidden text-ellipsis whitespace-nowrap rounded-lg bg-[#f7f2e9] px-2.5 py-2 text-[9px] text-ink-600">{room.obsUrl}</code>
              <div className="mt-2 flex gap-1.5">
                <Button variant="secondary" size="sm" icon={<Copy size={12} />} onClick={() => void copyObs()}>Kopyala</Button>
                <a href={room.obsUrl} target="_blank" rel="noreferrer">
                  <Button variant="secondary" size="sm" icon={<ExternalLink size={12} />}>Aç</Button>
                </a>
              </div>
              <p className="mt-3 text-[9px] font-bold uppercase tracking-wider text-violet-500">Sadece overlay (şeffaf)</p>
              <code className="mt-1 block max-w-full overflow-hidden text-ellipsis whitespace-nowrap rounded-lg bg-violet-50 px-2.5 py-2 text-[9px] text-violet-700">{room.overlayUrl}</code>
              <div className="mt-2 flex gap-1.5">
                <Button variant="secondary" size="sm" icon={<Copy size={12} />} onClick={() => void copyOverlay()}>Kopyala</Button>
                <a href={room.overlayUrl} target="_blank" rel="noreferrer">
                  <Button variant="secondary" size="sm" icon={<ExternalLink size={12} />}>Aç</Button>
                </a>
              </div>
            </div>
            <div className="rounded-2xl border border-ink-100 bg-white p-4">
              <h3 className="text-sm font-bold text-ink-950">İstatistik</h3>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-[#fbf7f0] p-2.5">
                  <p className="text-[9px] text-ink-400">Tur</p>
                  <p className="mt-0.5 text-lg font-bold text-ink-900">{room.roundsPlayed}</p>
                </div>
                <div className="rounded-lg bg-[#fbf7f0] p-2.5">
                  <p className="text-[9px] text-ink-400">Son kazanan</p>
                  <p className="mt-0.5 truncate text-[11px] font-bold text-ink-900">{room.lastWinnerName ?? '—'}</p>
                </div>
              </div>
              <Link to="/panel/arcade" className="mt-3 inline-flex items-center gap-1 text-[10px] font-semibold text-brand-700">
                Moderasyon ve sorular <ArrowRight size={11} />
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
