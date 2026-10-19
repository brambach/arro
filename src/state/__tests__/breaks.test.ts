// Runs with TZ=America/Los_Angeles (package.json "test").
import { describe, expect, it } from '@jest/globals';
import { breakProblem, nextBreakDay } from '../breaks';

const TODAY = '2026-10-17';

describe('breakProblem', () => {
  it('lets a first break be up to two weeks', () => {
    expect(breakProblem([], TODAY, 1)).toBeNull();
    expect(breakProblem([], TODAY, 14)).toBeNull();
  });

  it('counts a changed break from the day it started, not from today', () => {
    // Started 10 days ago: ending within 14 days of that start fits, two more weeks doesn't.
    const running = [{ startsOn: '2026-10-07', endsOn: '2026-10-19' }];
    expect(breakProblem(running, TODAY, 1)).toBeNull();
    expect(breakProblem(running, TODAY, 4)).toBeNull();
    expect(breakProblem(running, TODAY, 7)).toBe('tooLong');
    expect(breakProblem(running, TODAY, 14)).toBe('tooLong');
  });

  it('allows at most 14 paused days in any 30', () => {
    // 10 days ended last week, so 4 more fit and a week doesn't.
    const earlier = [{ startsOn: '2026-10-01', endsOn: '2026-10-10' }];
    expect(breakProblem(earlier, TODAY, 3)).toBeNull();
    expect(breakProblem(earlier, TODAY, 7)).toBe('tooMany');
  });

  it('stops ending a break and starting another to stay away', () => {
    // Two weeks just ended yesterday (or was ended early): nothing more fits yet.
    const ended = [{ startsOn: '2026-10-03', endsOn: '2026-10-16' }];
    expect(breakProblem(ended, TODAY, 1)).toBe('tooMany');
  });

  it('forgets breaks that are more than 30 days back', () => {
    expect(breakProblem([{ startsOn: '2026-09-01', endsOn: '2026-09-14' }], TODAY, 14)).toBeNull();
  });
});

describe('nextBreakDay', () => {
  it('is today when a break fits now', () => {
    expect(nextBreakDay([], TODAY)).toBe(TODAY);
  });

  it('is the first day the oldest paused day leaves the 30-day window', () => {
    // 3 to 16 October paused: the 3rd drops out of the window on 2 November.
    expect(nextBreakDay([{ startsOn: '2026-10-03', endsOn: '2026-10-16' }], TODAY)).toBe('2026-11-02');
  });
});
