// Runs with TZ=America/Los_Angeles (package.json "test").
import { describe, expect, it } from '@jest/globals';
import { addDays, weekStart, weekDays, isoWeekday } from '../dates';
import {
  WeekFamily,
  familyWeekHistory,
  familyWeekSummary,
  familyWeeks,
  memberWeekSummary,
  memberWeeks,
  overlayPendingSessions,
  ruleForWeek,
} from '../weeks';

// Monday 5 October 2026 is week 1; the family started on Saunafam that day.
const W1 = '2026-10-05';
const wk = (n: number) => addDays(W1, (n - 1) * 7);
const day = (week: number, offset: number) => addDays(wk(week), offset);

function fam(overrides: Partial<WeekFamily> = {}): WeekFamily {
  return {
    weekStartsOn: 1,
    saunafamStartedOn: W1,
    goalPerWeek: 3,
    minMinutes: 10,
    rules: [{ effectiveFrom: W1, goalPerWeek: 3, minMinutes: 10 }],
    members: [
      { id: 'sam', joinedOn: '2026-09-01', joinedAt: '2026-09-01T10:00:00Z' },
      { id: 'maya', joinedOn: '2026-09-02', joinedAt: '2026-09-02T10:00:00Z' },
    ],
    sessions: [],
    pauses: [],
    ...overrides,
  };
}

/** Three 20-minute sessions on Mon, Wed, Fri of each listed week. */
function keeps(member: string, weeks: number[]) {
  return weeks.flatMap((w) => [0, 2, 4].map((o) => ({ memberId: member, localDate: day(w, o), durationMinutes: 20 })));
}

describe('week_start', () => {
  it('finds Monday for a Monday-start family, any day of the week', () => {
    for (const d of weekDays('2026-10-19')) expect(weekStart(d, 1)).toBe('2026-10-19');
  });

  it('finds Sunday for a Sunday-start family', () => {
    expect(weekStart('2026-10-18', 7)).toBe('2026-10-18'); // a Sunday
    expect(weekStart('2026-10-24', 7)).toBe('2026-10-18'); // the Saturday after
    expect(weekStart('2026-10-19', 7)).toBe('2026-10-18'); // Monday belongs to the Sunday before
  });

  it('matches isodow', () => {
    expect(isoWeekday('2026-10-19')).toBe(1);
    expect(isoWeekday('2026-10-25')).toBe(7);
  });

  it('crosses a month and a daylight-saving change', () => {
    expect(weekStart('2026-11-01', 1)).toBe('2026-10-26');
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
  });
});

describe('counted days', () => {
  it('counts two sessions on one day once', () => {
    const f = fam({
      sessions: [
        { memberId: 'sam', localDate: day(1, 6), durationMinutes: 15 },
        { memberId: 'sam', localDate: day(1, 6), durationMinutes: 15 },
        { memberId: 'sam', localDate: day(1, 6), durationMinutes: 15 },
      ],
    });
    expect(memberWeeks(f, 'sam', day(1, 6))[0].countedDays).toBe(1);
  });

  it('leaves out sessions under the minimum, and anything before the reset', () => {
    const f = fam({
      sessions: [
        { memberId: 'sam', localDate: day(1, 1), durationMinutes: 9 },
        { memberId: 'sam', localDate: day(1, 2), durationMinutes: 10 },
        { memberId: 'sam', localDate: addDays(W1, -1), durationMinutes: 30 },
      ],
    });
    const [w] = memberWeeks(f, 'sam', day(1, 3));
    expect(w.days).toEqual([day(1, 2)]);
  });
});

