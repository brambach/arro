import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * Haptics, as part of the design (design/saunafam-spec.md, Definition of done,
 * Haptics). One function per moment; call sites never pick a haptic themselves.
 *
 * | Moment         | Haptic              |
 * |----------------|---------------------|
 * | timer start    | medium              |
 * | 5-minute tick  | light               |
 * | löyly          | soft                |
 * | finish         | success             |
 * | save           | success             |
 * | cheer          | light               |
 * | week kept      | success             |
 * | milestone      | heavy, then success |
 * | errors         | warning             |
 *
 * Fire each one on the frame its motion arrives, not when the motion starts: the
 * ember dot's success fires at the overshoot's peak (`emberPeakMs` in motion.ts),
 * a slat's when it touches down.
 */

export type HapticKind = 'light' | 'medium' | 'heavy' | 'soft' | 'success' | 'warning';

export const hapticTable = [
  { moment: 'timer start', kind: ['medium'] },
  { moment: '5-minute tick', kind: ['light'] },
  { moment: 'löyly', kind: ['soft'] },
  { moment: 'finish', kind: ['success'] },
  { moment: 'save', kind: ['success'] },
  { moment: 'cheer', kind: ['light'] },
  { moment: 'week kept', kind: ['success'] },
  { moment: 'milestone', kind: ['heavy', 'success'] },
  { moment: 'errors', kind: ['warning'] },
] as const satisfies readonly { moment: string; kind: readonly HapticKind[] }[];

/** Between the milestone's heavy thud and its success. */
export const milestoneGapMs = 180;

function play(kind: HapticKind): void {
  if (Platform.OS === 'web') return;
  // Haptics are a nicety: a phone that can't play one never breaks the moment.
  const done = () => undefined;
  switch (kind) {
    case 'light':
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(done);
      break;
    case 'medium':
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(done);
      break;
    case 'heavy':
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(done);
      break;
    case 'soft':
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft).catch(done);
      break;
    case 'success':
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(done);
      break;
    case 'warning':
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(done);
      break;
  }
}

export const haptics = {
  /** The door closes: the timer starts. */
  timerStart: () => play('medium'),
  /** Each 5-minute mark in the heat. */
  fiveMinuteTick: () => play('light'),
  /** "Throw löyly". */
  loyly: () => play('soft'),
  /** Done: the glow cools. */
  finish: () => play('success'),
  /** A session saved: at the ember dot's peak. */
  save: () => play('success'),
  /** "Cheer Maya on": at the heart's pulse. */
  cheer: () => play('light'),
  /** The whole family's week kept: when the slat finishes filling. */
  weekKept: () => play('success'),
  /** A streak milestone: a heavy thud as the number arrives, then success. */
  milestone: () => {
    play('heavy');
    setTimeout(() => play('success'), milestoneGapMs);
  },
  /** Plus landed: as the last slat of the wall finishes re-graining. */
  plusLanded: () => play('success'),
  /** Something didn't work (a save rolled back, an invite expired). */
  error: () => play('warning'),
} as const;

export type HapticMoment = keyof typeof haptics;
