import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Radio, Users } from 'lucide-react';
import { api } from '../lib/api';

interface LiveRoom {
  slug: string;
  name: string;
  gameKey: string;
  gameName: string;
  publisherName: string;
  roundsPlayed: number;
  lastPlayedAt: string | null;
}

export function LivePublishers() {
  const [rooms, setRooms] = useState<LiveRoom[]>([]);

  useEffect(() => {
    let active = true;
    const load = () => {
      api
        .get<{ rooms: LiveRoom[] }>('/api/arcade/live')
        .then((result) => {
          if (active) setRooms(result.rooms);
        })
        .catch(() => {
          if (active) setRooms([]);
        });
    };
    load();
    const timer = window.setInterval(load, 30_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  if (rooms.length === 0) return null;

  return (
    <section className="scroll-mt-24 border-y border-white/5 bg-ink-950 py-16 text-white sm:py-20">
      <div className="container-page">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-brand-400">
              <Radio size={12} className="animate-pulse" /> Şu an yayında
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
              Yayıncıların oynadığı oyunlar
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/50">
              Bu yayıncılar Rook Works oyunlarını şu anda canlı oynatıyor. Odaya gir, oyunu izle
              ve sohbete katıl.
            </p>
          </div>
          <Link
            to="/oyunlar"
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-brand-300 transition hover:text-brand-200"
          >
            Tüm oyunlar <ArrowRight size={13} />
          </Link>
        </div>

        <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rooms.map((room) => (
            <Link
              key={room.slug}
              to={`/canli/${room.slug}`}
              target="_blank"
              className="group flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 transition hover:border-brand-400/40 hover:bg-white/[0.07]"
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-500/15 text-lg">
                {room.gameKey === 'manor' ? '🕯️' : room.gameKey === 'tavaf' ? '🕋' : room.gameKey === 'kina' ? '🕯️' : '🎮'}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-white">
                  {room.publisherName}
                </span>
                <span className="mt-0.5 block truncate text-[11px] text-white/50">
                  {room.gameName} · {room.name}
                </span>
                <span className="mt-1 inline-flex items-center gap-1 text-[10px] text-white/35">
                  <Users size={10} /> {room.roundsPlayed} tur oynandı
                </span>
              </span>
              <span className="rounded-full bg-brand-500/20 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-brand-300">
                Canlı
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
