import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type * as HealthKitModule from '@appeeky/expo-healthkit';
import {
  HEALTH_SETTING_KEY,
  HEALTH_WRITTEN_KEY,
  MINDFUL_SESSION,
  healthAvailable,
  healthPermission,
  mindfulSample,
  parseHealthSetting,
  parseWritten,
  requestHealthPermission,
  saveHealthSetting,
  sessionsToWrite,
  setHealthKitForTests,
  writeMindfulMinutes,
} from '../health';
import { healthState } from '../healthSettings';

const NOW = new Date('2026-10-22T18:00:00.000Z');
const ON = { enabled: true, since: '2026-10-22T12:00:00.000Z' };

function fakeHealthKit(opts: { status?: number; failIds?: string[] } = {}) {
  let status = opts.status ?? 0;
  const saved: { type: string; startDate: unknown; endDate: unknown; metadata?: Record<string, string> }[] = [];
  const requests: unknown[] = [];
  const hk = {
    AuthorizationStatus: { notDetermined: 0, sharingDenied: 1, sharingAuthorized: 2 },
    isAvailable: () => true,
    getAuthorizationStatus: jest.fn(async () => status),
    requestAuthorization: jest.fn(async (o: unknown) => {
      requests.push(o);
      if (status === 0) status = 2;
      return true;
    }),
    saveCategorySample: jest.fn(async (s: (typeof saved)[number]) => {
      if (opts.failIds?.includes(s.metadata?.HKExternalUUID ?? '')) throw new Error('nope');
      saved.push(s);
      return 'uuid';
    }),
  };
  setHealthKitForTests(hk as unknown as typeof HealthKitModule);
  return { hk, saved, requests, deny: () => (status = 1) };
}

const session = (id: string, startedAt: string, durationMinutes = 15, pending?: boolean) => ({ id, startedAt, durationMinutes, pending });

beforeEach(async () => {
  await AsyncStorage.clear();
  setHealthKitForTests(undefined);
});

describe('mindfulSample', () => {
  it('is the heat minutes from the start, tagged with the session id', () => {
    expect(mindfulSample(session('s1', '2026-10-22T17:00:00.000Z', 20))).toEqual({
      type: MINDFUL_SESSION,
      value: 0,
      startDate: '2026-10-22T17:00:00.000Z',
      endDate: '2026-10-22T17:20:00.000Z',
      metadata: { HKExternalUUID: 's1' },
    });
  });

  it('caps at the server limit and refuses nonsense', () => {
    expect(mindfulSample(session('s', '2026-10-22T10:00:00.000Z', 500))?.endDate).toBe('2026-10-22T14:00:00.000Z');
    expect(mindfulSample(session('s', 'not a date'))).toBeNull();
    expect(mindfulSample(session('s', '2026-10-22T10:00:00.000Z', 0))).toBeNull();
  });
});

describe('sessionsToWrite', () => {
  const list = [
    session('later', '2026-10-22T17:00:00.000Z'),
    session('weekAgo', '2026-10-16T09:00:00.000Z'),
    session('tooOld', '2026-10-15T09:00:00.000Z'),
    session('pending', '2026-10-22T16:00:00.000Z', 15, true),
    session('done', '2026-10-21T16:00:00.000Z'),
    session('later', '2026-10-22T17:00:00.000Z'),
  ];

  it('takes saved, unwritten sessions from a week before the switch went on, soonest first, once each', () => {
    expect(sessionsToWrite(list, ON, new Set(['done']), NOW).map((s) => s.id)).toEqual(['weekAgo', 'later']);
  });

  it('writes nothing while off', () => {
    expect(sessionsToWrite(list, { enabled: false, since: null }, new Set(), NOW)).toEqual([]);
  });

  it('counts a week back from now for a setting saved before it had a time', () => {
    expect(sessionsToWrite(list, { enabled: true, since: null }, new Set(), NOW).map((s) => s.id)).toEqual([
      'weekAgo',
      'done',
      'later',
    ]);
  });
});

