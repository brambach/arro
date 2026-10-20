import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { palette } from '../theme/tokens';

/**
 * Saunafam's icons: drawn for this app, no stock set. One 24 pt grid, one
 * stroke (1.75 at 24 pt, round caps and joins), so they sit together. They
 * scale by `size`: the tab bar draws them at 28, rows at 24, buttons at 22.
 *
 *   <Icon name="stone" />
 *   <Icon name="ladle" size={22} color={palette.steam} />
 *
 * Shapes with a fill (`heartFilled`, the stone's body in `stoneFilled`) use the
 * same color as their stroke.
 */
export const STROKE = 1.75;

type Part =
  | { kind: 'path'; d: string; fill?: boolean }
  | { kind: 'circle'; cx: number; cy: number; r: number; fill?: boolean }
  | { kind: 'rect'; x: number; y: number; w: number; h: number; r: number; fill?: boolean };

const p = (d: string, fill?: boolean): Part => ({ kind: 'path', d, fill });
const c = (cx: number, cy: number, r: number, fill?: boolean): Part => ({ kind: 'circle', cx, cy, r, fill });
const rect = (x: number, y: number, w: number, h: number, r: number, fill?: boolean): Part => ({ kind: 'rect', x, y, w, h, r, fill });

/** A soft-toothed gear, drawn from polar points so the teeth are even. */
function gearPath(cx: number, cy: number, outer: number, inner: number, teeth: number): string {
  const pts: string[] = [];
  const step = (Math.PI * 2) / teeth;
  for (let i = 0; i < teeth; i++) {
    const a = i * step - Math.PI / 2;
    const corners = [
      [a - step * 0.3, inner],
      [a - step * 0.16, outer],
      [a + step * 0.16, outer],
      [a + step * 0.3, inner],
    ] as const;
    for (const [ang, r] of corners) pts.push(`${(cx + Math.cos(ang) * r).toFixed(2)} ${(cy + Math.sin(ang) * r).toFixed(2)}`);
  }
  return `M${pts.join('L')}Z`;
}

/** The river stone: domed on top, a little flatter underneath, heavier to the right. */
const STONE = 'M3.6 15.1c0-3.4 3.7-6.1 8.6-6.1 4.9 0 8.3 2.4 8.3 5.6 0 2.9-3.4 4.5-8.2 4.5-4.9 0-8.7-1.3-8.7-4z';

