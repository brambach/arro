import { Platform, TextStyle } from 'react-native';
import { palette } from './tokens';
import { frauncesMetrics } from './fontMetrics';

/**
 * Typography: one scale (design/saunafam-spec.md, Quality bar), nothing outside it.
 *
 * | style        | size / line height |
 * |--------------|--------------------|
 * | display      | 64/64              |
 * | title        | 34/38              |
 * | heading      | 24/28              |
 * | body         | 17/24              |
 * | bodySmall    | 15/21              |
 * | label        | 13/18              |
 * | caption      | 12/16, small caps  |
 * | timer        | 96 (numerals)      |
 *
 * The display face is Fraunces, soft cut (SOFT 100, WONK 0, optical size 48),
 * as two static files at 400 and 600 (assets/fonts, built by
 * scripts/brand/build-fonts.py, embedded by the expo-font plugin). iOS names
 * them by PostScript name, Android by file name; they're the same here.
 * Everything else is the system sans (SF Pro): `fontFamily` left unset.
 *
 * Weight variants (`bodyStrong`, `labelStrong`) keep the size and line height
 * of their style. Fraunces has no tabular figures: changing numbers go through
 * `FixedDigits` (src/components/FixedDigits.tsx), which uses `digitBox` below.
 */
export const weights = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

export const fontFiles = {
  'FrauncesSoft-Regular': require('../../assets/fonts/FrauncesSoft-Regular.ttf'),
  'FrauncesSoft-SemiBold': require('../../assets/fonts/FrauncesSoft-SemiBold.ttf'),
} as const;

const web = (name: string) => `"${name}", Georgia, serif`;

export const fonts = {
  /** Fraunces Soft 400. */
  display: Platform.select({ web: web('FrauncesSoft-Regular'), default: 'FrauncesSoft-Regular' }),
  /** Fraunces Soft 600. */
  displaySemibold: Platform.select({ web: web('FrauncesSoft-SemiBold'), default: 'FrauncesSoft-SemiBold' }),
  /** @deprecated Arro's name for the display face. Use display. */
  serif: Platform.select({ web: web('FrauncesSoft-Regular'), default: 'FrauncesSoft-Regular' }),
} as const;

const scale = {
  /** Milestone numbers, the streak count on Week. */
  display: {
    fontFamily: fonts.displaySemibold,
    fontSize: 64,
    lineHeight: 64,
    letterSpacing: -1.5,
    color: palette.char,
  },
  /** Screen titles and the greeting: "Good evening, Sam". */
  title: {
    fontFamily: fonts.displaySemibold,
    fontSize: 34,
    lineHeight: 38,
    letterSpacing: -0.6,
    color: palette.char,
  },
  /** Card headings: "weeks together", sheet titles. */
  heading: {
    fontFamily: fonts.display,
    fontSize: 24,
    lineHeight: 28,
    letterSpacing: -0.2,
    color: palette.char,
  },
  /** Body text, row titles. */
  body: { fontSize: 17, lineHeight: 24, fontWeight: weights.regular, letterSpacing: -0.2, color: palette.char },
  /** Supporting text: card body, row subtitles. Never smaller for running text. */
  bodySmall: { fontSize: 15, lineHeight: 21, fontWeight: weights.regular, letterSpacing: -0.1, color: palette.smoke },
  /** Meta: timestamps, stat labels, tab labels. */
  label: { fontSize: 13, lineHeight: 18, fontWeight: weights.regular, letterSpacing: 0, color: palette.stone },
  /** Small caps: "THIS WEEK", "IN THE HEAT". Sparingly. */
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: weights.semibold,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: palette.stone,
  },
  /** The timer's numerals. Lay them out with FixedDigits. */
  timer: {
    fontFamily: fonts.display,
    fontSize: 96,
    lineHeight: 104,
    letterSpacing: 0,
    color: palette.steam,
  },
} satisfies Record<string, TextStyle>;

export const type = {
  ...scale,
  /** Body at 600: "2 of 3 this week", row names, the button label. */
  bodyStrong: { ...scale.body, fontWeight: weights.semibold },
  bodySmallStrong: { ...scale.bodySmall, fontWeight: weights.semibold },
  labelStrong: { ...scale.label, fontWeight: weights.semibold },
  /** Tab bar labels: the caption's size and line height, without small caps. */
  tab: { ...scale.caption, textTransform: 'none', letterSpacing: 0.1, fontWeight: weights.medium },
  /** Heading in Fraunces 600, for a number set beside a heading. */
  headingStrong: { ...scale.heading, fontFamily: fonts.displaySemibold },

  // Arro's old names (deprecated), mapped onto the scale so old screens compile.
  /** @deprecated use title */
  greeting: scale.title,
  /** @deprecated use title */
  bigNumber: scale.title,
  /** @deprecated use heading */
  stat: scale.heading,
  /** @deprecated use bodyStrong */
  name: { ...scale.body, fontWeight: weights.semibold },
  /** @deprecated use label */
  meta: scale.label,
} satisfies Record<string, TextStyle>;

export type TypeStyle = keyof typeof scale;

/**
 * How far Dynamic Type may grow each style. Text scales; the big fixed
 * numerals cap so they never clip (Quality bar, Accessibility).
 */
export const maxFontScale: Record<TypeStyle, number | undefined> = {
  display: 1.2,
  title: 1.5,
  heading: 1.6,
  body: undefined,
  bodySmall: undefined,
  label: undefined,
  caption: 2,
  timer: 1,
};

/**
 * The box each character gets in FixedDigits, at a font size: digits all take
 * the widest digit's advance, so "11:11" and "10:08" are the same width.
 */
export function digitBox(fontSize: number, weight: 'regular' | 'semibold' = 'regular') {
  const m = frauncesMetrics[weight];
  return { digit: Math.ceil(m.digit * fontSize), colon: Math.ceil(m.colon * fontSize) };
}
