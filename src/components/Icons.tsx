import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { colors } from '../theme/tokens';

type IconProps = { size?: number; color?: string; strokeWidth?: number };

/**
 * Arro brand mark — final production logo (Arro Logo No.12 · variant "v5"):
 * a lowercase "a" route mark = Variant B's open counter + Variant D's optical
 * centering. Monochrome (currentColor). Replaces the old A-trail mark.
 */
export function ArroMark({ size = 32, color = colors.primary }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120" fill="none">
      <Circle cx={53} cy={59} r={25.5} stroke={color} strokeWidth={13} fill="none" strokeLinecap="round" />
      <Path
        d="M78.5 35 V78 Q78.5 86 88 84.5"
        stroke={color}
        strokeWidth={13}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function Stroke({
  size = 22,
  color = colors.ink,
  strokeWidth = 1.9,
  children,
}: IconProps & { children: React.ReactNode }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      {children}
    </Svg>
  );
}

export const Check = ({ size = 14, color = colors.keptCheck, strokeWidth = 3 }: IconProps) => (
  <Stroke size={size} color={color} strokeWidth={strokeWidth}>
    <Path d="M5 12.5 10 17.5 19 7" />
  </Stroke>
);

export const Snowflake = ({ size = 15, color = colors.freezeIcon, strokeWidth = 2 }: IconProps) => (
  <Stroke size={size} color={color} strokeWidth={strokeWidth}>
    <Path d="M12 4v16M5 8l14 8M19 8 5 16" />
  </Stroke>
);

export const Heart = ({ size = 15, color = colors.primary }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <Path d="M12 20.2S3.4 15 3.4 9.2C3.4 6.4 5.5 4.7 7.9 4.7c1.7 0 3.1 1 4.1 2.3 1-1.3 2.4-2.3 4.1-2.3 2.4 0 4.5 1.7 4.5 4.5 0 5.8-8.6 11-8.6 11z" />
  </Svg>
);

export const ChevronRight = ({ size = 18, color = '#C7BDAE', strokeWidth = 2 }: IconProps) => (
  <Stroke size={size} color={color} strokeWidth={strokeWidth}>
    <Path d="M9 6l6 6-6 6" />
  </Stroke>
);

export const ChevronLeft = ({ size = 22, color = colors.inkSoft, strokeWidth = 2.1 }: IconProps) => (
  <Stroke size={size} color={color} strokeWidth={strokeWidth}>
    <Path d="M15 5 8 12l7 7" />
  </Stroke>
);

export const ShareIcon = ({ size = 20, color = colors.inkSoft, strokeWidth = 1.9 }: IconProps) => (
  <Stroke size={size} color={color} strokeWidth={strokeWidth}>
    <Path d="M12 3v12" />
    <Path d="M8.5 6.5 12 3l3.5 3.5" />
    <Path d="M7 10.5H6a2 2 0 0 0-2 2V19a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6.5a2 2 0 0 0-2-2h-1" />
  </Stroke>
);

export const CalendarIcon = ({ size = 22, color = colors.muted, strokeWidth = 1.8 }: IconProps) => (
  <Stroke size={size} color={color} strokeWidth={strokeWidth}>
    <Rect x={3.5} y={5} width={17} height={15} rx={3} />
    <Path d="M3.5 9.5h17M8 3.5v3M16 3.5v3" />
  </Stroke>
);

export const ListIcon = ({ size = 22, color = colors.muted, strokeWidth = 1.8 }: IconProps) => (
  <Stroke size={size} color={color} strokeWidth={strokeWidth}>
    <Path d="M4 7h16M7 12h10M10 17h4" />
  </Stroke>
);

export const CogIcon = ({ size = 22, color = colors.inkSoft, strokeWidth = 1.9 }: IconProps) => (
  <Stroke size={size} color={color} strokeWidth={strokeWidth}>
    <Circle cx={12} cy={12} r={3.2} />
    <Path d="M12 3v2.2M12 18.8V21M4.6 7.5l1.9 1.1M17.5 15.4l1.9 1.1M4.6 16.5l1.9-1.1M17.5 8.6l1.9-1.1" />
  </Stroke>
);

