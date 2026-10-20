import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { depth, gradients, palette, radii, space } from '../theme/tokens';
import { distances, springs, timing } from '../theme/motion';
import { maxFontScale, type } from '../theme/typography';

/**
 * A row of large solid tiles for one choice (Your rhythm: 2, 3, 4, 5 a week;
 * 5, 10, 15, 20 minutes). Tiles are aspen trays pressed into the page; the
 * picked one fills with ember, crossfading, its number in steam. No outlines.
 *
 * At the largest Dynamic Type sizes the row becomes a 2 by 2 grid so nothing
 * clips.
 */
export type TileOption<T> = {
  value: T;
  /** The big Fraunces number or word: "3". */
  label: string;
  /** Under it: "a week", "minutes". */
  sub?: string;
  /** Read out: "3 sessions a week". */
  accessibilityLabel?: string;
};

type Props<T> = {
  options: TileOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** What the group is for, read out first: "Sessions a week". */
  accessibilityLabel: string;
  disabled?: boolean;
};

const ember = gradients.emberButton.map((s) => s.color) as [string, string, ...string[]];
const emberAt = gradients.emberButton.map((s) => s.offset) as [number, number, ...number[]];

export function ChoiceTiles<T extends string | number>({ options, value, onChange, accessibilityLabel, disabled }: Props<T>) {
  const { fontScale } = useWindowDimensions();
  const grid = fontScale >= 1.35;
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={accessibilityLabel} style={[styles.row, grid && styles.grid]}>
      {options.map((o) => (
        <Tile
          key={String(o.value)}
          option={o}
          picked={o.value === value}
          grid={grid}
          disabled={disabled}
          onPress={() => onChange(o.value)}
        />
      ))}
    </View>
  );
}

function Tile<T>({
  option,
  picked,
  grid,
  disabled,
  onPress,
}: {
  option: TileOption<T>;
  picked: boolean;
  grid: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  const on = useSharedValue(picked ? 1 : 0);
  const scale = useSharedValue(1);
  useEffect(() => {
    on.set(withTiming(picked ? 1 : 0, timing.utility));
  }, [picked, on]);
  const fill = useAnimatedStyle(() => ({ opacity: on.value }));
  const press = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const face = (light: boolean) => (
    <>
      <Text style={[type.title, light ? styles.light : null]} maxFontSizeMultiplier={maxFontScale.title}>
        {option.label}
      </Text>
      {option.sub ? <Text style={[type.bodySmallStrong, light ? styles.light : styles.sub]}>{option.sub}</Text> : null}
    </>
  );

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      onPressIn={() => {
        scale.set(withSpring(distances.pressScale, springs.press));
      }}
      onPressOut={() => {
        scale.set(withSpring(1, springs.press));
      }}
      accessibilityRole="radio"
      accessibilityState={{ selected: picked, disabled: !!disabled }}
      accessibilityLabel={option.accessibilityLabel ?? [option.label, option.sub].filter(Boolean).join(' ')}
      style={grid ? styles.cellGrid : styles.cell}
    >
      <Animated.View style={[styles.tile, disabled && styles.disabled, press]}>
        {face(false)}
        <Animated.View style={[StyleSheet.absoluteFill, styles.picked, fill]} pointerEvents="none">
          <LinearGradient colors={ember} locations={emberAt} style={StyleSheet.absoluteFill} />
          {face(true)}
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.s12 },
  grid: { flexWrap: 'wrap' },
  cell: { flex: 1 },
  cellGrid: { width: '47%', flexGrow: 1 },
  tile: {
    minHeight: 88,
    paddingVertical: space.s12,
    paddingHorizontal: space.s4,
    borderRadius: radii.tile,
    borderCurve: 'continuous',
    backgroundColor: palette.aspen,
    boxShadow: depth.sunk,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  picked: { alignItems: 'center', justifyContent: 'center', boxShadow: depth.button, borderRadius: radii.tile },
  light: { color: palette.steam },
  sub: { color: palette.smoke },
  disabled: { opacity: 0.45 },
});
