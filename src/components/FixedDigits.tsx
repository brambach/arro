import React from 'react';
import { StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';
import { digitBox, fonts, type } from '../theme/typography';

/**
 * Numbers that change, in Fraunces, without jitter. Fraunces has no tabular
 * figures, so every digit gets the same box (the widest digit's advance) and
 * the colon its own narrower one. "11:11" and "10:08" are the same width.
 *
 * The whole string is one accessibility element; pass `accessibilityLabel` for
 * a spoken form ("12 minutes 40 seconds").
 */
type Props = {
  value: string;
  /** A Fraunces style from the scale: timer by default. */
  variant?: 'timer' | 'display' | 'title' | 'heading';
  color?: string;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  /** Extra text styles (opacity-free; keep to color). */
  textStyle?: StyleProp<TextStyle>;
};

export function FixedDigits({ value, variant = 'timer', color, accessibilityLabel, style, textStyle }: Props) {
  const base = type[variant];
  const weight = base.fontFamily === fonts.displaySemibold ? 'semibold' : 'regular';
  const box = digitBox(base.fontSize, weight);
  return (
    <View
      style={[styles.row, style]}
      accessible
      accessibilityRole="text"
      accessibilityLabel={accessibilityLabel ?? value}
    >
      {[...value].map((ch, i) => {
        const isDigit = ch >= '0' && ch <= '9';
        const width = isDigit ? box.digit : ch === ':' ? box.colon : undefined;
        return (
          <Text
            // Position is the identity here: the same slot keeps its box as digits change.
            key={i}
            allowFontScaling={false}
            style={[base, styles.char, width !== undefined && { width }, color ? { color } : null, textStyle]}
          >
            {ch}
          </Text>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'baseline' },
  char: { textAlign: 'center', letterSpacing: 0 },
});
