import type { ArcadeGameDef } from '@shared/arcade';

/**
 * Oyun kartları için özgün, kodla çizilmiş kapak sahneleri.
 * Dış görsel veya başka sitenin asset'i kullanılmaz.
 */
export function GameArt({ game, className = '' }: { game: ArcadeGameDef; className?: string }) {
  const id = `cover-${game.key}`;
  return (
    <svg
      viewBox="0 0 640 400"
      preserveAspectRatio="xMidYMid slice"
      className={`block h-full w-full ${className}`}
      role="img"
      aria-label={`${game.name} oyun kapağı`}
    >
      <defs>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={game.soft} />
          <stop offset="55%" stopColor="#ffffff" />
          <stop offset="100%" stopColor={game.soft} />
        </linearGradient>
        <radialGradient id={`${id}-glow`} cx="50%" cy="30%" r="55%">
          <stop offset="0%" stopColor={game.accent} stopOpacity="0.28" />
          <stop offset="100%" stopColor={game.accent} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-floor`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={game.ink} stopOpacity="0.03" />
          <stop offset="100%" stopColor={game.ink} stopOpacity="0.16" />
        </linearGradient>
        <linearGradient id={`${id}-shade`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="55%" stopColor={game.ink} stopOpacity="0" />
          <stop offset="100%" stopColor={game.ink} stopOpacity="0.20" />
        </linearGradient>
        <filter id={`${id}-blur`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="14" />
        </filter>
        <filter id={`${id}-shadow`} x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="8" stdDeviation="8" floodColor={game.ink} floodOpacity="0.18" />
        </filter>
        <pattern id={`${id}-dots`} width="22" height="22" patternUnits="userSpaceOnUse">
          <circle cx="3" cy="3" r="1.3" fill={game.accent} opacity="0.22" />
        </pattern>
      </defs>

      <rect width="640" height="400" fill={`url(#${id}-bg)`} />
      <ellipse cx="410" cy="70" rx="240" ry="170" fill={`url(#${id}-glow)`} />
      <rect width="640" height="400" fill={`url(#${id}-dots)`} />
      <path d="M-40 400 L640 150 L640 400 Z" fill={`url(#${id}-floor)`} />

      {/* ortak derinlik ışıkları */}
      <g opacity="0.5">
        <path d="M70 0 L270 400 L200 400 L20 0 Z" fill="#ffffff" opacity="0.28" />
        <path d="M560 0 L390 400 L470 400 L630 0 Z" fill="#ffffff" opacity="0.22" />
      </g>

      <g filter={`url(#${id}-shadow)`}>
        <Scene game={game} id={id} />
      </g>

      <rect y="260" width="640" height="140" fill={`url(#${id}-shade)`} />
      <g opacity="0.55">
        <circle cx="82" cy="66" r="5" fill={game.accent} />
        <circle cx="555" cy="92" r="3" fill={game.accent} />
        <circle cx="500" cy="48" r="2.2" fill={game.accent} />
        <circle cx="132" cy="120" r="2.4" fill={game.accent} />
      </g>
    </svg>
  );
}

function Scene({ game, id }: { game: ArcadeGameDef; id: string }) {
  switch (game.mode) {
    case 'dance':
      return game.key === 'horon' ? <Horon game={game} id={id} /> : game.key === 'sira' ? <Sira game={game} id={id} /> : game.key === 'latina' ? <Latina game={game} id={id} /> : game.key === 'concert' ? <Concert game={game} id={id} /> : game.key === 'ramwong' ? <Ramwong game={game} id={id} /> : <Dance game={game} id={id} />;
    case 'press':
      return <Press game={game} id={id} />;
    case 'circle':
      return <Circle game={game} id={id} />;
    case 'quiz':
      return <Quiz game={game} id={id} />;
    case 'word':
      return <Word game={game} id={id} />;
    case 'battle':
      return game.key === 'stick' ? <Stick game={game} id={id} /> : <Battle game={game} id={id} />;
    case 'race':
      return <Race game={game} id={id} />;
    case 'wheel':
      return <Wheel game={game} id={id} />;
    case 'tug':
      return <Tug game={game} id={id} />;
    case 'versus':
      return <Versus game={game} id={id} />;
    case 'horse':
      return <Horse game={game} id={id} />;
    default:
      return null;
  }
}

function Person({
  x,
  y,
  color,
  scale = 1,
  rotate = 0,
  flip = false,
  pose = 'stand',
}: {
  x: number | string;
  y: number | string;
  color: string;
  scale?: number;
  rotate?: number;
  flip?: boolean;
  pose?: 'stand' | 'dance' | 'push' | 'fight' | 'ride';
}) {
  const arm = pose === 'dance' ? -1.1 : pose === 'push' ? -1.45 : pose === 'fight' ? -0.7 : -0.35;
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotate}) scale(${flip ? -scale : scale} ${scale})`}>
      <ellipse cx="0" cy="79" rx="26" ry="7" fill="#1f1b24" opacity="0.14" />
      <rect x="-10" y="44" width="8" height="35" rx="4" fill="#2f2a35" />
      <rect x="4" y="44" width="8" height="35" rx="4" fill="#2f2a35" />
      <rect x="-18" y="12" width="36" height="40" rx="14" fill={color} />
      <rect x="-20" y="20" width="40" height="8" rx="4" fill="#ffffff" opacity="0.28" />
      <circle cx="0" cy="-2" r="17" fill="#f0c8ac" />
      <path d="M-17 -4 Q-14 -24 0 -23 Q15 -24 17 -4 Q8 -13 0 -13 Q-8 -13 -17 -4" fill="#3b2a25" />
      <circle cx="-5" cy="-1" r="1.7" fill="#34251f" />
      <circle cx="6" cy="-1" r="1.7" fill="#34251f" />
      <path d="M-4 6 Q0 9 4 6" stroke="#b06a58" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <g transform={`rotate(${arm * 55})`}>
        <rect x="-22" y="17" width="7" height="28" rx="3.5" fill="#f0c8ac" />
      </g>
      <g transform={`rotate(${-arm * 55})`}>
        <rect x="15" y="17" width="7" height="28" rx="3.5" fill="#f0c8ac" />
      </g>
      {pose === 'fight' ? (
        <>
          <rect x="-39" y="12" width="6" height="55" rx="3" fill="#d9c7a8" transform="rotate(22 -36 12)" />
          <path d="M-46 4 L-30 18 L-20 8 Z" fill="#d9c7a8" />
          <ellipse cx="30" cy="34" rx="18" ry="23" fill="#9b7a4c" />
          <ellipse cx="30" cy="34" rx="12" ry="16" fill="#c49a62" />
        </>
      ) : null}
      {pose === 'push' ? (
        <g opacity="0.9">
          <circle cx="27" cy="20" r="5" fill="#ffffff" />
          <circle cx="34" cy="12" r="2.5" fill="#ffffff" opacity="0.7" />
        </g>
      ) : null}
    </g>
  );
}

function Dance({ game, id }: { game: ArcadeGameDef; id: string }) {
  return (
    <g>
      <ellipse cx="320" cy="340" rx="270" ry="48" fill="#2f2635" opacity="0.75" />
      <ellipse cx="320" cy="330" rx="215" ry="32" fill="#4a3a50" />
      <rect x="245" y="250" width="150" height="58" rx="12" fill="#1d1922" />
      <rect x="265" y="263" width="64" height="30" rx="5" fill="#f6c0d5" opacity="0.85" />
      <rect x="338" y="263" width="38" height="6" rx="3" fill="#ffffff" opacity="0.6" />
      <rect x="338" y="275" width="26" height="6" rx="3" fill="#ffffff" opacity="0.4" />
      <rect x="260" y="282" width="104" height="5" rx="2.5" fill="#e0558f" />
      <g transform="translate(215 245)">
        <rect width="24" height="92" rx="7" fill="#18141d" />
        <circle cx="12" cy="31" r="9" fill="#40313f" />
        <circle cx="12" cy="58" r="13" fill="#e0558f" opacity="0.55" />
      </g>
      <g transform="translate(402 245)">
        <rect width="24" height="92" rx="7" fill="#18141d" />
        <circle cx="12" cy="31" r="9" fill="#40313f" />
        <circle cx="12" cy="58" r="13" fill="#2563eb" opacity="0.55" />
      </g>
      <path d="M320 0 L320 53" stroke="#f7d3e2" strokeWidth="3" />
      <circle cx="320" cy="58" r="15" fill="#fff" />
      <circle cx="320" cy="58" r="9" fill="#f3b5cd" />
      <g opacity="0.85">
        <path d="M84 0 L196 330 L138 330 L24 0 Z" fill="#fff" opacity="0.26" />
        <path d="M556 0 L444 330 L502 330 L616 0 Z" fill="#fff" opacity="0.22" />
        <path d="M195 0 L290 330 L255 330 L156 0 Z" fill="#ffe0ee" opacity="0.2" />
      </g>
      <Person x="230" y="250" color="#e0558f" scale={0.95} pose="dance" rotate={-8} />
      <Person x="320" y="238" color="#2563eb" scale={1.03} pose="dance" rotate={4} />
      <Person x="404" y="252" color="#d97706" scale={0.9} pose="dance" rotate={9} flip />
      <Person x="280" y="272" color="#0f8a72" scale={0.74} pose="dance" rotate={-4} />
      <Person x="364" y="276" color="#7c3aed" scale={0.72} pose="dance" rotate={5} flip />
      {[0, 1, 2, 3, 4, 5, 6].map((index) => (
        <rect key={index} x={170 + index * 44} y={64 + (index % 3) * 22} width="7" height="3" rx="1.5" fill="#ffffff" opacity="0.7" transform={`rotate(${index * 23} ${170 + index * 44} ${64 + (index % 3) * 22})`} />
      ))}
      <text x="320" y="30" textAnchor="middle" fontFamily="system-ui" fontSize="14" fontWeight="900" letterSpacing="3" fill="#7a3d54" opacity="0.6">SAHNE 90</text>
    </g>
  );
}


function Horon({ game, id }: { game: ArcadeGameDef; id: string }) {
  return (
    <g>
      <circle cx="320" cy="220" r="160" fill="#fff1e6" opacity="0.8" />
      <ellipse cx="320" cy="330" rx="250" ry="35" fill="#6b3f2a" opacity="0.5" />
      <path d="M120 320 Q320 250 520 320" stroke="#b45309" strokeWidth="8" fill="none" opacity="0.5" />
      {[0, 1, 2, 3, 4].map((index) => (
        <g key={index} transform={`translate(${180 + index * 70} ${250 - (index % 2) * 15})`}>
          <circle cx="0" cy="-35" r="15" fill="#f0c8ac" />
          <path d="M-18 -32 Q-12 -52 0 -50 Q14 -52 18 -32 Q8 -40 0 -40 Q-8 -40 -18 -32" fill="#3b2a25" />
          <rect x="-16" y="-22" width="32" height="44" rx="12" fill={index % 2 ? '#dc2626' : '#b45309'} />
          <path d="M-28 -8 L-40 -24 M16 -8 L42 -24" stroke="#f0c8ac" strokeWidth="7" strokeLinecap="round" />
          <rect x="-13" y="20" width="9" height="32" rx="4" fill="#2f2a35" />
          <rect x="4" y="20" width="9" height="32" rx="4" fill="#2f2a35" />
        </g>
      ))}
      <g opacity="0.8">
        {[0, 1, 2, 3, 4, 5].map((index) => (
          <circle key={index} cx={100 + index * 88} cy={90 + (index % 2) * 28} r="9" fill="#fbbf24" />
        ))}
      </g>
      <text x="320" y="34" textAnchor="middle" fontFamily="system-ui" fontSize="14" fontWeight="900" letterSpacing="3" fill="#7c2d12" opacity="0.6">HORON &amp; HALAY</text>
    </g>
  );
}

function Sira({ game, id }: { game: ArcadeGameDef; id: string }) {
  return (
    <g>
      <rect x="70" y="80" width="500" height="250" rx="20" fill="#fef3c7" opacity="0.8" />
      <ellipse cx="320" cy="320" rx="230" ry="34" fill="#9f2d2d" opacity="0.55" />
      <rect x="140" y="280" width="360" height="34" rx="17" fill="#7c2d12" />
      {[0, 1, 2, 3, 4].map((index) => (
        <g key={index} transform={`translate(${205 + index * 56} ${250})`}>
          <circle cx="0" cy="-22" r="14" fill="#f0c8ac" />
          <path d="M-16 -20 Q-10 -38 0 -36 Q12 -38 16 -20 Q8 -27 0 -27 Q-8 -27 -16 -20" fill="#3b2a25" />
          <rect x="-15" y="-10" width="30" height="40" rx="10" fill={index % 2 ? '#7c2d12' : '#b45309'} />
        </g>
      ))}
      <g transform="translate(320 150)">
        <rect x="-18" y="-8" width="36" height="70" rx="14" fill="#b45309" />
        <circle cx="0" cy="-26" r="17" fill="#f0c8ac" />
        <path d="M-18 -26 Q-12 -46 0 -44 Q14 -46 18 -26 Q8 -34 0 -34 Q-8 -34 -18 -26" fill="#3b2a25" />
        <path d="M-40 55 L40 55" stroke="#7c2d12" strokeWidth="5" strokeLinecap="round" />
      </g>
      {[0, 1, 2, 3].map((index) => (
        <circle key={index} cx={160 + index * 105} cy={105 + (index % 2) * 18} r="8" fill="#fbbf24" />
      ))}
      <text x="320" y="34" textAnchor="middle" fontFamily="system-ui" fontSize="14" fontWeight="900" letterSpacing="3" fill="#78350f" opacity="0.6">SIRA GECESİ</text>
    </g>
  );
}

function Latina({ game, id }: { game: ArcadeGameDef; id: string }) {
  return (
    <g>
      <rect x="0" y="0" width="640" height="400" fill="#1e1b4b" />
      <ellipse cx="320" cy="330" rx="260" ry="38" fill="#db2777" opacity="0.35" />
      <circle cx="320" cy="210" r="150" fill="#7c3aed" opacity="0.25" />
      {[0, 1, 2, 3, 4, 5, 6].map((index) => (
        <rect key={index} x={110 + index * 62} y={60 + (index % 2) * 14} width="8" height="120" rx="4" fill={index % 2 ? '#22d3ee' : '#f472b6'} opacity="0.7" />
      ))}
      <g transform="translate(260 250)">
        <circle cx="0" cy="-28" r="17" fill="#f0c8ac" />
        <rect x="-17" y="-12" width="34" height="45" rx="14" fill="#db2777" />
        <path d="M-20 -2 L-44 -20 M18 -2 L42 -20" stroke="#f0c8ac" strokeWidth="7" strokeLinecap="round" />
        <path d="M-8 30 L-24 64 M8 30 L24 64" stroke="#2f2a35" strokeWidth="8" strokeLinecap="round" />
      </g>
      <g transform="translate(390 265) scale(0.9)">
        <circle cx="0" cy="-28" r="17" fill="#f0c8ac" />
        <rect x="-17" y="-12" width="34" height="45" rx="14" fill="#f472b6" />
        <path d="M-20 -2 L-44 -20 M18 -2 L42 -20" stroke="#f0c8ac" strokeWidth="7" strokeLinecap="round" />
        <path d="M-8 30 L-24 64 M8 30 L24 64" stroke="#2f2a35" strokeWidth="8" strokeLinecap="round" />
      </g>
      <text x="320" y="34" textAnchor="middle" fontFamily="system-ui" fontSize="14" fontWeight="900" letterSpacing="3" fill="#f9a8d4" opacity="0.8">NOCHE LATINA</text>
    </g>
  );
}

function Concert({ game, id }: { game: ArcadeGameDef; id: string }) {
  return (
    <g>
      <rect width="640" height="400" fill="#111827" />
      <ellipse cx="320" cy="330" rx="280" ry="50" fill="#7c3aed" opacity="0.3" />
      <path d="M80 0 L260 330 L200 330 L20 0 Z" fill="#22d3ee" opacity="0.16" />
      <path d="M560 0 L380 330 L440 330 L620 0 Z" fill="#f472b6" opacity="0.16" />
      <g transform="translate(320 220)">
        <circle cx="0" cy="-28" r="18" fill="#f0c8ac" />
        <path d="M-18 -30 Q-12 -52 0 -50 Q14 -52 18 -30 Q8 -40 0 -40 Q-8 -40 -18 -30" fill="#3b2a25" />
        <rect x="-18" y="-10" width="36" height="52" rx="14" fill="#7c3aed" />
        <path d="M-20 4 L-38 -20 M20 4 L38 -20" stroke="#f0c8ac" strokeWidth="7" strokeLinecap="round" />
        <rect x="-5" y="-60" width="10" height="26" rx="5" fill="#e5e7eb" />
        <circle cx="0" cy="-62" r="7" fill="#f472b6" />
      </g>
      {[0, 1, 2, 3, 4, 5, 6, 7].map((index) => (
        <g key={index} transform={`translate(${90 + index * 68} ${320 - (index % 2) * 12})`}>
          <circle cx="0" cy="-22" r="12" fill="#f0c8ac" />
          <rect x="-12" y="-12" width="24" height="34" rx="8" fill={['#f472b6', '#22d3ee', '#fbbf24'][index % 3]} />
          <path d="M-14 -2 L-28 -20 M12 -2 L28 -20" stroke="#f0c8ac" strokeWidth="5" strokeLinecap="round" />
        </g>
      ))}
      <text x="320" y="34" textAnchor="middle" fontFamily="system-ui" fontSize="14" fontWeight="900" letterSpacing="3" fill="#e9d5ff" opacity="0.8">LIVE CONCERT</text>
    </g>
  );
}

function Ramwong({ game, id }: { game: ArcadeGameDef; id: string }) {
  return (
    <g>
      <circle cx="320" cy="210" r="170" fill="#ffedd5" opacity="0.8" />
      <ellipse cx="320" cy="330" rx="250" ry="38" fill="#ea580c" opacity="0.25" />
      {[0, 1, 2, 3, 4, 5, 6].map((index) => (
        <g key={index} transform={`translate(${90 + index * 78} ${80 + (index % 2) * 22})`}>
          <line x1="0" y1="-42" x2="0" y2="-8" stroke="#9a3412" strokeWidth="2" />
          <circle cx="0" cy="4" r="11" fill="#f97316" />
          <circle cx="0" cy="4" r="6" fill="#fbbf24" />
        </g>
      ))}
      <g transform="translate(320 250)">
        <circle cx="0" cy="-28" r="17" fill="#f0c8ac" />
        <rect x="-18" y="-12" width="36" height="46" rx="14" fill="#ea580c" />
        <path d="M-20 -2 L-46 -18 M18 -2 L46 -18" stroke="#f0c8ac" strokeWidth="7" strokeLinecap="round" />
        <path d="M-8 30 L-24 64 M8 30 L24 64" stroke="#2f2a35" strokeWidth="8" strokeLinecap="round" />
      </g>
      <text x="320" y="34" textAnchor="middle" fontFamily="system-ui" fontSize="14" fontWeight="900" letterSpacing="3" fill="#9a3412" opacity="0.6">RAMWONG FAIR</text>
    </g>
  );
}

function Press({ game, id }: { game: ArcadeGameDef; id: string }) {
  const cards = [
    { x: 95, y: 150, color: '#d97706', rotate: -8 },
    { x: 170, y: 135, color: '#2563eb', rotate: 3 },
    { x: 245, y: 155, color: '#0f8a72', rotate: -3 },
  ];
  return (
    <g>
      <ellipse cx="350" cy="340" rx="285" ry="40" fill="#2f2635" opacity="0.12" />
      <rect x="405" y="96" width="155" height="210" rx="18" fill="#2d2320" />
      <rect x="425" y="118" width="115" height="70" rx="10" fill="#f6eee3" />
      <rect x="438" y="132" width="72" height="8" rx="4" fill="#d97706" />
      <rect x="438" y="148" width="88" height="5" rx="2.5" fill="#c4b4a4" />
      <rect x="438" y="160" width="56" height="5" rx="2.5" fill="#c4b4a4" />
      <circle cx="480" cy="228" r="22" fill="#f3c14b" />
      <circle cx="480" cy="228" r="14" fill="#794e16" />
      <rect x="455" y="264" width="52" height="16" rx="6" fill="#d97706" />
      <path d="M420 282 L540 282" stroke="#7d604c" strokeWidth="8" strokeLinecap="round" />
      <rect x="62" y="300" width="360" height="28" rx="14" fill="#3a2f2a" />
      <rect x="78" y="306" width="320" height="8" rx="4" fill="#8e7461" opacity="0.7" />
      {cards.map((card) => (
        <g key={card.x} transform={`translate(${card.x} ${card.y}) rotate(${card.rotate})`} filter={`url(#${id}-shadow)`}>
          <rect width="105" height="142" rx="12" fill="#fffdf9" stroke={game.ink} strokeOpacity="0.15" />
          <rect x="10" y="10" width="85" height="42" rx="8" fill={card.color} opacity="0.16" />
          <circle cx="32" cy="31" r="13" fill={card.color} />
          <circle cx="32" cy="27" r="5" fill="#fff" opacity="0.85" />
          <rect x="52" y="22" width="32" height="5" rx="2.5" fill={game.ink} opacity="0.4" />
          <rect x="52" y="33" width="22" height="4" rx="2" fill={game.ink} opacity="0.25" />
          <rect x="12" y="66" width="80" height="6" rx="3" fill={game.ink} opacity="0.16" />
          <rect x="12" y="80" width="62" height="5" rx="2.5" fill={game.ink} opacity="0.12" />
          <rect x="12" y="94" width="70" height="5" rx="2.5" fill={game.ink} opacity="0.1" />
          <circle cx="26" cy="122" r="10" fill={card.color} opacity="0.55" />
          <rect x="42" y="117" width="44" height="5" rx="2.5" fill={game.ink} opacity="0.2" />
        </g>
      ))}
      <g opacity="0.8">
        <path d="M80 70 L250 70" stroke="#d6c5b4" strokeWidth="2" strokeDasharray="8 8" />
        <path d="M80 52 L190 52" stroke="#d6c5b4" strokeWidth="2" strokeDasharray="8 8" />
      </g>
      <text x="320" y="30" textAnchor="middle" fontFamily="system-ui" fontSize="14" fontWeight="900" letterSpacing="3" fill="#7c4a2c" opacity="0.55">PROFİL MATBAASI</text>
    </g>
  );
}

