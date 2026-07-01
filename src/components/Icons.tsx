import React from 'react';
import Svg, { Circle, Line, Path, Rect, SvgProps } from 'react-native-svg';
import { colors } from '../theme/tokens';

type IconProps = {
  size?: number;
  color?: string;
} & SvgProps;

/**
 * The Arro mark: a running trail forming an "A", climbing, with three footfall dots.
 * Tri-colour by default (brand); pass `color` for a monochrome version (e.g. white on gradient).
 */
export function ArroMark({ size = 32, color }: { size?: number; color?: string }) {
  const path = color ?? colors.primary;
  const d1 = color ?? colors.primary;
  const d2 = color ?? colors.kept;
  const d3 = color ?? colors.freeze;
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <Path
        d="M11.5 38.5 L24 10.5 L36.5 38.5"
        stroke={path}
        strokeWidth={4.6}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <Circle cx={17.6} cy={28.5} r={3} fill={d1} />
      <Circle cx={24} cy={28.5} r={3} fill={d2} />
      <Circle cx={30.4} cy={28.5} r={3} fill={d3} />
    </Svg>
  );
}

export function Check({ size = 12, color = '#fff' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 12 12" fill="none">
      <Path
        d="M2.5 6.5l2.2 2.2L9.5 4"
        stroke={color}
        strokeWidth={2}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function Snowflake({ size = 18, color = colors.freeze }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 3v18M4.5 7.5l15 9M19.5 7.5l-15 9"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function StravaWave({ size = 22, color = '#fff' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 13c3-1 5-1 8 1s5 2 8 1"
        stroke={color}
        strokeWidth={2.4}
        strokeLinecap="round"
      />
      <Path
        d="M4 8c3-1 5-1 8 1s5 2 8 1"
        stroke={color}
        strokeWidth={2.4}
        strokeLinecap="round"
        opacity={0.55}
      />
    </Svg>
  );
}

export function UsersIcon({ size = 24, color = '#fff' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={8.5} cy={9} r={3} stroke={color} strokeWidth={2.2} />
      <Circle cx={16} cy={10.5} r={2.4} stroke={color} strokeWidth={2.2} opacity={0.7} />
      <Path
        d="M3.5 18c.6-2.6 2.6-4 5-4s4.4 1.4 5 4"
        stroke={color}
        strokeWidth={2.2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function StarIcon({ size = 24, color = '#fff' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 3l2.4 5 5.5.7-4 3.8 1 5.4L12 21l-4.9 0.9 1-5.4-4-3.8 5.5-.7L12 3z"
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function BellIcon({ size = 18, color = colors.warn }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6 10a6 6 0 0112 0c0 5 2 6 2 6H4s2-1 2-6z"
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      <Path d="M10 20a2 2 0 004 0" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

export function ShareIcon({ size = 22, color = colors.primary }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 3v12m0-12L8 7m4-4l4 4M5 14v5a1 1 0 001 1h12a1 1 0 001-1v-5"
        stroke={color}
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function ChevronRight({ size = 14, color = '#CDBBA3' }: { size?: number; color?: string }) {
  return (
    <Svg width={(size * 8) / 14} height={size} viewBox="0 0 8 14" fill="none">
      <Path
        d="M1 1l6 6-6 6"
        stroke={color}
        strokeWidth={2}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function CloseIcon({ size = 12, color = '#7A5A38' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 12 12" fill="none">
      <Path d="M2 2l8 8M10 2l-8 8" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

export function SettingsIcon({ size = 22, color = colors.faint }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={3} stroke={color} strokeWidth={2} />
      <Path
        d="M12 2.6v2.2M12 19.2v2.2M4.2 4.2l1.6 1.6M18.2 18.2l1.6 1.6M2.6 12h2.2M19.2 12h2.2M4.2 19.8l1.6-1.6M18.2 5.8l1.6-1.6"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

// ─── Tab bar icons ────────────────────────────────────────────────────────────
export function TabToday({ size = 24, color = colors.tabInactive, active }: IconProps & { active?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {active ? (
        <Path d="M4 11l8-6 8 6v8a1 1 0 01-1 1h-4v-6h-6v6H5a1 1 0 01-1-1v-8z" fill={color} />
      ) : (
        <Path
          d="M4 11l8-6 8 6v8a1 1 0 01-1 1h-4v-6h-6v6H5a1 1 0 01-1-1v-8z"
          stroke={color}
          strokeWidth={2}
          strokeLinejoin="round"
        />
      )}
    </Svg>
  );
}

export function TabTrail({ size = 24, color = colors.tabInactive }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 6h9a3 3 0 010 6H8a3 3 0 000 6h12"
        stroke={color}
        strokeWidth={2.2}
        fill="none"
        strokeLinecap="round"
      />
      <Circle cx={4} cy={6} r={1.8} fill={color} />
      <Circle cx={20} cy={18} r={1.8} fill={color} />
    </Svg>
  );
}

export function TabFeed({ size = 24, color = colors.tabInactive }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={4} y={6} width={16} height={3} rx={1.5} fill={color} />
      <Rect x={4} y={11} width={16} height={3} rx={1.5} fill={color} />
      <Rect x={4} y={16} width={10} height={3} rx={1.5} fill={color} />
    </Svg>
  );
}

export function TabMe({ size = 24, color = colors.tabInactive }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={9} r={3.6} stroke={color} strokeWidth={2.2} />
      <Path
        d="M5 19c1-3.2 3.6-5 7-5s6 1.8 7 5"
        stroke={color}
        strokeWidth={2.2}
        strokeLinecap="round"
      />
    </Svg>
  );
}
