// Runs with TZ=America/Los_Angeles (package.json "test").
import { describe, expect, it } from '@jest/globals';
import { buildView, keptSummary } from '../buildView';
import type { RemoteFamily, RemoteWorkout } from '../backend';
import type { SavedSession } from '../session';

// Wednesday 21 October 2026, 10am local. The week runs Monday the 19th to Sunday the 25th.
const NOW = new Date(2026, 9, 21, 10);

const session: SavedSession = {
  version: 1,
  role: 'founder',
  me: {
    id: 'me',
    name: 'Sam',
    color: '#EF6C1A',
    photoUri: null,
    moveMethod: 'manual',
    reminder: 'evening',
    remindersWanted: false,
    joinedOn: '2026-10-01',
  },
  family: { name: 'Home crew', joinCode: '', invited: [] },
  workouts: [],
  remote: { userId: 'u-me', memberId: 'me', familyId: 'fam' },
};

function member(id: string, name: string) {
  return {
    id,
    userId: `u-${id}`,
    name,
    color: '#4F97CF',
    photoPath: null,
    photoUrl: null,
    timezone: 'America/Los_Angeles',
    joinedAt: '2026-10-01T16:00:00Z',
    joinedOn: '2026-10-01',
  };
}

function workout(id: string, memberId: string, localDate: string, hour = 7): RemoteWorkout {
  return {
    id,
    memberId,
    localDate,
    type: 'walk',
    minutes: 30,
    source: 'manual',
    createdAt: new Date(`${localDate}T${String(hour).padStart(2, '0')}:00:00-07:00`).toISOString(),
    cheeredBy: [],
    comments: [],
  };
}

function family(overrides: Partial<RemoteFamily> = {}): RemoteFamily {
  return {
    id: 'fam',
    name: 'Home crew',
    joinCode: 'K7P4QX9M',
    members: [member('me', 'Sam'), member('mum', 'Maya')],
    // I moved Monday to Wednesday; Mum moved Monday and Wednesday.
    workouts: [
      workout('me-mon', 'me', '2026-10-19'),
      workout('me-tue', 'me', '2026-10-20'),
      workout('me-wed', 'me', '2026-10-21'),
      workout('mum-mon', 'mum', '2026-10-19'),
      workout('mum-wed', 'mum', '2026-10-21', 8),
    ],
    streak: { current: 3, longest: 3, daysTogetherThisYear: 3, startedOn: '2026-10-19' },
    memberStreaks: {
      me: { personalStreak: 3, movedToday: true, freezeAvailable: true, freezeBackOn: null },
      mum: { personalStreak: 3, movedToday: true, freezeAvailable: false, freezeBackOn: '2026-10-27' },
    },
    ...overrides,
  };
}

