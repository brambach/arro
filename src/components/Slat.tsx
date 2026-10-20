import React, { memo, useEffect, useId, useMemo, useState } from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { frost as frostColor, frozenFinish, palette, radii, space, WoodFinish, WoodName, woods } from '../theme/tokens';
import { moments, timing, useReduceMotion } from '../theme/motion';
import { type } from '../theme/typography';
import { EmberDots } from './EmberDots';
import { frost, grain } from './material';

/**
 * One week, as a wooden slat (Direction A, "the wall").
 *
 * | state     | look                                          |
 * |-----------|-----------------------------------------------|
 * | `kept`    | ember, with a faint light grain               |
 * | `frozen`  | lake, with frost stipple                      |
 * | `paused`  | plain aspen, no grain                         |
 * | `current` | aspen with grain, ember dots inside for days  |
 * | `open`    | aspen with grain (an empty tray, a past week) |
 *
 * `wood` picks the material (birch is free; cedar, alder and charred pine are
 * Plus). A kept week is ember-stained in every wood.
 *
 * Motion: when a slat goes from `current` to `kept` on screen, ember fills it
 * from the left edge to the right (`moments.weekKept.fill`) and `onFilled`
 * fires when it's full, for the week-kept haptic and sparks. When `wood`
 * changes, the new wood crossfades in over 400 ms after `woodDelay`.
 */
export type SlatState = 'kept' | 'frozen' | 'paused' | 'current' | 'open';

type Props = {
  state: SlatState;
  wood?: WoodName;
  /** 21 on the wall, 54 on Today's card. */
  height?: number;
  /** Changes the grain. Use the week's index so a slat keeps its grain. */
  seed?: number;
  /** For `current`: days counted and the week's target. */
  dots?: { filled: number; count: number };
  /** Small caps on the right ("Week 8"). */
  label?: string;
  onFilled?: () => void;
  onIgnitePeak?: () => void;
  /** Delay before a wood change crossfades in, for the one-at-a-time sweep. */
  woodDelay?: number;
  style?: StyleProp<ViewStyle>;
};

/** Grain is drawn in a fixed box and stretched to the slat's width. */
const VB_W = 300;

export function Slat({
  state,
  wood = 'birch',
  height = 21,
  seed = 1,
  dots,
  label,
  onFilled,
  onIgnitePeak,
  woodDelay = 0,
  style,
}: Props) {
  // Remember what the slat looked like before a change, during render, so the
  // first frame of a transition already has the old look underneath.
  const [shown, setShown] = useState({ state, wood, prevState: state, prevWood: wood });
  if (shown.state !== state || shown.wood !== wood) {
    setShown({ state, wood, prevState: shown.state, prevWood: shown.wood });
  }

  const big = height >= 40;
  const radius = big ? radii.slat : radii.slatSmall;
  const filling = state === 'kept' && shown.prevState !== 'kept';
  const woodChanged = shown.prevWood !== wood;

  return (
    <View
      style={[styles.slat, { height, borderRadius: radius }, style]}
      accessible
      accessibilityLabel={describe(state, dots, label)}
    >
      {/* What was there before, underneath the change. */}
      {filling || woodChanged ? (
        <Finish state={filling ? shown.prevState : state} wood={shown.prevWood} height={height} seed={seed} />
      ) : null}
      {filling ? (
        <KeptFill wood={wood} height={height} seed={seed} onFilled={onFilled} />
      ) : (
        <FadeLayer key={wood} fadeIn={woodChanged} delay={woodDelay}>
          <Finish state={state} wood={wood} height={height} seed={seed} />
        </FadeLayer>
      )}
      <View
        style={[StyleSheet.absoluteFill, { borderRadius: radius, boxShadow: rim(state, wood) }]}
        pointerEvents="none"
      />
      {state === 'current' && dots ? (
        <View style={[styles.inside, { paddingLeft: big ? space.s24 : space.s12 }]} pointerEvents="none">
          <EmberDots
            count={dots.count}
            filled={dots.filled}
            size={big ? 'large' : 'small'}
            onIgnitePeak={onIgnitePeak}
          />
        </View>
      ) : null}
      {label && big ? (
        <View style={[styles.inside, styles.labelWrap]} pointerEvents="none">
          <Text style={[type.caption, styles.label]}>{label}</Text>
        </View>
      ) : null}
    </View>
  );
}

function describe(state: SlatState, dots?: { filled: number; count: number }, label?: string) {
  const what =
    state === 'kept'
      ? 'kept'
      : state === 'frozen'
        ? 'a freeze was used'
        : state === 'paused'
          ? 'paused'
          : state === 'current' && dots
            ? `${dots.filled} of ${dots.count} so far`
            : 'not kept';
  return label ? `${label}, ${what}` : `Week, ${what}`;
}

