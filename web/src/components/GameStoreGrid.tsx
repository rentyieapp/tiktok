import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Clock3, LockKeyhole, ShoppingBag } from 'lucide-react';
import type { PackageDTO } from '@shared/types';
import { ARCADE_GAME_LIST } from '@shared/arcade';
import { formatPrice } from '@shared/defaults';
import { api } from '../lib/api';
import { GameArt } from './GameArt';
import { Button } from './ui';

export function GameStoreGrid({ limit }: { limit?: number }) {
  const [offers, setOffers] = useState<PackageDTO[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<{ offers: PackageDTO[] }>('/api/arcade/offers')
      .then((result) => setOffers(result.offers.filter((offer) => offer.isActive !== false)))
      .catch(() => setOffers([]))
      .finally(() => setLoading(false));
  }, []);

  const games = useMemo(
    () => (limit ? ARCADE_GAME_LIST.slice(0, limit) : ARCADE_GAME_LIST),
    [limit],
  );

  return (
    <div>
      {loading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((index) => (
            <div key={index} className="h-80 animate-pulse rounded-3xl bg-white/70" />
          ))}
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {games.map((game) => {
            const gameOffers = offers
              .filter((offer) => offer.gameKey === game.key)
              .sort((a, b) => a.durationDays - b.durationDays);
            return (
              <div
                key={game.key}
                className="group flex flex-col overflow-hidden rounded-3xl border border-[#e9e1d5] bg-white shadow-[0_10px_35px_-24px_rgba(48,38,25,0.28)] transition hover:-translate-y-0.5 hover:border-[#d8cbb9]"
              >
                <div className="relative h-36 overflow-hidden">
                  <GameArt game={game} className="transition duration-300 group-hover:scale-[1.03]" />
                  <span className="absolute left-4 top-4 rounded-full bg-white/85 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-ink-600 backdrop-blur">
                    {game.category}
                  </span>
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <h3 className="text-[15px] font-bold text-ink-950">{game.name}</h3>
                  <p className="mt-1 text-[10px] leading-relaxed text-ink-500">{game.tagline}</p>
                  <div className="mt-3 space-y-1.5">
                    {gameOffers.length === 0 ? (
                      <p className="rounded-lg bg-ink-50 px-2 py-1.5 text-[10px] text-ink-400">
                        Lisans yakında
                      </p>
                    ) : (
                      gameOffers.map((offer) => (
                        <div
                          key={offer.id}
                          className="flex items-center justify-between rounded-lg bg-[#fffaf4] px-2.5 py-1.5 text-[10px]"
                        >
                          <span className="inline-flex items-center gap-1 text-ink-500">
                            <Clock3 size={10} /> {offer.durationDays === 1 ? '1 gün' : offer.durationDays === 365 ? '1 yıl' : `${offer.durationDays} gün`}
                          </span>
                          <span className="font-bold text-ink-900">
                            {formatPrice(offer.priceCents, offer.currency)}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-[#f0ebe2] pt-3">
                    <span className="inline-flex items-center gap-1 text-[9px] text-ink-400">
                      <LockKeyhole size={10} /> Oyun lisansı
                    </span>
                    <Link to={`/oyun/${game.slug}`}>
                      <Button variant="secondary" size="sm" icon={<ArrowRight size={11} />}>
                        İncele
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <div className="mt-5 flex flex-wrap items-center gap-2 text-[10px] text-ink-400">
        <span className="inline-flex items-center gap-1">
          <ShoppingBag size={11} className="text-brand-600" /> Her oyun ayrı lisanslanır
        </span>
        <span>·</span>
        <span>1 gün veya 30 gün</span>
        <span>·</span>
        <span>Lisans bitince oda yayından kalkar</span>
      </div>
    </div>
  );
}
