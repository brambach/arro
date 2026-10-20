import React, { memo, useEffect, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { smoothStops } from './SoftEllipse';
import { gradients, palette } from '../theme/tokens';
import { moments, timing, useReduceMotion } from '../theme/motion';
import { ARC_DOTS, dotAngle, isMajorDot } from '../state/timerRoom';

/**
 * The timer's progress: a dotted ember arc, open at the bottom (the mockup's
 * 61 dots over 300 degrees, a bigger dot every 20th). Lit dots are hot ember
 * with a soft blurred glow around them; the rest are faint steam dents.
 *
 * `lit` is how many dots are lit from the start (src/state/timerRoom.ts
 * litDots). The newest lit dot ignites with the ember overshoot when it turns
 * on; with Reduce Motion it fades in. `dim` lowers the whole arc while cooling off.
 *
 * Static SVG, redrawn only when a dot lights (every 15 s at a 15 minute target).
 */
type Props = {
  /** Ring radius to the dots' centers. The mockup's is 176 on a 440 wide screen. */
  radius: number;
  lit: number;
  dim?: boolean;
};

/** Dot radii from the mockup, at its 176 pt ring. */
const DOT = 2.6;
const MAJOR = 4.2;
const MOCK_RADIUS = 176;
/**
 * Each lit dot's halo: the mockup blurs a glow-colored disc 2.2 pt wider than
 * the dot (2.4 pt blur). An SVG blur took about 200 ms to draw the first time,
 * enough to hold up the door, so the halo is a radial gradient over the same
 * reach instead.
 */
const HALO = 7.5;
const haloStops = smoothStops(palette.glow, 0.62);
/** Room around the ring for the glow. */
const PAD = 14;
/** The space around the ring inside the arc's box. */
export const ARC_PAD = PAD;

type Dot = { x: number; y: number; r: number; major: boolean };

function layoutDots(radius: number): Dot[] {
  const k = radius / MOCK_RADIUS;
  const c = radius + PAD;
  return Array.from({ length: ARC_DOTS }, (_, i) => {
    const a = dotAngle(i);
    const major = isMajorDot(i);
    return { x: c + radius * Math.sin(a), y: c - radius * Math.cos(a), r: (major ? MAJOR : DOT) * Math.max(0.8, k), major };
  });
}

export function TimerArc({ radius, lit, dim = false }: Props) {
  const size = (radius + PAD) * 2;
  const dots = useMemo(() => layoutDots(radius), [radius]);
  const shown = Math.max(0, Math.min(ARC_DOTS, lit));
  const fade = useSharedValue(dim ? 0.45 : 1);
  useEffect(() => {
    fade.set(withTiming(dim ? 0.45 : 1, moments.finishCool.glow));
  }, [dim, fade]);
  const style = useAnimatedStyle(() => ({ opacity: fade.value }));
  const lead = shown > 0 ? dots[shown - 1] : null;
  // The dot lit when the room opens just shows; later ones ignite as they light.
  const [firstLit] = React.useState(shown);

  return (
    <Animated.View
      style={[{ width: size, height: size }, style]}
      pointerEvents="none"
      importantForAccessibility="no-hide-descendants"
    >
      <ArcArt dots={dots} size={size} lit={shown - 1} />
      {lead ? <LeadDot key={shown} dot={lead} ignite={shown !== firstLit} /> : null}
    </Animated.View>
  );
}

/** Every dot but the newest lit one, which LeadDot draws. */
const ArcArt = memo(function ArcArt({ dots, size, lit }: { dots: Dot[]; size: number; lit: number }) {
  return (
    <Svg width={size} height={size}>
      <Defs>
        <RadialGradient id="arcDot" cx="40%" cy="35%" r="60%">
          {gradients.arcDot.map((s) => (
            <Stop key={s.offset} offset={s.offset} stopColor={s.color} />
          ))}
        </RadialGradient>
        <RadialGradient id="arcHalo" cx="50%" cy="50%" r="50%">
          {haloStops.map((st) => (
            <Stop key={st.offset} offset={st.offset} stopColor={st.color} stopOpacity={st.opacity} />
          ))}
        </RadialGradient>
      </Defs>
      {dots.slice(0, lit).map((d, i) => (
        <Circle key={`h${i}`} cx={d.x} cy={d.y} r={d.r + HALO} fill="url(#arcHalo)" />
      ))}
      {dots.map((d, i) =>
        i < lit ? (
          <Circle key={i} cx={d.x} cy={d.y} r={d.r} fill="url(#arcDot)" />
        ) : i === lit ? null : (
          <Circle key={i} cx={d.x} cy={d.y} r={d.r - 0.4} fill={palette.steam} opacity={0.2} />
        ),
      )}
    </Svg>
  );
});

/** The newest lit dot, in its own layer so it can ignite without redrawing the arc. */
function LeadDot({ dot, ignite }: { dot: Dot; ignite: boolean }) {
  const reduceMotion = useReduceMotion();
  const box = (dot.r + HALO) * 2;
  const s = useSharedValue(ignite && reduceMotion === false ? moments.checkInIgnite.fromScale : 1);
  const o = useSharedValue(ignite ? 0 : 1);
  useEffect(() => {
    if (!ignite) return;
    o.set(withTiming(1, timing.utility));
    if (reduceMotion === false) s.set(withTiming(1, moments.checkInIgnite));
    // Plays once per mount (each newly lit dot is a new mount).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const style = useAnimatedStyle(() => ({ opacity: o.value, transform: [{ scale: s.value }] }));
  return (
    <Animated.View style={[styles.lead, { left: dot.x - box / 2, top: dot.y - box / 2, width: box, height: box }, style]}>
      <Svg width={box} height={box}>
        <Defs>
          <RadialGradient id="leadDot" cx="40%" cy="35%" r="60%">
            {gradients.arcDot.map((st) => (
              <Stop key={st.offset} offset={st.offset} stopColor={st.color} />
            ))}
          </RadialGradient>
          <RadialGradient id="leadHalo" cx="50%" cy="50%" r="50%">
            {haloStops.map((st) => (
              <Stop key={st.offset} offset={st.offset} stopColor={st.color} stopOpacity={st.opacity} />
            ))}
          </RadialGradient>
        </Defs>
        <Circle cx={box / 2} cy={box / 2} r={dot.r + HALO} fill="url(#leadHalo)" />
        <Circle cx={box / 2} cy={box / 2} r={dot.r} fill="url(#leadDot)" />
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  lead: { position: 'absolute' },
});
