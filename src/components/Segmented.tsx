import React, { useEffect, useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { depth, palette, radii, space } from '../theme/tokens';
import { springs, timing, useReduceMotion } from '../theme/motion';
import { type } from '../theme/typography';

/**
 * Two or three choices side by side ("Today", "Yesterday"): an aspen tray
 * pressed into the page with a steam thumb that slides to the picked one on
 * a spring. Not the system segmented control.
 */
type Option<T extends string> = { value: T; label: string; disabled?: boolean };

type Props<T extends string> = {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Read out before each option: "When". */
  accessibilityLabel: string;
};

export function Segmented<T extends string>({ options, value, onChange, accessibilityLabel }: Props<T>) {
  const reduceMotion = useReduceMotion();
  const [width, setWidth] = useState(0);
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  const segment = width ? (width - space.s8) / options.length : 0;
  const x = useSharedValue(0);
  useEffect(() => {
    if (!segment) return;
    x.set(reduceMotion !== false ? withTiming(index * segment, timing.utility) : withSpring(index * segment, springs.toggle));
  }, [index, segment, reduceMotion, x]);
  const thumb = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  return (
    <View
      style={styles.tray}
      onLayout={(e: LayoutChangeEvent) => {
        const w = e.nativeEvent.layout.width;
        // Jump, don't slide, on the first layout.
        if (!width) x.set(index * ((w - space.s8) / options.length));
        setWidth(w);
      }}
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
    >
      {segment ? <Animated.View style={[styles.thumb, { width: segment }, thumb]} /> : null}
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            disabled={o.disabled}
            style={styles.option}
            accessibilityRole="radio"
            accessibilityLabel={o.label}
            accessibilityState={{ selected: on, disabled: !!o.disabled }}
          >
            <Text style={[type.bodySmallStrong, { color: on ? palette.char : palette.smoke }, o.disabled && styles.disabled]}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tray: {
    flexDirection: 'row',
    padding: space.s4,
    borderRadius: radii.field,
    borderCurve: 'continuous',
    backgroundColor: palette.aspen,
    boxShadow: depth.sunk,
  },
  thumb: {
    position: 'absolute',
    top: space.s4,
    bottom: space.s4,
    left: space.s4,
    borderRadius: radii.slat,
    borderCurve: 'continuous',
    backgroundColor: palette.steam,
    boxShadow: depth.thumb,
  },
  option: { flex: 1, minHeight: 40, alignItems: 'center', justifyContent: 'center', paddingVertical: space.s8 },
  disabled: { opacity: 0.45 },
});