function finishOf(state: SlatState, wood: WoodName): WoodFinish {
  if (state === 'frozen') return frozenFinish;
  return state === 'kept' ? woods[wood].kept : woods[wood].open;
}

function rim(state: SlatState, wood: WoodName) {
  const f = finishOf(state, wood);
  return `inset 0px 1px 0px 0px ${f.rimTop}, inset 0px -1px 0px 0px ${f.rimBottom}`;
}

/** The wood itself: gradient, grain, a knot, frost for a frozen week. Drawn once per look. */
const Finish = memo(function Finish({ state, wood, height, seed }: { state: SlatState; wood: WoodName; height: number; seed: number }) {
  const id = `slat${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const f = finishOf(state, wood);
  const art = useMemo(() => {
    const lines = height >= 40 ? 7 : 4;
    return {
      grain: state === 'paused' ? null : grain(VB_W, height, 40 + seed, lines, state !== 'frozen'),
      frost: state === 'frozen' ? frost(VB_W, height, 99 + seed, Math.round((70 * height) / 21)) : null,
    };
  }, [state, height, seed]);

  return (
    <Svg width="100%" height={height} viewBox={`0 0 ${VB_W} ${height}`} preserveAspectRatio="none" style={StyleSheet.absoluteFill}>
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          {f.stops.map((s) => (
            <Stop key={s.offset} offset={s.offset} stopColor={s.color} />
          ))}
        </LinearGradient>
      </Defs>
      <Rect x={0} y={0} width={VB_W} height={height} fill={`url(#${id})`} />
      {art.grain ? (
        <G>
          {art.grain.lines.map((l, i) => (
            <Path
              key={i}
              d={l.d}
              stroke={f.grain}
              strokeOpacity={f.grainOpacity * l.opacity}
              strokeWidth={l.width}
              fill="none"
              vectorEffect="non-scaling-stroke"
            />
          ))}
          {art.grain.knot ? (
            <>
              <Ellipse
                cx={art.grain.knot.cx}
                cy={art.grain.knot.cy}
                rx={art.grain.knot.rx}
                ry={art.grain.knot.ry}
                stroke={f.grain}
                strokeOpacity={f.grainOpacity * 1.2}
                strokeWidth={0.7}
                fill="none"
                vectorEffect="non-scaling-stroke"
              />
              <Ellipse
                cx={art.grain.knot.cx}
                cy={art.grain.knot.cy}
                rx={art.grain.knot.coreRx}
                ry={0.8}
                fill={f.grain}
                fillOpacity={f.grainOpacity * 0.9}
              />
            </>
          ) : null}
        </G>
      ) : null}
      {art.frost
        ? art.frost.map((d, i) => <Circle key={i} cx={d.cx} cy={d.cy} r={d.r} fill={frostColor} fillOpacity={d.opacity} />)
        : null}
    </Svg>
  );
});

/** A layer that crossfades in when it replaces another look; still otherwise. */
function FadeLayer({ children, fadeIn, delay }: { children: React.ReactNode; fadeIn: boolean; delay: number }) {
  const reduceMotion = useReduceMotion();
  const o = useSharedValue(fadeIn ? 0 : 1);
  useEffect(() => {
    if (!fadeIn) return;
    const { duration, easing } = moments.plusWoodCrossfade;
    o.set(withDelay(reduceMotion ? 0 : delay, withTiming(1, { duration, easing })));
  }, [fadeIn, delay, reduceMotion, o]);
  const s = useAnimatedStyle(() => ({ opacity: o.value }));
  return <Animated.View style={[StyleSheet.absoluteFill, s]}>{children}</Animated.View>;
}

/** Ember filling the slat from the left edge: the week was kept, together. */
function KeptFill({ wood, height, seed, onFilled }: { wood: WoodName; height: number; seed: number; onFilled?: () => void }) {
  const reduceMotion = useReduceMotion();
  const p = useSharedValue(0);
  useEffect(() => {
    const done = (finished?: boolean) => {
      'worklet';
      if (finished && onFilled) scheduleOnRN(onFilled);
    };
    p.set(reduceMotion ? withTiming(1, timing.utility, done) : withTiming(1, moments.weekKept.fill, done));
    // Plays once, when the slat turns kept. A new onFilled mustn't replay it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const s = useAnimatedStyle(() =>
    reduceMotion ? { opacity: p.value } : { transform: [{ scaleX: Math.max(0.0001, p.value) }] },
  );
  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.fromLeft, s]}>
      <Finish state="kept" wood={wood} height={height} seed={seed} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  slat: { overflow: 'hidden', backgroundColor: palette.aspen },
  inside: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, flexDirection: 'row', alignItems: 'center' },
  labelWrap: { justifyContent: 'flex-end', paddingRight: space.s20 },
  // On aspen, small caps take smoke: stone is under 4.5:1 there (check-contrast).
  label: { color: palette.smoke },
  fromLeft: { transformOrigin: 'left' },
});