export const icons = {
  // Tabs
  /** Today: a stone with steam rising. */
  today: [
    p('M4.2 17.4c0-2.6 3.4-4.5 7.8-4.5 4.5 0 7.8 1.8 7.8 4.3 0 2-3.3 3.2-7.7 3.2-4.6 0-7.9-1-7.9-3z'),
    p('M9.4 10.2c-1.1-1.3 1.1-2.4 0-3.9'),
    p('M14.4 10.2c-1.1-1.3 1.1-2.4 0-3.9'),
  ],
  /** Week: three slats, the bottom one a little lower and wider, like a bench. */
  week: [rect(4.5, 4.6, 15, 3.6, 1.2), rect(4.5, 10, 15, 3.6, 1.2), rect(3.5, 16, 17, 3.6, 1.2)],
  /** Feed: a speech bubble. */
  feed: [
    p('M4.6 7.4a2.6 2.6 0 0 1 2.6-2.6h9.6a2.6 2.6 0 0 1 2.6 2.6v5.9a2.6 2.6 0 0 1-2.6 2.6h-5.2l-3.9 3.1v-3.1h-.5a2.6 2.6 0 0 1-2.6-2.6z'),
  ],
  /** Me: a person. */
  me: [c(12, 8.6, 3.6), p('M5.6 19.4c1-3.1 3.6-4.7 6.4-4.7s5.4 1.6 6.4 4.7')],

  // Sauna types (the log form's tiles)
  /** Traditional: the kiuas, a stove with stones on top and steam. */
  traditional: [
    p('M5.5 12.6h13v6.4a1.4 1.4 0 0 1-1.4 1.4H6.9a1.4 1.4 0 0 1-1.4-1.4z'),
    p('M5.5 12.6c0-1.5 1.1-2.5 2.6-2.5.9 0 1.7.4 2.1 1 .5-.9 1.4-1.4 2.5-1.4 1.2 0 2.1.6 2.6 1.5.4-.3.9-.5 1.4-.5 1 0 1.8.8 1.8 1.9'),
    p('M9.5 16.6h5'),
    p('M12 7.4c-.9-1.1.9-2 0-3.2'),
  ],
  /** Wood-fired: a flame over crossed logs. */
  woodFired: [
    p('M12 15.4c-2.3 0-3.7-1.5-3.7-3.4 0-2.5 2.3-3.4 2.5-6.2 1.6 1 2.2 2.4 2.2 3.4.6-.4 1-1.1 1-2 1.3 1.2 1.7 2.9 1.7 4.5 0 2.1-1.4 3.7-3.7 3.7z'),
    p('M4.5 20l15-3'),
    p('M4.5 17l15 3'),
  ],
  /** Infrared: a heat panel, warmth radiating. */
  infrared: [rect(4, 4.5, 5.5, 15, 1.4), p('M13 9c1.1 1.6 1.1 4.4 0 6'), p('M16.2 7c1.9 2.8 1.9 7.2 0 10'), p('M19.4 5.1c2.6 3.9 2.6 9.9 0 13.8')],
  /** Steam room: wisps rising off a bench. */
  steam: [
    p('M4 19.5h16'),
    p('M8.2 15.8c-1.4-1.6 1.4-3 0-4.9s1.4-3.3 0-5.1'),
    p('M12 15.8c-1.4-1.6 1.4-3 0-4.9s1.4-3.3 0-5.1'),
    p('M15.8 15.8c-1.4-1.6 1.4-3 0-4.9s1.4-3.3 0-5.1'),
  ],
  /** Smoke: a smoke sauna, a low hut with smoke from the roof. */
  smoke: [
    p('M4.5 20v-6.9L12 8.2l7.5 4.9V20z'),
    p('M10.4 20v-3.6h3.2V20'),
    p('M15.6 9.6c-1-1.2.6-2.2-.2-3.4s.9-2 .3-3'),
  ],
  /** Banya: a birch vihta, leaves bound to a handle. */
  banya: [
    p('M12 14.2C8.6 13.2 6.6 10 7.3 5.8c3.2 1 4.7 3.8 4.7 8.4z'),
    p('M12 14.2c3.4-1 5.4-4.2 4.7-8.4-3.2 1-4.7 3.8-4.7 8.4z'),
    p('M12 12.6c-1.5-2-1.7-5.1 0-8.4 1.7 3.3 1.5 6.4 0 8.4z'),
    p('M12 14.2v6.3'),
    p('M10.5 16h3'),
  ],
  /** Other: a small cairn of stones. */
  other: [
    p('M3.8 18.6c0-1.7 1.8-2.9 4.2-2.9s4 1.1 4 2.8c0 1.2-1.8 1.8-4 1.8s-4.2-.5-4.2-1.7z'),
    p('M12 18.5c0-1.8 1.9-3 4.3-3s3.9 1.2 3.9 2.9c0 1.2-1.7 1.9-3.9 1.9S12 19.7 12 18.5z'),
    p('M7.8 13.4c0-2 2-3.4 4.4-3.4s4 1.3 4 3.1c0 1.1-.9 1.9-2.3 2.3'),
    p('M10.4 7.6c0-1.3 1-2.2 2.3-2.2 1.2 0 2 .8 2 1.9'),
  ],

  // Things
  /** The sauna stone. */
  stone: [p(STONE), p('M8.2 11.6c1.2-.6 2.6-.9 4.1-.9')],
  stoneFilled: [p(STONE, true)],
  /** One slat of the wall. */
  slat: [rect(3, 9.4, 18, 5.2, 1.6), p('M6.2 12h5.2'), p('M13.6 12.4h3.8')],
  /** A freeze. */
  snowflake: [
    p('M12 3.5v17'),
    p('M4.6 7.75l14.8 8.5'),
    p('M4.6 16.25l14.8-8.5'),
    p('M9.8 4.9L12 6.6l2.2-1.7'),
    p('M9.8 19.1l2.2-1.7 2.2 1.7'),
    p('M4.7 10.3l2.6-.4-1-2.5'),
    p('M19.3 13.7l-2.6.4 1 2.5'),
    p('M4.7 13.7l2.6.4-1 2.5'),
    p('M19.3 10.3l-2.6-.4 1-2.5'),
  ],
  /** A cheer. */
  heart: [p('M12 19.3c-.3 0-7.3-4.1-7.3-9.2 0-2.3 1.8-4.1 4.1-4.1 1.4 0 2.6.7 3.2 1.8.6-1.1 1.8-1.8 3.2-1.8 2.3 0 4.1 1.8 4.1 4.1 0 5.1-7 9.2-7.3 9.2z')],
  heartFilled: [p('M12 19.3c-.3 0-7.3-4.1-7.3-9.2 0-2.3 1.8-4.1 4.1-4.1 1.4 0 2.6.7 3.2 1.8.6-1.1 1.8-1.8 3.2-1.8 2.3 0 4.1 1.8 4.1 4.1 0 5.1-7 9.2-7.3 9.2z', true)],
  /** Throw löyly: the ladle, with steam. */
  ladle: [p('M3.5 14.5h8.6a4.3 4.3 0 0 1-8.6 0z'), p('M12.1 14.5l8.4-8'), p('M6.4 10.6c-.9-1 .9-1.8 0-3'), p('M9.6 10.6c-.9-1 .9-1.8 0-3')],
  /** Settings. */
  gear: [p(gearPath(12, 12, 8.4, 6.4, 8)), c(12, 12, 2.6)],
  camera: [
    p('M4 9a2 2 0 0 1 2-2h2.1l1.5-2.2h4.8L15.9 7H18a2 2 0 0 1 2 2v8.2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z'),
    c(12, 12.9, 3.4),
  ],
  photo: [rect(3.8, 5, 16.4, 14, 2.6), p('M4.4 16.6l4.4-4.4 3.3 3.3 2.3-2.3 5.3 5.3'), c(15.4, 9.6, 1.5)],
  /** A cold plunge (also the timer's "cooling off"). */
  droplet: [p('M12 3.8s-5.8 6.3-5.8 10.3a5.8 5.8 0 0 0 11.6 0c0-4-5.8-10.3-5.8-10.3z')],
  thermometer: [p('M10 14.4V5.6a2 2 0 0 1 4 0v8.8a3.7 3.7 0 1 1-4 0z'), p('M12 10.4v6.4')],
  timer: [c(12, 13.2, 7.3), p('M12 9.6v3.6l2.4 1.6'), p('M10 3.6h4')],
  bell: [p('M6.4 16.4v-5.2a5.6 5.6 0 0 1 11.2 0v5.2l1.6 2.1H4.8z'), p('M10 20.6a2 2 0 0 0 4 0')],
  family: [
    c(9, 8.8, 3),
    p('M3.6 18.8c.8-2.9 2.9-4.4 5.4-4.4s4.6 1.5 5.4 4.4'),
    c(16.4, 9.6, 2.4),
    p('M15.6 14.5c2.4-.2 4.1 1.1 4.8 3.6'),
  ],
  calendar: [rect(4, 5.6, 16, 14.4, 2.6), p('M4 10.2h16'), p('M8.4 3.6v4'), p('M15.6 3.6v4')],
  pause: [p('M9 6.5v11'), p('M15 6.5v11')],
  pencil: [p('M5 19l1-4.1L15.7 5.2a1.9 1.9 0 0 1 2.7 0l.4.4a1.9 1.9 0 0 1 0 2.7L9.1 18z'), p('M14 6.9l3.1 3.1')],
  share: [
    p('M12 3.8v10.8'),
    p('M8.4 7.2L12 3.8l3.6 3.4'),
    p('M8.2 10.4H6.6A1.6 1.6 0 0 0 5 12v6.4A1.6 1.6 0 0 0 6.6 20h10.8a1.6 1.6 0 0 0 1.6-1.6V12a1.6 1.6 0 0 0-1.6-1.6h-1.6'),
  ],
  /** Invite someone. */
  personPlus: [c(10, 8.6, 3.6), p('M3.6 19.4c1-3.1 3.6-4.7 6.4-4.7 1.5 0 2.9.4 4 1.3'), p('M18 13v6'), p('M15 16h6')],

  // Controls
  close: [p('M6.5 6.5l11 11'), p('M17.5 6.5l-11 11')],
  check: [p('M5 12.6l4.4 4.4L19 7.4')],
  plus: [p('M12 5v14'), p('M5 12h14')],
  minus: [p('M5 12h14')],
  /** Back, in a screen's top bar. Never on a link or a row. */
  back: [p('M14.5 5.5L8 12l6.5 6.5')],
  more: [c(6, 12, 1.2, true), c(12, 12, 1.2, true), c(18, 12, 1.2, true)],
} satisfies Record<string, Part[]>;

