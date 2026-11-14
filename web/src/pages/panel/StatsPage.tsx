import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Crown,
  Medal,
  RefreshCw,
  Star,
  Target,
  Trophy,
  Users,
} from 'lucide-react';
import type { PublisherStatsDTO } from '@shared/types';
import { api, ApiError } from '../../lib/api';
import { formatDateTime, formatDurationShort } from '../../lib/format';
import { useToast } from '../../lib/toast';
import {
  Button,
  EmptyState,
  PageHeader,
  SectionCard,
  StatCard,
  StatusBadge,
} from '../../components/ui';

export function StatsPage() {
  const { toast } = useToast();
  const [stats, setStats] = useState<PublisherStatsDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const result = await api.get<PublisherStatsDTO>('/api/game/stats');
      setStats(result);
      setError(null);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'İstatistikler yüklenemedi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const maxTeamWins = Math.max(1, ...(stats?.teamStats.map((team) => team.wins) ?? [1]));
  const hasMatches = Boolean(stats && stats.totalMatches > 0);

  return (
    <div>
      <PageHeader
        eyebrow="Analiz"
        title="Oyun istatistikleri"
        description="Yalnızca senin oyunundan hesaplanan veriler. Başka yayıncıların oyuncuları veya sonuçları buraya karışmaz."
        actions={
          <Button variant="secondary" icon={<RefreshCw size={15} />} loading={loading} onClick={() => void load()}>
            Yenile
          </Button>
        }
      />

      {error ? (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-700">{error}</div>
      ) : null}

      <div className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard
          label="Toplam maç"
          value={loading ? '—' : stats?.totalMatches ?? 0}
          hint={stats?.lastMatchAt ? `Son maç ${formatDateTime(stats.lastMatchAt)}` : 'Henüz tamamlanan maç yok'}
          icon={<Trophy size={17} />}
        />
        <StatCard
          label="Tekil oyuncu"
          value={loading ? '—' : stats?.totalUniquePlayers ?? 0}
          hint={`${stats?.totalPlayers ?? 0} toplam katılım`}
          icon={<Users size={17} />}
          accent="ink"
        />
        <StatCard
          label="Maç başına oyuncu"
          value={loading ? '—' : stats?.averageParticipants ?? 0}
          hint="Tamamlanan turların ortalaması"
          icon={<BarChart3 size={17} />}
          accent="violet"
        />
        <StatCard
          label="En çok kazanan takım"
          value={loading ? '—' : stats?.topTeam?.name ?? '—'}
          hint={stats?.topTeam ? `${stats.topTeam.wins} galibiyet` : 'Henüz galibiyet yok'}
          icon={<Crown size={17} />}
          accent="amber"
        />
      </div>

      {!loading && !hasMatches ? (
        <div className="card">
          <EmptyState
            icon={<Trophy size={22} />}
            title="Henüz istatistik oluşmadı"
            description="İlk turu tamamladığında kazanan takımlar, en aktif oyuncular ve maç geçmişi burada görünecek."
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Link to="/panel/yayin">
                  <Button variant="brand" icon={<Trophy size={15} />}>
                    Yayına git
                  </Button>
                </Link>
                <Link to="/panel/onizleme">
                  <Button variant="secondary" icon={<Target size={15} />}>
                    Test turu başlat
                  </Button>
                </Link>
              </div>
            }
          />
        </div>
      ) : (
        <div className="grid gap-5 xl:grid-cols-2">
          <SectionCard title="Takım performansı" description="Oynanan maç, galibiyet ve toplam puan." icon={<Trophy size={16} />}>
            <div className="space-y-4">
              {(stats?.teamStats ?? []).map((team) => (
                <div key={team.teamId}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: team.color }} />
                      <span className="truncate text-[12px] font-medium text-ink-800">{team.name}</span>
                      {stats?.topTeam?.teamId === team.teamId ? (
                        <Crown size={11} className="text-amber-500" />
                      ) : null}
                    </div>
                    <span className="shrink-0 text-[10px] text-ink-400">
                      {team.wins}G · {team.losses}M · {team.played} maç
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-ink-100">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${team.wins > 0 ? Math.max(6, (team.wins / maxTeamWins) * 100) : 2}%`,
                        background: team.color,
                      }}
                    />
                  </div>
                  <div className="mt-1 flex justify-between text-[9px] text-ink-400">
                    <span>{team.played > 0 ? `Galibiyet oranı %${Math.round((team.wins / team.played) * 100)}` : 'Henüz maç yok'}</span>
                    <span>{team.totalScore} puan</span>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="En aktif oyuncular" description="Yayıncıya özel kümülatif puan sıralaması." icon={<Star size={16} />}>
            {!stats || stats.topPlayers.length === 0 ? (
              <p className="text-xs text-ink-400">Henüz oyuncu verisi yok.</p>
            ) : (
              <ul className="space-y-1.5">
                {stats.topPlayers.map((player, index) => (
                  <li key={player.id} className="flex items-center gap-2.5 rounded-xl border border-ink-100 px-3 py-2">
                    <span
                      className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[9px] font-bold ${
                        index === 0
                          ? 'bg-amber-100 text-amber-700'
                          : index === 1
                            ? 'bg-ink-200 text-ink-700'
                            : index === 2
                              ? 'bg-orange-100 text-orange-700'
                              : 'bg-ink-50 text-ink-400'
                      }`}
                    >
                      {index + 1}
                    </span>
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: player.teamColor }} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12px] font-medium text-ink-800">{player.name}</p>
                      <p className="text-[9px] text-ink-400">{player.teamName} · {player.matches} maç</p>
                    </div>
                    <span className="text-[12px] font-semibold tabular-nums text-ink-700">{player.score}</span>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          <SectionCard title="En yüksek skorlar" description="Tek maçta ulaşılan en yüksek oyuncu puanları." icon={<Medal size={16} />}>
            {!stats || stats.highestScores.length === 0 ? (
              <p className="text-xs text-ink-400">Henüz skor kaydı yok.</p>
            ) : (
              <div className="table-wrap border-0 shadow-none">
                <table className="table-base min-w-0">
                  <thead>
                    <tr>
                      <th>Oyuncu</th>
                      <th>Takım</th>
                      <th className="text-right">Skor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.highestScores.map((player) => (
                      <tr key={player.id}>
                        <td className="font-medium text-ink-800">{player.name}</td>
                        <td>
                          <span className="inline-flex items-center gap-1.5 text-[11px] text-ink-500">
                            <span className="h-1.5 w-1.5 rounded-full" style={{ background: player.teamColor }} />
                            {player.teamName}
                          </span>
                        </td>
                        <td className="text-right font-semibold tabular-nums text-ink-800">{player.score}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>

          <SectionCard title="Son maçlar" description="Son 10 tamamlanmış tur." icon={<Trophy size={16} />}>
            {!stats || stats.recentMatches.length === 0 ? (
              <p className="text-xs text-ink-400">Henüz tamamlanmış maç yok.</p>
            ) : (
              <div className="table-wrap border-0 shadow-none">
                <table className="table-base min-w-0">
                  <thead>
                    <tr>
                      <th>Tarih</th>
                      <th>Kazanan</th>
                      <th>Oyuncu</th>
                      <th className="text-right">Süre</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recentMatches.map((match) => (
                      <tr key={match.id}>
                        <td className="whitespace-nowrap text-[11px] text-ink-500">
                          {formatDateTime(match.startedAt)}
                        </td>
                        <td>
                          {match.isDraw ? (
                            <StatusBadge status="neutral">Berabere</StatusBadge>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-ink-800">
                              <span className="h-1.5 w-1.5 rounded-full" style={{ background: match.winnerColor ?? '#64748b' }} />
                              {match.winnerTeamName ?? '—'}
                            </span>
                          )}
                        </td>
                        <td className="text-[11px] text-ink-500">{match.participantCount}</td>
                        <td className="text-right text-[10px] text-ink-400">
                          {formatDurationShort(match.durationSec)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-ink-100 bg-white p-4 shadow-card">
        <p className="text-[11px] leading-relaxed text-ink-500">
          Tüm metrikler yalnızca bu oyunun <span className="font-mono">game_id</span> değeriyle
          hesaplanır. Başka yayıncının verisi sorguya dahil edilmez.
        </p>
        <Link to="/panel/gecmis" className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-600 hover:text-brand-500">
          Tüm maç geçmişi <ArrowRight size={12} />
        </Link>
      </div>
    </div>
  );
}
