import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { alpha, depth, layout, palette, radii, space } from '../theme/tokens';
import { springs, timing, useReduceMotion } from '../theme/motion';

/**
 * A bottom sheet in steam over a soft char scrim (confirms, "Arro is now
 * Saunafam"). It rises on the `morph` spring and leaves with `utility`; with
 * Reduce Motion it only crossfades. It stays mounted until it has left, so it
 * never vanishes mid-move. Tapping the scrim calls `onDismiss` when given.
 */
type Props = {
  visible: boolean;
  onDismiss?: () => void;
  /** Read out for the scrim. */
  dismissLabel?: string;
  children: React.ReactNode;
};

const OFFSCREEN = 520;

export function Sheet({ visible, onDismiss, dismissLabel = 'Close', children }: Props) {
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const [mounted, setMounted] = useState(visible);
  const p = useSharedValue(0);

  // Mount at once when asked to show; unmount only after the sheet has left.
  if (visible && !mounted) setMounted(true);

  useEffect(() => {
    if (!mounted || reduceMotion === null) return;
    if (visible) {
      p.set(reduceMotion ? withTiming(1, timing.utility) : withSpring(1, springs.morph));
    } else {
      p.set(
        withTiming(0, timing.utility, (finished) => {
          'worklet';
          if (finished) scheduleOnRN(setMounted, false);
        }),
      );
    }
  }, [visible, mounted, reduceMotion, p]);

  const slide = reduceMotion ? 0 : OFFSCREEN;
  const scrim = useAnimatedStyle(() => ({ opacity: Math.min(1, p.value) }));
  const sheet = useAnimatedStyle(() => ({
    opacity: slide ? 1 : p.value,
    transform: [{ translateY: (1 - p.value) * slide }],
  }));

  if (!mounted) return null;
  return (
    <Modal transparent visible animationType="none" statusBarTranslucent onRequestClose={onDismiss}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.scrim, scrim]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onDismiss}
          disabled={!onDismiss}
          accessibilityRole="button"
          accessibilityLabel={dismissLabel}
        />
      </Animated.View>
      <View style={styles.bottom} pointerEvents="box-none">
        <Animated.View style={[styles.sheet, { paddingBottom: insets.bottom + space.s16 }, sheet]} accessibilityViewIsModal>
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { backgroundColor: alpha.scrim },
  bottom: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: palette.steam,
    borderTopLeftRadius: radii.sheet,
    borderTopRightRadius: radii.sheet,
    borderCurve: 'continuous',
    boxShadow: depth.float,
    paddingHorizontal: layout.inset,
    paddingTop: space.s32,
  },
});
