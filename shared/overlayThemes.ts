export interface OverlayThemeDef {
  id: string;
  name: string;
  tagline: string;
  pro: boolean;
  accent: string;
  background: string;
  className: string;
}

export const OVERLAY_THEMES: OverlayThemeDef[] = [
  { id: 'meydan', name: 'Meydan', tagline: 'Açık, sıcak ve sade varsayılan tema.', pro: false, accent: '#0f8a72', background: 'linear-gradient(135deg,#fffaf4,#effbf5)', className: 'overlay-theme-meydan' },
  { id: 'neon', name: 'Neon Gece', tagline: 'Koyu zemin, mor ve camgöbeği neon vurgular.', pro: true, accent: '#a855f7', background: 'linear-gradient(135deg,#120b24,#1e1b4b)', className: 'overlay-theme-neon' },
  { id: 'stadium', name: 'Stadyum', tagline: 'Saha yeşili ve tribün enerjisi.', pro: false, accent: '#16a34a', background: 'linear-gradient(135deg,#f0fdf4,#dcfce7)', className: 'overlay-theme-stadium' },
  { id: 'wedding', name: 'Düğün', tagline: 'Altın detaylar ve davet atmosferi.', pro: true, accent: '#d97706', background: 'linear-gradient(135deg,#fffbeb,#fef3c7)', className: 'overlay-theme-wedding' },
  { id: 'midnight', name: 'Gece Yarısı', tagline: 'Korku ve gizem yayınları için koyu tema.', pro: true, accent: '#dc2626', background: 'linear-gradient(135deg,#111827,#450a0a)', className: 'overlay-theme-midnight' },
];

export function overlayThemeById(id: string | undefined): OverlayThemeDef {
  return OVERLAY_THEMES.find((theme) => theme.id === id) ?? OVERLAY_THEMES[0]!;
}
