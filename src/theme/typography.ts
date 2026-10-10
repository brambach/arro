import { Platform, TextStyle } from 'react-native';
import { colors } from './tokens';

/**
 * Typography. Headings use Instrument Serif, the same display face as
 * arrofamily.com (and trydervo.com): one weight, 400, so headings get bigger,
 * never bolder. It's embedded by the expo-font config plugin (app.json, from
 * assets/fonts, OFL) and named by its PostScript name. Everything else is the
 * system sans (SF Pro). Body starts at 15 so it's easy to read for everyone in
 * the family. `fontFamily: undefined` = system sans.
 */
export const weights = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

export const fonts = {
  serif: Platform.select({
    web: '"InstrumentSerif-Regular", Georgia, serif',
    default: 'InstrumentSerif-Regular',
  }),
} as const;

export const type = {
  /** Milestone hero — "Bryce kept 30 days" (color applied inline, usually white). */
  display: { fontFamily: fonts.serif, fontSize: 42, lineHeight: 44, fontWeight: weights.regular, letterSpacing: -0.6 },
  /** Screen titles — "This Week", "Family feed", "Settings". */
  title: { fontFamily: fonts.serif, fontSize: 34, lineHeight: 37, fontWeight: weights.regular, letterSpacing: -0.4, color: colors.ink },
  /** Home greeting — "Good morning, Bryce." */
  greeting: { fontFamily: fonts.serif, fontSize: 27, lineHeight: 31, fontWeight: weights.regular, letterSpacing: -0.3, color: colors.ink },
  /** Big count — "2 of 3", profile stat numbers use `stat`. */
  bigNumber: { fontFamily: fonts.serif, fontSize: 40, lineHeight: 42, fontWeight: weights.regular, letterSpacing: -0.5, color: colors.ink },
  stat: { fontFamily: fonts.serif, fontSize: 30, lineHeight: 32, fontWeight: weights.regular, letterSpacing: -0.3, color: colors.ink },
  /** Names / card titles. */
  name: { fontSize: 16, lineHeight: 21, fontWeight: weights.semibold, color: colors.ink },
  /** Row labels, section headers. */
  label: { fontSize: 14, lineHeight: 19, fontWeight: weights.semibold, color: colors.inkSoft },
  /** Body copy. */
  body: { fontSize: 15, lineHeight: 21, fontWeight: weights.regular, color: colors.muted },
  /** Meta / timestamps. */
  meta: { fontSize: 13, lineHeight: 18, fontWeight: weights.regular, color: colors.faint },
} satisfies Record<string, TextStyle>;
