/**
 * What the timer room shows, worked out from the timer state and a clock. Pure,
 * so the screen only draws (src/screens/TimerScreen.tsx) and Jest can check the
 * words and the arc (src/state/__tests__/timerRoom.test.ts).
 */
import { saunaTypeLabels } from '../data/saunas';
import { timeLabel } from './dates';
import { TimerState, heatMs, phase } from './timer';

const MINUTE = 60_000;

/** Dots on the ember arc, as in the mockup: 61, a bigger one every 20th. */
export const ARC_DOTS = 61;
export const ARC_MAJOR_EVERY = 20;
/** The arc runs from 150 degrees left of the top round to 150 degrees right, open at the bottom. */
export const ARC_SWEEP_DEG = 300;

/** The glow warms one step every 5 minutes in the heat, up to step 5. */
export const WARMTH_STEP_MINUTES = 5;
export const MAX_WARMTH = 5;

/** How far toward the target the heat is, 0 to 1. Past the target it stays at 1. */
export function arcProgress(state: TimerState, now: Date): number {
  const target = state.targetMinutes * MINUTE;
  if (target <= 0) return 1;
  return Math.min(1, Math.max(0, heatMs(state, now) / target));
}

/**
 * How many dots are lit, counting from the first: dot i of n is lit once the
 * progress reaches i / (n - 1). The first one is lit from the start, so the arc
 * always shows where it begins.
 */
export function litDots(progress: number, count = ARC_DOTS): number {
  const p = Math.min(1, Math.max(0, progress));
  // The small epsilon keeps 12:40 of 15 at the mockup's 51, despite float error.
  return Math.min(count, Math.floor(p * (count - 1) + 1e-6) + 1);
}

/** Where dot i sits: an angle in radians from straight up, clockwise. */
export function dotAngle(i: number, count = ARC_DOTS): number {
  const t = count <= 1 ? 0 : i / (count - 1);
  return ((-ARC_SWEEP_DEG / 2 + ARC_SWEEP_DEG * t) * Math.PI) / 180;
}

export function isMajorDot(i: number): boolean {
  return i % ARC_MAJOR_EVERY === 0;
}

/** The glow's heat step: 0 for the first 5 minutes, then one more every 5, up to 5. */
export function warmthStep(state: TimerState, now: Date): number {
  return Math.min(MAX_WARMTH, Math.floor(heatMs(state, now) / (WARMTH_STEP_MINUTES * MINUTE)));
}

/** Which 5-minute mark the heat has passed (0 before 5 minutes). The light tick fires when this goes up. */
export function fiveMinuteMark(state: TimerState, now: Date): number {
  return Math.floor(heatMs(state, now) / (5 * MINUTE));
}

/** The round you're in, or the one you just finished while cooling off. */
export function roundNumber(state: TimerState): number {
  return Math.max(1, state.rounds.length);
}

/** The caps line at the top: "In the heat · Round 1", "Cooling off · Round 1 done". */
export function roomHeading(state: TimerState): string {
  const round = roundNumber(state);
  return phase(state) === 'heat' ? `In the heat · Round ${round}` : `Cooling off · Round ${round} done`;
}

/** The caps line under the numerals: "Traditional · 15 min". */
export function roomSubheading(state: TimerState): string {
  return `${saunaTypeLabels[state.saunaType]} · ${state.targetMinutes} min`;
}

/**
 * The quiet line above Throw löyly.
 * - In the heat, before the target: "Time to cool off at 7:27 PM".
 * - Past it: "That's your 15 minutes. Cool off when you're ready." (never cut off)
 * - Cooling off: "Cooling off. Go back in when you're ready."
 */
export function roomLine(state: TimerState, now: Date): string {
  if (phase(state) === 'cooling') return 'Cooling off. Go back in when you’re ready.';
  const remaining = state.targetMinutes * MINUTE - heatMs(state, now);
  if (remaining <= 0) return `That’s your ${state.targetMinutes} minutes. Cool off when you’re ready.`;
  return `Time to cool off at ${timeLabel(new Date(now.getTime() + remaining))}`;
}

/** The numerals, spoken: "12 minutes 40 seconds", "1 hour 2 minutes". */
export function spokenClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const part = (n: number, one: string) => `${n} ${one}${n === 1 ? '' : 's'}`;
  if (h > 0) return [part(h, 'hour'), m ? part(m, 'minute') : null].filter(Boolean).join(' ');
  if (m > 0) return [part(m, 'minute'), s ? part(s, 'second') : null].filter(Boolean).join(' ');
  return part(s, 'second');
}
