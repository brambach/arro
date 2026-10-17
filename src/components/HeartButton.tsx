import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform, Pressable, StyleSheet, Text } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors } from '../theme/tokens';
import { weights } from '../theme/typography';
import { Heart } from './Icons';

/**
 * A heart on someone's finished workout. Tap to cheer it, tap again to take the
 * cheer back. Same motion as CheerButton: press, one small pulse when you cheer,
 * a light haptic; reduced motion skips the pulse. Ink, not clay: an outline heart
 * that fills once you've cheered.
 *
 * Changes straight away; if onToggle rejects, it goes back.
 */
export function HeartButton({
  cheered,
  count,
  onToggle,
  label,
  size = 17,
}: {
  cheered: boolean;
  count: number;
  onToggle: (on: boolean) => Promise<unknown>;
  /** "Cheer Mum’s walk" */
  label: string;
  size?: number;
}) {
  const [on, setOn] = useState(cheered);
  const [n, setN] = useState(count);
  const scale = useRef(new Animated.Value(1)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const reduceMotion = useRef(false);

  // A refresh brings the server's answer.
  useEffect(() => {
    setOn(cheered);
    setN(count);
  }, [cheered, count]);

  useEffect(() => {
    let m = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => {
        if (m) reduceMotion.current = v;
      })
      .catch(() => {});
    return () => {
      m = false;
    };
  }, []);

  const press = () => {
    const next = !on;
    const step = next ? 1 : -1;
    setOn(next);
    setN((c) => c + step);
    if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
    if (next && !reduceMotion.current) {
      pulse.setValue(0);
      Animated.timing(pulse, { toValue: 1, duration: 380, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    }
    onToggle(next).catch(() => {
      setOn(!next);
      setN((c) => c - step);
    });
  };

  return (
    <Pressable
      onPress={press}
      onPressIn={() => Animated.timing(scale, { toValue: 0.92, duration: 90, useNativeDriver: true }).start()}
      onPressOut={() => Animated.timing(scale, { toValue: 1, duration: 140, useNativeDriver: true }).start()}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: on }}
      accessibilityValue={n > 0 ? { text: n === 1 ? '1 cheer' : `${n} cheers` } : undefined}
    >
      <Animated.View style={[styles.row, { transform: [{ scale }] }]}>
        <Animated.View
          pointerEvents="none"
          style={[
            styles.pulse,
            {
              opacity: pulse.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 0.5, 0] }),
              transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 2] }) }],
            },
          ]}
        >
          <Heart size={size} color={colors.ink} />
        </Animated.View>
        <Heart size={size} color={on ? colors.ink : colors.inkSoft} filled={on} />
        {n > 0 ? <Text style={[styles.count, on && styles.countOn]}>{n}</Text> : null}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 24 },
  pulse: { position: 'absolute', left: 0 },
  count: { fontSize: 13, fontWeight: weights.semibold, color: colors.faint2 },
  countOn: { color: colors.ink },
});
