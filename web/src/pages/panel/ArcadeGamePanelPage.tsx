import { useEffect, useMemo, useState } from 'react';
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
import { api, ApiError } from '../../lib/api';
import { useToast } from '../../lib/toast';
import { startCheckout } from '../../lib/checkout';
import { formatDate, formatPrice } from '../../lib/format';
import { GameArt } from '../../components/GameArt';
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
  const [tts, setTts] = useState(false);

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
      setOffers(offerResult.offers.filter((offer) => offer.gameKey === game.key && offer.isActive !== false));
      if (foundRoom) {
        setName(foundRoom.name);
        setWelcome(String(foundRoom.settings.welcomeText ?? ''));
        setAccent(String(foundRoom.settings.accent ?? game.accent));
        setOverlayTheme(foundRoom.settings.overlayTheme === 'minimal' ? 'minimal' : 'full');
        setTts(foundRoom.settings.ttsEnabled === true);
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
        settings: { ...room.settings, welcomeText: welcome, accent, overlayTheme, ttsEnabled: tts },
      });
      success('Oyun paneli güncellendi');
      await load();
    } catch (caught) {
      toastError('Kaydedilemedi', caught instanceof ApiError ? caught.message : 'Tekrar dene.');
    } finally {
      setWorking(false);
    }
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

  const buy = async (offer: PackageDTO) => {
    setWorking(true);
    try {
      await startCheckout(offer.id);
    } catch (caught) {
      toastError('Ödeme başlatılamadı', caught instanceof ApiError ? caught.message : 'Tekrar dene.');
      setWorking(false);
    }
  };

  const cheapest = useMemo(
    () => [...offers].sort((a, b) => a.priceCents - b.priceCents)[0],
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
              <div className="mt-4 flex flex-wrap gap-2">
                <Button variant="brand" size="sm" icon={<Zap size={13} />} loading={working} onClick={() => void startTrial()}>
                  Günde 30 dk ücretsiz dene
                </Button>
                {cheapest ? (
                  <Button variant="secondary" size="sm" icon={<ShoppingBag size={13} />} onClick={() => void buy(cheapest)}>
                    {formatPrice(cheapest.priceCents, cheapest.currency)} · Lisans al
                  </Button>
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
              </div>
              <label className="flex cursor-pointer items-center gap-2 text-[11px] text-ink-600">
                <input type="checkbox" checked={tts} onChange={(event) => setTts(event.target.checked)} className="h-4 w-4 accent-emerald-600" />
                Türkçe sesli sunucu (TTS)
              </label>
              <Button variant="brand" size="sm" icon={<Save size={13} />} loading={working} onClick={() => void save()}>
                Değişiklikleri kaydet
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-ink-100 bg-white p-4">
              <h3 className="text-sm font-bold text-ink-950">OBS bağlantısı</h3>
              <p className="mt-1 text-[10px] leading-relaxed text-ink-400">Bu URL yayın boyunca sabit kalır.</p>
              <code className="mt-2 block truncate rounded-lg bg-[#f7f2e9] px-2.5 py-2 text-[9px] text-ink-600">{room.obsUrl}</code>
              <div className="mt-2 flex gap-1.5">
                <Button variant="secondary" size="sm" icon={<Copy size={12} />} onClick={() => void copyObs()}>Kopyala</Button>
                <a href={room.obsUrl} target="_blank" rel="noreferrer">
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