describe('member week status', () => {
  it('is kept as soon as the goal is met, mid-week', () => {
    const f = fam({ sessions: keeps('sam', [2]) });
    expect(memberWeekSummary(f, 'sam', day(2, 4)).keptThisWeek).toBe(true);
    expect(memberWeeks(f, 'sam', day(2, 4))[1].status).toBe('kept');
  });

  it('is pending until the week is over', () => {
    const f = fam();
    expect(memberWeeks(f, 'sam', day(2, 6))[1].status).toBe('pending');
  });

  it('the reset week is joined, not missed, when not kept', () => {
    const f = fam();
    expect(memberWeeks(f, 'sam', day(2, 0))[0].status).toBe('joined');
  });

  it('someone who joins on a Thursday has a joined week, unless they keep it', () => {
    const f = fam({
      members: [...fam().members, { id: 'jo', joinedOn: day(3, 3), joinedAt: `${day(3, 3)}T12:00:00Z` }],
      sessions: [...keeps('sam', [1, 2, 3]), ...keeps('maya', [1, 2, 3])],
    });
    expect(memberWeeks(f, 'jo', day(4, 0))[0]).toMatchObject({ weekStart: wk(3), status: 'joined' });
    // The family week only expects the others.
    expect(familyWeeks(f, day(4, 0)).find((w) => w.weekStart === wk(3))?.state).toBe('counted');
  });

  it('a 3-day break doesn’t pause a week; 4 days does', () => {
    const three = fam({ sessions: keeps('sam', [1]), pauses: [{ memberId: 'sam', startsOn: day(2, 0), endsOn: day(2, 2) }] });
    const four = fam({ sessions: keeps('sam', [1]), pauses: [{ memberId: 'sam', startsOn: day(2, 0), endsOn: day(2, 3) }] });
    expect(memberWeeks(three, 'sam', day(3, 0))[1].status).toBe('frozen');
    expect(memberWeeks(four, 'sam', day(3, 0))[1].status).toBe('paused');
  });

  it('a 7-day break from Wednesday pauses that week (5 days) but not the next (2 days)', () => {
    const f = fam({ sessions: keeps('sam', [1]), pauses: [{ memberId: 'sam', startsOn: day(2, 2), endsOn: day(3, 1) }] });
    const rows = memberWeeks(f, 'sam', day(4, 0));
    expect(rows[1]).toMatchObject({ pausedDays: 5, status: 'paused' });
    expect(rows[2]).toMatchObject({ pausedDays: 2, status: 'frozen' });
  });

  it('a freeze used in week W, then a miss in W+2, is missed; a miss in W+4 is frozen again', () => {
    const f = fam({ sessions: keeps('sam', [1, 3, 4, 5]) });
    const rows = memberWeeks(f, 'sam', day(7, 0));
    expect(rows.map((r) => r.status)).toEqual(['kept', 'frozen', 'kept', 'kept', 'kept', 'frozen', 'pending']);
    const g = fam({ sessions: keeps('sam', [1, 3]) });
    expect(memberWeeks(g, 'sam', day(5, 0))[3].status).toBe('missed');
  });

  it('Monday morning, yesterday still open: last week reads frozen; logging Sunday makes it kept and gives the freeze back', () => {
    const twoOfThree = [
      { memberId: 'sam', localDate: day(2, 0), durationMinutes: 20 },
      { memberId: 'sam', localDate: day(2, 2), durationMinutes: 20 },
    ];
    const before = fam({ sessions: [...keeps('sam', [1]), ...twoOfThree] });
    const monday = day(3, 0);
    expect(memberWeekSummary(before, 'sam', monday)).toMatchObject({ lastWeekStatus: 'frozen', freezeAvailable: false, freezeBackOn: wk(6) });
    const after = fam({ sessions: [...keeps('sam', [1]), ...twoOfThree, { memberId: 'sam', localDate: day(2, 6), durationMinutes: 20 }] });
    expect(memberWeekSummary(after, 'sam', monday)).toMatchObject({ lastWeekStatus: 'kept', freezeAvailable: true, freezeBackOn: null });
  });

  it('personal streak: kept and frozen add one, paused holds, missed resets', () => {
    const f = fam({
      sessions: keeps('sam', [1, 3, 5, 6]),
      pauses: [{ memberId: 'sam', startsOn: day(4, 0), endsOn: day(4, 6) }],
    });
    // 1 kept, 2 frozen, 3 kept, 4 paused, 5 kept, 6 kept -> 5 in a row.
    expect(memberWeekSummary(f, 'sam', day(7, 0))).toMatchObject({ personalStreak: 5, longestPersonalStreak: 5 });
    const g = fam({ sessions: keeps('sam', [1, 4]) });
    // 1 kept, 2 frozen, 3 missed, 4 kept.
    expect(memberWeekSummary(g, 'sam', day(5, 0))).toMatchObject({ personalStreak: 1, longestPersonalStreak: 2 });
  });

  it('a goal change on Wednesday applies from next week', () => {
    const f = fam({
      rules: [
        { effectiveFrom: W1, goalPerWeek: 3, minMinutes: 10 },
        { effectiveFrom: wk(3), goalPerWeek: 2, minMinutes: 10 },
      ],
      sessions: [
        { memberId: 'sam', localDate: day(2, 0), durationMinutes: 20 },
        { memberId: 'sam', localDate: day(2, 1), durationMinutes: 20 },
        { memberId: 'sam', localDate: day(3, 0), durationMinutes: 20 },
        { memberId: 'sam', localDate: day(3, 1), durationMinutes: 20 },
      ],
    });
    expect(ruleForWeek(f, wk(2)).goal).toBe(3);
    const rows = memberWeeks(f, 'sam', day(4, 0));
    expect(rows[1]).toMatchObject({ goal: 3, status: 'frozen' });
    expect(rows[2]).toMatchObject({ goal: 2, status: 'kept' });
  });

  it('reports the break you’re on today', () => {
    const f = fam({ pauses: [{ memberId: 'maya', startsOn: day(1, 1), endsOn: day(1, 4) }] });
    expect(memberWeekSummary(f, 'maya', day(1, 2)).pausedUntil).toBe(day(1, 4));
    expect(memberWeekSummary(f, 'maya', day(1, 5)).pausedUntil).toBeNull();
  });
});

