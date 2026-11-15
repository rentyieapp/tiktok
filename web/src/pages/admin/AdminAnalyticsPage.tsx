import { useEffect, useMemo, useState } from 'react';
import { Activity, BarChart3, Crown, Gamepad2, RefreshCw, TrendingUp, Users, Wallet } from 'lucide-react';
import { api, ApiError } from '../../lib/api';
import { useToast } from '../../lib/toast';
import { formatPrice } from '@shared/defaults';
import { Button, EmptyState, PageHeader, SectionCard } from '../../components/ui';

interface Analytics {
  rangeDays: number;
  totals: {
    users: number;
    verifiedUsers: number;
    publishers: number;
    payingUsers: number;
    revenueCents: number;
    activeSubscriptions: number;
    gameLicenses: number;
    rooms: number;
    sessions: number;
    avgSessionPlayers: number;
  };
  conversion: number;
  daily: Array<{ date: string; signups: number; activeUsers: number; revenueCents: number; sessions: number }>;
  retention: Array<{ cohort: string; size: number; d1: number | null; d7: number | null; d30: number | null }>;
  topGames: Array<{ gameKey: string; name: string; sessions: number; players: number }>;
  recentActivity: Array<{ event: string; createdAt: string }>;
}

const EVENT_LABELS: Record<string, string> = {
  register: 'Kayıt',
  login: 'Giriş',
  payment: 'Ödeme',
  room_created: 'Oda açtı',
};

