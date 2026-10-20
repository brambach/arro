import React, { memo, useId } from 'react';
import Svg, { ClipPath, Defs, G, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { SoftEllipse } from '../SoftEllipse';
import { Stop as GradientStop, stoneArt, stoneGlow } from '../../theme/tokens';
import { stoneGeometry as g, stonePath } from './stonePath';

/**
 * The stone mark: the app icon's stone with its heat beneath, without the
 * tile or the wisps (the splash draws its own wisps). Same outline, geometry
 * and colors as assets/brand/icon.svg (scripts/brand/stone-icon.mjs); soft
 * light is radial gradients, since React Native SVG has no blur. Drawn once;
 * animate it from outside (opacity, scale).
 *
 * `width` sets the size; the height follows the view box.
 */
const VIEW = { x: -400, y: -170, w: 800, h: 420 };

function stops(list: GradientStop[]) {
  return list.map((s) => <Stop key={s.offset} offset={s.offset} stopColor={s.color} stopOpacity={s.opacity ?? 1} />);
}

export const StoneMark = memo(function StoneMark({ width }: { width: number }) {
  const id = `stone${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const height = (width * VIEW.h) / VIEW.w;
  return (
    <Svg width={width} height={height} viewBox={`${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}`}>
      <Defs>
        <RadialGradient id={`${id}body`} cx={-130} cy={-110} r={470} gradientUnits="userSpaceOnUse">
          {stops(stoneArt.body)}
        </RadialGradient>
        <LinearGradient id={`${id}under`} x1={0} y1={g.under.y0} x2={0} y2={g.under.y1} gradientUnits="userSpaceOnUse">
          {stops(stoneArt.under)}
        </LinearGradient>
        <ClipPath id={`${id}clip`}>
          <Path d={stonePath} />
        </ClipPath>
      </Defs>
      <SoftEllipse {...g.spill} falloff={stoneGlow.spill} />
      <SoftEllipse {...g.floor} falloff={stoneGlow.floor} />
      <SoftEllipse {...g.core} falloff={stoneGlow.core} />
      <Path d={stonePath} fill={`url(#${id}body)`} />
      <G clipPath={`url(#${id}clip)`}>
        <Rect x={-300} y={g.under.y0} width={600} height={160 - g.under.y0} fill={`url(#${id}under)`} />
        <SoftEllipse cx={g.core.cx} cy={g.core.cy + 4} rx={g.core.rx + 30} ry={22} falloff={stoneGlow.rim} />
        <SoftEllipse {...g.sheen} rx={g.sheen.rx * 1.3} ry={g.sheen.ry * 1.6} falloff={stoneGlow.sheen} />
      </G>
    </Svg>
  );
});
