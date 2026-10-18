// Runs with TZ=America/Los_Angeles (package.json "test"), so "yesterday" closes at
// 5pm in summer time and the 1 November daylight-saving change is in range.
import { describe, expect, it } from '@jest/globals';
import {
  addDays,
  dayKey,
  daysBetween,
  fromKey,
  timeLabel,
  utcDayKey,
  weekdayIndex,
  yesterdayClosedAt,
  yesterdayOpen,
} from '../dates';

describe('day keys', () => {
  it('uses the local day, not the UTC one', () => {
    const lateEvening = new Date('2026-10-17T05:00:00Z'); // 10pm on the 16th in Los Angeles
    expect(dayKey(lateEvening)).toBe('2026-10-16');
    expect(utcDayKey(lateEvening)).toBe('2026-10-17');
  });

  it('round-trips through fromKey at local noon', () => {
    const d = fromKey('2026-10-05');
    expect(d.getHours()).toBe(12);
    expect(dayKey(d)).toBe('2026-10-05');
  });

  it('adds days across the end and start of daylight saving', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-10-31', 2)).toBe('2026-11-02');
    expect(addDays('2026-03-07', 1)).toBe('2026-03-08');
    expect(addDays('2026-03-08', -1)).toBe('2026-03-07');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });

  it('counts whole days between keys, across daylight saving', () => {
    expect(daysBetween('2026-10-30', '2026-11-03')).toBe(4);
    expect(daysBetween('2026-11-03', '2026-10-30')).toBe(-4);
    expect(daysBetween('2026-10-17', '2026-10-17')).toBe(0);
  });

  it('numbers weekdays from Monday', () => {
    expect(weekdayIndex('2026-10-19')).toBe(0); // Monday
    expect(weekdayIndex('2026-10-18')).toBe(6); // Sunday
  });
});

describe('logging yesterday', () => {
  it('is open while the local date has caught up with UTC', () => {
    expect(yesterdayOpen(new Date('2026-10-17T17:00:00Z'))).toBe(true); // 10am
  });

  it('closes once UTC has moved to the next day', () => {
    expect(yesterdayOpen(new Date('2026-10-18T01:00:00Z'))).toBe(false); // 6pm on the 17th
  });

  it('says when it closed: the last UTC midnight, in local time', () => {
    expect(yesterdayClosedAt(new Date('2026-10-18T01:00:00Z'))).toBe('5:00 PM');
  });
});

describe('timeLabel', () => {
  it('writes a 12-hour time', () => {
    expect(timeLabel(new Date(2026, 9, 17, 0, 5))).toBe('12:05 AM');
    expect(timeLabel(new Date(2026, 9, 17, 12, 30))).toBe('12:30 PM');
    expect(timeLabel(new Date(2026, 9, 17, 18, 0))).toBe('6:00 PM');
  });
});
