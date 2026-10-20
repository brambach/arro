// Runs with TZ=America/Los_Angeles (package.json "test").
import { describe, expect, it } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  STALE_AFTER_MS,
  TIMER_KEY,
  announcement,
  clockLabel,
  coolOff,
  coolingMs,
  continuousHeatMs,
  defaultTargetMinutes,
  finish,
  heatMs,
  isStale,
  loadLastSaunaType,
  loadTimer,
  notificationTimes,
  parseTimer,
  phase,
  resume,
  saveLastSaunaType,
  saveTimer,
  setSaunaType,
  setTarget,
  startTimer,
  timerBarLabel,
} from '../timer';

const START = new Date(2026, 9, 21, 19, 0, 0); // Wednesday 7:00 PM
const at = (minutes: number, seconds = 0) => new Date(START.getTime() + minutes * 60_000 + seconds * 1000);
const fresh = () => startTimer(START, { targetMinutes: 15, saunaType: 'traditional' });

describe('timer math', () => {
  it('works out heat time from timestamps alone', () => {
    const t = fresh();
    expect(phase(t)).toBe('heat');
    expect(heatMs(t, at(12, 4))).toBe((12 * 60 + 4) * 1000);
    expect(clockLabel(heatMs(t, at(12, 4)))).toBe('12:04');
  });

  it('survives the app being killed: a stored timer gives the same time', async () => {
    const t = fresh();
    await saveTimer(t);
    const back = await loadTimer();
    expect(back).toEqual(t);
    expect(heatMs(back as NonNullable<typeof back>, at(40))).toBe(40 * 60_000);
    expect(await AsyncStorage.getItem(TIMER_KEY)).not.toBeNull();
    await saveTimer(null);
    expect(await loadTimer()).toBeNull();
  });

  it('adding a round pauses the heat clock while cooling off, and resuming starts the next round', () => {
    let t = fresh();
    t = coolOff(t, at(10));
    expect(phase(t)).toBe('cooling');
    expect(heatMs(t, at(15))).toBe(10 * 60_000);
    expect(coolingMs(t, at(15))).toBe(5 * 60_000);
    t = resume(t, at(15));
    expect(phase(t)).toBe('heat');
    expect(t.rounds).toHaveLength(2);
    expect(heatMs(t, at(22))).toBe(17 * 60_000);
    expect(continuousHeatMs(t, at(22))).toBe(7 * 60_000);
  });

  it('cooling off twice or resuming in the heat changes nothing', () => {
    const t = fresh();
    expect(resume(t, at(5))).toBe(t);
    const c = coolOff(t, at(5));
    expect(coolOff(c, at(6))).toBe(c);
  });

  it('stops at 10 rounds', () => {
    let t = fresh();
    for (let i = 1; i <= 12; i++) t = resume(coolOff(t, at(i * 2)), at(i * 2 + 1));
    expect(t.rounds).toHaveLength(10);
  });

  it('session minutes are heat minutes only, the sum of the rounds', () => {
    let t = fresh();
    t = coolOff(t, at(12));
    t = resume(t, at(20));
    const result = finish(t, at(28));
    expect(result).toMatchObject({ durationMinutes: 20, rounds: 2, saunaType: 'traditional', startedAt: START.toISOString() });
  });

  it('finishing while cooling off drops the open cooling stretch', () => {
    let t = fresh();
    t = coolOff(t, at(12));
    t = resume(t, at(15));
    t = coolOff(t, at(23));
    const result = finish(t, at(45));
    expect(result.durationMinutes).toBe(20);
    expect(result.rounds).toBe(2);
  });

  it('rounds to whole minutes, at least 1 and at most 240', () => {
    expect(finish(fresh(), at(0, 20)).durationMinutes).toBe(1);
    expect(finish(fresh(), at(14, 31)).durationMinutes).toBe(15);
    expect(finish(fresh(), at(300)).durationMinutes).toBe(240);
  });

  it('crossing midnight dates the session by its start', () => {
    const late = new Date(2026, 9, 21, 23, 50);
    const t = startTimer(late, { targetMinutes: 15, saunaType: 'smoke' });
    const result = finish(t, new Date(2026, 9, 22, 0, 20));
    expect(result.localDate).toBe('2026-10-21');
    expect(result.durationMinutes).toBe(30);
  });

  it('asks "Still going?" from 3 hours after the start', () => {
    const t = fresh();
    expect(isStale(t, new Date(START.getTime() + STALE_AFTER_MS - 1000))).toBe(false);
    expect(isStale(t, new Date(START.getTime() + STALE_AFTER_MS))).toBe(true);
  });

  it('target and type can change while it runs', () => {
    const t = setSaunaType(setTarget(fresh(), 20), 'infrared');
    expect(t).toMatchObject({ targetMinutes: 20, saunaType: 'infrared' });
  });

  it('labels the slim bar on Today', () => {
    expect(timerBarLabel(fresh(), at(12, 4))).toBe('In the heat · 12:04');
    expect(timerBarLabel(coolOff(fresh(), at(3)), at(9))).toBe('Cooling off · 3:00');
    expect(clockLabel((62 * 60 + 9) * 1000)).toBe('1:02:09');
  });

  it('announces every 5 minutes for VoiceOver', () => {
    expect(announcement(fresh(), at(4, 59), 0)).toBeNull();
    expect(announcement(fresh(), at(5), 0)).toBe('5 minutes');
    expect(announcement(fresh(), at(7), 5)).toBeNull();
    expect(announcement(fresh(), at(10, 1), 5)).toBe('10 minutes');
  });
});

describe('timer notifications', () => {
  it('at the start: the target in 15 minutes, the safety line at 45', () => {
    const times = notificationTimes(fresh(), START);
    expect(times.target).toEqual(at(15));
    expect(times.safety).toEqual(at(45));
  });

  it('after a round, the target counts the heat already done and the safety line restarts', () => {
    let t = coolOff(fresh(), at(10));
    expect(notificationTimes(t, at(12))).toEqual({ target: null, safety: null });
    t = resume(t, at(14));
    const times = notificationTimes(t, at(14));
    expect(times.target).toEqual(at(19));
    expect(times.safety).toEqual(at(59));
  });

  it('nothing past due', () => {
    const times = notificationTimes(fresh(), at(50));
    expect(times).toEqual({ target: null, safety: null });
  });
});

describe('defaults', () => {
  it('target: the family minimum, rounded up to at least 15, on a one-tap choice', () => {
    expect(defaultTargetMinutes(5)).toBe(15);
    expect(defaultTargetMinutes(10)).toBe(15);
    expect(defaultTargetMinutes(15)).toBe(15);
    expect(defaultTargetMinutes(16)).toBe(20);
    expect(defaultTargetMinutes(25)).toBe(30);
    expect(defaultTargetMinutes(45)).toBe(45);
  });

  it('remembers the last sauna type, traditional before any', async () => {
    await AsyncStorage.clear();
    expect(await loadLastSaunaType()).toBe('traditional');
    await saveLastSaunaType('banya');
    expect(await loadLastSaunaType()).toBe('banya');
  });

  it('a broken stored timer reads as no timer', () => {
    expect(parseTimer('nope')).toBeNull();
    expect(parseTimer(JSON.stringify({ startedAt: 'x', rounds: [], targetMinutes: 15, saunaType: 'traditional' }))).toBeNull();
    expect(parseTimer(JSON.stringify({ ...fresh(), saunaType: 'sweat lodge' }))).toBeNull();
  });
});
