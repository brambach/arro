// Runs with TZ=America/Los_Angeles (package.json "test").
import { describe, expect, it } from '@jest/globals';
import { coolOff, resume, startTimer } from '../timer';
import {
  ARC_DOTS,
  arcProgress,
  dotAngle,
  fiveMinuteMark,
  isMajorDot,
  litDots,
  roomHeading,
  roomLine,
  roomSubheading,
  spokenClock,
  warmthStep,
} from '../timerRoom';

const START = new Date(2026, 9, 21, 19, 0, 0); // 7:00 PM
const at = (minutes: number, seconds = 0) => new Date(START.getTime() + minutes * 60_000 + seconds * 1000);
const fresh = () => startTimer(START, { targetMinutes: 15, saunaType: 'traditional' });

describe('the timer room', () => {
  it('lights the arc like the mockup: 51 of 61 dots at 12:40 of 15 minutes', () => {
    expect(litDots(arcProgress(fresh(), at(12, 40)))).toBe(51);
  });

  it('starts with the first dot lit and stays full past the target', () => {
    expect(litDots(arcProgress(fresh(), at(0)))).toBe(1);
    expect(litDots(arcProgress(fresh(), at(15)))).toBe(ARC_DOTS);
    expect(litDots(arcProgress(fresh(), at(48)))).toBe(ARC_DOTS);
  });

  it('opens the arc at the bottom, 150 degrees each side of the top, with a bigger dot every 20th', () => {
    expect((dotAngle(0) * 180) / Math.PI).toBeCloseTo(-150);
    expect((dotAngle(30) * 180) / Math.PI).toBeCloseTo(0);
    expect((dotAngle(60) * 180) / Math.PI).toBeCloseTo(150);
    expect([0, 20, 40, 60].every(isMajorDot)).toBe(true);
    expect(isMajorDot(51)).toBe(false);
  });

  it('warms the glow one step every 5 minutes, up to 5', () => {
    expect(warmthStep(fresh(), at(4, 59))).toBe(0);
    expect(warmthStep(fresh(), at(5))).toBe(1);
    expect(warmthStep(fresh(), at(12, 40))).toBe(2);
    expect(warmthStep(fresh(), at(90))).toBe(5);
  });

  it('counts 5-minute marks of heat only, so cooling off never ticks', () => {
    let t = coolOff(fresh(), at(9));
    expect(fiveMinuteMark(t, at(9))).toBe(1);
    expect(fiveMinuteMark(t, at(20))).toBe(1);
    t = resume(t, at(20));
    expect(fiveMinuteMark(t, at(21))).toBe(2);
  });

  it('says where you are', () => {
    let t = fresh();
    expect(roomHeading(t)).toBe('In the heat · Round 1');
    expect(roomSubheading(t)).toBe('Traditional · 15 min');
    expect(roomLine(t, at(12, 40))).toBe('Time to cool off at 7:15 PM');
    expect(roomLine(t, at(16))).toBe('That’s your 15 minutes. Cool off when you’re ready.');
    t = coolOff(t, at(16));
    expect(roomHeading(t)).toBe('Cooling off · Round 1 done');
    expect(roomLine(t, at(17))).toBe('Cooling off. Go back in when you’re ready.');
    t = resume(t, at(20));
    expect(roomHeading(t)).toBe('In the heat · Round 2');
  });

  it('works out the cool-off time from heat left, not from the start, after a round', () => {
    let t = coolOff(fresh(), at(10));
    t = resume(t, at(20));
    // 10 minutes of heat so far at 7:20; 5 to go.
    expect(roomLine(t, at(20))).toBe('Time to cool off at 7:25 PM');
  });

  it('speaks the numerals', () => {
    expect(spokenClock((12 * 60 + 40) * 1000)).toBe('12 minutes 40 seconds');
    expect(spokenClock(60_000)).toBe('1 minute');
    expect(spokenClock(9000)).toBe('9 seconds');
    expect(spokenClock((62 * 60 + 9) * 1000)).toBe('1 hour 2 minutes');
  });
});
