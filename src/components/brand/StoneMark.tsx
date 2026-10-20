import React, { memo, useId } from 'react';
import Svg, { ClipPath, Defs, Ellipse, G, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { Stop as GradientStop, stoneArt } from '../../theme/tokens';
import { stonePath } from './stonePath';

/**
 * The stone mark: the app icon's stone with its heat beneath, without the
 * tile or the wisps (the splash draws its own wisps). Same outline and colors
 * as assets/brand/icon.svg; soft light is radial gradients, since React
 * Native SVG has no blur. Drawn once; animate it from outside (opacity, scale).
 *
 * `width` sets the size; the height follows (VIEW_W x VIEW_H).
 */
const VIEW_X = 150;
const VIEW_Y = 400;
export const STONE_VIEW_W = 730;
export const STONE_VIEW_H = 470;

function stops(list: GradientStop[]) {
  return list.map((s) => <Stop key={s.offset} offset={s.offset} stopColor={s.color} stopOpacity={s.opacity ?? 1} />);
}

export const StoneMark = memo(function StoneMark({ width }: { width: number }) {
  const id = `stone${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const height = (width * STONE_VIEW_H) / STONE_VIEW_W;
  return (
    <Svg width={width} height={height} viewBox={`${VIEW_X} ${VIEW_Y} ${STONE_VIEW_W} ${STONE_VIEW_H}`}>
      <Defs>
        <RadialGradient id={`${id}spill`} cx="50%" cy="50%" r="50%">
          {stops(stoneArt.spill)}
        </RadialGradient>
        <RadialGradient id={`${id}glow`} cx="50%" cy="50%" r="50%">
          {stops(stoneArt.glow)}
        </RadialGradient>
        <RadialGradient id={`${id}core`} cx="50%" cy="50%" r="50%">
          {stops(stoneArt.core)}
        </RadialGradient>
        <RadialGradient id={`${id}body`} cx={420} cy={486} r={430} gradientUnits="userSpaceOnUse">
          {stops(stoneArt.body)}
        </RadialGradient>
        <LinearGradient id={`${id}under`} x1={0} y1={600} x2={0} y2={752} gradientUnits="userSpaceOnUse">
          {stops(stoneArt.under)}
        </LinearGradient>
        <RadialGradient id={`${id}sheen`} cx="50%" cy="50%" r="50%">
          {stops(stoneArt.sheen)}
        </RadialGradient>
        <ClipPath id={`${id}clip`}>
          <Path d={stonePath} />
        </ClipPath>
      </Defs>
      <Ellipse cx={516} cy={640} rx={360} ry={190} fill={`url(#${id}spill)`} />
      <Ellipse cx={520} cy={744} rx={360} ry={106} fill={`url(#${id}glow)`} />
      <Ellipse cx={516} cy={744} rx={250} ry={34} fill={`url(#${id}core)`} />
      <Path d={stonePath} fill={`url(#${id}body)`} />
      <G clipPath={`url(#${id}clip)`}>
        <Rect x={200} y={540} width={640} height={230} fill={`url(#${id}under)`} />
        <Ellipse cx={452} cy={512} rx={230} ry={84} fill={`url(#${id}sheen)`} />
      </G>
    </Svg>
  );
});
