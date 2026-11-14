import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarDays,
  Clock,
  RefreshCw,
  Trophy,
  Users,
} from 'lucide-react';
import type { SessionHistoryDTO } from '@shared/types';
import { api, ApiError } from '../../lib/api';
import { useStudio } from '../../lib/studio';
import { formatDateTime, formatDurationShort } from '../../lib/format';
import { Button, EmptyState, PageHeader, StatCard, StatusBadge } from '../../components/ui';

export function HistoryPage() {
  const { game } = useStudio();
  const [sessions, setSessions] = useState<SessionHistoryDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const result = await api.get<{ sessions: SessionHistoryDTO[] }>('/api/game/sessions');
      setSessions(result.sessions);
      setError(null);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Geçmiş yüklenemedi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const summary = useMemo(() => {
    const total = sessions.length;
    const participants = sessions.reduce((sum, session) => sum + session.participantCount, 0);
    const latest = sessions[0];
    const wins = sessions.filter((session) => !session.isDraw).length;
    return { total, participants, latest, wins };
  }, [sessions]);

  return (
    <div>
      <PageHeader
        eyebrow="Geçmiş"
        title="Oyun geçmişi"
        description="Tamamlanan tüm turlar; kazanan, süre ve katılımcı sayısı. Maçlar yalnızca senin oyununa aittir."
        actions={
          <Button variant="secondary" icon={<RefreshCw size={15} />} loading={loading} onClick={() => void load()}>
            Yenile
          </Button>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="Tamamlanan tur" value={loading ? '—' : summary.total} icon={<Trophy size={17} />} />
        <StatCard
          label="Toplam katılım"
          value={loading ? '—' : summary.participants}
          hint="Tüm turlardaki oyuncu katılımı"
          icon={<Users size={17} />}
          accent="ink"
        />
        <StatCard
          label="Son maç"
          value={loading ? '—' : summary.latest ? formatDateTime(summary.latest.startedAt) : '—'}
          hint={summary.latest ? `${summary.latest.participantCount} oyuncu` : 'Henüz maç yok'}
          icon={<CalendarDays size={17} />}
          accent="amber"
        />
      </div>

      {error ? (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-700">{error}</div>
      ) : null}

      {loading ? (
        <div className="table-wrap p-4">
          <div className="space-y-2">
            {[0, 1, 2, 3].map((index) => (
              <div key={index} className="h-12 animate-pulse rounded-xl bg-ink-50" />
            ))}
          </div>
        </div>
      ) : sessions.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<CalendarDays size={22} />}
            title="Geçmiş henüz boş"
            description="İlk tur tamamlandığında maç sonuçları burada listelenir. İstersen önizleme sayfasında test turu çalıştırabilirsin."
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Link to={game ? `/live/${game.publicSlug}` : '/panel/yayin'} target={game ? '_blank' : undefined} rel="noreferrer">
                  <Button variant="brand">Yayın ekranını aç</Button>
                </Link>
                <Link to="/panel/onizleme">
                  <Button variant="secondary">Önizlemeyi dene</Button>
                </Link>
              </div>
            }
          />
        </div>
      ) : (
        <div className="table-wrap">
          <table className="table-base">
            <thead>
              <tr>
                <th>Tur</th>
                <th>Tarih</th>
                <th>Kazanan</th>
                <th>Sonuç</th>
                <th>Oyuncu</th>
                <th>Süre</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((session) => (
                <tr key={session.id}>
                  <td>
                    <span className="font-mono text-[11px] text-ink-400">#{session.roundIndex}</span>
                  </td>
                  <td className="whitespace-nowrap text-[11px] text-ink-500">
                    {formatDateTime(session.startedAt)}
                  </td>
                  <td>
                    {session.isDraw ? (
                      <span className="text-[11px] font-medium text-ink-500">—</span>
                    ) : (
                      <span className="inline-flex items-center gap-2 text-[12px] font-medium text-ink-800">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ background: session.winnerColor ?? '#64748b' }}
                        />
                        {session.winnerTeamName ?? 'Bilinmiyor'}
                      </span>
                    )}
                  </td>
                  <td>
                    {session.isDraw ? (
                      <StatusBadge status="neutral">Berabere</StatusBadge>
                    ) : session.winnerTeamName ? (
                      <StatusBadge status="ok">Kazanan belli</StatusBadge>
                    ) : (
                      <StatusBadge status="neutral">Sonuç yok</StatusBadge>
                    )}
                  </td>
                  <td className="text-[11px] text-ink-600">{session.participantCount}</td>
                  <td>
                    <span className="inline-flex items-center gap-1 text-[10px] text-ink-400">
                      <Clock size={10} /> {formatDurationShort(session.durationSec)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-4 text-[10px] leading-relaxed text-ink-400">
        Maç sonuçları, sunucu oturumu kapandığında yazılır. Sunucu yeniden başlarsa yarım kalan
        oturumlar “abandoned” olarak işaretlenir ve listelenmez.
      </p>
    </div>
  );
}