describe('the stored setting and ids', () => {
  it('reads M10’s shape, the new one, and junk', () => {
    expect(parseHealthSetting('{"enabled":true}')).toEqual({ enabled: true, since: null });
    expect(parseHealthSetting(JSON.stringify(ON))).toEqual(ON);
    expect(parseHealthSetting('{"enabled":"yes","since":"x"}')).toEqual({ enabled: false, since: null });
    expect(parseHealthSetting('{')).toEqual({ enabled: false, since: null });
    expect(parseHealthSetting(null)).toEqual({ enabled: false, since: null });
    expect(parseWritten('["a",2,"b"]')).toEqual(['a', 'b']);
    expect(parseWritten('nope')).toEqual([]);
  });

  it('keeps the time it went on, and forgets it when off', async () => {
    await saveHealthSetting(true, NOW);
    expect(JSON.parse((await AsyncStorage.getItem(HEALTH_SETTING_KEY)) ?? '')).toEqual({ enabled: true, since: NOW.toISOString() });
    await saveHealthSetting(false, NOW);
    expect(JSON.parse((await AsyncStorage.getItem(HEALTH_SETTING_KEY)) ?? '')).toEqual({ enabled: false, since: null });
  });
});

describe('permission', () => {
  it('is unavailable without the native module (Jest, web, an old dev client)', async () => {
    setHealthKitForTests(null);
    expect(healthAvailable()).toBe(false);
    expect(await healthPermission()).toBe('unavailable');
    expect(await requestHealthPermission()).toBe('unavailable');
    expect(healthState(true, 'unavailable')).toBe('unavailable');
  });

  it('asks for write access to mindful minutes only, and reports the answer', async () => {
    const { requests } = fakeHealthKit();
    expect(await healthPermission()).toBe('notAsked');
    expect(await requestHealthPermission()).toBe('granted');
    expect(requests).toEqual([{ toShare: [MINDFUL_SESSION] }]);
  });

  it('reads a no from iOS', async () => {
    fakeHealthKit({ status: 1 });
    expect(await requestHealthPermission()).toBe('denied');
    expect(healthState(true, 'denied')).toBe('denied');
  });
});

describe('writeMindfulMinutes', () => {
  const today = [session('a', '2026-10-22T17:00:00.000Z', 20), session('b', '2026-10-22T15:00:00.000Z', 12)];

  it('does nothing while the switch is off', async () => {
    const { saved } = fakeHealthKit({ status: 2 });
    expect(await writeMindfulMinutes(today, NOW)).toEqual({ written: [], skipped: 'off', failed: 0 });
    expect(saved).toHaveLength(0);
  });

  it('writes each session once, however often it is asked', async () => {
    const { saved } = fakeHealthKit({ status: 2 });
    await AsyncStorage.setItem(HEALTH_SETTING_KEY, JSON.stringify(ON));
    const [first, second] = await Promise.all([writeMindfulMinutes(today, NOW), writeMindfulMinutes(today, NOW)]);
    expect(first.written).toEqual(['b', 'a']);
    expect(second.written).toEqual([]);
    expect(saved.map((s) => s.metadata?.HKExternalUUID)).toEqual(['b', 'a']);
    expect(parseWritten(await AsyncStorage.getItem(HEALTH_WRITTEN_KEY))).toEqual(['b', 'a']);
    // An edit later (same id, new minutes) doesn't write it again.
    expect((await writeMindfulMinutes([session('a', '2026-10-22T17:00:00.000Z', 25)], NOW)).written).toEqual([]);
  });

  it('skips quietly when Health says no, and writes once it says yes', async () => {
    const fake = fakeHealthKit({ status: 1 });
    await AsyncStorage.setItem(HEALTH_SETTING_KEY, JSON.stringify(ON));
    expect(await writeMindfulMinutes(today, NOW)).toEqual({ written: [], skipped: 'notAllowed', failed: 0 });
    expect(fake.saved).toHaveLength(0);
    fakeHealthKit({ status: 2 });
    expect((await writeMindfulMinutes(today, NOW)).written).toEqual(['b', 'a']);
  });

  it('a failed write never throws, and is tried again next time', async () => {
    fakeHealthKit({ status: 2, failIds: ['a'] });
    await AsyncStorage.setItem(HEALTH_SETTING_KEY, JSON.stringify(ON));
    expect(await writeMindfulMinutes(today, NOW)).toEqual({ written: ['b'], skipped: null, failed: 1 });
    const { saved } = fakeHealthKit({ status: 2 });
    expect((await writeMindfulMinutes(today, NOW)).written).toEqual(['a']);
    expect(saved).toHaveLength(1);
  });

  it('is unavailable without Health', async () => {
    setHealthKitForTests(null);
    await AsyncStorage.setItem(HEALTH_SETTING_KEY, JSON.stringify(ON));
    expect((await writeMindfulMinutes(today, NOW)).skipped).toBe('unavailable');
  });
});
