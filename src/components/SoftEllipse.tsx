import React, { useId } from 'react';
import { Circle, Defs, G, RadialGradient, Stop } from 'react-native-svg';
import { Stop as GradientStop } from '../theme/tokens';

/**
 * A soft elliptical glow: a radial gradient from the center to the edge of an
 * ellipse. React Native SVG on iOS doesn't stretch an objectBoundingBox radial
 * gradient to a non-square shape (it draws a circle and leaves a hard edge), so
 * this draws a unit circle and scales the whole group to the ellipse. Put it
 * inside an <Svg>.
 */
type Props = {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  /** Explicit stops, center to edge. */
  stops?: GradientStop[];
  /** Or one color fading smoothly from `opacity` at the center to nothing at `reach` (0 to 1). */
  falloff?: { color: string; opacity: number; reach?: number };
  opacity?: number;
};

/**
 * Stops for a smooth fade: opacity follows (1 - t)^2, sampled finely, so there's
 * no visible ring where a two-stop gradient changes slope.
 */
export function smoothStops(color: string, peak: number, reach = 1): GradientStop[] {
  const n = 10;
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n;
    return { offset: t * reach, color, opacity: peak * (1 - t) * (1 - t) };
  });
}

export function SoftEllipse({ cx, cy, rx, ry, stops: given, falloff, opacity }: Props) {
  const stops = given ?? (falloff ? smoothStops(falloff.color, falloff.opacity, falloff.reach) : []);
  const id = `soft${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <>
      <Defs>
        <RadialGradient id={id} cx={0} cy={0} r={1} gradientUnits="userSpaceOnUse">
          {stops.map((s) => (
            <Stop key={s.offset} offset={s.offset} stopColor={s.color} stopOpacity={s.opacity ?? 1} />
          ))}
        </RadialGradient>
      </Defs>
      <G transform={`translate(${cx} ${cy}) scale(${rx} ${ry})`} opacity={opacity}>
        <Circle cx={0} cy={0} r={1} fill={`url(#${id})`} />
      </G>
    </>
  );
}
