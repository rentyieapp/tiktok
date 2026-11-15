import { Link } from 'react-router-dom';

interface LogoProps {
  to?: string;
  theme?: 'light' | 'dark';
  compact?: boolean;
}

export function Logo({ to = '/', theme = 'light', compact = false }: LogoProps) {
  const content = (
    <span className="flex items-center gap-2.5">
      <img
        src="/rook-bird.png"
        alt="Rook Works"
        className="h-10 w-10 shrink-0 object-contain drop-shadow-[0_6px_12px_rgba(109,90,230,0.25)]"
      />
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
