import React from 'react';
import { Pressable, StyleProp, View, ViewStyle } from 'react-native';
import { colors, radii, shadows } from '../theme/tokens';

/**
 * Rounded warm surface with a single soft shadow. One shadow per surface
 * (Spec §3). Becomes pressable when onPress is provided.
 */
type Props = {
  children: React.ReactNode;
  elevation?: keyof typeof shadows;
  radius?: number;
  padding?: number;
  background?: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

export function Card({
  children,
  elevation = 'card',
  radius = radii.card,
  padding = 16,
  background = colors.white,
  onPress,
  style,
}: Props) {
  const surface: StyleProp<ViewStyle> = [
    { backgroundColor: background, borderRadius: radius, padding },
    shadows[elevation],
    style,
  ];

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [surface, pressed && { opacity: 0.85 }]}
      >
        {children}
      </Pressable>
    );
  }
  return <View style={surface}>{children}</View>;
}
