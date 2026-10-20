import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { depth, layout, palette, radii, space } from '../theme/tokens';
import { moments, timing } from '../theme/motion';
import { haptics } from '../theme/haptics';
import { type } from '../theme/typography';
import { useApp } from '../state/AppState';

/**
 * The quiet rollback: when an optimistic change didn't go through (a cheer, a
 * comment, Remove me), the screen has already put things back, and this says
 * so in one line ("Couldn't send that cheer. Try again.") at the top, with the
 * warning haptic. It goes by itself after a few seconds, or on a tap.
 *
 * Mount it once at the end of a screen's root view.
 */
const SHOW_MS = 4000;

export function NoticeToast() {
  const { notice, clearNotice } = useApp();
  const insets = useSafeAreaInsets();
  const [text, setText] = useState<string | null>(notice);
  const o = useSharedValue(0);

  useEffect(() => {
    if (!notice) return;
    const show = setTimeout(() => setText(notice), 0);
    haptics.error();
    o.set(withTiming(1, timing.utility));
    const hide = setTimeout(() => {
      o.set(withTiming(0, timing.utility));
      clearNotice();
    }, SHOW_MS);
    return () => {
      clearTimeout(show);
      clearTimeout(hide);
    };
  }, [notice, clearNotice, o]);

  const s = useAnimatedStyle(() => ({
    opacity: o.value,
    transform: [{ translateY: (1 - o.value) * -moments.todayArrival.rise }],
  }));
  if (!text) return null;
  return (
    <Animated.View style={[styles.wrap, { top: insets.top + space.s8 }, s]} pointerEvents={notice ? 'auto' : 'none'}>
      <Pressable
        onPress={() => {
          o.set(withTiming(0, timing.utility));
          clearNotice();
        }}
        accessibilityRole="alert"
        accessibilityLabel={text}
        style={styles.card}
      >
        <Text style={[type.bodySmall, styles.text]}>{text}</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: layout.gutter, right: layout.gutter },
  card: {
    backgroundColor: palette.steam,
    borderRadius: radii.field,
    boxShadow: depth.float,
    paddingHorizontal: space.s16,
    paddingVertical: space.s12,
  },
  text: { color: palette.char },
});
