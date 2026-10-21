import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { depth, layout, palette, radii, space } from '../theme/tokens';
import { distances, springs } from '../theme/motion';
import { type } from '../theme/typography';
import { Icon } from './Icon';

/**
 * A value with a minus and a plus either side: rounds (1 to 10), a start time
 * (5 minutes a step). A steam well with two round aspen buttons; the value in
 * the middle reads as text. VoiceOver gets one adjustable element: swipe up
 * or down to change it.
 */
type Props = {
  label: string;
  /** What's shown, such as "2" or "6:45 PM". */
  display: string;
  /** The spoken value, if it differs: "2 rounds". */
  spoken?: string;
  onDecrement: () => void;
  onIncrement: () => void;
  canDecrement: boolean;
  canIncrement: boolean;
};

export function Stepper({ label, display, spoken, onDecrement, onIncrement, canDecrement, canIncrement }: Props) {
  return (
    <View
      style={styles.well}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ text: spoken ?? display }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => {
        if (e.nativeEvent.actionName === 'increment' && canIncrement) onIncrement();
        if (e.nativeEvent.actionName === 'decrement' && canDecrement) onDecrement();
      }}
    >
      <StepButton icon="minus" onPress={onDecrement} disabled={!canDecrement} />
      <Text style={[type.bodyStrong, styles.value]}>{display}</Text>
      <StepButton icon="plus" onPress={onIncrement} disabled={!canIncrement} />
    </View>
  );
}

function StepButton({ icon, onPress, disabled }: { icon: 'minus' | 'plus'; onPress: () => void; disabled: boolean }) {
  const scale = useSharedValue(1);
  const s = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={space.s4}
      onPressIn={() => scale.set(withSpring(distances.pressScale - 0.05, springs.press))}
      onPressOut={() => scale.set(withSpring(1, springs.press))}
      importantForAccessibility="no"
      accessibilityElementsHidden
    >
      <Animated.View style={[styles.button, disabled && styles.disabled, s]}>
        <Icon name={icon} size={20} color={palette.char} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  well: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: layout.button,
    paddingHorizontal: space.s4,
    borderRadius: radii.field,
    borderCurve: 'continuous',
    backgroundColor: palette.steam,
    boxShadow: depth.card,
  },
  value: { flex: 1, textAlign: 'center', paddingHorizontal: space.s8 },
  button: {
    width: layout.touch,
    height: layout.touch,
    borderRadius: radii.round,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.aspen,
  },
  disabled: { opacity: 0.35 },
});
