import React from 'react';
import { AccessibilityActionEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { depth, palette, radii, space } from '../theme/tokens';
import { distances, springs } from '../theme/motion';
import { type } from '../theme/typography';
import { clockTimeLabel } from '../state/reminders';
import { stepTime } from '../state/settingsCopy';
import { FixedDigits } from './FixedDigits';
import { Icon } from './Icon';

/**
 * The reminder time: the time in Fraunces between two round steppers, 15
 * minutes a tap, wrapping round midnight. VoiceOver treats it as one
 * adjustable control (swipe up or down to change it).
 */
const STEP = 15;

type Props = {
  /** "18:30" */
  time: string;
  onChange: (time: string) => void;
};

export function TimeStepper({ time, onChange }: Props) {
  const label = clockTimeLabel(time); // "6:30 PM"
  const [clock, half] = label.split(' ');
  const onAction = (e: AccessibilityActionEvent) => {
    if (e.nativeEvent.actionName === 'increment') onChange(stepTime(time, STEP));
    if (e.nativeEvent.actionName === 'decrement') onChange(stepTime(time, -STEP));
  };
  return (
    <View style={styles.row}>
      <Step icon="minus" label="Earlier" onPress={() => onChange(stepTime(time, -STEP))} />
      <View
        style={styles.time}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel="Reminder time"
        accessibilityValue={{ text: label }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={onAction}
      >
        <FixedDigits value={clock} variant="title" />
        <Text style={[type.heading, styles.half]} maxFontSizeMultiplier={1}>
          {half}
        </Text>
      </View>
      <Step icon="plus" label="Later" onPress={() => onChange(stepTime(time, STEP))} />
    </View>
  );
}

function Step({ icon, label, onPress }: { icon: 'minus' | 'plus'; label: string; onPress: () => void }) {
  const scale = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => {
        scale.set(withSpring(distances.pressScale, springs.press));
      }}
      onPressOut={() => {
        scale.set(withSpring(1, springs.press));
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      // The adjustable time above already does this for VoiceOver.
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Animated.View style={[styles.step, anim]}>
        <Icon name={icon} size={22} color={palette.char} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.s12 },
  time: { flexDirection: 'row', alignItems: 'baseline', gap: space.s8, justifyContent: 'center', flex: 1 },
  half: { color: palette.smoke },
  step: {
    width: 48,
    height: 48,
    borderRadius: radii.round,
    backgroundColor: palette.aspen,
    boxShadow: depth.sunk,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
