import React, { forwardRef, useCallback, useEffect, useImperativeHandle } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { alpha, depth, layout, palette, radii, space } from '../theme/tokens';
import { springs, timing, useReduceMotion } from '../theme/motion';
import { Icon } from './Icon';

/**
 * A bottom sheet over a dimmed screen (the nudge, a past week): birch, radius
 * 28, lifted with depth.float. It rises on the `morph` spring as the scrim
 * fades in, and goes back down before `onClosed` pops the route, so there's no
 * jump. The close mark is top right, at full size from the first frame.
 *
 * Use it as the whole screen of a `transparentModal` route with animation
 * 'none'; the sheet does its own motion. Reduce Motion: a crossfade.
 */
export type SheetHandle = { close: () => void };

type Props = {
  children: React.ReactNode;
  onClosed: () => void;
  accessibilityLabel: string;
};

const TRAVEL = 480;

export const Sheet = forwardRef<SheetHandle, Props>(function Sheet({ children, onClosed, accessibilityLabel }, ref) {
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const p = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion === null) return;
    p.set(reduceMotion ? withTiming(1, timing.utility) : withSpring(1, springs.morph));
  }, [reduceMotion, p]);

  const close = useCallback(() => {
    p.set(
      withTiming(0, timing.utility, (finished) => {
        'worklet';
        if (finished) scheduleOnRN(onClosed);
      }),
    );
  }, [onClosed, p]);
  useImperativeHandle(ref, () => ({ close }), [close]);

  const still = reduceMotion !== false;
  const scrim = useAnimatedStyle(() => ({ opacity: Math.min(1, p.value) }));
  const card = useAnimatedStyle(() => ({
    opacity: still ? p.value : 1,
    transform: [{ translateY: still ? 0 : (1 - p.value) * TRAVEL }],
  }));

  return (
    <View style={styles.root} accessibilityViewIsModal>
      <Animated.View style={[StyleSheet.absoluteFill, styles.scrim, scrim]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityRole="button" accessibilityLabel="Close" />
      </Animated.View>
      <Animated.View
        style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, space.s16) + space.s16 }, card]}
        accessibilityLabel={accessibilityLabel}
      >
        <Pressable onPress={close} style={styles.close} accessibilityRole="button" accessibilityLabel="Close" hitSlop={space.s8}>
          <Icon name="close" size={22} color={palette.smoke} />
        </Pressable>
        {children}
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  scrim: { backgroundColor: alpha.scrim },
  sheet: {
    backgroundColor: palette.birch,
    borderTopLeftRadius: radii.sheet,
    borderTopRightRadius: radii.sheet,
    boxShadow: depth.float,
    paddingTop: space.s32,
    paddingHorizontal: layout.inset,
  },
  close: {
    position: 'absolute',
    top: space.s16,
    right: space.s16,
    width: layout.touch,
    height: layout.touch,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
});
