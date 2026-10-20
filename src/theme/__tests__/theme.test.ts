import { describe, expect, it, jest } from '@jest/globals';
import { layout, spaceScale, space } from '../tokens';
import { durations, emberPeakMs, moments, momentSummary, peakFraction, springs, springTouchdownMs } from '../motion';
import { hapticTable } from '../haptics';
import { grain, wallLines, wisp } from '../../components/material';

jest.mock('expo-haptics', () => ({}));

describe('spacing', () => {
  it('only uses the 4 pt scale', () => {
    expect([...spaceScale]).toEqual([4, 8, 12, 16, 20, 24, 32, 40, 56, 72]);
    for (const v of Object.values(space)) expect(spaceScale).toContain(v);
    for (const k of ['gutter', 'inset', 'cardPad', 'section'] as const) expect(spaceScale).toContain(layout[k]);
  });
});

describe('motion', () => {
  it('has the spec tokens', () => {
    expect(durations).toEqual({ settle: 1100, ember: 520, utility: 240 });
    expect(moments.splash.total).toBe(1500);
    expect(moments.doorCloses.room.duration).toBe(800);
    expect(moments.doorCloses.glowRise.duration).toBe(1400);
    expect(moments.finishCool.glow.duration).toBe(700);
    expect(moments.milestoneWall.perSlat).toBe(50);
    expect(moments.plusWoodCrossfade.duration).toBe(400);
  });

  it('times the ember haptic to the overshoot peak, past the middle', () => {
    expect(peakFraction('ember')).toBeGreaterThan(0.5);
    expect(peakFraction('ember')).toBeLessThan(1);
    expect(emberPeakMs).toBeLessThan(durations.ember);
    // A curve with no overshoot peaks at its end.
    expect(peakFraction('settle')).toBeCloseTo(1, 2);
  });

  it('finds a slat spring touchdown before it settles', () => {
    const t = springTouchdownMs(springs.slat);
    expect(t).toBeGreaterThan(120);
    expect(t).toBeLessThan(300);
  });
});

describe('the moment summary', () => {
  it('matches the moments it describes', () => {
    const get = (path: string): unknown => path.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown>)[k], moments);
    for (const row of momentSummary) {
      const m = get(row.key) as { start?: number; duration?: number };
      expect(m).toBeDefined();
      if (row.ms.includes(' to ')) {
        const [a, b] = row.ms.split(' to ').map(Number);
        expect(m.start).toBe(a);
        expect((m.start ?? 0) + (m.duration ?? 0)).toBe(b);
      } else if (/^\d+$/.test(row.ms)) {
        expect(m.duration).toBe(Number(row.ms));
      }
    }
  });
});

describe('haptics', () => {
  it('maps every moment in the spec table', () => {
    expect(hapticTable.map((h) => h.moment)).toEqual([
      'timer start',
      '5-minute tick',
      'löyly',
      'finish',
      'save',
      'cheer',
      'week kept',
      'milestone',
      'errors',
    ]);
    expect(hapticTable.find((h) => h.moment === 'milestone')?.kind).toEqual(['heavy', 'success']);
  });
});

describe('materials', () => {
  it('draws the same grain, wall and wisps for the same seed', () => {
    expect(grain(300, 21, 5)).toEqual(grain(300, 21, 5));
    expect(grain(300, 21, 5)).not.toEqual(grain(300, 21, 6));
    const xs = wallLines(390, 7);
    expect(xs).toEqual(wallLines(390, 7));
    // About every 28 pt, never closer than 24 or wider than 32.
    xs.slice(1).forEach((x, i) => {
      expect(x - xs[i]).toBeGreaterThanOrEqual(24);
      expect(x - xs[i]).toBeLessThanOrEqual(32);
    });
    const w = wisp(100, 400, 200, 3);
    expect(w.length).toBeGreaterThan(200);
    expect(w.d.startsWith('M100.0 400.0')).toBe(true);
  });
});
