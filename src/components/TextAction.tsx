import React from 'react';
import { Pressable, StyleProp, StyleSheet, Text, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { alpha, palette, space } from '../theme/tokens';
import { timing } from '../theme/motion';
import { type } from '../theme/typography';

/**
 * A secondary action: plain text, weight 600, no underline, no arrow, no
 * outline ("Log one I already did", "Add a round"). It dims a little when pressed.
 *
 * Tones: `ink` on light screens, `coal` for the one ember-colored action on a
 * light screen, `steam` on the dark room, `steamDim` for a quiet action there
 * ("Cancel").
 */
type Props = {
  label: string;
  onPress: () => void;
  tone?: 'ink' | 'coal' | 'steam' | 'steamDim';
  size?: 'body' | 'bodySmall';
  disabled?: boolean;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
};

const toneColor = {
  ink: palette.char,
  coal: palette.coal,
  steam: palette.steam,
  steamDim: alpha.steam60,
} as const;

export function TextAction({ label, onPress, tone = 'ink', size = 'body', disabled, accessibilityHint, style }: Props) {
  const dim = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ opacity: dim.value }));
  const text = size === 'body' ? type.bodyStrong : type.bodySmallStrong;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      onPressIn={() => {
        dim.set(withTiming(0.55, timing.utility));
      }}
      onPressOut={() => {
        dim.set(withTiming(1, timing.utility));
      }}
      hitSlop={space.s12}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!disabled }}
      style={[styles.hit, style]}
    >
      <Animated.View style={anim}>
        <Text style={[text, { color: toneColor[tone] }, disabled && styles.disabled]}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hit: { alignSelf: 'center', paddingVertical: space.s8 },
  disabled: { opacity: 0.45 },
});
