import { describe, expect, it } from '@jest/globals';
import { milestoneColumns, milestoneSlatHeight } from '../milestoneLayout';

describe('the milestone wall', () => {
  it('one column up to 13 weeks, then columns of 13', () => {
    expect(milestoneColumns(4)).toEqual([{ slats: 4, startIndex: 0 }]);
    expect(milestoneColumns(12)).toEqual([{ slats: 12, startIndex: 0 }]);
    expect(milestoneColumns(26)).toEqual([
      { slats: 13, startIndex: 0 },
      { slats: 13, startIndex: 13 },
    ]);
    expect(milestoneColumns(52).map((c) => c.slats)).toEqual([13, 13, 13, 13]);
    expect(milestoneColumns(52)[3].startIndex).toBe(39);
  });

  it('every week is a slat', () => {
    for (const w of [4, 8, 12, 26, 52]) expect(milestoneColumns(w).reduce((n, c) => n + c.slats, 0)).toBe(w);
  });

  it('thinner slats when the columns sit side by side', () => {
    expect(milestoneSlatHeight(12)).toBe(21);
    expect(milestoneSlatHeight(26)).toBe(14);
  });
});
