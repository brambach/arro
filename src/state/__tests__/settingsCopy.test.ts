import { describe, expect, it } from '@jest/globals';
import { addDays } from '../dates';
import { healthState } from '../healthSettings';
import {
  PLUS_PAYER_WARNING,
  RENAMED_SHEET,
  breakOptions,
  daysInOrder,
  plusNotice,
  reminderSentence,
  remindersValue,
  shortDaysLabel,
  signOutBody,
  stepTime,
} from '../settingsCopy';
import { withCurrent } from '../../screens/FamilyRulesScreen';
import { DEFAULT_REMINDER_DAYS, DEFAULT_REMINDER_TIME } from '../reminders';

// 2026-10-22 is a Thursday.
const THU = '2026-10-22';

describe('reminder labels', () => {
  it('names the days short, with words for the common sets', () => {
    expect(shortDaysLabel([4, 6])).toBe('Thu and Sat');
    expect(shortDaysLabel([1, 3, 5])).toBe('Mon, Wed and Fri');
    expect(shortDaysLabel([1, 2, 3, 4, 5])).toBe('Weekdays');
    expect(shortDaysLabel([6, 7])).toBe('Weekends');
    expect(shortDaysLabel([1, 2, 3, 4, 5, 6, 7])).toBe('Every day');
    expect(shortDaysLabel([])).toBe('No days');
  });

  it('defaults to Thursday and Saturday at 6:30 PM', () => {
    expect(remindersValue(true, DEFAULT_REMINDER_DAYS, DEFAULT_REMINDER_TIME)).toBe('Thu and Sat, 6:30 PM');
    expect(remindersValue(false, DEFAULT_REMINDER_DAYS, DEFAULT_REMINDER_TIME)).toBe('Off');
    expect(remindersValue(true, [], DEFAULT_REMINDER_TIME)).toBe('Off');
    expect(reminderSentence([4, 6], '18:30')).toBe('Thu and Sat at 6:30 PM, if your week isn’t kept yet.');
    expect(reminderSentence([], '18:30')).toBe('Pick at least one day.');
  });

  it('steps the time 15 minutes at a time, round midnight', () => {
    expect(stepTime('18:30', 15)).toBe('18:45');
    expect(stepTime('23:45', 15)).toBe('00:00');
    expect(stepTime('00:00', -15)).toBe('23:45');
  });

  it('orders the day picker by the family week start', () => {
    expect(daysInOrder(1)[0]).toBe(1);
    expect(daysInOrder(7)).toEqual([7, 1, 2, 3, 4, 5, 6]);
  });
});

describe('Take a break lengths', () => {
  it('rest of this week runs to the last day of the family week', () => {
    const [rest, week, two] = breakOptions([], THU, 1);
    expect(rest).toMatchObject({ key: 'rest', days: 4, fits: true, detail: 'Until Sunday' });
    expect(week).toMatchObject({ key: 'week', days: 7, fits: true });
    expect(two).toMatchObject({ key: 'twoWeeks', days: 14, fits: true });
  });

  it('a Sunday-start week ends on Saturday', () => {
    expect(breakOptions([], THU, 7)[0]).toMatchObject({ days: 3, detail: 'Until Saturday' });
  });

  it('on the last day of the week, the rest of it is just today', () => {
    expect(breakOptions([], '2026-10-25', 1)[0]).toMatchObject({ days: 1, detail: 'Just today, back tomorrow' });
  });

  it('marks lengths over the server limits (14 in any 30)', () => {
    const earlier = [{ startsOn: addDays(THU, -20), endsOn: addDays(THU, -11) }]; // 10 days
    const opts = breakOptions(earlier, THU, 1);
    expect(opts.map((o) => o.fits)).toEqual([true, false, false]);
  });
});

describe('Family rules tiles', () => {
  it('adds the family’s own number when it is outside the tiles', () => {
    expect(withCurrent([2, 3, 4, 5], 3)).toEqual([2, 3, 4, 5]);
    expect(withCurrent([2, 3, 4, 5], 7)).toEqual([2, 3, 4, 5, 7]);
    expect(withCurrent([5, 10, 15, 20], 1)).toEqual([1, 5, 10, 15, 20]);
  });
});

describe('quiet Plus lines', () => {
  const base = { active: true, status: 'active' as const, product: 'saunafam.plus.annual' as const, expiresAt: '2026-11-20T00:00:00Z', payerName: 'Maya', payerIsMe: false };

  it('says nothing while all is well', () => {
    expect(plusNotice(base, THU)).toBeNull();
  });

  it('a plan that ended: back to birch, nothing lost', () => {
    expect(plusNotice({ ...base, active: false, status: 'expired', expiresAt: '2026-10-03T00:00:00Z' }, THU)).toBe(
      'Plus ended on Oct 3. The wall is back to birch. Everything you logged is still here.',
    );
  });

  it('Apple couldn’t renew: only the payer hears about it', () => {
    expect(plusNotice({ ...base, status: 'grace_period', payerIsMe: true }, THU)).toBe(
      'Apple couldn’t renew Plus. You can update your payment in Settings.',
    );
    expect(plusNotice({ ...base, status: 'grace_period' }, THU)).toBeNull();
  });

  it('a week before a plan from someone who left runs out', () => {
    expect(plusNotice({ ...base, payerName: null, expiresAt: '2026-10-27T00:00:00Z' }, THU)).toBe(
      'Plus ends on Oct 27. The wall goes back to birch then, and everything you logged stays.',
    );
    expect(plusNotice({ ...base, payerName: null, product: 'saunafam.plus.lifetime', expiresAt: null }, THU)).toBeNull();
  });
});

describe('sheet and confirm copy', () => {
  it('"Arro is now Saunafam" says the spec words at the default rhythm', () => {
    expect(RENAMED_SHEET.body(3, 10)).toBe(
      'Your family is still here. We’ve moved from daily movement to a weekly sauna streak: 3 sessions a week each, 10 minutes or more. Everyone starts fresh at week one.',
    );
  });

  it('sign out names a running timer and anything unsent', () => {
    expect(signOutBody(false, 0)).toBe('Your family and your streak stay. Sign in with Apple to come back.');
    expect(signOutBody(true, 2)).toContain('The timer that’s running now will be thrown away.');
    expect(signOutBody(true, 2)).toContain('2 sessions haven’t sent yet and will be lost.');
  });

  it('the Plus payer warning is the spec’s, word for word', () => {
    expect(PLUS_PAYER_WARNING).toBe(
      'You pay for Saunafam Plus. Deleting your account doesn’t cancel it. Cancel in Settings, Apple ID, Subscriptions first.',
    );
  });
});

describe('Apple Health state', () => {
  it('reads the switch and what iOS says', () => {
    expect(healthState(false, 'granted')).toBe('off');
    expect(healthState(true, 'granted')).toBe('on');
    expect(healthState(true, 'denied')).toBe('denied');
    expect(healthState(true, 'unavailable')).toBe('unavailable');
    expect(healthState(true, 'notWired')).toBe('waiting');
  });
});
