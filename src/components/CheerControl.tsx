import React, { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { palette, space } from '../theme/tokens';
import { distances, emberPeakMs, springs, timing, useReduceMotion } from '../theme/motion';
import { haptics } from '../theme/haptics';
import { type } from '../theme/typography';
import { Icon } from './Icon';

/**
 * "Cheer Maya on": a heart and a line of text, no outline. Tapping it fills
 * the heart with one pulse on the `ember` curve and a light haptic at the
 * pulse's peak; never a loop, no flying hearts. The cheer itself is optimistic
 * (AppState rolls it back quietly if the server says no). Tapping again takes
 * it back, without a pulse.
 */
type Props = {
  label: string;
  cheered: boolean;
  onCheer: () => void;
  onUncheer: () => void;
};

export function CheerControl({ label, cheered, onCheer, onUncheer }: Props) {
  const reduceMotion = useReduceMotion();
  const scale = useSharedValue(1);
  const press = useSharedValue(1);
  const pulseTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(pulseTimer.current), []);

  const onPress = () => {
    if (cheered) {
      onUncheer();
      return;
    }
    onCheer();
    if (reduceMotion !== false) {
      haptics.cheer();
      return;
    }
    // One pulse: up past full size on the ember overshoot, then home.
    scale.set(withSequence(withTiming(1.28, timing.ember), withTiming(1, timing.utility)));
    pulseTimer.current = setTimeout(haptics.cheer, emberPeakMs);
  };

  const heart = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const body = useAnimatedStyle(() => ({ transform: [{ scale: press.value }] }));

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => {
        press.set(withSpring(distances.pressScale, springs.press));
      }}
      onPressOut={() => {
        press.set(withSpring(1, springs.press));
      }}
      hitSlop={space.s8}
      accessibilityRole="button"
      accessibilityLabel={cheered ? 'Cheered' : label}
      accessibilityHint={cheered ? 'Takes your cheer back' : undefined}
      accessibilityState={{ selected: cheered }}
    >
      <Animated.View style={[styles.row, body]}>
        <Animated.View style={heart}>
          <Icon name={cheered ? 'heartFilled' : 'heart'} size={22} color={cheered ? palette.ember : palette.smoke} />
        </Animated.View>
        <Text style={[type.bodySmallStrong, cheered ? styles.on : styles.off]}>{cheered ? 'Cheered' : label}</Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.s8, paddingVertical: space.s8 },
  on: { color: palette.coal },
  off: { color: palette.char },
});
