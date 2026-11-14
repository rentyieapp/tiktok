import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  Check,
  Copy,
  Gamepad2,
  Link2,
  Radio,
  RefreshCw,
  Send,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Twitch,
  Youtube,
  Zap,
} from 'lucide-react';
import type { ArcadeRoomDTO, LivePlatform, PlatformConnectionDTO } from '@shared/types';
import { api, ApiError } from '../../lib/api';
import { useToast } from '../../lib/toast';
import { Button, PageHeader, SectionCard, Spinner, StatusBadge } from '../../components/ui';

const PLATFORM_META: Record<LivePlatform, { label: string; icon: typeof Twitch; help: string }> = {
  twitch: {
    label: 'Twitch',
    icon: Twitch,
    help: 'Kanal adını yaz. Public sohbet anonim IRC ile okunur; OAuth gerekmez.',
  },
  youtube: {
    label: 'YouTube',
    icon: Youtube,
    help: 'Kanal ID’si veya @handle yaz. Sunucuda YOUTUBE_API_KEY tanımlı olmalı.',
  },
  tiktok: {
    label: 'TikTok',
    icon: Radio,
    help: 'TikTok’un resmî sohbet API’si yok. Connector URL’sini TikFinity/TikTools gibi bir köprüye tanımla.',
  },
};

