import React, { useRef } from 'react';
import { Animated, Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors, radii, shadows } from '../theme/tokens';
import { weights } from '../theme/typography';

/**
 * PrimaryButton — flat solid Arro-orange CTA. Press primitive (Motion §3):
 * scale 1→0.96 over 90ms down, back to 1 over 140ms up. No gradient, no bounce.
 */
type Props = {
  title: string;
  onPress?: () => void;
  icon?: React.ReactNode;
  disabled?: boolean;
  /** 'large' is the one big action on a screen ("I moved today"). */
  size?: 'default' | 'large';
  style?: StyleProp<ViewStyle>;
};

export function PrimaryButton({ title, onPress, icon, disabled, size = 'default', style }: Props) {
  const scale = useRef(new Animated.Value(1)).current;

  const press = (to: number, duration: number) =>
    Animated.timing(scale, { toValue: to, duration, useNativeDriver: true }).start();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => press(0.96, 90)}
      onPressOut={() => press(1, 140)}
      style={style}
    >
      <Animated.View
        style={[
          styles.btn,
          size === 'large' && styles.btnLarge,
          shadows.button,
          { transform: [{ scale }] },
          disabled && { opacity: 0.45 },
        ]}
      >
        {icon ? <View style={styles.icon}>{icon}</View> : null}
        <Text style={[styles.label, size === 'large' && styles.labelLarge]}>{title}</Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: radii.button,
    backgroundColor: colors.primary,
  },
  btnLarge: { height: 68, borderRadius: radii.card },
  icon: { marginRight: 2 },
  label: { color: colors.white, fontSize: 16, fontWeight: weights.semibold },
  labelLarge: { fontSize: 19, fontWeight: weights.bold },
});
