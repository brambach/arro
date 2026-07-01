import { TextStyle } from 'react-native';
import { colors } from './tokens';

/**
 * Type scale — transcribed from "Arro Spec.html" §2.
 * Literata (display serif) + Nunito (UI sans). Two families only.
 * Font-family strings match the @expo-google-fonts keys loaded in App.tsx.
 */

export const fonts = {
  serif: 'Literata_600SemiBold',
  serifItalic: 'Literata_500Medium_Italic',
  serifMedium: 'Literata_500Medium',
  sansBody: 'Nunito_600SemiBold',
  sansLabel: 'Nunito_700Bold',
  sansHeavy: 'Nunito_800ExtraBold',
} as const;

export const type = {
  streakHero: {
    fontFamily: fonts.serif,
    fontSize: 52,
    lineHeight: 52,
    letterSpacing: -0.5,
    color: colors.ink,
  },
  display: {
    fontFamily: fonts.serif,
    fontSize: 32,
    lineHeight: 36,
    letterSpacing: -0.4,
    color: colors.ink,
  },
  title: {
    fontFamily: fonts.serif,
    fontSize: 26,
    lineHeight: 30,
    letterSpacing: -0.4,
    color: colors.ink,
  },
  greeting: {
    fontFamily: fonts.serif,
    fontSize: 27,
    lineHeight: 30,
    letterSpacing: -0.4,
    color: colors.ink,
  },
  serifQuote: {
    fontFamily: fonts.serifItalic,
    fontSize: 17,
    lineHeight: 24,
    color: colors.inkSoft,
  },
  name: {
    fontFamily: fonts.sansHeavy,
    fontSize: 15,
    lineHeight: 20,
    color: colors.ink,
  },
  label: {
    fontFamily: fonts.sansLabel,
    fontSize: 13,
    lineHeight: 18,
    color: colors.inkSoft,
  },
  body: {
    fontFamily: fonts.sansBody,
    fontSize: 13,
    lineHeight: 17,
    color: colors.muted,
  },
  overline: {
    fontFamily: fonts.sansHeavy,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colors.faint,
  },
} satisfies Record<string, TextStyle>;
