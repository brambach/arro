import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { space } from '../theme/tokens';
import { moments, timing, useReduceMotion } from '../theme/motion';
import { digitBox, fonts, type } from '../theme/typography';

/**
 * A number in Fraunces that rolls, digit by digit, the way Arro's RollingText
 * does: the new digit rises in from below while the old one lifts out above.
 * Built on Reanimated, on the UI thread.
 *
 * - On mount with `rollIn`, every digit rises in from below (Today's arrival:
 *   "numbers roll in"), `delay` ms after mount, each digit a stagger later.
 * - When `value` changes, only the digits that changed roll.
 *
 * Every digit sits in a fixed box (Fraunces has no tabular figures), so nothing
 * shifts while it rolls. Reduce Motion: the number crossfades in place.
 */
type Props = {
  value: number;
  variant?: 'display' | 'title' | 'heading' | 'headingStrong';
  color?: string;
  rollIn?: boolean;
  delay?: number;
  accessibilityLabel?: string;
};

export function RollingNumber({ value, variant = 'display', color, rollIn = false, delay = 0, accessibilityLabel }: Props) {
  const base = type[variant];
  const weight = base.fontFamily === fonts.displaySemibold ? 'semibold' : 'regular';
  const box = digitBox(base.fontSize, weight);
  const digits = String(Math.max(0, Math.round(value))).split('');
  return (
    <View style={styles.row} accessible accessibilityRole="text" accessibilityLabel={accessibilityLabel ?? String(value)}>
      {digits.map((d, i) => (
        <Digit
          // Keyed from the right, so 9 to 10 keeps the ones column rolling in place.
          key={digits.length - i}
          digit={d}
          width={box.digit}
          lineHeight={base.lineHeight}
          textStyle={[base, color ? { color } : null]}
          rollIn={rollIn}
          delay={delay + i * moments.todayArrival.stagger}
        />
      ))}
    </View>
  );
}

function Digit({
  digit,
  width,
  lineHeight,
  textStyle,
  rollIn,
  delay,
}: {
  digit: string;
  width: number;
  lineHeight: number;
  textStyle: React.ComponentProps<typeof Text>['style'];
  rollIn: boolean;
  delay: number;
}) {
  const reduceMotion = useReduceMotion();
  // What's rolling out (null when nothing is), and the roll's progress.
  const [leaving, setLeaving] = useState<string | null>(null);
  const [shown, setShown] = useState(digit);
  const p = useSharedValue(rollIn ? 0 : 1);
  const first = useRef(true);

  if (shown !== digit) {
    setLeaving(shown);
    setShown(digit);
  }

  useEffect(() => {
    if (!first.current) return;
    if (!rollIn || reduceMotion === null) return;
    first.current = false;
    const t = reduceMotion ? timing.utility : timing.settle;
    p.set(withDelay(reduceMotion ? 0 : delay, withTiming(1, t)));
  }, [rollIn, reduceMotion, delay, p]);

  useEffect(() => {
    if (leaving === null) return;
    first.current = false;
    p.set(0);
    p.set(withTiming(1, reduceMotion ? timing.utility : timing.settle));
    const t = setTimeout(() => setLeaving(null), timing.settle.duration);
    return () => clearTimeout(t);
  }, [leaving, reduceMotion, p]);

  const travel = lineHeight * 0.9;
  const still = reduceMotion === true;
  const inStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, p.value * 1.4),
    transform: [{ translateY: still ? 0 : (1 - p.value) * travel }],
  }));
  const outStyle = useAnimatedStyle(() => ({
    opacity: Math.max(0, 1 - p.value * 1.8),
    transform: [{ translateY: still ? 0 : -p.value * travel }],
  }));

  return (
    <View style={[styles.clip, { width, height: lineHeight + space.s16 }]}>
      <Animated.View style={[styles.cell, inStyle]}>
        <Text allowFontScaling={false} style={[textStyle, styles.char]}>
          {shown}
        </Text>
      </Animated.View>
      {leaving !== null ? (
        <Animated.View style={[styles.cell, StyleSheet.absoluteFill, outStyle]} importantForAccessibility="no">
          <Text allowFontScaling={false} style={[textStyle, styles.char]}>
            {leaving}
          </Text>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end' },
  // The clip box is a little taller than the line so Fraunces' tall figures aren't cut;
  // negative margins give the space back to the layout.
  clip: { overflow: 'hidden', marginVertical: -space.s8, justifyContent: 'center' },
  cell: { alignItems: 'center', justifyContent: 'center', paddingVertical: space.s8 },
  char: { textAlign: 'center', letterSpacing: 0 },
});
