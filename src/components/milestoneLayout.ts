/**
 * How the milestone wall is laid out: one column of slats up to 13 weeks,
 * then columns of 13 side by side (26 weeks is two, 52 is four), so even a
 * year fits the card. Each column starts building when the one before it has
 * dropped its last slat, so the whole wall still goes up one slat every 50 ms.
 */
export const SLATS_PER_COLUMN = 13;

export type MilestoneColumn = { slats: number; startIndex: number };

export function milestoneColumns(weeks: number): MilestoneColumn[] {
  const n = Math.max(1, Math.round(weeks));
  const cols: MilestoneColumn[] = [];
  for (let start = 0; start < n; start += SLATS_PER_COLUMN) {
    cols.push({ slats: Math.min(SLATS_PER_COLUMN, n - start), startIndex: start });
  }
  return cols;
}

/** Slat height: the wall's 21 pt for a single column, thinner when they sit side by side. */
export function milestoneSlatHeight(weeks: number): number {
  return weeks > SLATS_PER_COLUMN ? 14 : 21;
}
