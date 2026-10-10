import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { colors, depth, radii } from '../theme/tokens';

/**
 * Frosted glass, as on arrofamily.com: what's behind shows through blurred and
 * warmed by the card colour, with a light rim that's brightest along the top.
 * The shadow sits on the outer view and the blur is clipped inside it, so the
 * corners stay round without cutting the shadow off. Glass only reads as glass
 * over something with colour in it (the dawn glow, the contour map, a photo); on flat
 * paper use a plain Card.
 */
type Props = {
  children: React.ReactNode;
  radius?: number;
  padding?: number;
  /** Blur strength, 0-100. */
  intensity?: number;
  tint?: string;
  style?: StyleProp<ViewStyle>;
};

export function Glass({ children, radius = radii.cardLg, padding = 18, intensity = 40, tint = colors.glass, style }: Props) {
  return (
    <View style={[{ borderRadius: radius, padding, boxShadow: depth.float }, style]}>
      <View style={[StyleSheet.absoluteFill, { borderRadius: radius, overflow: 'hidden' }]} pointerEvents="none">
        <BlurView intensity={intensity} tint="light" style={StyleSheet.absoluteFill} />
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: tint,
              borderRadius: radius,
              boxShadow: 'inset 0px 1px 0px 0px rgba(255,255,255,0.85), inset 0px 0px 0px 1px rgba(255,255,255,0.45)',
            },
          ]}
        />
      </View>
      {children}
    </View>
  );
}
