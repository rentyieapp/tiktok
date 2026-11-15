import { Link } from 'react-router-dom';
import { Check, Crown, Layers3, LockKeyhole, Sparkles } from 'lucide-react';
import { OVERLAY_THEMES } from '@shared/overlayThemes';
import { MarketingFooter, MarketingHeader } from '../../components/MarketingHeader';
import { Button } from '../../components/ui';
import { useAuth } from '../../lib/auth';

export function ThemesPage() {
  const { me } = useAuth();
  return (
    <div className="min-h-screen bg-[#fbf7f0] text-ink-900">
      <MarketingHeader />
      <section className="container-page py-12">
        <span className="badge-neutral"><Layers3 size={11} /> Overlay tema mağazası</span>
        <h1 className="mt-4 max-w-2xl font-display text-4xl font-bold tracking-tight text-ink-950 sm:text-5xl">
          Yayınının havasına uygun overlay teması seç.
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-500">
          Temel temalar oyun lisansına dahil. Pro temalar Overlay Pro ile açılır; OBS’de
          şeffaf overlay katmanında otomatik uygulanır.
        </p>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {OVERLAY_THEMES.map((theme) => (
            <div key={theme.id} className="overflow-hidden rounded-3xl border border-[#e9e1d5] bg-white shadow-card">
              <div className={`relative h-40 ${theme.className}`} style={{ background: theme.background }}>
                <div className="absolute left-4 top-4 w-28 rounded-lg border border-white/70 bg-white/90 p-2 shadow-sm">
                  <p className="text-[6px] font-bold uppercase tracking-wider text-ink-400">Oda</p>
                  <p className="truncate text-[8px] font-semibold text-ink-800">Rook Works canlı</p>
                </div>
                <div className="absolute bottom-4 right-4 w-24 rounded-lg border border-white/70 bg-white/90 p-2 shadow-sm">
                  <p className="text-[6px] font-bold uppercase tracking-wider text-ink-400">Hedef</p>
                  <div className="mt-1 h-1 rounded-full bg-ink-100"><div className="h-full w-2/3 rounded-full" style={{ background: theme.accent }} /></div>
                </div>
                {theme.pro ? <span className="absolute right-3 top-3 rounded-full bg-violet-600 px-2 py-1 text-[8px] font-extrabold text-white">PRO</span> : <span className="absolute right-3 top-3 rounded-full bg-white/90 px-2 py-1 text-[8px] font-bold text-ink-500">ÜCRETSİZ</span>}
              </div>
              <div className="p-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-ink-950">{theme.name}</h2>
                  {theme.pro ? <Crown size={14} className="text-violet-600" /> : <Check size={14} className="text-emerald-600" />}
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-ink-500">{theme.tagline}</p>
                <Link to={me ? '/panel/arcade' : '/kayit'} className="mt-4 inline-flex">
                  <Button variant="secondary" size="sm" icon={theme.pro ? <LockKeyhole size={12} /> : <Sparkles size={12} />}>
                    {theme.pro ? 'Overlay Pro ile kullan' : 'Panele git'}
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-violet-200 bg-violet-50/60 p-5">
          <p className="text-[11px] leading-relaxed text-violet-900/80">Pro temalar Overlay Pro lisansıyla açılır. Oyun panelinden tema seçip kaydettiğinde yayındaki overlay’e 8 saniye içinde uygulanır.</p>
          <Link to="/satin-al"><Button variant="brand" size="sm">Overlay Pro’yu gör</Button></Link>
        </div>
      </section>
      <MarketingFooter />
    </div>
  );
}
