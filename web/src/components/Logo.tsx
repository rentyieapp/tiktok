import { Swords } from 'lucide-react';
import { Link } from 'react-router-dom';

interface LogoProps {
  to?: string;
  theme?: 'light' | 'dark';
  compact?: boolean;
}

export function Logo({ to = '/', theme = 'light', compact = false }: LogoProps) {
  const content = (
    <span className="flex items-center gap-2.5">
      <span className="relative grid h-10 w-10 place-items-center overflow-hidden rounded-[13px] bg-gradient-to-br from-brand-300 via-brand-500 to-emerald-700 shadow-[0_8px_24px_-8px_rgba(16,185,129,0.8)]">
        <Swords size={21} strokeWidth={2.4} className="relative z-10 text-ink-950" />
        <span className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.5),transparent_55%)]" />
      </span>
      {!compact ? (
        <span className="leading-none">
          <span
            className={`block font-display text-[17px] font-bold tracking-tight ${
              theme === 'dark' ? 'text-white' : 'text-ink-950'
            }`}
          >
            Meydan
          </span>
          <span
            className={`mt-1 block text-[9px] font-semibold uppercase tracking-[0.24em] ${
              theme === 'dark' ? 'text-white/40' : 'text-ink-400'
            }`}
          >
            Oyun Platformu
          </span>
        </span>
      ) : null}
    </span>
  );

  if (!to) return content;
  return (
    <Link to={to} className="group inline-flex items-center" aria-label="Meydan oyun platformu ana sayfa">
      {content}
    </Link>
  );
}
