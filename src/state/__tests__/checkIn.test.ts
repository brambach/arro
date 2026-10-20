import { describe, expect, it } from '@jest/globals';
import { KEEP_HOLD_MS, checkInChange, checkInTimeline } from '../checkIn';
import { durations, emberPeakMs, moments } from '../../theme/motion';

describe('the check-in moment', () => {
  it('a new counted day ignites a dot; the family week turning kept plays the fill', () => {
    expect(checkInChange({ filled: 2, weekKept: false }, { filled: 3, weekKept: false })).toEqual({ ignite: true, keep: false });
    expect(checkInChange({ filled: 2, weekKept: false }, { filled: 3, weekKept: true })).toEqual({ ignite: true, keep: true });
    // A second session on a counted day changes nothing on the slat.
    expect(checkInChange({ filled: 2, weekKept: false }, { filled: 2, weekKept: false })).toEqual({ ignite: false, keep: false });
    // Someone else keeping it for the family while you look: just the fill.
    expect(checkInChange({ filled: 3, weekKept: false }, { filled: 3, weekKept: true })).toEqual({ ignite: false, keep: true });
    // Taking a session back never plays anything.
    expect(checkInChange({ filled: 3, weekKept: true }, { filled: 2, weekKept: false })).toEqual({ ignite: false, keep: false });
  });

  it('the fill waits for the dot to land, then the line follows the sparks', () => {
    const t = checkInTimeline({ ignite: true, keep: true }, false);
    expect(t.fillAt).toBe(durations.ember + KEEP_HOLD_MS);
    expect(t.fillAt).toBeGreaterThan(emberPeakMs);
    expect(t.fullAt).toBe(t.fillAt + moments.weekKept.fill.duration);
    expect(t.lineAt).toBe(t.fullAt + moments.weekKept.lineDelay);
    expect(checkInTimeline({ ignite: false, keep: true }, false).fillAt).toBe(0);
  });

  it('Reduce Motion: the slat turns kept and the line crossfades, no waiting', () => {
    expect(checkInTimeline({ ignite: true, keep: true }, true)).toEqual({ fillAt: 0, fullAt: durations.utility, lineAt: durations.utility });
  });
});
