import React, { memo, useEffect, useMemo } from 'react';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, G, LinearGradient, Line, Path, RadialGradient, Stop, Text as SvgText } from 'react-native-svg';
import { faces, palette } from '../theme/tokens';
import { moments } from '../theme/motion';
import { weights } from '../theme/typography';
import type { TimerFace } from '../state/look';
import { litDots } from '../state/timerRoom';
import { smoothStops } from './SoftEllipse';
import { ARC_PAD, TimerArc } from './TimerArc';

/**
 * The timer's dial in one of the three faces (spec, Paid tier, "Timer faces"):
 *
 * - `loyly`, free: the dotted ember arc (TimerArc).
 * - `coal`: direction B's ring on soot. A thin track all the way round, the
 *   heat drawn over it clockwise from the top, a hot head at the end.
 * - `brass`: direction C's clock. A brass bezel and a cream dial marked to 60
 *   minutes, an ember wedge to the target, a char minute hand at the heat time
 *   and a thin ember seconds hand.
 *
 * Every face takes the same size (`radius` to the ring, ARC_PAD around it), so
 * the room lays out the same. Static SVG, redrawn as the clock ticks.
 */
type Props = {
  face: TimerFace;
  radius: number;
  /** Heat toward the target, 0 to 1. */
  progress: number;
  /** For the brass hands: heat time so far, and the target. */
  heatMs: number;
  targetMinutes: number;
  dim?: boolean;
};

export function TimerDial({ face, radius, progress, heatMs, targetMinutes, dim = false }: Props) {
  if (face === 'loyly') return <TimerArc radius={radius} lit={litDots(progress)} dim={dim} />;
  return (
    <Dim dim={dim} size={(radius + ARC_PAD) * 2}>
      {face === 'coal' ? (
        <CoalRing radius={radius} progress={progress} />
      ) : (
        <BrassClock radius={radius} heatMs={heatMs} targetMinutes={targetMinutes} />
      )}
    </Dim>
  );
}

function Dim({ dim, size, children }: { dim: boolean; size: number; children: React.ReactNode }) {
  const fade = useSharedValue(dim ? 0.45 : 1);
  useEffect(() => {
    fade.set(withTiming(dim ? 0.45 : 1, moments.finishCool.glow));
  }, [dim, fade]);
  const style = useAnimatedStyle(() => ({ opacity: fade.value }));
  return (
    <Animated.View style={[{ width: size, height: size }, style]} pointerEvents="none" importantForAccessibility="no-hide-descendants">
      {children}
    </Animated.View>
  );
}

const headHalo = smoothStops(palette.glow, 0.7);

