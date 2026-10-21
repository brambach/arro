import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { gradients, palette, radii, space } from '../theme/tokens';
import { distances, springs, timing } from '../theme/motion';
import { type } from '../theme/typography';
import { SaunaType } from '../data/types';
import { saunaTypeLabels } from '../data/saunas';
import { Icon, IconName } from './Icon';

/** The custom icon for each sauna type. */
export const saunaTypeIcon: Record<SaunaType, IconName> = {
  traditional: 'traditional',
  wood_fired: 'woodFired',
  infrared: 'infrared',
  steam: 'steam',
  smoke: 'smoke',
  banya: 'banya',
  other: 'other',
};

/**
 * A large filled tile for the log form's 2-column sauna grid: the type's own
 * icon and its name. Aspen at rest; picked, it fills with ember (a crossfade)
 * and the icon and name turn steam. Never a pill.
 */
type Props = { saunaType: SaunaType; selected: boolean; onPress: () => void };

export function SaunaTypeTile({ saunaType, selected, onPress }: Props) {
  const on = useSharedValue(selected ? 1 : 0);
  const scale = useSharedValue(1);
  useEffect(() => {
    on.set(withTiming(selected ? 1 : 0, timing.utility));
  }, [selected, on]);
  const fill = useAnimatedStyle(() => ({ opacity: on.value }));
  const press = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const ink = selected ? palette.steam : palette.char;
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => scale.set(withSpring(distances.pressScale, springs.press))}
      onPressOut={() => scale.set(withSpring(1, springs.press))}
      accessibilityRole="radio"
      accessibilityLabel={saunaTypeLabels[saunaType]}
      accessibilityState={{ selected }}
      style={styles.hit}
    >
      <Animated.View style={[styles.tile, press]}>
        <Animated.View style={[StyleSheet.absoluteFill, fill]}>
          <LinearGradient
            colors={[gradients.emberButton[0].color, gradients.emberButton[1].color, gradients.emberButton[2].color]}
            locations={[gradients.emberButton[0].offset, gradients.emberButton[1].offset, gradients.emberButton[2].offset]}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
        <Icon name={saunaTypeIcon[saunaType]} size={28} color={ink} />
        <Text style={[type.bodySmallStrong, { color: ink }]}>{saunaTypeLabels[saunaType]}</Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hit: { flex: 1 },
  tile: {
    minHeight: 84,
    paddingHorizontal: space.s16,
    paddingVertical: space.s12,
    gap: space.s8,
    justifyContent: 'center',
    borderRadius: radii.tile,
    borderCurve: 'continuous',
    backgroundColor: palette.aspen,
    overflow: 'hidden',
  },
});
