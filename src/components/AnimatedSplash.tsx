import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { colors } from '../theme/tokens';
import { weights } from '../theme/typography';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedPath = Animated.createAnimatedComponent(Path);

const SIZE = 96;
const CIRC = 2 * Math.PI * 25.5; // bowl circumference ≈ 160
const STEM = 62; // stem+foot dash length (over-estimate)

/**
 * Logo-draw splash (Motion Storyboard C1 / Handoff V1·4): the mark draws like a
 * running route — the bowl loop, then the forward foot — then the wordmark fades
 * in, then the whole splash fades out to reveal the app. ~1.2s, one pass, never
 * loops. Reduced Motion → show the finished mark and fade out quickly.
 */
export function AnimatedSplash({ onDone }: { onDone: () => void }) {
  const circle = useRef(new Animated.Value(CIRC)).current;
  const stem = useRef(new Animated.Value(STEM)).current;
  const word = useRef(new Animated.Value(0)).current;
  const cover = useRef(new Animated.Value(1)).current;
  const [reduceMotion, setReduceMotion] = useState<boolean | null>(null);

  // Keep the latest onDone without making it an animation-effect dependency
  // (App passes a fresh arrow each render; we never want to restart the draw).
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    let m = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => m && setReduceMotion(v))
      .catch(() => m && setReduceMotion(false));
    return () => {
      m = false;
    };
  }, []);

  useEffect(() => {
    if (reduceMotion === null) return;
    const easeInOut = Easing.inOut(Easing.cubic);

    if (reduceMotion) {
      circle.setValue(0);
      stem.setValue(0);
      word.setValue(1);
      const t = Animated.timing(cover, { toValue: 0, duration: 220, delay: 500, useNativeDriver: true });
      t.start(({ finished }) => finished && onDoneRef.current());
      return () => t.stop();
    }

    const seq = Animated.sequence([
      Animated.timing(circle, { toValue: 0, duration: 550, easing: easeInOut, useNativeDriver: false }),
      Animated.timing(stem, { toValue: 0, duration: 300, easing: easeInOut, useNativeDriver: false }),
      Animated.timing(word, { toValue: 1, duration: 250, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.delay(250),
      Animated.timing(cover, { toValue: 0, duration: 240, useNativeDriver: true }),
    ]);
    seq.start(({ finished }) => finished && onDoneRef.current());
    return () => seq.stop();
  }, [reduceMotion, circle, stem, word, cover]);

  return (
    <Animated.View style={[styles.root, { opacity: cover }]}>
      <Svg width={SIZE} height={SIZE} viewBox="0 0 120 120" fill="none">
        <AnimatedCircle
          cx={53}
          cy={59}
          r={25.5}
          stroke={colors.primary}
          strokeWidth={13}
          strokeLinecap="round"
          strokeDasharray={CIRC}
          strokeDashoffset={circle}
        />
        <AnimatedPath
          d="M78.5 35 V78 Q78.5 86 88 84.5"
          stroke={colors.primary}
          strokeWidth={13}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={STEM}
          strokeDashoffset={stem}
        />
      </Svg>
      <Animated.Text style={[styles.word, { opacity: word }]}>Arro</Animated.Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.screen,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  word: { fontSize: 30, fontWeight: weights.bold, letterSpacing: -0.6, color: colors.ink, marginTop: 14 },
});
