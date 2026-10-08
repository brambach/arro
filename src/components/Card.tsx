import React from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import { colors, radii, shadows } from '../theme/tokens';
import { PressableScale } from './PressableScale';

/**
 * Flat card: white surface, hairline border, near-zero shadow (the border does
 * the work, not depth). Becomes pressable (with a soft sink) when onPress is provided.
 */
type Props = {
  children: React.ReactNode;
  radius?: number;
  padding?: number;
  background?: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

export function Card({
  children,
  radius = radii.cardLg,
  padding = 16,
  background = colors.card,
  onPress,
  style,
}: Props) {
  const surface: StyleProp<ViewStyle> = [
    {
      backgroundColor: background,
      borderRadius: radius,
      padding,
      borderWidth: 1,
      borderColor: colors.border,
    },
    shadows.card,
    style,
  ];

  if (onPress) {
    return (
      <PressableScale onPress={onPress} accessibilityRole="button" to={0.98} style={surface}>
        {children}
      </PressableScale>
    );
  }
  return <View style={surface}>{children}</View>;
}