// ── Onboarding feature icons ──────────────────────────────────────────────
export const SyncIcon = ({ size = 24, color = colors.primary, strokeWidth = 1.9 }: IconProps) => (
  <Stroke size={size} color={color} strokeWidth={strokeWidth}>
    <Path d="M4 8a8 8 0 0 1 13.5-3.2L20 7" />
    <Path d="M20 4v3h-3" />
    <Path d="M20 16a8 8 0 0 1-13.5 3.2L4 17" />
    <Path d="M4 20v-3h3" />
  </Stroke>
);

export const UsersIcon = ({ size = 24, color = colors.primary, strokeWidth = 1.9 }: IconProps) => (
  <Stroke size={size} color={color} strokeWidth={strokeWidth}>
    <Circle cx={9} cy={8.5} r={3.2} />
    <Path d="M3.5 19c.7-3.1 3-4.6 5.5-4.6s4.8 1.5 5.5 4.6" />
    <Circle cx={17.2} cy={7.6} r={2.4} />
    <Path d="M16 13c2 .1 3.7 1.4 4.4 3.9" />
  </Stroke>
);

export const FlameIcon = ({ size = 24, color = colors.primary }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <Path d="M13 2c.4 3-1.6 4.6-3 6.2C8.4 9.9 7 11.6 7 14a5 5 0 0 0 10 .2c0-2-1-3.7-2-5 .3 1.2 0 2.3-.8 2.8.6-2.6-1-5.4-1.2-10z" />
  </Svg>
);

// ── Settings row icons ────────────────────────────────────────────────────
export const StravaIcon = ({ size = 18, color = '#fff', strokeWidth = 2.2 }: IconProps) => (
  <Stroke size={size} color={color} strokeWidth={strokeWidth}>
    <Path d="M3 12h4l2.5-7 5 14 2.5-7H21" />
  </Stroke>
);

export const TargetIcon = ({ size = 18, color = '#fff', strokeWidth = 1.9 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth}>
    <Circle cx={12} cy={12} r={8} />
    <Circle cx={12} cy={12} r={3.4} />
  </Svg>
);

export const BellIcon = ({ size = 18, color = '#fff', strokeWidth = 1.9 }: IconProps) => (
  <Stroke size={size} color={color} strokeWidth={strokeWidth}>
    <Path d="M6 9.5a6 6 0 0 1 12 0c0 4.5 1.8 5.8 1.8 5.8H4.2S6 14 6 9.5z" />
    <Path d="M10 19a2 2 0 0 0 4 0" />
  </Stroke>
);

export const LockIcon = ({ size = 18, color = '#fff', strokeWidth = 1.9 }: IconProps) => (
  <Stroke size={size} color={color} strokeWidth={strokeWidth}>
    <Rect x={5} y={10.5} width={14} height={9} rx={2.2} />
    <Path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
  </Stroke>
);

// ── Tab bar icons ─────────────────────────────────────────────────────────
export const TabToday = ({ size = 23, color = colors.tabInactive, strokeWidth = 1.9 }: IconProps) => (
  <Stroke size={size} color={color} strokeWidth={strokeWidth}>
    <Path d="M4.5 10.8 12 4.5l7.5 6.3" />
    <Path d="M6.4 9.7V19a.8.8 0 0 0 .8.8h9.6a.8.8 0 0 0 .8-.8V9.7" />
  </Stroke>
);

export const TabWeek = ({ size = 23, color = colors.tabInactive, strokeWidth = 2.1 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round">
    <Path d="M6 20v-8M12 20V5M18 20v-5" />
  </Svg>
);

export const TabFeed = ({ size = 23, color = colors.tabInactive, strokeWidth = 1.9 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round">
    <Rect x={4} y={5.5} width={16} height={5.2} rx={1.7} />
    <Rect x={4} y={13.3} width={16} height={5.2} rx={1.7} />
  </Svg>
);

export const TabMe = ({ size = 23, color = colors.tabInactive, strokeWidth = 1.9 }: IconProps) => (
  <Stroke size={size} color={color} strokeWidth={strokeWidth}>
    <Circle cx={12} cy={8.4} r={3.5} />
    <Path d="M5.6 19.4c1-3.3 3.6-4.8 6.4-4.8s5.4 1.5 6.4 4.8" />
  </Stroke>
);