function Circle({ game, id }: { game: ArcadeGameDef; id: string }) {
  return (
    <g>
      <ellipse cx="320" cy="335" rx="280" ry="50" fill="#c9dcc9" opacity="0.45" />
      <ellipse cx="320" cy="320" rx="190" ry="34" fill="none" stroke="#b7d3b4" strokeWidth="10" />
      <ellipse cx="320" cy="320" rx="125" ry="22" fill="none" stroke="#cbe2c8" strokeWidth="7" />
      <g opacity="0.9">
        <ellipse cx="112" cy="230" rx="42" ry="54" fill="#8fba8b" />
        <ellipse cx="112" cy="230" rx="28" ry="38" fill="#a9cea4" />
        <rect x="108" y="270" width="9" height="46" rx="4" fill="#7a5a44" />
        <ellipse cx="516" cy="248" rx="36" ry="48" fill="#9bc397" />
        <ellipse cx="516" cy="248" rx="24" ry="32" fill="#b4d8ae" />
        <rect x="512" y="280" width="8" height="38" rx="4" fill="#7a5a44" />
      </g>
      <circle cx="320" cy="235" r="42" fill="#f7d774" opacity="0.35" />
      <circle cx="320" cy="235" r="22" fill="#f6ca63" />
      <circle cx="320" cy="235" r="12" fill="#fff4c8" />
      <path d="M320 213 L320 195" stroke="#b98b3d" strokeWidth="4" strokeLinecap="round" />
      <circle cx="320" cy="191" r="5" fill="#b98b3d" />
      <Person x="222" y="256" color="#dc2626" scale={0.68} rotate={-6} />
      <Person x="278" y="270" color="#7c3aed" scale={0.72} rotate={4} flip />
      <Person x="366" y="270" color="#0f8a72" scale={0.68} rotate={-4} />
      <Person x="420" y="252" color="#e0558f" scale={0.74} rotate={8} flip />
      <g opacity="0.7">
        <ellipse cx="320" cy="235" rx="90" ry="30" fill="none" stroke="#f6ca63" strokeWidth="2" strokeDasharray="5 9" />
      </g>
      <text x="320" y="30" textAnchor="middle" fontFamily="system-ui" fontSize="14" fontWeight="900" letterSpacing="3" fill="#4c6a4a" opacity="0.55">HALKA</text>
    </g>
  );
}

