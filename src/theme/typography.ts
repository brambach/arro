import { TextStyle } from 'react-native';
import { colors } from './tokens';

/**
 * Typography — Literata for the moments that carry feeling (screen titles, the
 * greeting, big numbers, milestones) and the system font (SF Pro / Roboto) for
 * everything you read at a glance. The serif is what makes Arro feel like a
 * family thing rather than a fitness dashboard; keep it to display sizes.
 */
export const weights = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

/** Loaded in App.tsx via useFonts. Weight lives in the family name, so never pair with fontWeight. */
export const fonts = {
  serif: 'Literata_600SemiBold',
  serifMedium: 'Literata_500Medium',
  serifItalic: 'Literata_500Medium_Italic',
} as const;

export const type = {
  /** Milestone hero — "Bryce kept 30 days" (color applied inline, usually white). */
  display: { fontFamily: fonts.serif, fontSize: 34, lineHeight: 40, letterSpacing: -0.8 },
  /** Screen titles — "This Week", "Family feed", "Settings". */
  title: { fontFamily: fonts.serif, fontSize: 27, lineHeight: 33, letterSpacing: -0.6, color: colors.ink },
  /** Home greeting — "Good morning, Bryce." */
  greeting: { fontFamily: fonts.serif, fontSize: 24, lineHeight: 30, letterSpacing: -0.5, color: colors.ink },
  /** Big count — "2 of 3", profile stat numbers use `stat`. */
  bigNumber: { fontFamily: fonts.serif, fontSize: 34, lineHeight: 40, letterSpacing: -0.8, color: colors.ink },
  stat: { fontFamily: fonts.serif, fontSize: 24, lineHeight: 30, letterSpacing: -0.4, color: colors.ink },
  /** Names / card titles. */
  name: { fontSize: 15, lineHeight: 19, fontWeight: weights.semibold, color: colors.ink },
  /** Row labels, section headers. */
  label: { fontSize: 13, lineHeight: 17, fontWeight: weights.semibold, color: colors.inkSoft },
  /** Body copy. */
  body: { fontSize: 13, lineHeight: 18, fontWeight: weights.regular, color: colors.muted },
  /** Meta / timestamps. */
  meta: { fontSize: 12.5, lineHeight: 16, fontWeight: weights.regular, color: colors.faint },
} satisfies Record<string, TextStyle>;