describe('family weeks', () => {
  it('a solo founder has no family weeks and a streak of 0', () => {
    const f = fam({ members: [fam().members[0]], sessions: keeps('sam', [1, 2]) });
    expect(familyWeeks(f, day(3, 0))).toEqual([]);
    expect(familyWeekSummary(f, day(3, 0))).toMatchObject({ familyStreak: 0, startedOn: null, latestWeekState: null });
    expect(memberWeekSummary(f, 'sam', day(3, 0)).personalStreak).toBe(2);
  });

  it('counts, breaks, holds on pending and skip', () => {
    const f = fam({
      sessions: [...keeps('sam', [1, 2, 3, 5]), ...keeps('maya', [1, 2, 3, 5])],
      pauses: [
        { memberId: 'sam', startsOn: day(4, 0), endsOn: day(4, 6) },
        { memberId: 'maya', startsOn: day(4, 0), endsOn: day(4, 6) },
      ],
    });
    const states = familyWeeks(f, day(6, 2)).map((w) => w.state);
    // Everyone on a break in week 4: skip. Week 6 still running: pending.
    expect(states).toEqual(['counted', 'counted', 'counted', 'skip', 'counted', 'pending']);
    expect(familyWeekSummary(f, day(6, 2))).toMatchObject({ familyStreak: 4, longestStreak: 4, weeksTogetherThisYear: 4, startedOn: W1 });
  });

  it('breaks when an expected member misses, and weeks together never go down', () => {
    // Maya: kept 1, frozen 2, kept 3, missed 4 (freeze not back yet).
    const f = fam({ sessions: [...keeps('sam', [1, 2, 3, 4, 5]), ...keeps('maya', [1, 3, 5])] });
    const rows = familyWeeks(f, day(6, 0));
    expect(rows.map((r) => r.state)).toEqual(['counted', 'counted', 'counted', 'broken', 'counted', 'pending']);
    expect(rows[1].freezeUsed).toBe(true);
    expect(familyWeekSummary(f, day(6, 0))).toMatchObject({ familyStreak: 1, longestStreak: 3, weeksTogetherThisYear: 4, latestWeekState: 'pending' });
  });

  it('removing a member recomputes past weeks: a broken week can become counted', () => {
    const jo = { id: 'jo', joinedOn: '2026-09-03', joinedAt: '2026-09-03T10:00:00Z' };
    const both = [...keeps('sam', [1, 2, 3]), ...keeps('maya', [1, 2, 3])];
    // Jo: kept 1, frozen 2, missed 3.
    const withJo = fam({ members: [...fam().members, jo], sessions: [...both, ...keeps('jo', [1])] });
    expect(familyWeeks(withJo, day(4, 0)).map((w) => w.state)).toEqual(['counted', 'counted', 'broken', 'pending']);
    const without = fam({ sessions: both });
    expect(familyWeeks(without, day(4, 0)).map((w) => w.state)).toEqual(['counted', 'counted', 'counted', 'pending']);
  });
});

