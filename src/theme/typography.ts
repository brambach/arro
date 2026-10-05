import { Platform, TextStyle } from 'react-native';
import { colors } from './tokens';

/**
 * Typography — system fonts only, nothing to install. Headings use the system
 * serif (New York on iOS, via React Native's 'ui-serif' design); everything else
 * is the system sans (SF Pro). Body starts at 15 so it's easy to read for
 * everyone in the family. `fontFamily: undefined` = system sans.
 */
export const weights = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

export const fonts = {
  serif: Platform.select({
    ios: 'ui-serif',
    web: 'ui-serif, "New York", Georgia, serif',
    default: 'serif',
  }),
} as const;

export const type = {
  /** Milestone hero — "Bryce kept 30 days" (color applied inline, usually white). */
  display: { fontFamily: fonts.serif, fontSize: 34, lineHeight: 39, fontWeight: weights.semibold },
  /** Screen titles — "This Week", "Family feed", "Settings". */
  title: { fontFamily: fonts.serif, fontSize: 28, lineHeight: 33, fontWeight: weights.semibold, color: colors.ink },
  /** Home greeting — "Good morning, Bryce." */
  greeting: { fontFamily: fonts.serif, fontSize: 22, lineHeight: 27, fontWeight: weights.medium, color: colors.ink },
  /** Big count — "2 of 3", profile stat numbers use `stat`. */
  bigNumber: { fontFamily: fonts.serif, fontSize: 32, lineHeight: 37, fontWeight: weights.semibold, color: colors.ink },
  stat: { fontFamily: fonts.serif, fontSize: 24, lineHeight: 28, fontWeight: weights.semibold, color: colors.ink },
  /** Names / card titles. */
  name: { fontSize: 16, lineHeight: 21, fontWeight: weights.semibold, color: colors.ink },
  /** Row labels, section headers. */
  label: { fontSize: 14, lineHeight: 19, fontWeight: weights.semibold, color: colors.inkSoft },
  /** Body copy. */
  body: { fontSize: 15, lineHeight: 21, fontWeight: weights.regular, color: colors.muted },
  /** Meta / timestamps. */
  meta: { fontSize: 13, lineHeight: 18, fontWeight: weights.regular, color: colors.faint },
} satisfies Record<string, TextStyle>;