function Quiz({ game, id }: { game: ArcadeGameDef; id: string }) {
  return (
    <g>
      <ellipse cx="320" cy="345" rx="285" ry="36" fill="#2b3a5a" opacity="0.14" />
      <rect x="118" y="58" width="404" height="190" rx="18" fill="#15294a" />
      <rect x="132" y="72" width="376" height="162" rx="12" fill="#1d3d68" />
      <rect x="152" y="93" width="112" height="8" rx="4" fill="#9fd0ff" opacity="0.8" />
      <rect x="152" y="112" width="250" height="15" rx="5" fill="#ffffff" opacity="0.9" />
      <rect x="152" y="138" width="205" height="9" rx="4" fill="#ffffff" opacity="0.55" />
      {['A', 'B', 'C', 'D'].map((letter, index) => (
        <g key={letter} transform={`translate(${152 + (index % 2) * 182} ${174 + Math.floor(index / 2) * 32})`}>
          <rect width="166" height="24" rx="7" fill="#ffffff" opacity="0.12" />
          <circle cx="15" cy="12" r="8" fill={index === 1 ? '#8ee3bd' : '#7db9ef'} opacity="0.9" />
          <text x="15" y="16" textAnchor="middle" fontFamily="system-ui" fontSize="9" fontWeight="900" fill="#10233d">{letter}</text>
          <rect x="30" y="9" width="94" height="5" rx="2.5" fill="#ffffff" opacity="0.55" />
        </g>
      ))}
      <rect x="222" y="248" width="42" height="74" rx="8" fill="#e8e0d5" />
      <rect x="312" y="260" width="42" height="62" rx="8" fill="#e8e0d5" />
      <rect x="402" y="248" width="42" height="74" rx="8" fill="#e8e0d5" />
      <Person x="243" y="205" color="#2563eb" scale={0.52} />
      <Person x="333" y="218" color="#e0558f" scale={0.48} flip />
      <Person x="423" y="205" color="#0f8a72" scale={0.52} />
      <g opacity="0.5">
        <path d="M170 0 L250 250 L210 250 L120 0 Z" fill="#ffffff" opacity="0.3" />
        <path d="M490 0 L410 250 L450 250 L540 0 Z" fill="#ffffff" opacity="0.25" />
      </g>
      <text x="320" y="30" textAnchor="middle" fontFamily="system-ui" fontSize="14" fontWeight="900" letterSpacing="3" fill="#24476f" opacity="0.7">BİLGİ ARENASI</text>
    </g>
  );
}

