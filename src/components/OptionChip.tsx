import React from 'react';
import { Pressable, StyleProp, StyleSheet, Text, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { alpha, palette, radii, space } from '../theme/tokens';
import { distances, springs, timing } from '../theme/motion';
import { type } from '../theme/typography';

/**
 * A one-tap choice: minute chips (10, 15, 20, 30), recent places, the timer's
 * target and type. A filled soft rectangle (radius 9), never an outlined pill.
 *
 * - light: aspen, smoke label; picked is ember with a steam label.
 * - dark: for the timer room, a faint steam fill; picked is ember.
 *
 * The fill crossfades (opacity) and the chip presses down on a spring.
 */
type Props = {
  label: string;
  selected?: boolean;
  onPress: () => void;
  tone?: 'light' | 'dark';
  disabled?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
};

export function OptionChip({ label, selected = false, onPress, tone = 'light', disabled, accessibilityLabel, accessibilityHint, style }: Props) {
  const scale = useSharedValue(1);
  const on = useSharedValue(selected ? 1 : 0);
  React.useEffect(() => {
    on.set(withTiming(selected ? 1 : 0, timing.utility));
  }, [selected, on]);
  const press = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const fill = useAnimatedStyle(() => ({ opacity: on.value }));
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      onPressIn={() => scale.set(withSpring(distances.pressScale, springs.press))}
      onPressOut={() => scale.set(withSpring(1, springs.press))}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ selected, disabled: !!disabled }}
      hitSlop={space.s4}
      style={style}
    >
      <Animated.View style={[styles.chip, tone === 'dark' ? styles.dark : styles.light, disabled && styles.disabled, press]}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.picked, fill]} />
        <Text
          style={[
            type.bodySmallStrong,
            { color: selected ? palette.steam : tone === 'dark' ? alpha.steam72 : palette.smoke },
          ]}
        >
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: 40,
    paddingHorizontal: space.s16,
    paddingVertical: space.s8,
    borderRadius: radii.slat,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  light: { backgroundColor: palette.aspen },
  dark: { backgroundColor: alpha.roomChip },
  picked: { backgroundColor: palette.ember },
  disabled: { opacity: 0.45 },
});
