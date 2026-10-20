import React, { useCallback, useEffect, useRef, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import * as SplashScreen from 'expo-splash-screen';
import Svg from 'react-native-svg';
import { SoftEllipse } from './SoftEllipse';
import { palette, space, stoneArt } from '../theme/tokens';
import { moments, probeReduceMotion } from '../theme/motion';
import { StoneMark } from './brand/StoneMark';
import { Wordmark } from './brand/Wordmark';
import { SteamWisps } from './SteamWisps';

/**
 * First launch (design/saunafam-spec.md, Key motion moments, 1).
 *
 * The native splash is plain birch, the same as this component's first frame,
 * so there's no flash and no jump. It stays up until the fonts are loaded, the
 * cached family has been read (`ready`) and this component's SVG is mounted.
 * Then the native splash hides, and the motion starts on the frame after.
 *
 * | ms          | what happens                                                      |
 * |-------------|-------------------------------------------------------------------|
 * | 0 to 600    | three wisps draw upward from the bottom third; the glow comes to 40% |
 * | 400 to 1000 | the stone fades in and settles from 0.96 to 1                     |
 * | 700 to 1200 | the wordmark fades in as its letter spacing settles from 2 to 0   |
 * | 1200 to 1500| the mark lifts 8 pt and fades; the birch fades into the app       |
 * | 1200 to 1800| the wisps thin out; the next screen's own haze carries on         |
 *
 * Returning users (`returning`) get no mark: a 400 ms fade from birch into the
 * app. With Reduce Motion: the finished mark fades in, holds, and crossfades
 * out (250 ms each way).
 */
type Props = {
  /** Fonts loaded and the cached session and family read. */
  ready: boolean;
  /** Someone's signed in: skip the mark and fade straight into Today. */
  returning: boolean;
  onDone: () => void;
};

const STONE_WIDTH = 136;
const WORD_SIZE = 40;

export function AnimatedSplash({ ready, returning, onDone }: Props) {
  const { width, height } = useWindowDimensions();
  const [mounted, setMounted] = useState(false);
  const [phase, setPhase] = useState<'waiting' | 'playing' | 'leaving'>('waiting');
  const [reduced, setReduced] = useState<boolean | null>(null);
  const started = useRef(false);
  const doneRef = useRef(onDone);
  useEffect(() => {
    doneRef.current = onDone;
  }, [onDone]);

  const cover = useSharedValue(1);
  const glow = useSharedValue(0);
  const stone = useSharedValue(0);
  const word = useSharedValue(0);
  const spacing = useSharedValue<number>(moments.splash.wordmark.fromLetterSpacing);
  const lift = useSharedValue(0);
  const haze = useSharedValue(1);

  useEffect(() => {
    probeReduceMotion().then(setReduced);
  }, []);

  const onLayout = useCallback((_e: LayoutChangeEvent) => setMounted(true), []);

  const finish = useCallback(() => doneRef.current(), []);
  const leave = useCallback(() => setPhase('leaving'), []);

  useEffect(() => {
    if (!ready || !mounted || reduced === null || started.current) return;
    started.current = true;
    // The first frame here matches the native splash exactly, so it can go now.
    SplashScreen.hide();
    const raf = requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        setPhase('playing');
        play();
      }),
    );
    return () => cancelAnimationFrame(raf);

    function play() {
      const s = moments.splash;
      if (returning) {
        cover.set(withTiming(0, s.returning, (f) => {
          'worklet';
          if (f) scheduleOnRN(finish);
        }));
        return;
      }
      if (reduced) {
        const r = s.reduced;
        const fade = { duration: r.duration, easing: r.easing };
        stone.set(withTiming(1, fade));
        word.set(withTiming(1, fade));
        glow.set(withTiming(s.wisps.glowOpacity, fade));
        spacing.set(0);
        cover.set(withDelay(
          r.duration + r.hold,
          withTiming(0, fade, (f) => {
            'worklet';
            if (f) scheduleOnRN(finish);
          }),
        ));
        return;
      }
      // 0 to 600: the glow comes up as the wisps draw (SteamWisps draws itself).
      glow.set(withTiming(s.wisps.glowOpacity, { duration: s.wisps.duration, easing: s.wisps.easing }));
      // 400 to 1000: the stone.
      stone.set(withDelay(s.stone.start, withTiming(1, { duration: s.stone.duration, easing: s.stone.easing })));
      // 700 to 1200: the wordmark, its spacing settling.
      word.set(withDelay(s.wordmark.start, withTiming(1, { duration: s.wordmark.duration, easing: s.wordmark.easing })));
      spacing.set(withDelay(s.wordmark.start, withTiming(0, { duration: s.wordmark.duration, easing: s.wordmark.easing })));
      // 1200 to 1500: lift and fade, and the birch opens onto the app.
      const exit = { duration: s.exit.duration, easing: s.exit.easing };
      lift.set(withDelay(s.exit.start, withTiming(-s.exit.lift, exit)));
      cover.set(withDelay(
        s.exit.start,
        withTiming(0, exit, (f) => {
          'worklet';
          if (f) scheduleOnRN(leave);
        }),
      ));
      // After: the wisps drift on over the next screen and thin out.
      haze.set(withDelay(
        s.hazeOut.start,
        withTiming(0, { duration: s.hazeOut.duration, easing: s.hazeOut.easing }, (f) => {
          'worklet';
          if (f) scheduleOnRN(finish);
        }),
      ));
    }
    // Starts once, when everything is ready. The shared values are stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, mounted, reduced, returning]);

  const coverStyle = useAnimatedStyle(() => ({ opacity: cover.value }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: glow.value * cover.value }));
  const markStyle = useAnimatedStyle(() => ({ transform: [{ translateY: lift.value }] }));
  const stoneStyle = useAnimatedStyle(() => ({
    opacity: stone.value * cover.value,
    transform: [{ scale: moments.splash.stone.fromScale + (1 - moments.splash.stone.fromScale) * stone.value }],
  }));
  const wordStyle = useAnimatedStyle(() => ({ opacity: word.value * cover.value }));
  const hazeStyle = useAnimatedStyle(() => ({ opacity: haze.value }));

  const showMark = !returning;
  const drawWisps = showMark && phase !== 'waiting' && reduced === false;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents={phase === 'leaving' ? 'none' : 'auto'} onLayout={onLayout}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.birch, coverStyle]} />
      {showMark ? (
        <>
          <Animated.View style={[StyleSheet.absoluteFill, glowStyle]} pointerEvents="none">
            <FloorGlow width={width} height={height} />
          </Animated.View>
          <Animated.View style={[StyleSheet.absoluteFill, hazeStyle]} pointerEvents="none">
            {drawWisps ? (
              <SteamWisps width={width} height={height} draw base={0.9} rise={0.3} columns={[0.36, 0.5, 0.64]} thickness={6} sway={26} />
            ) : null}
          </Animated.View>
          <Animated.View style={[styles.center, markStyle]} pointerEvents="none">
            <Animated.View style={stoneStyle}>
              <StoneMark width={STONE_WIDTH} />
            </Animated.View>
            <Animated.View style={[styles.word, wordStyle]}>
              <Wordmark fontSize={WORD_SIZE} spacing={spacing} />
            </Animated.View>
          </Animated.View>
        </>
      ) : null}
    </View>
  );
}

/** A warm glow from the bottom edge, at most 40% while the splash plays. */
function FloorGlow({ width, height }: { width: number; height: number }) {
  return (
    <Svg width={width} height={height}>
      <SoftEllipse cx={width / 2} cy={height} rx={width * 0.9} ry={height * 0.42} falloff={{ color: palette.glow, opacity: stoneArt.spill[0].opacity ?? 0 }} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  birch: { backgroundColor: palette.birch },
  center: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  word: { marginTop: space.s24 },
});