/** Direction B: a glowing ring on soot. */
const CoalRing = memo(function CoalRing({ radius, progress }: { radius: number; progress: number }) {
  const c = radius + ARC_PAD;
  const size = c * 2;
  const stroke = Math.max(8, radius * 0.075);
  const p = Math.min(1, Math.max(0, progress));
  const circumference = 2 * Math.PI * radius;
  const a = p * 2 * Math.PI;
  const hx = c + radius * Math.sin(a);
  const hy = c - radius * Math.cos(a);
  return (
    <Svg width={size} height={size}>
      <Defs>
        <LinearGradient id="coalRing" x1="1" y1="0" x2="0" y2="1">
          {faces.coal.ring.map((s) => (
            <Stop key={s.offset} offset={s.offset} stopColor={s.color} />
          ))}
        </LinearGradient>
        <RadialGradient id="coalHalo" cx="50%" cy="50%" r="50%">
          {headHalo.map((s) => (
            <Stop key={s.offset} offset={s.offset} stopColor={s.color} stopOpacity={s.opacity} />
          ))}
        </RadialGradient>
        <RadialGradient id="coalInner" cx="50%" cy="50%" r="50%">
          <Stop offset={0.62} stopColor={faces.coal.ring[1].color} stopOpacity={0} />
          <Stop offset={0.9} stopColor={faces.coal.ring[1].color} stopOpacity={0.14 * p} />
          <Stop offset={1} stopColor={faces.coal.ring[1].color} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      {/* The warmth the ring throws inward as it fills. */}
      <Circle cx={c} cy={c} r={radius + stroke} fill="url(#coalInner)" />
      <Circle cx={c} cy={c} r={radius} stroke={faces.coal.track} strokeWidth={stroke} fill="none" />
      {p > 0 ? (
        <Circle
          cx={c}
          cy={c}
          r={radius}
          stroke="url(#coalRing)"
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${circumference * p} ${circumference}`}
          transform={`rotate(-90 ${c} ${c})`}
        />
      ) : null}
      <Circle cx={hx} cy={hy} r={stroke * 2.2} fill="url(#coalHalo)" />
      <Circle cx={hx} cy={hy} r={stroke * 0.62} fill={faces.coal.head} />
    </Svg>
  );
});

/** Direction C: a brass clock to 60 minutes. */
const BrassClock = memo(function BrassClock({ radius, heatMs, targetMinutes }: { radius: number; heatMs: number; targetMinutes: number }) {
  const c = radius + ARC_PAD;
  const size = c * 2;
  const bezel = radius * 0.1;
  const r = radius - bezel / 2; // the dial
  const ticks = useMemo(() => Array.from({ length: 60 }, (_, i) => i), []);
  const minutes = heatMs / 60_000;
  const handA = ((minutes % 60) / 60) * 2 * Math.PI;
  const secA = (((heatMs / 1000) % 60) / 60) * 2 * Math.PI;
  const target = Math.min(60, Math.max(0, targetMinutes));
  const wedge = wedgePath(c, r * 0.94, target / 60);
  const at = (angle: number, len: number) => ({ x: c + len * Math.sin(angle), y: c - len * Math.cos(angle) });
  const hand = at(handA, r * 0.72);
  const tail = at(handA + Math.PI, r * 0.1);
  const sec = at(secA, r * 0.86);
  const secTail = at(secA + Math.PI, r * 0.16);
  const figure = Math.max(14, r * 0.17);
  return (
    <Svg width={size} height={size}>
      <Defs>
        <LinearGradient id="brassBezel" x1="0" y1="0" x2="1" y2="1">
          {faces.brass.bezel.map((s) => (
            <Stop key={s.offset} offset={s.offset} stopColor={s.color} />
          ))}
        </LinearGradient>
        <RadialGradient id="brassDial" cx="42%" cy="38%" r="70%">
          <Stop offset={0} stopColor={faces.brass.dial} />
          <Stop offset={1} stopColor={faces.brass.dialEdge} />
        </RadialGradient>
      </Defs>
      <Circle cx={c} cy={c} r={radius + bezel / 2} fill="url(#brassBezel)" />
      <Circle cx={c} cy={c} r={r} fill="url(#brassDial)" />
      {target > 0 ? <Path d={wedge} fill={faces.brass.wedge} fillOpacity={faces.brass.wedgeOpacity} /> : null}
      <G>
        {ticks.map((i) => {
          const major = i % 5 === 0;
          const a = (i / 60) * 2 * Math.PI;
          const o = at(a, r * 0.95);
          const n = at(a, r * (major ? 0.83 : 0.89));
          return (
            <Line
              key={i}
              x1={o.x}
              y1={o.y}
              x2={n.x}
              y2={n.y}
              stroke={faces.brass.ink}
              strokeOpacity={major ? 0.9 : 0.45}
              strokeWidth={major ? 2.4 : 1}
              strokeLinecap="round"
            />
          );
        })}
      </G>
      {[60, 15, 30, 45].map((m) => {
        const p = at((m / 60) * 2 * Math.PI, r * 0.66);
        return (
          <SvgText
            key={m}
            x={p.x}
            y={p.y + figure * 0.36}
            fontSize={figure}
            fontWeight={weights.semibold}
            fill={faces.brass.ink}
            textAnchor="middle"
          >
            {m}
          </SvgText>
        );
      })}
      <Line x1={tail.x} y1={tail.y} x2={hand.x} y2={hand.y} stroke={faces.brass.ink} strokeWidth={Math.max(4, r * 0.035)} strokeLinecap="round" />
      <Line x1={secTail.x} y1={secTail.y} x2={sec.x} y2={sec.y} stroke={faces.brass.wedge} strokeWidth={1.4} strokeLinecap="round" />
      <Circle cx={c} cy={c} r={Math.max(5, r * 0.045)} fill={faces.brass.pin} />
    </Svg>
  );
});

/** A pie slice from 12 o'clock clockwise, `share` of the way round. */
function wedgePath(c: number, r: number, share: number): string {
  if (share >= 1) return `M${c} ${c - r}A${r} ${r} 0 1 1 ${c - 0.01} ${c - r}Z`;
  const a = share * 2 * Math.PI;
  const x = c + r * Math.sin(a);
  const y = c - r * Math.cos(a);
  return `M${c} ${c}L${c} ${c - r}A${r} ${r} 0 ${share > 0.5 ? 1 : 0} 1 ${x} ${y}Z`;
}

/** A face's look, small, for its tile: the room's color behind the dial. */
export function faceRoom(face: TimerFace): string {
  return face === 'coal' ? faces.coal.soot : palette.char;
}

/** The numerals' color on each face. */
export function faceNumerals(face: TimerFace): string {
  return face === 'coal' ? faces.coal.numerals : palette.steam;
}
