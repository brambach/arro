// Runs with TZ=America/Los_Angeles (package.json "test").
import { describe, expect, it } from '@jest/globals';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  NOTIFICATION_COPY,
  REMINDER_PREFIX,
  ReminderPlan,
  legacyIdentifiers,
  normalizeDays,
  parseTime,
  weeklyReminders,
} from '../reminders';
import { parseTap } from '../notifications';

// Wednesday 21 October 2026, 10am. The week runs Monday the 19th to Sunday the 25th.
const NOW = new Date(2026, 9, 21, 10);

const plan = (overrides: Partial<ReminderPlan> = {}): ReminderPlan => ({
  days: [4, 6], // Thursday and Saturday
  time: '18:30',
  weekStartsOn: 1,
  goal: 3,
  countedDays: 1,
  minMinutes: 10,
  ...overrides,
});

const describeAll = (list: ReturnType<typeof weeklyReminders>) =>
  list.map((r) => `${r.at.getMonth() + 1}/${r.at.getDate()} ${r.at.getHours()}:${String(r.at.getMinutes()).padStart(2, '0')} ${r.title}`);

describe('weekly reminders', () => {
  it('fall on the chosen days at the chosen time, 4 weeks ahead', () => {
    const list = weeklyReminders(plan(), NOW);
    expect(describeAll(list)).toEqual([
      '10/22 18:30 2 to go this week',
      '10/24 18:30 2 to go this week',
      '10/29 18:30 3 to go this week',
      '10/31 18:30 3 to go this week',
      '11/5 18:30 3 to go this week',
      '11/7 18:30 3 to go this week',
      '11/12 18:30 3 to go this week',
      '11/14 18:30 3 to go this week',
    ]);
    expect(list[0].body).toBe('Ten minutes counts. Your family will see it.');
    expect(list[0].identifier).toBe(`${REMINDER_PREFIX}2026-10-22`);
  });

  it('stay at 6:30 PM across the daylight-saving change', () => {
    const list = weeklyReminders(plan({ days: [7] }), NOW);
    expect(list.map((r) => r.at.getHours())).toEqual([18, 18, 18, 18]);
    expect(list[1].at.getDate()).toBe(1); // Sunday 1 November, the day the clocks change
  });

  it('leave out the rest of a kept week', () => {
    const list = weeklyReminders(plan({ countedDays: 3 }), NOW);
    expect(list[0].at.getDate()).toBe(29);
    expect(list).toHaveLength(6);
  });

  it('leave out today once the time has passed, and keep it before', () => {
    const thursdayEvening = new Date(2026, 9, 22, 19);
    expect(weeklyReminders(plan(), thursdayEvening)[0].at.getDate()).toBe(24);
    const thursdayMorning = new Date(2026, 9, 22, 9);
    expect(weeklyReminders(plan(), thursdayMorning)[0].at.getDate()).toBe(22);
  });

  it('skip days on a break', () => {
    const list = weeklyReminders(plan({ pauses: [{ startsOn: '2026-10-22', endsOn: '2026-10-30' }] }), NOW);
    expect(list.map((r) => r.at.getDate()).slice(0, 2)).toEqual([31, 5]);
  });

  it('follow a Sunday-start week', () => {
    // Saturday the 24th ends a Sunday-start week; Thursday the 29th is in the next.
    const list = weeklyReminders(plan({ weekStartsOn: 7, countedDays: 2 }), NOW);
    expect(describeAll(list).slice(0, 3)).toEqual(['10/22 18:30 1 to go this week', '10/24 18:30 1 to go this week', '10/29 18:30 3 to go this week']);
  });

  it('none without days', () => {
    expect(weeklyReminders(plan({ days: [] }), NOW)).toEqual([]);
  });

  it('build the words from the family minimum', () => {
    expect(NOTIFICATION_COPY.reminderBody(15)).toBe('Fifteen minutes counts. Your family will see it.');
    expect(NOTIFICATION_COPY.reminderBody(1)).toBe('One minute counts. Your family will see it.');
    expect(NOTIFICATION_COPY.reminderBody(25)).toBe('Twenty-five minutes counts. Your family will see it.');
    expect(NOTIFICATION_COPY.reminderTitle(1)).toBe('1 to go this week');
    expect(NOTIFICATION_COPY.timerTarget(20)).toBe('20 minutes in. Time to cool off.');
  });

  it('match design/copy/notifications.md word for word', () => {
    const doc = readFileSync(join(__dirname, '../../../design/copy/notifications.md'), 'utf8');
    expect(doc).toContain(`| ${NOTIFICATION_COPY.timerTarget(15)} |`);
    expect(doc).toContain(`| ${NOTIFICATION_COPY.timerSafety} |`);
    expect(doc).toContain(`| ${NOTIFICATION_COPY.reminderTitle(2)} | ${NOTIFICATION_COPY.reminderBody(10)} |`);
    expect(doc).toContain(`\`${REMINDER_PREFIX}\``);
  });

  it('read times and days safely', () => {
    expect(parseTime('07:05')).toEqual({ hour: 7, minute: 5 });
    expect(parseTime('banana')).toEqual({ hour: 18, minute: 30 });
    expect(normalizeDays([6, 4, 4, 9, 'x'])).toEqual([4, 6]);
    expect(normalizeDays(undefined)).toEqual([4, 6]);
  });
});

describe('legacy cleanup', () => {
  it('picks out Arro’s identifiers only', () => {
    expect(
      legacyIdentifiers(['arro-reminder-2026-10-21T01:30:00.000Z', 'arro-saved-w1', 'saunafam-reminder-2026-10-22', 'saunafam-timer-target']),
    ).toEqual(['arro-reminder-2026-10-21T01:30:00.000Z', 'arro-saved-w1']);
  });
});

describe('notification taps', () => {
  it('route the new push kinds', () => {
    expect(parseTap({ kind: 'session', sessionId: 's1', memberId: 'm' })).toEqual({ kind: 'session', sessionId: 's1' });
    expect(parseTap({ kind: 'session_comment', sessionId: 's1', commentId: 'c' })).toEqual({ kind: 'session_comment', sessionId: 's1' });
    expect(parseTap({ kind: 'nudge', memberId: 'm' })).toEqual({ kind: 'nudge', memberId: 'm' });
    expect(parseTap({ kind: 'weekend', memberId: 'm', weekStart: '2026-10-19' })).toEqual({ kind: 'weekend', weekStart: '2026-10-19' });
    expect(parseTap({ kind: 'joined', memberId: 'm' })).toEqual({ kind: 'joined', memberId: 'm' });
  });

  it('ignore build 8’s kinds and junk', () => {
    expect(parseTap({ kind: 'moved', workoutId: 'w' })).toBeNull();
    expect(parseTap({ kind: 'session' })).toBeNull();
    expect(parseTap(null)).toBeNull();
  });
});
