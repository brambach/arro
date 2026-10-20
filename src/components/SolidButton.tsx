import React from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { alpha, depth, gradients, layout, palette, radii, space, Stop } from '../theme/tokens';
import { distances, springs, timing } from '../theme/motion';
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
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
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
          <Text style={[type.bodyStrong, styles.label]} numberOfLines={2}>
            {title}
          </Text>
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
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
