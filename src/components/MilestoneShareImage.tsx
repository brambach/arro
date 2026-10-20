import React, { forwardRef, useImperativeHandle, useRef } from "react";
import { PixelRatio, StyleSheet, View } from "react-native";
import Svg, {
  ClipPath,
  Defs,
  G,
  LinearGradient,
  Path,
  Rect,
  Stop,
  Text as SvgText,
} from "react-native-svg";
import { alpha, palette, woods } from "../theme/tokens";
import { fonts } from "../theme/typography";
import { grain, wallLines } from "./material";
import { milestoneColumns, SLATS_PER_COLUMN } from "./milestoneLayout";

/**
 * The milestone's share image, 1080 x 1350 (4:5, what Instagram and iMessage
 * show uncropped): birch, the wall of ember slats, the number in big Fraunces,
 * the title, the family's name and the saunafam wordmark. Drawn as SVG and
 * rasterized with react-native-svg's toDataURL, so it needs no native module
 * beyond the one the app already has. It's mounted invisible, at the size in
 * points that comes out at 1080 x 1350 pixels on this screen.
 */
export type ShareImageHandle = { toPng: () => Promise<string> };

type Props = { weeks: number; title: string; familyName: string };

const W = 1080;
const H = 1350;

export const MilestoneShareImage = forwardRef<ShareImageHandle, Props>(
  function MilestoneShareImage({ weeks, title, familyName }, ref) {
    const svg = useRef<Svg>(null);
    useImperativeHandle(ref, () => ({
      toPng: () =>
        new Promise<string>((resolve, reject) => {
          const s = svg.current;
          if (!s) {
            reject(new Error("The share image isn’t ready"));
            return;
          }
          // toDataURL renders the view at the screen's scale, so the view is sized to come out at exactly W x H pixels.
          s.toDataURL((b64: string) => resolve(b64));
        }),
    }));

    const cols = milestoneColumns(weeks);
    const slatH = weeks > SLATS_PER_COLUMN ? 34 : 46;
    const gap = 10;
    const bench = 26;
    const colW = cols.length === 1 ? 560 : cols.length === 2 ? 380 : 196;
    const colGap = 28;
    const wallW = cols.length * colW + (cols.length - 1) * colGap;
    const left = (W - wallW) / 2;
    const floor = 800;
    const kept = woods.birch.kept;

    return (
      <View
        style={styles.hidden}
        pointerEvents="none"
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
      >
        <Svg
          ref={svg}
          width={W / PixelRatio.get()}
          height={H / PixelRatio.get()}
          viewBox={`0 0 ${W} ${H}`}
        >
          <Defs>
            <LinearGradient id="kept" x1="0" y1="0" x2="0" y2="1">
              {kept.stops.map((s) => (
                <Stop key={s.offset} offset={s.offset} stopColor={s.color} />
              ))}
            </LinearGradient>
          </Defs>
          <Rect x={0} y={0} width={W} height={H} fill={palette.birch} />
          {/* The sauna wall behind, as on every screen. */}
          {wallLines(W, 7, 84).map((x) => (
            <Rect
              key={x}
              x={x}
              y={0}
              width={3}
              height={H}
              fill={alpha.wallLine}
            />
          ))}
          {cols.map((c, ci) => (
            <G key={ci}>
              {Array.from({ length: c.slats }, (_, i) => {
                const benches = Math.floor(i / 4);
                const y = floor - (i + 1) * slatH - i * gap - benches * bench;
                const x = left + ci * (colW + colGap);
                const g = grain(colW, slatH, 40 + c.startIndex + i, 4, false);
                return (
                  <G key={i}>
                    <Defs>
                      <ClipPath id={`slat${ci}-${i}`}>
                        <Rect
                          x={x}
                          y={y}
                          width={colW}
                          height={slatH}
                          rx={slatH * 0.3}
                        />
                      </ClipPath>
                    </Defs>
                    <Rect
                      x={x}
                      y={y}
                      width={colW}
                      height={slatH}
                      rx={slatH * 0.3}
                      fill="url(#kept)"
                    />
                    <G clipPath={`url(#slat${ci}-${i})`}>
                      {g.lines.map((l, li) => (
                        <Path
                          key={li}
                          d={l.d}
                          transform={`translate(${x} ${y})`}
                          stroke={kept.grain}
                          strokeOpacity={kept.grainOpacity * l.opacity}
                          strokeWidth={l.width * 2}
                          fill="none"
                        />
                      ))}
                    </G>
                  </G>
                );
              })}
            </G>
          ))}
          <SvgText
            x={W / 2}
            y={1000}
            textAnchor="middle"
            fontFamily={fonts.displaySemibold}
            fontSize={200}
            fill={palette.coal}
          >
            {String(weeks)}
          </SvgText>
          <SvgText
            x={W / 2}
            y={1090}
            textAnchor="middle"
            fontFamily={fonts.display}
            fontSize={64}
            fill={palette.char}
          >
            {title.replace(/^\d+\s/, "")}
          </SvgText>
          <SvgText
            x={W / 2}
            y={1156}
            textAnchor="middle"
            fontSize={38}
            fill={palette.smoke}
          >
            {familyName}
          </SvgText>
          <SvgText
            x={W / 2}
            y={1270}
            textAnchor="middle"
            fontFamily={fonts.display}
            fontSize={34}
            fill={palette.stone}
          >
            saunafam
          </SvgText>
        </Svg>
      </View>
    );
  },
);

const styles = StyleSheet.create({
  // On screen (so iOS lays it out) but invisible and out of the way.
  hidden: { position: "absolute", left: 0, bottom: 0, opacity: 0 },
});
