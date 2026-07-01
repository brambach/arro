/**
 * Arro design tokens — transcribed 1:1 from "Arro Spec.html" §1, §3.
 * Warm cream / orange system. One shadow per surface; never stack glows.
 */

export const colors = {
  // Surfaces & neutrals
  cream: '#FBF3E7', // app background
  surface: '#FFFBF4', // screen / primary card
  surface2: '#FFFDF9', // raised card
  warmFill: '#FFF1DE', // info panel / streak card
  peach: '#FFEBD6', // soft button / kept tile
  white: '#FFFFFF',

  // Text
  ink: '#40312A', // primary text
  inkSoft: '#5B4636', // secondary text
  muted: '#9A8676', // body / captions
  faint: '#B0997F', // labels / meta
  hairline: '#F1E7D8', // dividers

  // Accents
  primary: '#EE7B3A', // brand / actions / accents
  primaryPress: '#D4691F', // pressed / deep accent
  kept: '#6FB98A', // kept-today / success
  freeze: '#6FA6CE', // freeze day
  warn: '#C9A24E', // still-to-run

  // Derived tones used in the visual frames
  tabInactive: '#C2AE97',
  ringMuted: '#D9C9B4',
  freezeRing: '#9BC3E0',
  cheerBg: '#FFEAD6',
  cheerBgPress: '#FFDDBE',
  reactionChip: '#FBEFDD',
  reactionInk: '#8B7867',
  goldChipBg: '#FBEFD6',
  ringTrack: '#F1DDC2',
  keptTileBg: '#FFEBD6',
  freezeTileBg: '#E9F1F8',
  freezeDot: '#7FB0D6',
  shadowWarm: '#965A28', // rgb(150,90,40) — base for warm card shadows
} as const;

/** One hue per person — drives avatar rings, streak numerals, legend dots. Never reassign. */
export const memberColors = {
  bryce: { color: '#EE7B3A', soft: '#FBE2CE' },
  darcey: { color: '#E58AA0', soft: '#F7DBE3' },
  whit: { color: '#6FA6CE', soft: '#D7E6F1' },
  julie: { color: '#6FB98A', soft: '#D8EDE0' },
  greg: { color: '#E0A94E', soft: '#F6E7C7' },
} as const;

/** Linear-gradient stops used across the app. */
export const gradients = {
  primaryButton: ['#FF974A', '#EE7B3A'] as const,
  appIcon: ['#FF9E52', '#EE7B3A'] as const,
  avatarYou: ['#FF9A52', '#EE7B3A'] as const,
  cheerButton: ['#FFEAD6', '#FFDDBE'] as const,
  onboarding: ['#FFE7C8', '#FFEFDD', '#FFF8F0', '#FFFCF8'] as const,
  recapStrip: ['#EE7B3A', '#F6A45E', '#6FB98A', '#6FA6CE'] as const,
};

export const spacing = {
  xs: 4, // hairline gaps
  sm: 8, // icon / label
  md: 12, // card inner gap
  card: 16, // card padding
  screen: 20, // screen padding
  lg: 22, // large card padding
  section: 24, // section gap
} as const;

export const radii = {
  pill: 999, // buttons, chips, avatar badges
  tile: 14, // day tiles, icon tiles
  card: 22, // list cards
  cardLg: 28, // hero / recap cards
} as const;

/** RN shadow presets (iOS shadow* + Android elevation). */
export const shadows = {
  card: {
    shadowColor: colors.shadowWarm,
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  raised: {
    shadowColor: colors.shadowWarm,
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 12 },
    elevation: 5,
  },
  hero: {
    shadowColor: colors.shadowWarm,
    shadowOpacity: 0.16,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 18 },
    elevation: 10,
  },
  button: {
    shadowColor: colors.primary,
    shadowOpacity: 0.32,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
} as const;

export type MemberId = keyof typeof memberColors;