describe('a family on the server', () => {
  it('counts who has kept today', () => {
    const view = buildView(session, null, family(), NOW);
    expect(view.joinedCount).toBe(2);
    expect(view.keptCount).toBe(2);
    expect(view.iKeptToday).toBe(true);
    expect(view.nudgeTarget).toBeUndefined();
    expect(view.me.relationship).toBe('You');
  });

  it('offers a nudge for someone who still has today, never for you', () => {
    const f = family({
      workouts: family().workouts.filter((w) => w.id !== 'mum-wed'),
      memberStreaks: { ...family().memberStreaks, mum: { ...family().memberStreaks.mum, movedToday: false } },
    });
    const view = buildView(session, null, f, NOW);
    expect(view.keptCount).toBe(1);
    expect(view.nudgeTarget?.id).toBe('mum');
    expect(view.members.mum.today).toBe('still');
  });

  it('shows only today and yesterday in the feed', () => {
    const view = buildView(session, null, family(), NOW);
    expect(view.feed.map((f) => f.workoutId).sort()).toEqual(['me-tue', 'me-wed', 'mum-wed']);
  });

  it('marks a missed day the streak runs through as a freeze day', () => {
    const view = buildView(session, null, family(), NOW);
    expect(view.week.strip.slice(0, 3).map((d) => d.state)).toEqual(['kept', 'freeze', 'kept']);
    expect(view.week.rows.find((r) => r.dow === 'Tue')?.badge).toBe('Freeze day');
  });

  it('marks it missed when the streak broke there', () => {
    const f = family({ streak: { current: 1, longest: 1, daysTogetherThisYear: 2, startedOn: '2026-10-19' } });
    const view = buildView(session, null, f, NOW);
    expect(view.week.strip.slice(0, 3).map((d) => d.state)).toEqual(['kept', 'missed', 'kept']);
  });

  it('leads with days together after a break, without naming anyone', () => {
    const f = family({ streak: { current: 0, longest: 12, daysTogetherThisYear: 20, startedOn: '2026-10-01' } });
    const view = buildView(session, null, f, NOW);
    expect(view.streak.kind).toBe('afterBreak');
    expect(view.streak.daysTogether).toBe(20);
    expect(JSON.stringify(view.week)).not.toMatch(/broke/i);
  });

  it('counts down the first 30 days, then shows the milestone', () => {
    expect(buildView(session, null, family(), NOW).goal).toMatchObject({ status: 'active', day: 3, total: 30 });
    const done = family({ streak: { current: 30, longest: 30, daysTogetherThisYear: 30, startedOn: '2026-09-22' } });
    expect(buildView(session, null, done, NOW).goal.status).toBe('done');
  });
});

describe('before the server family loads', () => {
  it('shows just you', () => {
    const view = buildView(session, null, null, NOW);
    expect(view.joinedCount).toBe(1);
    expect(view.feed).toEqual([]);
  });
});

describe('breaks on Today', () => {
  it('leaves people on a break out of the count', () => {
    expect(keptSummary(1, 3, 1)).toEqual({ value: '1 of 2', label: 'kept it today', expected: 2 });
  });

  it('says everyone is away instead of "0 of 1"', () => {
    expect(keptSummary(0, 2, 2)).toEqual({ value: 'All away', label: 'everyone’s on a break today', expected: 0 });
    expect(keptSummary(0, 1, 1).value).toBe('All away');
  });

  it('shows everyone away when the whole family is on a break', () => {
    const today = '2026-10-21';
    const f = family({
      workouts: family().workouts.filter((w) => w.localDate !== today),
      memberStreaks: {
        me: { ...family().memberStreaks.me, movedToday: false },
        mum: { ...family().memberStreaks.mum, movedToday: false },
      },
      pauses: [
        { memberId: 'me', startsOn: today, endsOn: '2026-10-23' },
        { memberId: 'mum', startsOn: '2026-10-20', endsOn: today },
      ],
    });
    const view = buildView(session, null, f, NOW);
    expect(keptSummary(view.keptCount, view.joinedCount, view.awayCount).value).toBe('All away');
    expect(view.myPauses).toEqual([{ startsOn: today, endsOn: '2026-10-23' }]);
  });
});

describe('a family cached by an older build', () => {
  // Build 6 cached workouts with no comments, healthWorkoutId or sourceApp, and the family with no pauses.
  // Build 7 rendered that before the server refresh and crashed on launch.
  function build6Family() {
    const f = family();
    const old = {
      ...f,
      workouts: f.workouts.map(({ comments, healthWorkoutId, sourceApp, ...rest }) => rest),
    } as Partial<RemoteFamily>;
    delete old.pauses;
    return old as RemoteFamily;
  }

  it('renders without throwing', () => {
    expect(() => buildView(session, null, build6Family(), NOW)).not.toThrow();
  });

  it('shows its workouts with no comments', () => {
    const view = buildView(session, null, build6Family(), NOW);
    expect(view.keptCount).toBe(2);
    expect(view.workouts['me-wed'].comments).toEqual([]);
  });
});