function Word({ game, id }: { game: ArcadeGameDef; id: string }) {
  return (
    <g>
      <ellipse cx="320" cy="345" rx="280" ry="34" fill="#3b1e5e" opacity="0.14" />
      <rect x="104" y="52" width="432" height="194" rx="18" fill="#2d1b4d" />
      <rect x="120" y="68" width="400" height="162" rx="12" fill="#3d2268" />
      <rect x="142" y="88" width="100" height="42" rx="10" fill="#f7f1ff" opacity="0.9" />
      <text x="192" y="119" textAnchor="middle" fontFamily="system-ui" fontSize="30" fontWeight="900" fill="#7c3aed">H</text>
      <rect x="142" y="148" width="178" height="10" rx="5" fill="#ffffff" opacity="0.9" />
      <rect x="142" y="168" width="132" height="8" rx="4" fill="#ffffff" opacity="0.5" />
      <g opacity="0.8">
        <rect x="380" y="90" width="44" height="44" rx="8" fill="#a78bfa" transform="rotate(8 402 112)" />
        <rect x="436" y="108" width="44" height="44" rx="8" fill="#c4b5fd" transform="rotate(-6 458 130)" />
        <rect x="388" y="146" width="44" height="44" rx="8" fill="#ddd6fe" transform="rotate(-10 410 168)" />
      </g>
      <g transform="translate(180 268)">
        <rect width="112" height="54" rx="10" fill="#ffffff" opacity="0.95" />
        <rect x="12" y="12" width="88" height="6" rx="3" fill="#7c3aed" opacity="0.5" />
        <rect x="12" y="26" width="62" height="6" rx="3" fill="#7c3aed" opacity="0.3" />
      </g>
      <Person x="348" y="232" color="#7c3aed" scale={0.72} />
      <Person x="446" y="252" color="#e0558f" scale={0.62} flip />
      <text x="320" y="30" textAnchor="middle" fontFamily="system-ui" fontSize="14" fontWeight="900" letterSpacing="3" fill="#6d4a9a" opacity="0.65">HARF ŞEHİR</text>
    </g>
  );
}

