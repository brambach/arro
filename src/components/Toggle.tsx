import React, { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { depth, gradients, palette, radii } from '../theme/tokens';
import { springs, timing, useReduceMotion } from '../theme/motion';

/**
 * A designed on/off switch (not the system Switch): an aspen tray pressed into
 * the page, a steam thumb that slides on a spring, and the tray filling with
 * ember when it's on. Opacity and transform only.
 */
type Props = {
  value: boolean;
  onValueChange: (next: boolean) => void;
  /** Read out by VoiceOver. Required: a switch is never unlabeled. */
  accessibilityLabel: string;
  disabled?: boolean;
};

const W = 52;
const H = 32;
const THUMB = 26;
const TRAVEL = W - THUMB - (H - THUMB);

export function Toggle({ value, onValueChange, accessibilityLabel, disabled }: Props) {
  const reduceMotion = useReduceMotion();
  const on = useSharedValue(value ? 1 : 0);

  useEffect(() => {
    on.set(reduceMotion ? withTiming(value ? 1 : 0, timing.utility) : withSpring(value ? 1 : 0, springs.toggle));
  }, [value, reduceMotion, on]);

  const fill = useAnimatedStyle(() => ({ opacity: Math.min(1, Math.max(0, on.value)) }));
  const thumb = useAnimatedStyle(() => ({ transform: [{ translateX: on.value * TRAVEL }] }));

  return (
    <Pressable
      onPress={() => onValueChange(!value)}
      disabled={disabled}
      hitSlop={8}
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: value, disabled: !!disabled }}
      style={disabled && styles.disabled}
    >
      <View style={styles.track}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.fill, fill]}>
          <LinearGradient
            colors={[gradients.emberButton[0].color, gradients.emberButton[2].color]}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
        <Animated.View style={[styles.thumb, thumb]} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    width: W,
    height: H,
    borderRadius: radii.round,
    backgroundColor: palette.aspen,
    boxShadow: depth.sunk,
    justifyContent: 'center',
  },
  fill: { borderRadius: radii.round, overflow: 'hidden' },
  thumb: {
    position: 'absolute',
    left: (H - THUMB) / 2,
    width: THUMB,
    height: THUMB,
    borderRadius: radii.round,
    backgroundColor: palette.steam,
    boxShadow: depth.thumb,
  },
  disabled: { opacity: 0.45 },
});
