import type { ArcadeKey } from '@shared/arcade';

export type SceneMotif =
  | 'print'
  | 'rings'
  | 'quiz'
  | 'library'
  | 'colosseum'
  | 'dojo'
  | 'pixels'
  | 'carnival'
  | 'rope'
  | 'split'
  | 'track'
  | 'village'
  | 'courtyard'
  | 'club'
  | 'concert'
  | 'temple'
  | 'mountain'
  | 'grandprix'
  | 'town'
  | 'kitchen'
  | 'vault'
  | 'savanna'
  | 'battle'
  | 'city'
  | 'sky'
  | 'box'
  | 'cove'
  | 'henna'
  | 'wedding'
  | 'kaaba'
  | 'haunted'
  | 'stage';

export interface SceneIdentity {
  sky: string;
  horizon: string;
  glow: string;
  motif: SceneMotif;
  banner: string;
}

/** Her oyun için ayrı atmosfer; ortak mod sahnelerinin üzerine kimlik katmanı ekler. */
export const SCENE_IDENTITIES: Record<ArcadeKey, SceneIdentity> = {
  dance: { sky: '#080711', horizon: '#1b0d2b', glow: '#e0558f', motif: 'stage', banner: 'SAHNE 90' },
  press: { sky: '#f6efe3', horizon: '#b98a55', glow: '#b45309', motif: 'print', banner: 'PROFİL MATBAASI' },
  circle: { sky: '#edf9f2', horizon: '#9ad4b5', glow: '#0f8a72', motif: 'rings', banner: 'HALKA' },
  quiz: { sky: '#07172e', horizon: '#123b6b', glow: '#38bdf8', motif: 'quiz', banner: 'BİLGİ ARENASI' },
  word: { sky: '#1b1030', horizon: '#4c2a78', glow: '#a855f7', motif: 'library', banner: 'HARF ŞEHİR' },
  gladiator: { sky: '#2a1510', horizon: '#7c2d12', glow: '#f59e0b', motif: 'colosseum', banner: 'ARENA USTALARI' },
  stick: { sky: '#eef4f7', horizon: '#9fc4d4', glow: '#0e7490', motif: 'dojo', banner: 'ÇUBUK HAYATTA KALMA' },
  kart: { sky: '#0d1b2e', horizon: '#16406b', glow: '#22d3ee', motif: 'pixels', banner: 'PİKSEL YARIŞ' },
  wheel: { sky: '#2a1020', horizon: '#701a45', glow: '#f472b6', motif: 'carnival', banner: 'ÇARKIFELEK' },
  tug: { sky: '#24120b', horizon: '#7c2d12', glow: '#f97316', motif: 'rope', banner: 'HALAT ÇEKME' },
  versus: { sky: '#1e1030', horizon: '#6d28d9', glow: '#ec4899', motif: 'split', banner: 'KIZLAR VS ERKEKLER' },
  horse: { sky: '#f4e8d2', horizon: '#9a6b3c', glow: '#b45309', motif: 'track', banner: 'AT YARIŞI' },
  horon: { sky: '#1a2618', horizon: '#4d6b35', glow: '#facc15', motif: 'village', banner: 'HORON & HALAY' },
  sira: { sky: '#2a1b12', horizon: '#8b5e34', glow: '#f59e0b', motif: 'courtyard', banner: 'SIRA GECESİ' },
  latina: { sky: '#180d2b', horizon: '#7e22ce', glow: '#f472b6', motif: 'club', banner: 'NOCHE LATINA' },
  concert: { sky: '#08080f', horizon: '#312e81', glow: '#a78bfa', motif: 'concert', banner: 'LIVE CONCERT' },
  ramwong: { sky: '#25130e', horizon: '#9a3412', glow: '#fb923c', motif: 'temple', banner: 'RAMWONG FAIR' },
  hill: { sky: '#dff0ff', horizon: '#7fb2d9', glow: '#0284c7', motif: 'mountain', banner: 'TEPE FIRLAMASI' },
  grandprix: { sky: '#0b0b12', horizon: '#3f1d1d', glow: '#ef4444', motif: 'grandprix', banner: 'GRAND PRIX' },
  town: { sky: '#dff3ff', horizon: '#86b9d8', glow: '#0ea5e9', motif: 'town', banner: 'İZLEYİCİ KASABASI' },
  melon: { sky: '#e6f7e7', horizon: '#5f9f62', glow: '#16a34a', motif: 'kitchen', banner: 'KARPUZ PATLATMA' },
  gold: { sky: '#1b1608', horizon: '#7c5a13', glow: '#facc15', motif: 'vault', banner: 'ALTIN MIKNATISI' },
  animal: { sky: '#f7e7c1', horizon: '#b8863f', glow: '#f59e0b', motif: 'savanna', banner: 'ANIMAL RUN' },
  clash: { sky: '#17102a', horizon: '#7f1d1d', glow: '#f97316', motif: 'battle', banner: 'TEAM CLASH' },
  crowd: { sky: '#e6efff', horizon: '#7595c8', glow: '#2563eb', motif: 'city', banner: 'KALABALIK KOŞUSU' },
  balloon: { sky: '#dff4ff', horizon: '#8ec9e8', glow: '#f97316', motif: 'sky', banner: 'BALON SAVAŞI' },
  brick: { sky: '#e9f1ff', horizon: '#8aa9d6', glow: '#2563eb', motif: 'box', banner: 'BRICK BOX' },
  chest: { sky: '#dff4fa', horizon: '#4a9aa8', glow: '#f59e0b', motif: 'cove', banner: 'CHEST COVE' },
  manor: { sky: '#090a12', horizon: '#24212a', glow: '#8b5cf6', motif: 'haunted', banner: 'GECE YARISI' },
  egg: { sky: '#fff1d6', horizon: '#c17a35', glow: '#d97706', motif: 'kitchen', banner: 'EGG SMASH' },
  halay: { sky: '#3b1114', horizon: '#7c2d12', glow: '#fbbf24', motif: 'wedding', banner: 'HALAY' },
  kina: { sky: '#2a1128', horizon: '#701a45', glow: '#f0abfc', motif: 'henna', banner: 'KINA GECESİ' },
  tavaf: { sky: '#0b1420', horizon: '#1a2838', glow: '#d4a63c', motif: 'kaaba', banner: 'TAVAF' },
};