function Battle({ game, id }: { game: ArcadeGameDef; id: string }) {
  return (
    <g>
      <ellipse cx="320" cy="335" rx="290" ry="52" fill="#7c4a22" opacity="0.18" />
      <path d="M38 332 Q320 270 602 332 L602 380 L38 380 Z" fill="#d8b483" opacity="0.7" />
      <g opacity="0.9">
        {[90, 550].map((x) => (
          <g key={x}>
            <ellipse cx={x} cy="270" rx="52" ry="10" fill="#7c4a22" opacity="0.25" />
            <rect x={x - 20} y="94" width="40" height="180" rx="8" fill="#e5d5bd" />
            <rect x={x - 27} y="84" width="54" height="16" rx="5" fill="#c8b08c" />
            <rect x={x - 27} y="262" width="54" height="14" rx="4" fill="#c8b08c" />
          </g>
        ))}
      </g>
      <g>
        <path d="M206 62 L260 62 L260 165 L206 165 Z" fill="#dc2626" opacity="0.9" />
        <path d="M214 74 L252 74 L252 150 L214 150 Z" fill="#fff" opacity="0.14" />
        <text x="233" y="120" textAnchor="middle" fontFamily="system-ui" fontSize="15" fontWeight="900" fill="#fff">ARENA</text>
        <path d="M380 62 L434 62 L434 165 L380 165 Z" fill="#0f8a72" opacity="0.9" />
        <path d="M388 74 L426 74 L426 150 L388 150 Z" fill="#fff" opacity="0.14" />
        <text x="407" y="120" textAnchor="middle" fontFamily="system-ui" fontSize="13" fontWeight="900" fill="#fff">USTA</text>
      </g>
      <Person x="250" y="232" color="#e0558f" scale={0.82} pose="fight" rotate={-4} />
      <Person x="340" y="218" color="#2563eb" scale={0.94} pose="fight" rotate={6} flip />
      <Person x="418" y="250" color="#d97706" scale={0.72} pose="fight" rotate={3} />
      <Person x="176" y="252" color="#7c3aed" scale={0.7} pose="fight" rotate={-6} flip />
      <g opacity="0.55">
        <circle cx="290" cy="210" r="4" fill="#fff" />
        <circle cx="382" cy="194" r="3" fill="#fff" />
        <path d="M304 226 L330 214" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
      </g>
      <text x="320" y="32" textAnchor="middle" fontFamily="system-ui" fontSize="14" fontWeight="900" letterSpacing="3" fill="#6b4622" opacity="0.55">ARENA USTALARI</text>
    </g>
  );
}