describe('history', () => {
  it('is newest first, one row per member, and never names someone else’s miss or freeze', () => {
    const f = fam({ sessions: [...keeps('sam', [1, 3]), ...keeps('maya', [1, 2])] });
    const asSam = familyWeekHistory(f, 'sam', day(4, 0));
    expect(asSam.map((r) => `${r.weekStart}:${r.memberId}:${r.status}`)).toEqual([
      `${wk(3)}:sam:kept`,
      `${wk(3)}:maya:not_kept`,
      `${wk(2)}:sam:frozen`,
      `${wk(2)}:maya:kept`,
      `${wk(1)}:sam:kept`,
      `${wk(1)}:maya:kept`,
    ]);
    const asMaya = familyWeekHistory(f, 'maya', day(4, 0));
    expect(asMaya.find((r) => r.weekStart === wk(2) && r.memberId === 'sam')?.status).toBe('not_kept');
    expect(asMaya.find((r) => r.weekStart === wk(3) && r.memberId === 'maya')?.status).toBe('frozen');
  });

  it('stops at the count asked for', () => {
    const f = fam({ sessions: keeps('sam', [1, 2, 3, 4, 5]) });
    const weeks = new Set(familyWeekHistory(f, 'sam', day(6, 0), 2).map((r) => r.weekStart));
    expect([...weeks]).toEqual([wk(5), wk(4)]);
  });
});

describe('sessions still in the outbox', () => {
  it('fill your dots and can keep the week straight away', () => {
    const f = fam({ sessions: [{ memberId: 'sam', localDate: day(1, 0), durationMinutes: 20 }, { memberId: 'sam', localDate: day(1, 1), durationMinutes: 20 }] });
    const week = memberWeekSummary(f, 'sam', day(1, 3));
    expect(week).toMatchObject({ countedDays: 2, keptThisWeek: false, personalStreak: 0 });
    const next = overlayPendingSessions(week, [{ memberId: 'sam', localDate: day(1, 3), durationMinutes: 15 }]);
    expect(next).toMatchObject({ countedDays: 3, keptThisWeek: true, personalStreak: 1, longestPersonalStreak: 1 });
  });

  it('ignore short sessions, other people, other weeks and days already counted', () => {
    const f = fam({ sessions: [{ memberId: 'sam', localDate: day(1, 0), durationMinutes: 20 }] });
    const week = memberWeekSummary(f, 'sam', day(1, 3));
    const same = overlayPendingSessions(week, [
      { memberId: 'sam', localDate: day(1, 1), durationMinutes: 5 },
      { memberId: 'maya', localDate: day(1, 1), durationMinutes: 20 },
      { memberId: 'sam', localDate: addDays(W1, -1), durationMinutes: 20 },
      { memberId: 'sam', localDate: day(1, 0), durationMinutes: 20 },
    ]);
    expect(same).toEqual(week);
  });
});
