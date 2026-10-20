/**
 * Streak milestones at 4, 8, 12, 26 and 52 weeks, for the family streak and your
 * own. The phone remembers which ones it has shown (saunafam.milestones.v1), so
 * each appears once per person, even if a streak breaks and climbs back.
 * Server-side milestones are out of scope for build 9.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MemberId } from '../data/types';

export const MILESTONES_KEY = 'saunafam.milestones.v1';
export const MILESTONE_WEEKS = [4, 8, 12, 26, 52] as const;

export type MilestoneKind = 'family' | 'personal';

export interface Milestone {
  kind: MilestoneKind;
  weeks: number;
}

/** Shown milestones per member: { [memberId]: { family: [4, 8], personal: [4] } }. */
export type MilestoneMemory = Record<MemberId, { family: number[]; personal: number[] }>;

/** The highest milestone a streak has reached, or null under 4. */
export function reached(streak: number): number | null {
  const hit = MILESTONE_WEEKS.filter((n) => n <= streak);
  return hit.length ? hit[hit.length - 1] : null;
}

/**
 * The milestone to show now, or null. Family first, then personal. Only the
 * highest reached is shown: someone at 9 weeks on a new phone sees 8, never 4
 * then 8 (markShown also files every lower one away).
 */
export function dueMilestone(
  memory: MilestoneMemory,
  memberId: MemberId,
  streaks: { family: number; personal: number },
): Milestone | null {
  const mine = memory[memberId] ?? { family: [], personal: [] };
  for (const kind of ['family', 'personal'] as const) {
    const n = reached(streaks[kind]);
    if (n !== null && !mine[kind].includes(n)) return { kind, weeks: n };
  }
  return null;
}

/** After showing one: it, and every lower milestone of the same kind, never shows again. */
export function markShown(memory: MilestoneMemory, memberId: MemberId, milestone: Milestone): MilestoneMemory {
  const mine = memory[memberId] ?? { family: [], personal: [] };
  const lower = MILESTONE_WEEKS.filter((n) => n <= milestone.weeks);
  return {
    ...memory,
    [memberId]: { ...mine, [milestone.kind]: [...new Set([...mine[milestone.kind], ...lower])].sort((a, b) => a - b) },
  };
}

/** Badges on Me: every milestone, earned when the longest personal streak reached it. */
export function badges(longestPersonalStreak: number): { weeks: number; earned: boolean }[] {
  return MILESTONE_WEEKS.map((weeks) => ({ weeks, earned: longestPersonalStreak >= weeks }));
}

export function parseMilestones(raw: string | null): MilestoneMemory {
  if (!raw) return {};
  try {
    const v = JSON.parse(raw) as unknown;
    if (!v || typeof v !== 'object') return {};
    const out: MilestoneMemory = {};
    for (const [id, entry] of Object.entries(v as Record<string, unknown>)) {
      const e = entry as { family?: unknown; personal?: unknown };
      const nums = (x: unknown) => (Array.isArray(x) ? x.filter((n): n is number => typeof n === 'number') : []);
      out[id] = { family: nums(e?.family), personal: nums(e?.personal) };
    }
    return out;
  } catch {
    return {};
  }
}

export async function loadMilestones(): Promise<MilestoneMemory> {
  try {
    return parseMilestones(await AsyncStorage.getItem(MILESTONES_KEY));
  } catch {
    return {};
  }
}

export async function saveMilestones(memory: MilestoneMemory): Promise<void> {
  await AsyncStorage.setItem(MILESTONES_KEY, JSON.stringify(memory));
}