function Stick({ game, id }: { game: ArcadeGameDef; id: string }) {
  return (
    <g>
      <ellipse cx="320" cy="342" rx="280" ry="40" fill="#0e7490" opacity="0.14" />
      <rect x="82" y="60" width="476" height="250" rx="20" fill="#ecfeff" opacity="0.75" />
      <g opacity="0.8">
        {[0, 1, 2, 3].map((index) => (
          <rect key={index} x={112 + index * 112} y={272} width="76" height="12" rx="6" fill="#a5f3fc" />
        ))}
        <rect x="116" y="218" width="70" height="54" rx="8" fill="#cffafe" />
        <rect x="452" y="218" width="70" height="54" rx="8" fill="#cffafe" />
      </g>
      <g transform="translate(220 108)">
        <rect width="200" height="54" rx="10" fill="#0e7490" />
        <text x="100" y="36" textAnchor="middle" fontFamily="system-ui" fontSize="23" fontWeight="900" fill="#ffffff" letterSpacing="2">STICK DOJO</text>
      </g>
      <g stroke="#0e7490" strokeWidth="6" strokeLinecap="round" fill="none">
        <g transform="translate(236 260)">
          <circle cx="0" cy="-44" r="15" fill="#0e7490" stroke="none" />
          <path d="M0 -28 L0 6 M-22 -14 L22 -14 M0 6 L-17 44 M0 6 L17 44" />
          <path d="M-22 -14 L-38 -38" />
        </g>
        <g transform="translate(318 244)" stroke="#db2777">
          <circle cx="0" cy="-44" r="15" fill="#db2777" stroke="none" />
          <path d="M0 -28 L0 6 M-22 -14 L22 -14 M0 6 L-17 44 M0 6 L17 44" />
          <path d="M22 -14 L38 -38" />
        </g>
        <g transform="translate(398 264)" stroke="#f59e0b">
          <circle cx="0" cy="-44" r="15" fill="#f59e0b" stroke="none" />
          <path d="M0 -28 L0 6 M-22 -14 L22 -14 M0 6 L-17 44 M0 6 L17 44" />
          <path d="M-22 -14 L-38 -38" />
        </g>
      </g>
      <g opacity="0.7">
        <circle cx="176" cy="150" r="4" fill="#0e7490" />
        <circle cx="476" cy="128" r="3" fill="#db2777" />
        <path d="M466 170 L510 154" stroke="#0e7490" strokeWidth="2" />
      </g>
      <text x="320" y="30" textAnchor="middle" fontFamily="system-ui" fontSize="14" fontWeight="900" letterSpacing="3" fill="#0e7490" opacity="0.6">ÇUBUK HAYATTA KALMA</text>
    </g>
  );
}