export function PlatformConnectionsPage() {
  const { success, error: toastError } = useToast();
  const [params, setParams] = useSearchParams();
  const [rooms, setRooms] = useState<ArcadeRoomDTO[]>([]);
  const [connections, setConnections] = useState<PlatformConnectionDTO[]>([]);
  const [youtubeConfigured, setYoutubeConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedRoom, setSelectedRoom] = useState(params.get('room') ?? '');
  const [channels, setChannels] = useState<Record<LivePlatform, string>>({
    twitch: '',
    youtube: '',
    tiktok: '',
  });
  const [busy, setBusy] = useState<string | null>(null);
  const [testing, setTesting] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<{ rooms: ArcadeRoomDTO[] }>('/api/arcade/rooms')
      .then((result) => {
        setRooms(result.rooms);
        const initial = selectedRoom || result.rooms[0]?.id || '';
        setSelectedRoom(initial);
        if (initial) setParams({ room: initial }, { replace: true });
      })
      .catch((caught) => {
        toastError('Odalar yüklenemedi', caught instanceof ApiError ? caught.message : 'Tekrar dene.');
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedRoom) return;
    setLoading(true);
    api
      .get<{ connections: PlatformConnectionDTO[]; youtubeConfigured: boolean }>(
        `/api/platforms/rooms/${selectedRoom}`,
      )
      .then((result) => {
        setConnections(result.connections);
        setYoutubeConfigured(result.youtubeConfigured);
      })
      .catch((caught) =>
        toastError('Bağlantılar yüklenemedi', caught instanceof ApiError ? caught.message : 'Tekrar dene.'),
      )
      .finally(() => setLoading(false));
  }, [selectedRoom]);

  const reloadConnections = async () => {
    if (!selectedRoom) return;
    try {
      const result = await api.get<{ connections: PlatformConnectionDTO[]; youtubeConfigured: boolean }>(
        `/api/platforms/rooms/${selectedRoom}`,
      );
      setConnections(result.connections);
      setYoutubeConfigured(result.youtubeConfigured);
    } catch (caught) {
      toastError('Bağlantılar yenilenemedi', caught instanceof ApiError ? caught.message : 'Tekrar dene.');
    }
  };

  const selectRoom = (id: string) => {
    setSelectedRoom(id);
    setParams({ room: id }, { replace: true });
  };

  const connect = async (platform: LivePlatform) => {
    const channel = channels[platform].trim();
    if (!channel) {
      toastError('Kanal gerekli', `${PLATFORM_META[platform].label} kanalını yaz.`);
      return;
    }
    setBusy(platform);
    try {
      await api.post(`/api/platforms/rooms/${selectedRoom}/connect`, { platform, channel });
      success('Bağlantı başlatıldı', `${PLATFORM_META[platform].label} bağlantısı hazırlanıyor.`);
      const result = await api.get<{ connections: PlatformConnectionDTO[]; youtubeConfigured: boolean }>(
        `/api/platforms/rooms/${selectedRoom}`,
      );
      setConnections(result.connections);
    } catch (caught) {
      toastError('Bağlantı kurulamadı', caught instanceof ApiError ? caught.message : 'Tekrar dene.');
    } finally {
      setBusy(null);
    }
  };

  const disconnect = async (connection: PlatformConnectionDTO) => {
    setBusy(connection.platform);
    try {
      await api.delete(`/api/platforms/connections/${connection.id}`);
      success('Bağlantı kaldırıldı');
      setConnections((current) => current.filter((item) => item.id !== connection.id));
    } catch (caught) {
      toastError('Kaldırılamadı', caught instanceof ApiError ? caught.message : 'Tekrar dene.');
    } finally {
      setBusy(null);
    }
  };

  const test = async (kind: 'comment' | 'gift' | 'like' | 'follow') => {
    setTesting(kind);
    try {
      const result = await api.post<{ accepted: boolean; reason?: string }>(
        `/api/platforms/rooms/${selectedRoom}/test`,
        { kind, text: kind === 'comment' ? 'Merhaba test' : 'test' },
      );
      if (result.accepted) success('Test olayı gönderildi', 'Oyun sahnesinde görünmeli.');
      else toastError('Olay işlenemedi', result.reason ?? 'Tur henüz başlamamış olabilir.');
    } catch (caught) {
      toastError('Test gönderilemedi', caught instanceof ApiError ? caught.message : 'Tekrar dene.');
    } finally {
      setTesting(null);
    }
  };

  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      success('Kopyalandı', value);
    } catch {
      toastError('Kopyalanamadı', 'Adresi manuel seç.');
    }
  };

  const room = rooms.find((item) => item.id === selectedRoom);

  return (
    <div>
      <PageHeader
        eyebrow="Yayın bağlantıları"
        title="Platform bağlantıları"
        description="Twitch, YouTube ve TikTok olaylarını seçtiğin oyun odasına bağla. Gelen yorum, beğeni ve hediyeler oyuna otomatik işlenir."
        actions={
          <Button variant="secondary" icon={<RefreshCw size={14} />} onClick={() => void reloadConnections()}>
            Yenile
          </Button>
        }
      />

      {loading && rooms.length === 0 ? (
        <Spinner label="Bağlantılar yükleniyor..." />
      ) : rooms.length === 0 ? (
        <div className="card p-8 text-center">
          <Gamepad2 size={30} className="mx-auto text-ink-300" />
          <h2 className="mt-3 text-lg font-bold text-ink-950">Önce bir oyun odası aç</h2>
          <p className="mt-1 text-xs text-ink-500">Platform bağlantısı için yayın odası gerekir.</p>
          <Link to="/panel/arcade" className="mt-4 inline-flex">
            <Button variant="brand" icon={<ArrowRight size={14} />}>
              Oyun odalarına git
            </Button>
          </Link>
        </div>
      ) : (
        <>
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <label className="text-[11px] font-semibold text-ink-500" htmlFor="room-select">
              Oda
            </label>
            <select
              id="room-select"
              className="select max-w-xs text-xs"
              value={selectedRoom}
              onChange={(event) => selectRoom(event.target.value)}
            >
              {rooms.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            {room ? (
              <Link to={`/canli/${room.slug}`} target="_blank" className="text-[10px] font-medium text-brand-700">
                Odayı aç ↗
              </Link>
            ) : null}
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            {(Object.keys(PLATFORM_META) as LivePlatform[]).map((platform) => {
              const meta = PLATFORM_META[platform];
              const Icon = meta.icon;
              const existing = connections.find((item) => item.platform === platform);
              const isBusy = busy === platform;
              return (
                <SectionCard
                  key={platform}
                  title={meta.label}
                  description={meta.help}
                  icon={<Icon size={16} />}
                >
                  {existing ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2 rounded-xl bg-[#fbf7f0] p-3">
                        <div className="min-w-0">
                          <p className="truncate text-[11px] font-semibold text-ink-800">
                            {existing.channel}
                          </p>
                          <p className="mt-0.5 text-[9px] text-ink-400">
                            {existing.lastEventAt ? 'Son olay alındı' : 'Olay bekleniyor'}
                          </p>
                        </div>
                        <StatusBadge
                          status={
                            existing.status === 'connected'
                              ? 'ok'
                              : existing.status === 'error'
                                ? 'bad'
                                : 'warn'
                          }
                        >
                          {existing.status === 'connected'
                            ? 'Bağlı'
                            : existing.status === 'error'
                              ? 'Hata'
                              : 'Bağlanıyor'}
                        </StatusBadge>
                      </div>
                      {existing.lastError ? (
                        <p className="rounded-lg bg-amber-50 p-2 text-[9px] leading-relaxed text-amber-800">
                          {existing.lastError}
                        </p>
                      ) : null}
                      {platform === 'tiktok' && existing.connectorUrl ? (
                        <div className="rounded-xl border border-[#e9e1d5] bg-[#fffaf4] p-2.5">
                          <p className="text-[9px] font-semibold uppercase tracking-wider text-ink-400">
                            Connector URL
                          </p>
                          <p className="mt-1 break-all font-mono text-[9px] leading-relaxed text-ink-600">
                            {existing.connectorUrl}
                          </p>
                          <div className="mt-2 flex gap-1.5">
                            <Button
                              variant="secondary"
                              size="sm"
                              icon={<Copy size={11} />}
                              onClick={() => void copy(existing.connectorUrl!)}
                            >
                              Kopyala
                            </Button>
                          </div>
                          <p className="mt-2 text-[9px] leading-relaxed text-ink-400">
                            TikFinity → Event API / Webhook alanına bu adresi ekle. Gövde esnek
                            biçimde okunur: <code>comment</code>, <code>gift</code>,{' '}
                            <code>like</code>, <code>follow</code>.
                          </p>
                        </div>
                      ) : null}
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={<Trash2 size={12} />}
                        loading={isBusy}
                        onClick={() => void disconnect(existing)}
                      >
                        Bağlantıyı kaldır
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      <input
                        className="input text-xs"
                        value={channels[platform]}
                        onChange={(event) =>
                          setChannels((current) => ({ ...current, [platform]: event.target.value }))
                        }
                        placeholder={
                          platform === 'twitch'
                            ? 'twitch_kanal'
                            : platform === 'youtube'
                              ? '@kanal veya UC...'
                              : 'tiktok_kullanici'
                        }
                      />
                      {platform === 'youtube' && !youtubeConfigured ? (
                        <p className="flex items-start gap-1.5 rounded-lg bg-amber-50 p-2 text-[9px] leading-relaxed text-amber-800">
                          <ShieldAlert size={11} className="mt-0.5 shrink-0" />
                          Sunucuda <code>YOUTUBE_API_KEY</code> tanımlı değil. Anahtar eklenince
                          YouTube sohbeti okunur.
                        </p>
                      ) : null}
                      <Button
                        variant="brand"
                        size="sm"
                        className="w-full"
                        loading={isBusy}
                        onClick={() => void connect(platform)}
                        icon={<Link2 size={12} />}
                      >
                        {platform === 'tiktok' ? 'Connector oluştur' : 'Bağla'}
                      </Button>
                    </div>
                  )}
                </SectionCard>
              );
            })}
          </div>

          <SectionCard
            title="Bağlantıyı test et"
            description="Platformdan olay gelmeden önce odaya test yorumu, beğeni veya hediye gönder."
            icon={<Zap size={16} />}
          >
            <div className="flex flex-wrap gap-2">
              {[
                { kind: 'comment' as const, label: 'Test yorum', icon: Check },
                { kind: 'like' as const, label: 'Test beğeni', icon: ShieldCheck },
                { kind: 'gift' as const, label: 'Test hediye', icon: Send },
                { kind: 'follow' as const, label: 'Test takip', icon: ShieldAlert },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <Button
                    key={item.kind}
                    variant="secondary"
                    size="sm"
                    icon={<Icon size={12} />}
                    loading={testing === item.kind}
                    onClick={() => void test(item.kind)}
                  >
                    {item.label}
                  </Button>
                );
              })}
            </div>
            <p className="mt-3 text-[10px] leading-relaxed text-ink-400">
              Test olayları oyun turu başladıysa işlenir. Tur yoksa önce oyun sayfasından veya
              platformdan ilk izleyici gelmelidir.
            </p>
          </SectionCard>
        </>
      )}
    </div>
  );
}
