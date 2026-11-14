import { Link } from 'react-router-dom';
import { ArrowUpRight, Play, ShieldAlert } from 'lucide-react';
import type { ArcadeGameDef } from '@shared/arcade';
import type { PackageDTO } from '@shared/types';
import { formatPrice } from '@shared/defaults';
import { GameArt } from './GameArt';

export function ArcadeGameCard({
  game,
  compact = false,
  offers = [],
}: {
  game: ArcadeGameDef;
  compact?: boolean;
  offers?: PackageDTO[];
}) {
  return (
    <Link
      to={`/oyun/${game.slug}`}
      className="group flex flex-col overflow-hidden rounded-3xl border border-[#e9e2d7] bg-white shadow-[0_10px_35px_-24px_rgba(48,38,25,0.28)] transition duration-200 hover:-translate-y-0.5 hover:border-[#d8cbb9] hover:shadow-[0_18px_45px_-24px_rgba(48,38,25,0.3)]"
    >
      <div className={`relative overflow-hidden ${compact ? 'h-32' : 'h-44'}`}>
        <GameArt game={game} className="transition duration-300 group-hover:scale-[1.03]" />
        <div className="absolute left-4 top-4 flex flex-wrap gap-1.5">
          <span className="rounded-full bg-white/80 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-ink-600 backdrop-blur">
            {game.category}
          </span>
          {game.risk === 'yuksek' ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100/90 px-2 py-1 text-[9px] font-bold text-amber-800 backdrop-blur">
              <ShieldAlert size={9} /> Dikkat
            </span>
          ) : null}
        </div>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-lg font-bold tracking-tight text-ink-950">{game.name}</h3>
          <span className="grid h-7 w-7 place-items-center rounded-full bg-[#f7f2ea] text-ink-400 transition group-hover:bg-ink-950 group-hover:text-white">
            <ArrowUpRight size={13} />
          </span>
        </div>
        <p className="mt-1 text-[12px] leading-relaxed text-ink-500">{game.tagline}</p>
        {!compact ? (
          <p className="mt-2 line-clamp-2 text-[11px] leading-relaxed text-ink-400">
            {game.description}
          </p>
        ) : null}
        {offers.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {offers
              .sort((a, b) => a.durationDays - b.durationDays)
              .slice(0, 2)
              .map((offer) => (
                <span key={offer.id} className="rounded-full bg-[#f7f2e9] px-2 py-1 text-[9px] font-semibold text-ink-600">
                  {offer.durationDays === 1 ? '1 gün' : `${offer.durationDays} gün`} ·{' '}
                  {formatPrice(offer.priceCents, offer.currency)}
                </span>
              ))}
          </div>
        ) : null}
        <div className="mt-4 flex items-center justify-between border-t border-[#f0ebe2] pt-3">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-ink-500">
            <Play size={11} className="text-brand-600" /> Önizle
          </span>
          <span className="text-[10px] text-ink-400">{game.durationSec} sn · {game.maxPlayers} kişi</span>
        </div>
      </div>
    </Link>
  );
}