function Race({ game, id }: { game: ArcadeGameDef; id: string }) {
  return (
    <g>
      <path d="M210 150 L430 150 L610 400 L30 400 Z" fill="#3a3540" />
      <path d="M240 160 L400 160 L520 400 L120 400 Z" fill="#4a4552" />
      {[0, 1, 2].map((index) => (
        <path key={index} d={`M${300 + index * 20} 160 L${250 + index * 80} 400`} stroke="#fff" strokeWidth="5" strokeDasharray="18 20" opacity="0.75" />
      ))}
      <rect x="188" y="116" width="264" height="30" rx="6" fill="#25212b" />
      <rect x="200" y="102" width="240" height="16" rx="4" fill="#fff" opacity="0.9" />
      <text x="320" y="116" textAnchor="middle" fontFamily="system-ui" fontSize="10" fontWeight="900" fill="#2b2632">FİNİŞ</text>
      <g>
        <path d="M210 128 L240 128 L240 400 L210 400 Z" fill="#25212b" />
        <path d="M400 128 L430 128 L430 400 L400 400 Z" fill="#25212b" />
      </g>
      <g transform="translate(250 300)">
        <rect width="86" height="48" rx="12" fill="#dc2626" />
        <rect x="12" y="10" width="40" height="14" rx="5" fill="#fff" opacity="0.9" />
        <circle cx="18" cy="52" r="12" fill="#1f1b24" />
        <circle cx="68" cy="52" r="12" fill="#1f1b24" />
      </g>
      <g transform="translate(345 260) rotate(-4)">
        <rect width="90" height="50" rx="12" fill="#2563eb" />
        <rect x="13" y="11" width="42" height="15" rx="5" fill="#fff" opacity="0.9" />
        <circle cx="20" cy="54" r="12" fill="#1f1b24" />
        <circle cx="70" cy="54" r="12" fill="#1f1b24" />
      </g>
      <g transform="translate(440 320) rotate(5)">
        <rect width="82" height="46" rx="11" fill="#0f8a72" />
        <rect x="12" y="9" width="36" height="13" rx="5" fill="#fff" opacity="0.9" />
        <circle cx="17" cy="50" r="11" fill="#1f1b24" />
        <circle cx="65" cy="50" r="11" fill="#1f1b24" />
      </g>
      <g opacity="0.7">
        <path d="M150 70 L260 70" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
        <path d="M120 94 L230 94" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
        <path d="M500 80 L590 80" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
      </g>
      <text x="320" y="32" textAnchor="middle" fontFamily="system-ui" fontSize="14" fontWeight="900" letterSpacing="3" fill="#4b4252" opacity="0.5">PİKSEL YARIŞ</text>
    </g>
  );
}

function Wheel({ game, id }: { game: ArcadeGameDef; id: string }) {
  const colors = ['#e0558f', '#2563eb', '#0f8a72', '#d97706', '#7c3aed', '#dc2626', '#0891b2', '#65a30d'];
  return (
    <g>
      <ellipse cx="320" cy="345" rx="255" ry="36" fill="#6b4a1d" opacity="0.14" />
      <circle cx="320" cy="212" r="142" fill="#fff" opacity="0.8" />
      <circle cx="320" cy="212" r="136" fill="#f3c14b" />
      {colors.map((color, index) => {
        const start = -Math.PI / 2 + (index * Math.PI * 2) / colors.length;
        const end = start + (Math.PI * 2) / colors.length;
        const x1 = 320 + Math.cos(start) * 122;
        const y1 = 212 + Math.sin(start) * 122;
        const x2 = 320 + Math.cos(end) * 122;
        const y2 = 212 + Math.sin(end) * 122;
        return (
          <path key={color} d={`M320 212 L${x1} ${y1} A122 122 0 0 1 ${x2} ${y2} Z`} fill={color} stroke="#fff" strokeWidth="2" opacity="0.95" />
        );
      })}
      <circle cx="320" cy="212" r="38" fill="#fffaf0" stroke="#d9a441" strokeWidth="5" />
      <text x="320" y="208" textAnchor="middle" fontFamily="system-ui" fontSize="15" fontWeight="900" fill="#5b3e0a">ÇARK</text>
      <text x="320" y="224" textAnchor="middle" fontFamily="system-ui" fontSize="7" fontWeight="800" fill="#b07a1d">BİLET</text>
      <path d="M304 69 L336 69 L320 102 Z" fill="#e0558f" />
      <circle cx="320" cy="58" r="10" fill="#e0558f" />
      {Array.from({ length: 16 }).map((_, index) => {
        const angle = (index / 16) * Math.PI * 2;
        return <circle key={index} cx={320 + Math.cos(angle) * 145} cy={212 + Math.sin(angle) * 145} r="5" fill={index % 2 ? '#fff5c8' : '#ffffff'} />;
      })}
      <g transform="translate(66 272) rotate(-8)">
        <rect width="102" height="58" rx="9" fill="#fffdf5" />
        <text x="12" y="20" fontFamily="system-ui" fontSize="8" fontWeight="800" fill="#9a6819">ÇEKİLİŞ</text>
        <text x="12" y="42" fontFamily="system-ui" fontSize="18" fontWeight="900" fill="#d97706">10</text>
      </g>
      <g transform="translate(485 250) rotate(8)">
        <rect width="90" height="52" rx="8" fill="#fffdf5" />
        <text x="12" y="18" fontFamily="system-ui" fontSize="7" fontWeight="800" fill="#9a6819">BİLET</text>
        <text x="12" y="38" fontFamily="system-ui" fontSize="16" fontWeight="900" fill="#e0558f">+25</text>
      </g>
      <text x="320" y="32" textAnchor="middle" fontFamily="system-ui" fontSize="14" fontWeight="900" letterSpacing="3" fill="#8b5a12" opacity="0.55">ÇARKIFELEK</text>
    </g>
  );
}

