import { TextStyle } from 'react-native';
import { colors } from './tokens';

/**
 * Typography — system font only (SF Pro on iOS / Roboto on Android), which reads
 * as clean, native, Albert-Sans-adjacent. No serif, no decorative type: hierarchy
 * comes from weight, size, and letter-spacing. `fontFamily: undefined` = system.
 */
export const weights = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

export const type = {
  /** Milestone hero — "Bryce kept 30 days" (color applied inline, usually white). */
  display: { fontSize: 33, lineHeight: 36, fontWeight: weights.bold, letterSpacing: -0.6 },
  /** Screen titles — "This Week", "Family feed", "Settings". */
  title: { fontSize: 25, lineHeight: 29, fontWeight: weights.bold, letterSpacing: -0.5, color: colors.ink },
  /** Home greeting — "Good morning, Bryce." */
  greeting: { fontSize: 20, lineHeight: 24, fontWeight: weights.bold, letterSpacing: -0.4, color: colors.ink },
  /** Big count — "2 of 3", profile stat numbers use `stat`. */
  bigNumber: { fontSize: 30, lineHeight: 34, fontWeight: weights.bold, letterSpacing: -0.5, color: colors.ink },
  stat: { fontSize: 22, lineHeight: 26, fontWeight: weights.bold, letterSpacing: -0.3, color: colors.ink },
  /** Names / card titles. */
  name: { fontSize: 15, lineHeight: 19, fontWeight: weights.semibold, color: colors.ink },
  /** Row labels, section headers. */
  label: { fontSize: 13, lineHeight: 17, fontWeight: weights.semibold, color: colors.inkSoft },
  /** Body copy. */
  body: { fontSize: 13, lineHeight: 18, fontWeight: weights.regular, color: colors.muted },
  /** Meta / timestamps. */
  meta: { fontSize: 12.5, lineHeight: 16, fontWeight: weights.regular, color: colors.faint },
} satisfies Record<string, TextStyle>;