export function AdminAnalyticsPage() {
  const { error: toastError } = useToast();
  const [data, setData] = useState<Analytics | null>(null);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);

  const load = async (range = days) => {
    setLoading(true);
    try {
      setData(await api.get<Analytics>(`/api/admin/analytics?days=${range}`));
    } catch (caught) {
      toastError('Analitik yüklenemedi', caught instanceof ApiError ? caught.message : 'Tekrar dene.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(days);
  }, [days]);

  const maxDaily = useMemo(() => Math.max(1, ...(data?.daily.map((point) => Math.max(point.activeUsers, point.signups, point.sessions)) ?? [1])), [data]);

  return (
    <div>
      <PageHeader
        eyebrow="Süper admin"
        title="Retention & analitik"
        description="Kayıt, aktivite, dönüşüm ve retention metriklerini tek ekranda izle."
        actions={
          <div className="flex gap-2">
            {[7, 30, 90].map((range) => (
              <button key={range} onClick={() => setDays(range)} className={`rounded-lg px-3 py-2 text-[11px] font-semibold ${days === range ? 'bg-ink-950 text-white' : 'border border-ink-200 bg-white text-ink-500'}`}>{range} gün</button>
            ))}
            <Button variant="secondary" icon={<RefreshCw size={14} />} loading={loading} onClick={() => void load(days)}>Yenile</Button>
          </div>
        }
      />

      {!data ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[0, 1, 2, 3].map((i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-white" />)}</div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: 'Toplam kullanıcı', value: data.totals.users, sub: `${data.totals.verifiedUsers} doğrulanmış`, icon: <Users size={16} />, color: 'bg-blue-50 text-blue-600' },
              { label: 'Aktif yayıncı', value: data.totals.publishers, sub: `${data.totals.rooms} oda`, icon: <Gamepad2 size={16} />, color: 'bg-emerald-50 text-emerald-600' },
              { label: 'Ödeme yapan', value: data.totals.payingUsers, sub: `%${data.conversion} dönüşüm`, icon: <Crown size={16} />, color: 'bg-violet-50 text-violet-600' },
              { label: 'Gelir', value: formatPrice(data.totals.revenueCents), sub: `${data.totals.activeSubscriptions} aktif abonelik`, icon: <Wallet size={16} />, color: 'bg-amber-50 text-amber-700' },
            ].map((card) => (
              <div key={card.label} className="rounded-2xl border border-ink-100 bg-white p-5 shadow-card">
                <div className="flex items-center justify-between"><p className="text-[10px] font-bold uppercase tracking-wider text-ink-400">{card.label}</p><span className={`grid h-8 w-8 place-items-center rounded-xl ${card.color}`}>{card.icon}</span></div>
                <p className="mt-3 text-2xl font-bold tracking-tight text-ink-950">{card.value}</p>
                <p className="mt-1 text-[10px] text-ink-400">{card.sub}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 grid gap-5 xl:grid-cols-[1.5fr_0.8fr]">
            <SectionCard title={`Son ${data.rangeDays} gün`} icon={<BarChart3 size={16} />} description="Aktif kullanıcı, kayıt ve oturum hareketi.">
              <div className="flex h-52 items-end gap-1">
                {data.daily.map((point) => (
                  <div key={point.date} className="group relative flex h-full flex-1 flex-col items-center justify-end gap-0.5">
                    <div className="w-full rounded-t bg-brand-500/20" style={{ height: `${(point.activeUsers / maxDaily) * 100}%` }} />
                    <div className="w-full rounded-t bg-brand-600" style={{ height: `${(point.signups / maxDaily) * 100}%` }} />
                    <div className="w-full rounded-t bg-violet-400" style={{ height: `${(point.sessions / maxDaily) * 100}%` }} />
                    <span className="pointer-events-none absolute -top-8 hidden whitespace-nowrap rounded bg-ink-950 px-2 py-1 text-[8px] text-white group-hover:block">{point.date.slice(5)} · {point.activeUsers} aktif · {point.signups} kayıt</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-3 text-[9px] text-ink-400">
                <span><i className="mr-1 inline-block h-2 w-2 rounded-sm bg-brand-500/30" /> Aktif</span>
                <span><i className="mr-1 inline-block h-2 w-2 rounded-sm bg-brand-600" /> Kayıt</span>
                <span><i className="mr-1 inline-block h-2 w-2 rounded-sm bg-violet-400" /> Oturum</span>
              </div>
            </SectionCard>

            <SectionCard title="Retention" icon={<TrendingUp size={16} />} description="Kayıt gününe göre D1 / D7 / D30 dönüş oranı." bodyClassName="p-0">
              <div className="table-wrap border-0 shadow-none">
                <table className="table-base">
                  <thead><tr><th>Kohort</th><th>Boyut</th><th>D1</th><th>D7</th><th>D30</th></tr></thead>
                  <tbody>
                    {data.retention.length === 0 ? <tr><td colSpan={5}>Henüz kohort yok.</td></tr> : data.retention.slice(-8).map((row) => (
                      <tr key={row.cohort}>
                        <td className="whitespace-nowrap text-[10px]">{row.cohort.slice(5)}</td>
                        <td className="text-[10px]">{row.size}</td>
                        {[row.d1, row.d7, row.d30].map((value, index) => (
                          <td key={index}><span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${value === null ? 'bg-ink-50 text-ink-300' : value >= 30 ? 'bg-emerald-50 text-emerald-700' : value >= 15 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-600'}`}>{value === null ? '—' : `${value}%`}</span></td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          </div>

          <div className="mt-5 grid gap-5 xl:grid-cols-2">
            <SectionCard title="En çok oynanan oyunlar" icon={<Gamepad2 size={16} />} description="Oturum ve oyuncu sayısına göre.">
              {data.topGames.length === 0 ? <EmptyState icon={<Gamepad2 size={18} />} title="Henüz oturum yok" description="Oyunlar oynandıkça burada sıralanır." /> : (
                <div className="space-y-2.5">
                  {data.topGames.map((game, index) => (
                    <div key={game.gameKey} className="flex items-center gap-2.5">
                      <span className="w-4 text-[10px] font-bold text-ink-300">{index + 1}</span>
                      <span className="min-w-0 flex-1 truncate text-[11px] font-medium text-ink-700">{game.name}</span>
                      <span className="text-[9px] text-ink-400">{game.sessions} oturum</span>
                      <span className="w-16 text-right text-[9px] font-semibold text-ink-600">{game.players} oyuncu</span>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
            <SectionCard title="Son aktiviteler" icon={<Activity size={16} />} description="Kullanıcı bazlı son olaylar.">
              <div className="space-y-2">
                {data.recentActivity.length === 0 ? <p className="text-[11px] text-ink-400">Henüz aktivite yok.</p> : data.recentActivity.map((event, index) => (
                  <div key={`${event.createdAt}-${index}`} className="flex items-center justify-between gap-2 text-[10px]">
                    <span className="rounded-full bg-ink-50 px-2 py-0.5 font-semibold text-ink-600">{EVENT_LABELS[event.event] ?? event.event}</span>
                    <span className="text-ink-400">{new Date(event.createdAt).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })}</span>
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-ink-100 bg-white p-4"><p className="text-[10px] uppercase tracking-wider text-ink-400">Tamamlanan oturum</p><p className="mt-1 text-xl font-bold">{data.totals.sessions}</p></div>
            <div className="rounded-2xl border border-ink-100 bg-white p-4"><p className="text-[10px] uppercase tracking-wider text-ink-400">Oturum başına oyuncu</p><p className="mt-1 text-xl font-bold">{data.totals.avgSessionPlayers}</p></div>
            <div className="rounded-2xl border border-ink-100 bg-white p-4"><p className="text-[10px] uppercase tracking-wider text-ink-400">Aktif oyun lisansı</p><p className="mt-1 text-xl font-bold">{data.totals.gameLicenses}</p></div>
          </div>
        </>
      )}
    </div>
  );
}