function Tug({ game, id }: { game: ArcadeGameDef; id: string }) {
  return (
    <g>
      <ellipse cx="320" cy="335" rx="290" ry="44" fill="#3b2a24" opacity="0.14" />
      <rect x="34" y="232" width="250" height="130" rx="18" fill="#fecaca" opacity="0.3" />
      <rect x="356" y="232" width="250" height="130" rx="18" fill="#bfdbfe" opacity="0.35" />
      <path d="M60 318 Q320 280 580 318" stroke="#8a5a2b" strokeWidth="14" fill="none" strokeLinecap="round" />
      <g transform="translate(300 270)">
        <rect x="8" y="4" width="24" height="78" rx="5" fill="#fff" stroke="#7c3aed" strokeWidth="3" />
        <path d="M32 10 L70 24 L32 38 Z" fill="#7c3aed" />
      </g>
      <Person x="182" y="246" color="#dc2626" scale={0.82} pose="push" rotate={-5} />
      <Person x="246" y="260" color="#e0558f" scale={0.7} pose="push" rotate={-3} />
      <Person x="458" y="246" color="#2563eb" scale={0.82} pose="push" rotate={5} flip />
      <Person x="394" y="260" color="#0f8a72" scale={0.7} pose="push" rotate={3} flip />
      <path d="M148 220 L196 238" stroke="#dc2626" strokeWidth="5" strokeLinecap="round" opacity="0.5" />
      <path d="M492 220 L444 238" stroke="#2563eb" strokeWidth="5" strokeLinecap="round" opacity="0.5" />
      <text x="320" y="30" textAnchor="middle" fontFamily="system-ui" fontSize="14" fontWeight="900" letterSpacing="3" fill="#7c3a24" opacity="0.55">HALAT ÇEKME</text>
    </g>
  );
}

function Versus({ game, id }: { game: ArcadeGameDef; id: string }) {
  return (
    <g>
      <ellipse cx="320" cy="340" rx="290" ry="40" fill="#3b2a24" opacity="0.13" />
      <rect x="42" y="84" width="250" height="260" rx="20" fill="#fce7f3" opacity="0.7" />
      <rect x="348" y="84" width="250" height="260" rx="20" fill="#dbeafe" opacity="0.7" />
      <g transform="translate(296 160)">
        <rect width="48" height="186" rx="8" fill="#f5e5eb" stroke="#fff" strokeWidth="3" />
        <rect x="0" y="0" width="12" height="186" fill="#db2777" />
        <rect x="36" y="0" width="12" height="186" fill="#2563eb" />
      </g>
      <Person x="170" y="238" color="#db2777" scale={0.84} pose="push" rotate={-5} />
      <Person x="236" y="256" color="#f472b6" scale={0.68} pose="push" rotate={-3} />
      <Person x="470" y="238" color="#2563eb" scale={0.84} pose="push" rotate={5} flip />
      <Person x="404" y="256" color="#60a5fa" scale={0.68} pose="push" rotate={3} flip />
      <text x="158" y="115" textAnchor="middle" fontFamily="system-ui" fontSize="20" fontWeight="900" fill="#be185d" opacity="0.8">KIZLAR</text>
      <text x="482" y="115" textAnchor="middle" fontFamily="system-ui" fontSize="20" fontWeight="900" fill="#1d4ed8" opacity="0.8">ERKEKLER</text>
      <text x="320" y="30" textAnchor="middle" fontFamily="system-ui" fontSize="14" fontWeight="900" letterSpacing="3" fill="#8a3055" opacity="0.55">KIZLAR VS ERKEKLER</text>
    </g>
  );
}

function Horse({ game, id }: { game: ArcadeGameDef; id: string }) {
  const jockeys = [
    { x: 128, color: '#dc2626', name: 'DENİZ' },
    { x: 248, color: '#2563eb', name: 'KAAN' },
    { x: 368, color: '#16a34a', name: 'ELİF' },
    { x: 488, color: '#f59e0b', name: 'MERT' },
  ];
  return (
    <g>
      <path d="M0 260 L640 220 L640 400 L0 400 Z" fill="#d9ad70" />
      <path d="M0 290 L640 250" stroke="#fff" strokeWidth="5" opacity="0.55" />
      <path d="M0 330 L640 290" stroke="#fff" strokeWidth="3" opacity="0.35" />
      <g>
        <path d="M20 190 L620 140" stroke="#8a5a2b" strokeWidth="10" strokeLinecap="round" />
        <path d="M20 170 L620 120" stroke="#c89354" strokeWidth="4" strokeLinecap="round" />
        {[60, 260, 460].map((x) => (
          <g key={x}>
            <rect x={x} y="100" width="10" height="110" fill="#7c4a22" />
            <path d={`M${x + 10} 108 L${x + 58} 122 L${x + 10} 136 Z`} fill="#dc2626" />
          </g>
        ))}
      </g>
      {jockeys.map((jockey, index) => (
        <g key={jockey.name} transform={`translate(${jockey.x} ${235 + index * 18})`}>
          <ellipse cx="0" cy="82" rx="42" ry="8" fill="#3b2412" opacity="0.16" />
          <g transform="translate(-42 40)">
            <rect width="84" height="38" rx="16" fill={jockey.color} />
            <rect x="66" y="6" width="20" height="30" rx="7" fill={jockey.color} />
            <path d="M86 8 L104 16 L86 24 Z" fill={jockey.color} />
            <rect x="8" y="34" width="8" height="24" rx="4" fill="#5b3a24" />
            <rect x="64" y="34" width="8" height="24" rx="4" fill="#5b3a24" />
            <rect x="-2" y="8" width="26" height="10" rx="5" fill="#fef3c7" />
          </g>
          <circle cx="0" cy="30" r="14" fill="#f0c8ac" />
          <path d="M-14 26 Q-10 10 0 12 Q12 10 14 26 Q6 20 0 20 Q-6 20 -14 26" fill="#3b2a25" />
          <rect x="-9" y="40" width="18" height="24" rx="7" fill={jockey.color} />
          <text x="0" y="18" textAnchor="middle" fontFamily="system-ui" fontSize="7" fontWeight="900" fill="#3b2412" opacity="0.55">{jockey.name}</text>
        </g>
      ))}
      <g transform="translate(510 88)">
        <rect width="104" height="42" rx="8" fill="#3b2412" />
        <text x="52" y="27" textAnchor="middle" fontFamily="system-ui" fontSize="17" fontWeight="900" fill="#fef3c7">FİNİŞ</text>
      </g>
      <text x="320" y="30" textAnchor="middle" fontFamily="system-ui" fontSize="14" fontWeight="900" letterSpacing="3" fill="#6b4414" opacity="0.55">AT YARIŞI</text>
    </g>
  );
}
