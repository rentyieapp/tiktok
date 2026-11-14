import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Check,
  Circle,
  Copy,
  CreditCard,
  Gamepad2,
  Globe2,
  Languages,
  Link2,
  MonitorPlay,
  Play,
  Radio,
  Settings,
  Shield,
  Sparkles,
  Square,
  Trophy,
  Users,
} from 'lucide-react';
import type { PublisherStatsDTO } from '@shared/types';
import { useStudio } from '../../lib/studio';
import { useAuth } from '../../lib/auth';
import { api, ApiError } from '../../lib/api';
import { useToast } from '../../lib/toast';
import { formatDate, formatDateTime } from '../../lib/format';
import { Button, CopyButton, PageHeader, SectionCard, StatusBadge, TeamCrest } from '../../components/ui';

export function OverviewPage() {
  const { game, publicUrl, live, refresh } = useStudio();
  const { me } = useAuth();
  const { success, error: toastError } = useToast();
  const [stats, setStats] = useState<PublisherStatsDTO | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    if (!game) {
      setLoadingStats(false);
      return;
    }
    let cancelled = false;
    api
      .get<PublisherStatsDTO>('/api/game/stats')
      .then((result) => {
        if (!cancelled) setStats(result);
      })
      .catch(() => {
        if (!cancelled) setStats(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingStats(false);
      });
    return () => {
      cancelled = true;
    };
  }, [game]);

  if (!game) {
    return (
      <div className="mx-auto max-w-2xl py-10 text-center">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-brand-50 text-brand-600">
          <Gamepad2 size={28} />
        </span>
        <h1 className="mt-5 text-2xl font-bold text-ink-950">Önce oyununu oluşturalım.</h1>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-500">
          İsim, takım sayısı ve takımlarını seç; kalıcı yayın bağlantın otomatik oluşsun.
        </p>
        <Link to="/panel/oyun" className="mt-6 inline-block">
          <Button variant="brand" size="lg" icon={<Sparkles size={16} />}>
            Oyun oluşturma sihirbazını aç
          </Button>
        </Link>
      </div>
    );
  }

  const url = `${window.location.origin}/live/${game.publicSlug}`;
  const running = live?.phase === 'running';
  const readySteps = [
    { label: 'Oyun oluşturuldu', done: true },
    { label: 'Ayarlar kişiselleştirildi', done: game.configVersion > 1 },
    { label: 'Yayın bağlantısı açık', done: game.liveEnabled },
    { label: 'İlk tur tamamlandı', done: Boolean(stats?.totalMatches) },
  ];
  const completedSteps = readySteps.filter((step) => step.done).length;

  const startRound = async () => {
    setWorking(true);
    try {
      await api.post('/api/game/session/start', {});
      await refresh();
      success('Tur başlatıldı', 'Yayın ekranın canlıya geçti.');
    } catch (caught) {
      toastError('Tur başlatılamadı', caught instanceof ApiError ? caught.message : 'Tekrar dene.');
    } finally {
      setWorking(false);
    }
  };

  const stopRound = async () => {
    setWorking(true);
    try {
      await api.post('/api/game/session/stop', {});
      await refresh();
      success('Tur durduruldu');
    } catch (caught) {
      toastError('Tur durdurulamadı', caught instanceof ApiError ? caught.message : 'Tekrar dene.');
    } finally {
      setWorking(false);
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Genel bakış"
        title={`Merhaba, ${me?.user.displayName?.split(' ')[0] ?? 'yayıncı'}.`}
        description={
          running
            ? 'Arenan canlı. İzleyici komutları ve destekler anlık işleniyor.'
            : 'Arenan hazır. Yayın bağlantını OBS’e ekle veya bir test turu başlat.'
        }
        actions={
          <>
            <Link to="/panel/onizleme">
              <Button variant="secondary" icon={<MonitorPlay size={15} />}>
                Önizleme
              </Button>
            </Link>
            {running ? (
              <Button
                variant="secondary"
                icon={<Square size={14} />}
                loading={working}
                onClick={() => void stopRound()}
              >
                Turu durdur
              </Button>
            ) : (
              <Button
                variant="brand"
                icon={<Play size={15} />}
                loading={working}
                disabled={!game.liveEnabled}
                onClick={() => void startRound()}
              >
                Tur başlat
              </Button>
            )}
          </>
        }
      />

      {/* Oyun kartı */}
      <div className="relative mb-6 min-w-0 overflow-hidden rounded-2xl bg-ink-950 p-6 text-white shadow-float sm:p-7">
        <div className="absolute inset-0 bg-marketing-grid opacity-40" />
        <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-brand-500/20 blur-3xl" />
        <div className="relative flex min-w-0 flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              {running ? (
                <span className="badge-live">
                  <span className="live-dot h-1.5 w-1.5 rounded-full bg-red-400" /> CANLI
                </span>
              ) : game.liveEnabled ? (
                <span className="badge bg-brand-400/15 text-brand-300 ring-1 ring-inset ring-brand-400/30">
                  Yayına hazır
                </span>
              ) : (
                <span className="badge bg-white/10 text-white/50">Bağlantı kapalı</span>
              )}
              <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2 py-1 text-[10px] text-white/45">
                <Globe2 size={11} /> {game.language.toUpperCase()}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2 py-1 text-[10px] text-white/45">
                <Shield size={11} /> v{game.configVersion}
              </span>
            </div>
            <h2 className="mt-3 truncate font-display text-2xl font-bold sm:text-3xl">{game.gameName}</h2>
            <div className="mt-3 flex flex-wrap items-center gap-4 text-[11px] text-white/45">
              <span className="inline-flex items-center gap-1.5">
                <Users size={12} /> {game.teamCount} takım
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Radio size={12} /> {live?.players ?? 0} oyuncu · {live?.viewers ?? 0} izleyici
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Trophy size={12} /> {stats?.totalMatches ?? 0} maç
              </span>
            </div>
            <div className="mt-5 flex w-full min-w-0 flex-wrap items-center gap-2">
              <div className="flex w-full min-w-0 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 sm:max-w-md">
                <Link2 size={13} className="shrink-0 text-brand-300" />
                <span className="min-w-0 flex-1 truncate font-mono text-[10px] text-white/60">{url}</span>
              </div>
              <CopyButton
                value={url}
                label="Kopyala"
                size="sm"
                variant="brand"
                className="shrink-0"
              />
              <Link to="/panel/yayin">
                <Button variant="ghost" size="sm" className="text-white/60 hover:bg-white/10 hover:text-white">
                  Yayın sayfası <ArrowUpRight size={13} />
                </Button>
              </Link>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            {game.teams.slice(0, 4).map((team) => (
              <div
                key={team.slot}
                className="flex w-[120px] flex-col items-center rounded-2xl border border-white/10 bg-white/[0.04] p-3 backdrop-blur"
              >
                <TeamCrest symbol={team.symbol} emblemUrl={team.emblemUrl} color={team.primaryColor} size={38} />
                <p className="mt-2 w-full truncate text-center text-[11px] font-semibold text-white/80">
                  {team.name}
                </p>
                <p className="mt-0.5 font-mono text-[9px] text-white/30">!{team.joinCommand}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[
          {
            label: 'Toplam maç',
            value: stats?.totalMatches ?? 0,
            hint: stats?.lastMatchAt ? `Son maç ${formatDate(stats.lastMatchAt)}` : 'Henüz maç yok',
            icon: Trophy,
          },
          {
            label: 'Tekil oyuncu',
            value: stats?.totalUniquePlayers ?? 0,
            hint: `${stats?.totalPlayers ?? 0} toplam katılım`,
            icon: Users,
          },
          {
            label: 'Maç başına oyuncu',
            value: stats?.averageParticipants ?? 0,
            hint: 'Tamamlanan turlar ortalaması',
            icon: BarChart3,
          },
          {
            label: 'En çok kazanan',
            value: stats?.topTeam?.name ?? '—',
            hint: stats?.topTeam ? `${stats.topTeam.wins} galibiyet` : 'Henüz sonuç yok',
            icon: Sparkles,
          },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="card card-pad">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] text-ink-500">{item.label}</p>
                  <p className="mt-1.5 truncate font-display text-xl font-bold text-ink-950">{item.value}</p>
                  <p className="mt-1 text-[10px] text-ink-400">{item.hint}</p>
                </div>
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-ink-100 text-ink-600">
                  <Icon size={16} />
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Yayına hazırlık */}
        <SectionCard
          title="Yayına hazırlık"
          description={`${completedSteps}/4 adım tamamlandı`}
          icon={<Sparkles size={16} />}
        >
          <div className="mb-4">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-100">
              <div
                className="h-full rounded-full bg-brand-500 transition-all duration-500"
                style={{ width: `${(completedSteps / readySteps.length) * 100}%` }}
              />
            </div>
          </div>
          <ul className="space-y-2.5">
            {readySteps.map((step) => (
              <li key={step.label} className="flex items-center gap-2.5">
                <span
                  className={`grid h-5 w-5 shrink-0 place-items-center rounded-full ${
                    step.done ? 'bg-brand-500 text-white' : 'border border-ink-200 text-ink-300'
                  }`}
                >
                  {step.done ? <Check size={11} strokeWidth={3} /> : <Circle size={8} />}
                </span>
                <span className={`text-[12px] ${step.done ? 'text-ink-700' : 'text-ink-400'}`}>
                  {step.label}
                </span>
                {!step.done ? (
                  <Link
                    to={
                      step.label.includes('Yayın')
                        ? '/panel/yayin'
                        : step.label.includes('Ayarlar')
                          ? '/panel/ayarlar'
                          : step.label.includes('tur')
                            ? '/panel/onizleme'
                            : '/panel/oyun'
                    }
                    className="ml-auto text-[10px] font-medium text-brand-600 hover:text-brand-500"
                  >
                    Tamamla
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
          <div className="mt-4 rounded-xl bg-ink-50 p-3 text-[10px] leading-relaxed text-ink-500">
            İlk turu başlatmak için yayın ekranını aç veya önizleme sayfasında test et.
          </div>
        </SectionCard>

        {/* Son maçlar */}
        <SectionCard
          title="Son maçlar"
          description="Yayıncıya özel oyun geçmişin"
          icon={<Trophy size={16} />}
          action={
            <Link to="/panel/gecmis" className="text-[11px] font-medium text-brand-600 hover:text-brand-500">
              Tümü
            </Link>
          }
        >
          {loadingStats ? (
            <div className="space-y-2">
              {[0, 1, 2].map((index) => (
                <div key={index} className="h-12 animate-pulse rounded-xl bg-ink-50" />
              ))}
            </div>
          ) : !stats || stats.recentMatches.length === 0 ? (
            <p className="rounded-xl bg-ink-50 p-4 text-[11px] leading-relaxed text-ink-500">
              Henüz tamamlanmış bir maç yok. İlk turu başlattığında sonuçlar burada görünecek.
            </p>
          ) : (
            <ul className="space-y-2">
              {stats.recentMatches.slice(0, 4).map((match) => (
                <li key={match.id} className="flex items-center gap-2.5 rounded-xl border border-ink-100 p-2.5">
                  <span
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-sm"
                    style={{ background: `${match.winnerColor ?? '#64748b'}22` }}
                  >
                    <Trophy size={13} style={{ color: match.winnerColor ?? '#64748b' }} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] font-semibold text-ink-800">
                      {match.isDraw ? 'Berabere' : match.winnerTeamName ?? 'Kazanan yok'}
                    </p>
                    <p className="text-[9px] text-ink-400">
                      {formatDateTime(match.startedAt)} · {match.participantCount} oyuncu
                    </p>
                  </div>
                  <span className="text-[9px] text-ink-400">{match.durationSec} sn</span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        {/* Hızlı işlemler */}
        <SectionCard title="Hızlı işlemler" icon={<Settings size={16} />}>
          <div className="grid grid-cols-2 gap-2">
            {[
              { to: '/panel/takimlar', label: 'Takımlar', icon: Shield },
              { to: '/panel/ayarlar', label: 'Oyun ayarları', icon: Settings },
              { to: '/panel/komutlar', label: 'Komutlar', icon: Languages },
              { to: '/panel/istatistikler', label: 'İstatistikler', icon: BarChart3 },
              { to: '/panel/yayin', label: 'Yayın bağlantısı', icon: Radio },
              { to: '/panel/odeme', label: 'Paketim', icon: CreditCard },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className="group flex flex-col gap-2 rounded-xl border border-ink-100 p-3 transition hover:border-ink-200 hover:bg-ink-50"
                >
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-ink-100 text-ink-600 transition group-hover:bg-white group-hover:text-brand-600">
                    <Icon size={15} />
                  </span>
                  <span className="flex items-center justify-between text-[11px] font-medium text-ink-700">
                    {item.label}
                    <ArrowUpRight size={11} className="text-ink-300 group-hover:text-brand-500" />
                  </span>
                </Link>
              );
            })}
          </div>
        </SectionCard>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-ink-100 bg-white p-4 shadow-card">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600">
            <Link2 size={16} />
          </span>
          <div className="min-w-0">
            <p className="text-[12px] font-semibold text-ink-800">Kalıcı yayın bağlantın</p>
            <p className="max-w-full truncate font-mono text-[10px] text-ink-400">{url}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={url} target="_blank" rel="noreferrer">
            <Button variant="secondary" size="sm" icon={<ArrowUpRight size={13} />}>
              Yayını aç
            </Button>
          </a>
          <CopyButton value={url} label="Bağlantıyı kopyala" size="sm" variant="primary" />
        </div>
      </div>

      {me?.subscription ? (
        <p className="mt-4 flex flex-wrap items-center gap-1.5 text-[10px] text-ink-400">
          <CreditCard size={11} /> {me.subscription.packageName} paketi · {formatDate(me.subscription.expiresAt)} tarihine kadar
          geçerli · <Link to="/panel/odeme" className="font-medium text-brand-600">Paketi yönet</Link>
        </p>
      ) : null}
    </div>
  );
}
