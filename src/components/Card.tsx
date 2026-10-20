import React from 'react';
import { Pressable, StyleProp, View, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { depth, layout, palette, radii } from '../theme/tokens';
import { distances, springs } from '../theme/motion';

/**
 * A steam-colored card, lifted off the birch by a half-point char ring, a close
 * contact shadow and a long soft shadow (depth.card). Pressable when `onPress`
 * is set: it eases down a little under the finger, with a spring.
 */
type Props = {
  children: React.ReactNode;
  /** Inner padding, from the spacing scale. Defaults to 20. */
  padding?: 0 | 4 | 8 | 12 | 16 | 20 | 24 | 32;
  /** Raised higher: a sheet-like card (depth.float). */
  float?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
  /** @deprecated Arro's prop; cards have one radius now. */
  radius?: number;
  /** A tray-colored card (aspen) for something that sits in the page. */
  background?: string;
};

export function Card({ children, padding = layout.cardPad, float, onPress, accessibilityLabel, accessibilityHint, background = palette.steam, style }: Props) {
  const surface: StyleProp<ViewStyle> = [
    { backgroundColor: background, borderRadius: radii.card, padding, boxShadow: float ? depth.float : depth.card },
    style,
  ];
  if (!onPress) return <View style={surface}>{children}</View>;
  return (
    <PressableCard surface={surface} onPress={onPress} label={accessibilityLabel} hint={accessibilityHint}>
      {children}
    </PressableCard>
  );
}

function PressableCard({
  children,
  surface,
  onPress,
  label,
  hint,
}: {
  children: React.ReactNode;
  surface: StyleProp<ViewStyle>;
  onPress: () => void;
  label?: string;
  hint?: string;
}) {
  const scale = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => {
        scale.set(withSpring(1 - (1 - distances.pressScale) / 2, springs.press));
      }}
      onPressOut={() => {
        scale.set(withSpring(1, springs.press));
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
    >
      <Animated.View style={[surface, anim]}>{children}</Animated.View>
    </Pressable>
  );
}