export type IconName = keyof typeof icons;

type Props = {
  name: IconName;
  size?: number;
  color?: string;
  /** Override the stroke (in grid units, before scaling). Rarely needed. */
  strokeWidth?: number;
  accessibilityLabel?: string;
};

export function Icon({ name, size = 24, color = palette.stone, strokeWidth = STROKE, accessibilityLabel }: Props) {
  const parts: Part[] = icons[name];
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      accessible={!!accessibilityLabel}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityLabel ? 'image' : undefined}
    >
      {parts.map((part, i) => {
        const fill = part.fill ? color : 'none';
        if (part.kind === 'circle') return <Circle key={i} cx={part.cx} cy={part.cy} r={part.r} fill={fill} />;
        if (part.kind === 'rect')
          return <Rect key={i} x={part.x} y={part.y} width={part.w} height={part.h} rx={part.r} fill={fill} />;
        return <Path key={i} d={part.d} fill={fill} />;
      })}
    </Svg>
  );
}

/** The icon names, grouped, for the Design sheet and the docs. */
export const iconGroups: { title: string; names: IconName[] }[] = [
  { title: 'Tabs', names: ['today', 'week', 'feed', 'me'] },
  { title: 'Sauna types', names: ['traditional', 'woodFired', 'infrared', 'steam', 'smoke', 'banya', 'other'] },
  {
    title: 'Things',
    names: [
      'stone',
      'stoneFilled',
      'slat',
      'snowflake',
      'heart',
      'heartFilled',
      'ladle',
      'gear',
      'camera',
      'photo',
      'droplet',
      'thermometer',
      'timer',
      'bell',
      'family',
      'calendar',
      'pause',
      'pencil',
      'share',
      'personPlus',
    ],
  },
  { title: 'Controls', names: ['close', 'check', 'plus', 'minus', 'back', 'more'] },
];
