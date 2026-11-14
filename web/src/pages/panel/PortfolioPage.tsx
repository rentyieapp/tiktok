import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Clock3,
  Copy,
  Gamepad2,
  Globe2,
  Layers,
  LockKeyhole,
  Play,
  Plus,
  Radio,
  ShieldCheck,
  Sparkles,
  Store,
  Trophy,
  Users,
} from 'lucide-react';
import type { ArcadeRoomDTO } from '@shared/types';
import { ARCADE_GAME_LIST } from '@shared/arcade';
import { useAuth } from '../../lib/auth';
import { useStudio } from '../../lib/studio';
import { api } from '../../lib/api';
import { formatDate } from '../../lib/format';
import { GameArt } from '../../components/GameArt';
import { Button, PageHeader, Spinner } from '../../components/ui';

interface LicenseRow {
  gameKey: string;
  expiresAt: string;
}

export function PortfolioPage() {
  const { me } = useAuth();
  const { game, live } = useStudio();
  const [rooms, setRooms] = useState<ArcadeRoomDTO[]>([]);
  const [licenses, setLicenses] = useState<LicenseRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<{ rooms: ArcadeRoomDTO[]; licenses: LicenseRow[] }>('/api/arcade/rooms')
      .then((result) => {
        setRooms(result.rooms);
        setLicenses(result.licenses);
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  const licenseFor = (key: string) => licenses.find((license) => license.gameKey === key);
  const roomFor = (key: string) => rooms.find((room) => room.gameKey === key);
  const sortedGames = useMemo(() => {
    return [...ARCADE_GAME_LIST].sort((a, b) => {
      const aOwned = Boolean(licenseFor(a.key));
      const bOwned = Boolean(licenseFor(b.key));
      if (aOwned !== bOwned) return aOwned ? -1 : 1;
      return a.category.localeCompare(b.category, 'tr');
    });
  }, [licenses]);

  const totalRounds = rooms.reduce((sum, room) => sum + room.roundsPlayed, 0);
  const activeRooms = rooms.filter((room) => room.status === 'live').length;
  const firstName = me?.user.displayName?.split(' ')[0] ?? 'yayıncı';
  const running = live?.phase === 'running';

  return (
    <div>
      <PageHeader
        eyebrow="Oyun portföyü"
        title={`Merhaba, ${firstName}.`}
        description="Tüm oyunların tek yerde. Bir oyun seç; kendi oda, yayın ve istatistik panelini aç."
        actions={
          <>
            <Link to="/satin-al">
              <Button variant="secondary" icon={<Store size={15} />}>
                Oyun mağazası
              </Button>
            </Link>
            <Link to="/panel/arcade">
              <Button variant="brand" icon={<Layers size={15} />}>
                Oyunlarım
              </Button>
            </Link>
          </>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[
          { label: 'Aktif oyun', value: `${licenses.length}/${ARCADE_GAME_LIST.length}`, hint: 'arcade lisansı', icon: Gamepad2 },
          { label: 'Canlı oda', value: activeRooms, hint: `${rooms.length} oda toplam`, icon: Radio },
          { label: 'Oynanan tur', value: totalRounds, hint: 'arcade toplamı', icon: Trophy },
          { label: '3D stüdyo', value: game ? `${game.teamCount} takım` : 'Kurulmadı', hint: running ? 'şu an canlı' : game?.liveEnabled ? 'yayına hazır' : 'bağlantı kapalı', icon: Play },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="rounded-2xl border border-ink-100 bg-white p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-400">{stat.label}</p>
                  <p className="mt-1 font-display text-2xl font-bold text-ink-950">{stat.value}</p>
                </div>
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#f3ede3] text-brand-700">
                  <Icon size={16} />
                </span>
              </div>
              <p className="mt-2 text-[10px] text-ink-400">{stat.hint}</p>
            </div>
          );
        })}
      </div>

      <section className="mb-6 overflow-hidden rounded-2xl border border-ink-100 bg-ink-950 text-white">
        <div className="relative flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="absolute inset-0 bg-marketing-grid opacity-30" />
          <div className="relative">
            <div className="flex flex-wrap items-center gap-2">
              <span className="badge bg-brand-400/15 text-brand-300 ring-1 ring-inset ring-brand-400/30">
                <Sparkles size={10} /> 3D stüdyo oyunu
              </span>
              {game ? (
                <span className={running ? 'badge-live' : 'badge bg-white/10 text-white/70'}>
                  {running ? 'CANLI' : game.liveEnabled ? 'Yayına hazır' : 'Bağlantı kapalı'}
                </span>
              ) : null}
            </div>
            <h2 className="mt-2 font-display text-2xl font-bold">Taraftar Savaşı 3D</h2>
            <p className="mt-1 max-w-lg text-[11px] leading-relaxed text-white/50">
              Takım savaşı, komutlar ve 3D yayın sahnesi. Arcade oyunlarından bağımsız kendi paneli,
              takım limiti ve istatistikleri vardır.
            </p>
            <div className="mt-3 flex flex-wrap gap-3 text-[10px] text-white/45">
              <span className="inline-flex items-center gap-1"><Users size={11} /> {game?.teamCount ?? 0} takım</span>
              <span className="inline-flex items-center gap-1"><Radio size={11} /> {live?.players ?? 0} oyuncu</span>
              <span className="inline-flex items-center gap-1"><Globe2 size={11} /> {game?.language?.toUpperCase() ?? 'TR'}</span>
            </div>
          </div>
          <div className="relative flex shrink-0 flex-wrap gap-2">
            {game ? (
              <>
                <Link to="/panel/3d">
                  <Button variant="brand" icon={<ArrowRight size={14} />}>3D panelini aç</Button>
                </Link>
                <Link to="/panel/yayin">
                  <Button variant="ghost" className="text-white/70 hover:bg-white/10 hover:text-white">Yayın</Button>
                </Link>
              </>
            ) : (
              <Link to="/panel/oyun">
                <Button variant="brand" icon={<Plus size={14} />}>3D oyununu kur</Button>
              </Link>
            )}
          </div>
        </div>
      </section>

      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold text-ink-950">Arcade oyunların</h2>
          <p className="mt-0.5 text-[11px] text-ink-500">
            Lisanslı oyunlarına tıkla; oyunun kendi panelinde oda, OBS ve yayın ayarlarını yönet.
          </p>
        </div>
        <Link to="/panel/arcade" className="text-[10px] font-semibold text-brand-700">
          Tüm oyunları yönet →
        </Link>
      </div>

      {loading ? (
        <Spinner label="Oyun portföyü yükleniyor..." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {sortedGames.map((gameDef) => {
            const license = licenseFor(gameDef.key);
            const room = roomFor(gameDef.key);
            return (
              <Link
                key={gameDef.key}
                to={`/panel/oyun/${gameDef.key}`}
                className="group overflow-hidden rounded-2xl border border-ink-100 bg-white transition hover:-translate-y-0.5 hover:shadow-card"
              >
                <div className="relative h-24 overflow-hidden">
                  <GameArt game={gameDef} />
                  <span className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-[8px] font-bold ${license ? 'bg-emerald-500 text-white' : 'bg-ink-950/80 text-white'}`}>
                    {license ? 'Lisanslı' : 'Kilitli'}
                  </span>
                  {room ? (
                    <span className={`absolute right-2 top-2 rounded-full px-2 py-0.5 text-[8px] font-bold ${room.status === 'live' ? 'bg-white/90 text-emerald-700' : 'bg-white/90 text-ink-500'}`}>
                      {room.status === 'live' ? 'Yayında' : 'Duraklatıldı'}
                    </span>
                  ) : null}
                </div>
                <div className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-[12px] font-bold text-ink-950">{gameDef.name}</p>
                      <p className="text-[9px] text-ink-400">{gameDef.category}</p>
                    </div>
                    <ArrowUpRight size={13} className="shrink-0 text-ink-300 transition group-hover:text-brand-600" />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[9px]">
                    {license ? (
                      <span className="inline-flex items-center gap-1 text-emerald-700">
                        <ShieldCheck size={10} /> {formatDate(license.expiresAt)}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-ink-400">
                        <LockKeyhole size={10} /> Lisans yok
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 text-ink-400">
                      <Clock3 size={10} /> {room?.roundsPlayed ?? 0} tur
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {[
          { title: 'Oyun seç', text: 'Portföyden bir oyuna gir; kendi odasını ve yayın bağlantısını aç.', icon: Gamepad2 },
          { title: 'Lisans yönet', text: 'Tek oyun veya Tüm Oyunlar paketiyle lisansları aç.', icon: ShieldCheck },
          { title: 'OBS’e ekle', text: 'Oyun panelindeki sabit bağlantıyı OBS Browser Source’a ekle.', icon: Copy },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.title} className="flex items-start gap-2.5 rounded-xl border border-ink-100 bg-white p-3.5">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#f3ede3] text-brand-700"><Icon size={14} /></span>
              <div>
                <p className="text-[11px] font-semibold text-ink-800">{item.title}</p>
                <p className="mt-0.5 text-[10px] leading-relaxed text-ink-400">{item.text}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
