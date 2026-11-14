import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  Clock3,
  Gamepad2,
  Play,
  ShieldAlert,
  Sparkles,
  Users,
} from 'lucide-react';
import { ARCADE_GAME_LIST } from '@shared/arcade';
import { GameArt } from '../../components/GameArt';
import { Button, PageHeader, SectionCard } from '../../components/ui';

export function AdminGamesPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Süper admin"
        title="Oyun kataloğu"
        description="Platformda yayında olan on yedi oyun. İçerikler ve görseller kod tabanlıdır; fiyat ve süreler Paketler ekranından yönetilir."
        actions={
          <Link to="/oyunlar" target="_blank">
            <Button variant="secondary" icon={<ArrowUpRight size={15} />}>
              Vitrini gör
            </Button>
          </Link>
        }
      />

      <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-ink-100 bg-white p-4 text-[11px] leading-relaxed text-ink-500 shadow-card">
        <Sparkles size={14} className="mt-0.5 shrink-0 text-brand-600" />
        <span>
          <strong className="text-ink-800">{ARCADE_GAME_LIST.length} oyun yayında.</strong> Yeni
          bir oyun eklendiğinde bu listede otomatik görünür. Oyun sayfalarındaki demo odaları
          yayıncıya özel oda fazına kadar ortak önizleme odasıdır.
        </span>
      </div>

      <SectionCard
        title="Yayındaki oyunlar"
        description="Her oyun 9:16 sahnede, kendi kuralları ve uyarılarıyla çalışır."
        icon={<Gamepad2 size={16} />}
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {ARCADE_GAME_LIST.map((game) => (
            <div
              key={game.key}
              className="overflow-hidden rounded-2xl border border-ink-100 bg-white transition hover:border-ink-200 hover:shadow-float"
            >
              <div className="relative h-32">
                <GameArt game={game} className="rounded-none" />
                <div className="absolute left-3 top-3 flex gap-1.5">
                  <span className="rounded-full bg-white/85 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-ink-600 backdrop-blur">
                    {game.category}
                  </span>
                  {game.risk === 'yuksek' ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100/90 px-2 py-1 text-[9px] font-bold text-amber-800">
                      <ShieldAlert size={9} /> Riskli
                    </span>
                  ) : null}
                </div>
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-[14px] font-bold text-ink-950">{game.name}</h3>
                    <p className="mt-0.5 text-[10px] text-ink-400">{game.tagline}</p>
                  </div>
                  <span className="badge-ok text-[9px]">Yayında</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[9px] text-ink-400">
                  <span className="inline-flex items-center gap-1">
                    <Clock3 size={10} /> {game.durationSec} sn
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Users size={10} /> {game.maxPlayers} kişi
                  </span>
                  <span className="font-mono text-ink-300">/{game.slug}</span>
                </div>
                <div className="mt-3 flex gap-2 border-t border-ink-100 pt-3">
                  <Link to={`/oyun/${game.slug}`} target="_blank" className="flex-1">
                    <Button variant="secondary" size="sm" icon={<Play size={12} />} className="w-full">
                      Oyunu aç
                    </Button>
                  </Link>
                  <Link to="/admin/paketler">
                    <Button variant="ghost" size="sm">
                      Fiyatlar
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-[11px] leading-relaxed text-amber-900">
        <strong>Not:</strong> Oyunlar şu an ortak demo odalarında çalışıyor. Yayıncıya özel oda,
        lisans kontrolü ve TikTok bağlantısı bir sonraki fazda eklenecek. Fiyat ve süre yönetimi
        şimdiden hazır.
      </div>
    </div>
  );
}
