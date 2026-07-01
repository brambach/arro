import React, { useRef } from 'react';
import {
  Animated,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients, radii, shadows } from '../theme/tokens';
import { fonts } from '../theme/typography';

/**
 * PrimaryButton (Spec §5) — gradient CTA. Press = scale 0.97 + slight darken
 * over 120ms, no spring/bounce. Full-width by default; h58, radius 20.
 */
type Props = {
  title: string;
  onPress?: () => void;
  icon?: React.ReactNode;
  disabled?: boolean;
  height?: number;
  style?: StyleProp<ViewStyle>;
};

export function PrimaryButton({ title, onPress, icon, disabled, height = 58, style }: Props) {
  const scale = useRef(new Animated.Value(1)).current;
  const darken = useRef(new Animated.Value(0)).current;

  const animate = (toScale: number, toDark: number) => {
    Animated.parallel([
      Animated.timing(scale, { toValue: toScale, duration: 120, useNativeDriver: true }),
      Animated.timing(darken, { toValue: toDark, duration: 120, useNativeDriver: true }),
    ]).start();
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => animate(0.97, 1)}
      onPressOut={() => animate(1, 0)}
      style={style}
    >
      <Animated.View
        style={[
          { transform: [{ scale }], borderRadius: 20, height },
          !disabled && shadows.button,
          disabled && { opacity: 0.4 },
        ]}
      >
        <LinearGradient
          colors={gradients.primaryButton}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.grad, { height, borderRadius: 20 }]}
        >
          {icon}
          <Text style={styles.label}>{title}</Text>
          <Animated.View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              {
                borderRadius: 20,
                backgroundColor: colors.primaryPress,
                opacity: darken.interpolate({ inputRange: [0, 1], outputRange: [0, 0.18] }),
              },
            ]}
          />
        </LinearGradient>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  grad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: radii.card,
    overflow: 'hidden',
  },
  label: {
    fontFamily: fonts.sansHeavy,
    fontSize: 17.5,
    letterSpacing: 0.2,
    color: colors.white,
  },
});
