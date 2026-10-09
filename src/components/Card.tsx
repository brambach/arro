import React from 'react';
import { Pressable, StyleProp, View, ViewStyle } from 'react-native';
import { colors, radii, shadows } from '../theme/tokens';
import { Glass } from './Glass';

/**
 * Card: a raised paper surface. No border; a soft warm ring and a long shadow
 * lift it off the page (shadows.card). `glass` makes it frosted glass instead,
 * for a card that sits over colour (Today's top card over the dawn glow).
 * Becomes pressable when onPress is provided.
 */
type Props = {
  children: React.ReactNode;
  radius?: number;
  padding?: number;
  background?: string;
  onPress?: () => void;
  glass?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Card({
  children,
  radius = radii.cardLg,
  padding = 16,
  background = colors.card,
  onPress,
  glass,
  style,
}: Props) {
  if (glass && !onPress) {
    return (
      <Glass radius={radius} padding={padding} style={style}>
        {children}
      </Glass>
    );
  }

  const surface: StyleProp<ViewStyle> = [
    {
      backgroundColor: background,
      borderRadius: radius,
      padding,
    },
    shadows.card,
    style,
  ];

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        style={({ pressed }) => [surface, pressed && { opacity: 0.9 }]}
      >
        {children}
      </Pressable>
    );
  }
  return <View style={surface}>{children}</View>;
}
