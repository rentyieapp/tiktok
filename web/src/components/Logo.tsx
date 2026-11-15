import { Bird } from 'lucide-react';
import { Link } from 'react-router-dom';

interface LogoProps {
  to?: string;
  theme?: 'light' | 'dark';
  compact?: boolean;
}

export function Logo({ to = '/', theme = 'light', compact = false }: LogoProps) {
  const content = (
    <span className="flex items-center gap-2.5">
      <span className="relative grid h-10 w-10 place-items-center overflow-hidden rounded-[13px] bg-gradient-to-br from-violet-400 via-violet-600 to-indigo-800 shadow-[0_8px_24px_-8px_rgba(109,90,230,0.85)]">
        <Bird size={22} strokeWidth={2.4} className="relative z-10 text-amber-300" />
        <span className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.45),transparent_55%)]" />
      </span>
      {!compact ? (
        <span className="min-w-0 leading-none">
          <span
            className={`block font-display text-[17px] font-extrabold tracking-tight ${
              theme === 'dark' ? 'text-white' : 'text-ink-950'
            }`}
          >
            ROOK <span className="text-amber-500">WORKS</span>
          </span>
          <span
            className={`mt-1 block truncate text-[8px] font-semibold tracking-[0.18em] ${
              theme === 'dark' ? 'text-white/40' : 'text-ink-400'
            }`}
          >
            INTERACTIVE LIVE GAMES
          </span>
        </span>
      ) : null}
    </span>
  );

  if (!to) return content;
  return (
    <Link to={to} className="group inline-flex min-w-0 items-center" aria-label="Rook Works ana sayfa">
      {content}
    </Link>
  );
}
