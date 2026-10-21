import React, { forwardRef, memo, useImperativeHandle, useMemo, useRef } from 'react';
import { PixelRatio, StyleSheet, View } from 'react-native';
import Svg, { Circle, ClipPath, Defs, G, LinearGradient, Path, Rect, Stop, Text as SvgText } from 'react-native-svg';
import { alpha, faces, frozenFinish, palette, WoodFinish, WoodName, woods } from '../theme/tokens';
import { fonts } from '../theme/typography';
import { grain, wallLines } from './material';
import { posterLayout, PosterWeek } from './posterLayout';

/**
 * The wall poster (spec, Paid tier): every week the family has kept, with its
 * name and dates, print-ready at 1800 x 2400 pixels (6 x 8 inches at 300 dpi).
 * Weeks run down in columns of 13, a quarter each, oldest at the top left. A
 * kept week is ember in the family's wood, a frozen one lake, an open one
 * plain wood. A Founding family gets its brass nail on the first slat.
 *
 * `width` is how wide it shows on screen. `toPng` renders a hidden copy at the
 * full size (react-native-svg's toDataURL, as the milestone image does).
 */
export type PosterHandle = { toPng: () => Promise<string> };

type Props = {
  weeks: PosterWeek[];
  wood: WoodName;
  familyName: string;
  /** "Mar 2, 2026 to Oct 19, 2026" */
  dates: string;
  /** "37 weeks kept, together" */
  summary: string;
  nail: boolean;
  width: number;
};

export const POSTER_W = 1800;
export const POSTER_H = 2400;

export const WallPoster = forwardRef<PosterHandle, Props>(function WallPoster(props, ref) {
  const full = useRef<Svg>(null);
  useImperativeHandle(ref, () => ({
    toPng: () =>
      new Promise<string>((resolve, reject) => {
        const s = full.current;
        if (!s) {
          reject(new Error('The poster isn’t ready'));
          return;
        }
        s.toDataURL((b64: string) => resolve(b64));
      }),
  }));
  const shown = props.width;
  return (
    <View>
      <PosterArt {...props} width={shown} height={(shown * POSTER_H) / POSTER_W} />
      <View style={styles.hidden} pointerEvents="none" importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        <PosterArt {...props} svgRef={full} width={POSTER_W / PixelRatio.get()} height={POSTER_H / PixelRatio.get()} />
      </View>
    </View>
  );
});

const PosterArt = memo(function PosterArt({
  weeks,
  wood,
  familyName,
  dates,
  summary,
  nail,
  width,
  height,
  svgRef,
}: Props & { height: number; svgRef?: React.Ref<Svg> }) {
  const layout = useMemo(() => posterLayout(weeks.length, POSTER_W, POSTER_H), [weeks.length]);
  const w = woods[wood];
  const finishes: { id: string; f: WoodFinish }[] = [
    { id: 'kept', f: w.kept },
    { id: 'open', f: w.open },
    { id: 'frozen', f: frozenFinish },
  ];
  const first = layout.slots[0];
  return (
    <Svg ref={svgRef} width={width} height={height} viewBox={`0 0 ${POSTER_W} ${POSTER_H}`}>
      <Defs>
        {finishes.map(({ id, f }) => (
          <LinearGradient key={id} id={`poster-${id}`} x1="0" y1="0" x2="0" y2="1">
            {f.stops.map((s) => (
              <Stop key={s.offset} offset={s.offset} stopColor={s.color} />
            ))}
          </LinearGradient>
        ))}
      </Defs>
      <Rect x={0} y={0} width={POSTER_W} height={POSTER_H} fill={palette.birch} />
      {wallLines(POSTER_W, 5, 120).map((x) => (
        <Rect key={x} x={x} y={0} width={4} height={POSTER_H} fill={alpha.wallLine} />
      ))}
      <SvgText x={POSTER_W / 2} y={250} textAnchor="middle" fontFamily={fonts.displaySemibold} fontSize={layout.titleSize(familyName.length)} fill={palette.char}>
        {familyName}
      </SvgText>
      <SvgText x={POSTER_W / 2} y={340} textAnchor="middle" fontSize={52} fill={palette.smoke}>
        {dates}
      </SvgText>
      {weeks.map((wk, i) => {
        const slot = layout.slots[i];
        const f = wk === 'kept' ? w.kept : wk === 'frozen' ? frozenFinish : w.open;
        const fill = wk === 'kept' ? 'url(#poster-kept)' : wk === 'frozen' ? 'url(#poster-frozen)' : 'url(#poster-open)';
        const g = wk === 'paused' ? null : grain(slot.w, slot.h, 40 + i, 3, wk !== 'frozen');
        return (
          <G key={i}>
            <Defs>
              <ClipPath id={`ps${i}`}>
                <Rect x={slot.x} y={slot.y} width={slot.w} height={slot.h} rx={slot.h * 0.28} />
              </ClipPath>
            </Defs>
            <Rect x={slot.x} y={slot.y} width={slot.w} height={slot.h} rx={slot.h * 0.28} fill={fill} />
            {g ? (
              <G clipPath={`url(#ps${i})`}>
                {g.lines.map((l, li) => (
                  <Path
                    key={li}
                    d={l.d}
                    transform={`translate(${slot.x} ${slot.y})`}
                    stroke={f.grain}
                    strokeOpacity={f.grainOpacity * l.opacity}
                    strokeWidth={l.width * 2}
                    fill="none"
                  />
                ))}
              </G>
            ) : null}
          </G>
        );
      })}
      {nail && first ? (
        <G>
          <Circle cx={first.x + first.h * 0.6} cy={first.y + first.h / 2} r={first.h * 0.2} fill={faces.brass.bezel[2].color} />
          <Circle cx={first.x + first.h * 0.6} cy={first.y + first.h / 2} r={first.h * 0.15} fill={faces.brass.bezel[0].color} />
        </G>
      ) : null}
      <SvgText x={POSTER_W / 2} y={POSTER_H - 260} textAnchor="middle" fontFamily={fonts.display} fontSize={64} fill={palette.coal}>
        {summary}
      </SvgText>
      <SvgText x={POSTER_W / 2} y={POSTER_H - 150} textAnchor="middle" fontFamily={fonts.display} fontSize={48} fill={palette.stone}>
        saunafam
      </SvgText>
    </Svg>
  );
});

const styles = StyleSheet.create({
  hidden: { position: 'absolute', left: 0, top: 0, opacity: 0 },
});
