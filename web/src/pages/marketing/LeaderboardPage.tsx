import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Crown, Flame, Gamepad2, Radio, Trophy, Users } from 'lucide-react';
import { ARCADE_GAMES, type ArcadeKey } from '@shared/arcade';
import { api } from '../../lib/api';
import { Button } from '../../components/ui';
import { GameArt } from '../../components/GameArt';
import { MarketingFooter, MarketingHeader } from '../../components/MarketingHeader';

interface LeaderboardData {
  publishers: Array<{ name: string; rooms: number; rounds: number; lastPlayedAt: string | null }>;
  games: Array<{ gameKey: string; rooms: number; rounds: number }>;
  totals: { rooms: number; rounds: number; publishers: number };
}

export function LeaderboardPage() {
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<LeaderboardData>('/api/leaderboard')
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  const publishers = data?.publishers ?? [];
  const games = data?.games ?? [];
  const podium = publishers.slice(0, 3);

  return (
    <div className="min-h-screen bg-[#fbf7f0] text-ink-900">
      <MarketingHeader />
      <section className="relative overflow-hidden border-b border-[#eee7dc] bg-[#fffaf4]">
        <div className="absolute -left-24 top-0 h-72 w-72 rounded-full bg-[#dff5ea] blur-[90px]" />
        <div className="absolute -right-24 top-10 h-80 w-80 rounded-full bg-[#ffe2ef] blur-[100px]" />
        <div className="container-page relative py-14 text-center sm:py-20">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#e4dccf] bg-white px-3.5 py-1.5 text-[11px] font-semibold text-ink-600">
            <Trophy size={12} className="text-amber-600" /> Topluluk liderlik tablosu
          </span>
          <h1 className="mx-auto mt-5 max-w-3xl text-balance font-display text-4xl font-bold leading-[1.06] tracking-tight text-ink-950 sm:text-5xl">
            Sohbeti en iyi oynatan yayıncılar.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-ink-500">
            Oynanan tur sayısına göre yayıncılar ve oyunlar. Her tur, yayının etkileşimini
            artıran gerçek bir oyundan geliyor.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-2 text-[10px] text-ink-400">
            <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5">
              <Radio size={11} className="text-brand-600" /> {data?.totals.rooms ?? 0} canlı oda
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5">
              <Flame size={11} className="text-amber-600" /> {data?.totals.rounds ?? 0} oynanan tur
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5">
              <Users size={11} className="text-blue-600" /> {data?.totals.publishers ?? 0} yayıncı
            </span>
          </div>
        </div>
      </section>

      <main className="container-page py-12 sm:py-16">
        {loading ? (
          <div className="flex flex-wrap justify-center gap-4">
            {[0, 1, 2].map((index) => (
              <div key={index} className="h-48 animate-pulse rounded-3xl bg-white/70" />
            ))}
          </div>
        ) : publishers.length === 0 ? (
          <div className="mx-auto max-w-lg rounded-3xl border border-[#e9e1d5] bg-white p-8 text-center shadow-card">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#f7f2e9] text-amber-600">
              <Trophy size={24} />
            </span>
            <h2 className="mt-4 text-xl font-bold text-ink-950">Liderlik tablosu henüz boş</h2>
            <p className="mt-2 text-[12px] leading-relaxed text-ink-500">
              İlk oyununu yayına al, turları tamamla ve burada yerini al.
            </p>
            <Link to="/panel/arcade" className="mt-5 inline-flex">
              <Button variant="brand" icon={<ArrowRight size={14} />}>
                Oyunlarını aç
              </Button>
            </Link>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap justify-center gap-4">
              {podium.map((publisher, index) => (
                <div
                  key={publisher.name}
                  className={`relative w-full overflow-hidden rounded-3xl border bg-white p-5 shadow-card sm:w-[260px] ${
                    index === 0 ? 'border-amber-300' : 'border-[#e9e1d5]'
                  }`}
                >
                  {index === 0 ? <div className="absolute inset-x-0 top-0 h-1 bg-amber-400" /> : null}
                  <div className="flex items-center justify-between">
                    <span className={`grid h-9 w-9 place-items-center rounded-full text-sm font-bold ${
                      index === 0
                        ? 'bg-amber-100 text-amber-700'
                        : index === 1
                          ? 'bg-ink-100 text-ink-600'
                          : 'bg-orange-100 text-orange-700'
                    }`}>
                      {index + 1}
                    </span>
                    {index === 0 ? <Crown size={18} className="text-amber-500" /> : null}
                  </div>
                  <p className="mt-4 truncate text-lg font-bold text-ink-950">{publisher.name}</p>
                  <p className="mt-0.5 text-[10px] text-ink-400">{publisher.rooms} oda</p>
                  <p className="mt-3 font-display text-2xl font-bold text-ink-950">
                    {publisher.rounds} <span className="text-xs font-medium text-ink-400">tur</span>
                  </p>
                </div>
              ))}
            </div>

            {publishers.length > 3 ? (
              <div className="mt-6 overflow-hidden rounded-2xl border border-[#e9e1d5] bg-white shadow-card">
                <table className="w-full text-left text-[12px]">
                  <thead className="bg-[#fbf7f0] text-[9px] uppercase tracking-wider text-ink-400">
                    <tr>
                      <th className="px-4 py-3 font-semibold">#</th>
                      <th className="px-4 py-3 font-semibold">Yayıncı</th>
                      <th className="px-4 py-3 text-right font-semibold">Oda</th>
                      <th className="px-4 py-3 text-right font-semibold">Tur</th>
                    </tr>
                  </thead>
                  <tbody>
                    {publishers.slice(3).map((publisher, index) => (
                      <tr key={publisher.name} className="border-t border-[#f0ebe2]">
                        <td className="px-4 py-3 text-ink-400">{index + 4}</td>
                        <td className="px-4 py-3 font-semibold text-ink-800">{publisher.name}</td>
                        <td className="px-4 py-3 text-right text-ink-500">{publisher.rooms}</td>
                        <td className="px-4 py-3 text-right font-semibold text-ink-800">{publisher.rounds}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </>
        )}

        <div className="mt-10">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-600">Oyunlar</p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight text-ink-950">En çok oynananlar</h2>
            </div>
            <Link to="/oyunlar" className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-700">
              Tüm oyunlar <ArrowRight size={12} />
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {games.map((entry) => {
              const game = ARCADE_GAMES[entry.gameKey as ArcadeKey];
              if (!game) return null;
              return (
                <Link
                  key={entry.gameKey}
                  to={`/oyun/${game.slug}`}
                  className="group flex items-center gap-4 rounded-2xl border border-[#e9e1d5] bg-white p-3 shadow-card transition hover:-translate-y-0.5 hover:border-[#d8cbb9]"
                >
                  <div className="h-16 w-24 shrink-0 overflow-hidden rounded-xl">
                    <GameArt game={game} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-bold text-ink-950">{game.name}</p>
                    <p className="text-[10px] text-ink-400">{game.category}</p>
                    <p className="mt-1 text-[10px] font-semibold text-ink-600">
                      {entry.rounds} tur · {entry.rooms} oda
                    </p>
                  </div>
                  <Gamepad2 size={16} className="text-ink-300 transition group-hover:text-brand-600" />
                </Link>
              );
            })}
          </div>
          {!loading && games.length === 0 ? (
            <p className="rounded-2xl border border-[#e9e1d5] bg-white p-6 text-center text-[12px] text-ink-400">
              Henüz oynanmış oyun yok.
            </p>
          ) : null}
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
