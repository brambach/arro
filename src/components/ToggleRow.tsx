import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { alpha, layout, space } from '../theme/tokens';
import { timing } from '../theme/motion';
import { type } from '../theme/typography';
import { Toggle } from './Toggle';

/**
 * A row with an on/off switch, for a ListGroup. The whole row is the switch:
 * tapping anywhere flips it, and VoiceOver reads one switch with the row's
 * title, its state, and the subtitle as a hint.
 */
type Props = {
  title: string;
  subtitle?: string;
  value: boolean;
  onValueChange: (next: boolean) => void;
  disabled?: boolean;
};

export function ToggleRow({ title, subtitle, value, onValueChange, disabled }: Props) {
  const press = useSharedValue(0);
  const wash = useAnimatedStyle(() => ({ opacity: press.value }));
  return (
    <Pressable
      onPress={() => onValueChange(!value)}
      disabled={disabled}
      onPressIn={() => {
        press.set(withTiming(1, timing.utility));
      }}
      onPressOut={() => {
        press.set(withTiming(0, timing.utility));
      }}
      accessibilityRole="switch"
      accessibilityLabel={title}
      accessibilityHint={subtitle}
      accessibilityState={{ checked: value, disabled: !!disabled }}
      style={[styles.row, { minHeight: subtitle ? layout.row : layout.rowCompact }]}
    >
      <Animated.View style={[StyleSheet.absoluteFill, styles.wash, wash]} pointerEvents="none" />
      <View style={styles.text}>
        <Text style={type.bodyStrong}>{title}</Text>
        {subtitle ? <Text style={type.label}>{subtitle}</Text> : null}
      </View>
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Toggle value={value} onValueChange={onValueChange} accessibilityLabel={title} disabled={disabled} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.s12, paddingHorizontal: space.s20, paddingVertical: space.s12 },
  wash: { backgroundColor: alpha.press },
  text: { flex: 1, minWidth: 0 },
});
