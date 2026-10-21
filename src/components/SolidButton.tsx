import React, { useEffect } from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import Animated, { cancelAnimation, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSpring, withTiming } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { alpha, depth, gradients, layout, palette, radii, space, Stop } from '../theme/tokens';
import { distances, moments, springs, timing, useReduceMotion } from '../theme/motion';
import { type } from '../theme/typography';

/**
 * The primary action: a solid soft rectangle (radius 16), never a capsule and
 * never outlined. Ember with a warm inner highlight along the top and an
 * ember-tinted shadow beneath (depth.button). Pressed, it eases down with a
 * spring and the face crossfades to coal.
 *
 * - `size="large"` is the one big action on a screen ("Start a session"), 64 pt.
 * - `tone="ash"` is the translucent button on the dark room ("Throw löyly").
 */
type Props = {
  title: string;
  onPress?: () => void;
  icon?: React.ReactNode;
  size?: 'regular' | 'large';
  tone?: 'ember' | 'ash';
  disabled?: boolean;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
  /** Stretch to the parent's width (the default) or hug the label. */
  fill?: boolean;
  /**
   * Waiting on something (the App Store): full color, not pressable, three
   * small dots after the label light in turn. Not dimmed like `disabled`,
   * which would read as "you can't".
   */
  busy?: boolean;
};

const colorsOf = (stops: Stop[]) => stops.map((s) => s.color) as [string, string, ...string[]];
const offsetsOf = (stops: Stop[]) => stops.map((s) => s.offset) as [number, number, ...number[]];

export function SolidButton({
  title,
  onPress,
  icon,
  size = 'regular',
  tone = 'ember',
  disabled,
  accessibilityHint,
  style,
  fill = true,
  busy = false,
}: Props) {
  const pressed = useSharedValue(0);
  const scale = useSharedValue(1);

  const body = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const coal = useAnimatedStyle(() => ({ opacity: pressed.value }));

  const height = size === 'large' ? layout.buttonTall : layout.button;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!disabled, busy }}
      disabled={disabled || busy}
      onPress={onPress}
      onPressIn={() => {
        pressed.set(withTiming(1, timing.utility));
        scale.set(withSpring(distances.pressScale, springs.press));
      }}
      onPressOut={() => {
        pressed.set(withTiming(0, timing.utility));
        scale.set(withSpring(1, springs.press));
      }}
      style={[fill ? styles.fill : styles.hug, style]}
    >
      <Animated.View
        style={[
          styles.face,
          // minHeight, so a label at the largest Dynamic Type sizes wraps instead of being cut off.
          { minHeight: height, boxShadow: tone === 'ember' ? depth.button : depth.ash },
          disabled && styles.disabled,
          body,
        ]}
      >
        {tone === 'ember' ? (
          <>
            <LinearGradient
              colors={colorsOf(gradients.emberButton)}
              locations={offsetsOf(gradients.emberButton)}
              style={StyleSheet.absoluteFill}
            />
            <Animated.View style={[StyleSheet.absoluteFill, coal]}>
              <LinearGradient
                colors={colorsOf(gradients.coalButton)}
                locations={offsetsOf(gradients.coalButton)}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>
          </>
        ) : (
          <>
            <LinearGradient colors={[alpha.ashTop, alpha.ashBottom]} style={StyleSheet.absoluteFill} />
            <Animated.View style={[StyleSheet.absoluteFill, styles.ashPressed, coal]} />
          </>
        )}
        <View style={styles.content}>
          {icon ? <View importantForAccessibility="no">{icon}</View> : null}
          <Text style={[type.bodyStrong, styles.label]}>
            {title}
          </Text>
          {busy ? <BusyDots /> : null}
        </View>
      </Animated.View>
    </Pressable>
  );
}

/** Three steam dots lighting in turn, while the button waits. */
function BusyDots() {
  return (
    <View style={styles.dots} importantForAccessibility="no-hide-descendants">
      {[0, 1, 2].map((i) => (
        <BusyDot key={i} index={i} />
      ))}
    </View>
  );
}

function BusyDot({ index }: { index: number }) {
  const o = useSharedValue(0.35);
  const reduceMotion = useReduceMotion();
  useEffect(() => {
    if (reduceMotion !== false) return;
    const { duration, easing } = moments.waiting;
    o.set(withDelay(index * moments.waiting.stagger, withRepeat(withTiming(1, { duration, easing }), -1, true)));
    return () => cancelAnimation(o);
  }, [index, o, reduceMotion]);
  const s = useAnimatedStyle(() => ({ opacity: o.value }));
  return <Animated.View style={[styles.dot, s]} />;
}

const styles = StyleSheet.create({
  dots: { flexDirection: 'row', gap: space.s4 },
  dot: { width: 5, height: 5, borderRadius: radii.round, backgroundColor: palette.steam },
  fill: { alignSelf: 'stretch' },
  hug: { alignSelf: 'center' },
  face: {
    borderRadius: radii.button,
    borderCurve: 'continuous',
    overflow: 'hidden',
    justifyContent: 'center',
    paddingHorizontal: space.s24,
    // Grows past its height only with large Dynamic Type, so the label never clips.
    paddingVertical: space.s12,
  },
  content: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.s12, flexShrink: 1 },
  label: { color: palette.steam, textAlign: 'center', flexShrink: 1 },
  ashPressed: { backgroundColor: alpha.pressOnDark },
  disabled: { opacity: 0.45 },
});
