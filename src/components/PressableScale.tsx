import React, { useRef } from 'react';
import { Animated, Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';
import { springs } from '../theme/motion';

/**
 * Press primitive with weight: the surface sinks slightly under your finger and
 * springs back on release. Use for anything tappable that isn't a button.
 */
type Props = Omit<PressableProps, 'style'> & {
  /** How far it sinks; cards want less than small controls. */
  to?: number;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
};

export function PressableScale({ to = 0.97, style, children, onPressIn, onPressOut, ...rest }: Props) {
  const scale = useRef(new Animated.Value(1)).current;
  const spring = (toValue: number) =>
    Animated.spring(scale, { toValue, ...springs.press, useNativeDriver: true }).start();

  return (
    <Pressable
      {...rest}
      onPressIn={(e) => {
        spring(to);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        spring(1);
        onPressOut?.(e);
      }}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>
    </Pressable>
  );
}
