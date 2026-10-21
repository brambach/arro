// Runs with TZ=America/Los_Angeles (package.json "test").
// The Plus extras: the Heat log, every week, the wall poster, timer faces and app icons.
import { describe, expect, it } from '@jest/globals';
import { buildPreviewScenario } from '../../data/preview';
import { POSTER_H, POSTER_W } from '../../components/WallPoster';
import { posterLayout, WEEKS_PER_COLUMN } from '../../components/posterLayout';
import { monthRows, posterData, weekLook, longDate } from '../archive';
import { HeatSession, heatLog, hoursLabel, sampleHeatLog } from '../heatLog';
import { DEFAULT_LOOK, effectiveLook, loadLooks, parseLooks, saveLooks } from '../look';

const REAL = new Date(2026, 9, 20, 9);

const s = (over: Partial<HeatSession>): HeatSession => ({
  id: Math.random().toString(36),
  memberId: 'sam',
  sharedId: null,
  localDate: '2026-10-01',
  durationMinutes: 20,
  saunaType: 'traditional',
  place: null,
  ...over,
});

describe('the Heat log', () => {
  const members = [
    { id: 'sam', name: 'Sam' },
    { id: 'maya', name: 'Maya' },
    { id: 'jo', name: 'Jo' },
  ];

  it('adds up hours by month for the last 12 months, and this year', () => {
    const log = heatLog(
      [
        s({ localDate: '2026-10-01', durationMinutes: 30 }),
        s({ localDate: '2026-10-02', durationMinutes: 30, memberId: 'maya' }),
        s({ localDate: '2026-01-05', durationMinutes: 45 }),
        s({ localDate: '2025-11-05', durationMinutes: 15 }),
        s({ localDate: '2025-10-05', durationMinutes: 99 }),
      ],
      members,
      9,
      '2026-10-22',
    );
    expect(log.months.map((m) => m.key)).toEqual([
      '2025-11', '2025-12', '2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10',
    ]);
    expect(log.months[0]).toMatchObject({ label: 'Nov', minutes: 15 });
    expect(log.months[11]).toMatchObject({ label: 'Oct', minutes: 60 });
    expect(log.maxMinutes).toBe(60);
    expect(log.hoursThisYear).toBe(1.8); // 105 minutes
    expect(log.bestRun).toBe(9);
  });

  it('counts a shared session once by type and place, but everyone’s minutes', () => {
    const log = heatLog(
      [
        s({ id: 'a', sharedId: 'a', place: 'Lake cabin', saunaType: 'wood_fired' }),
        s({ id: 'b', sharedId: 'a', memberId: 'maya', place: 'Lake cabin', saunaType: 'wood_fired' }),
        s({ id: 'c', place: 'lake cabin ', saunaType: 'traditional' }),
        s({ id: 'd', place: 'Home', saunaType: 'traditional' }),
      ],
      members,
      0,
      '2026-10-22',
    );
    expect(log.sessions).toBe(3);
    expect(log.types).toEqual([
      { type: 'traditional', label: 'Traditional', count: 2 },
      { type: 'wood_fired', label: 'Wood-fired', count: 1 },
    ]);
    expect(log.places).toEqual([
      { place: 'Lake cabin', count: 2 },
      { place: 'Home', count: 1 },
    ]);
    expect(log.months[11].minutes).toBe(80);
  });

  it('lists everyone’s longest session alphabetically, no ranking', () => {
    const log = heatLog(
      [s({ memberId: 'sam', durationMinutes: 25 }), s({ memberId: 'maya', durationMinutes: 40, localDate: '2026-09-12' }), s({ memberId: 'jo', durationMinutes: 15 })],
      members,
      0,
      '2026-10-22',
    );
    expect(log.longest.map((l) => [l.name, l.minutes])).toEqual([
      ['Jo', 15],
      ['Maya', 40],
      ['Sam', 25],
    ]);
    expect(log.longest[1].date).toBe('Sep 12');
  });

  it('is empty with no sessions; the locked preview is made-up numbers', () => {
    expect(heatLog([], members, 0, '2026-10-22').empty).toBe(true);
    expect(sampleHeatLog('2026-10-22').longest).toEqual([]);
    expect(hoursLabel(40)).toBe('40 minutes');
    expect(hoursLabel(60)).toBe('1 hour');
    expect(hoursLabel(150)).toBe('2.5 hours');
  });
});

describe('every week and the poster', () => {
  const founding = buildPreviewScenario('plusFounding', REAL);
  const archive = founding.archive;

  it('the preview keeps every week, past the 12 on the phone', () => {
    expect(founding.family?.history.length).toBeLessThanOrEqual(12 * 3);
    const weeks = new Set(archive?.history.map((h) => h.weekStart));
    expect(weeks.size).toBe(40);
  });

  it('groups weeks by month, newest month first', () => {
    const rows = monthRows(archive?.history ?? [], 'sam');
    expect(rows.reduce((n, r) => n + r.weeks.length, 0)).toBe(40);
    expect(rows[0].key > rows[rows.length - 1].key).toBe(true);
    for (const r of rows) {
      expect(r.weeks.length).toBeLessThanOrEqual(5);
      expect(r.kept).toBeLessThanOrEqual(r.weeks.length);
    }
    expect(rows[0].label).toMatch(/^[A-Z][a-z]+ \d{4}$/);
  });

  it('a kept week is kept, a freeze is frozen, a break is paused, the rest open', () => {
    expect(weekLook({ weekStart: '', state: 'counted', freezeUsed: false, current: false })).toBe('kept');
    expect(weekLook({ weekStart: '', state: 'counted', freezeUsed: true, current: false })).toBe('frozen');
    expect(weekLook({ weekStart: '', state: 'skip', freezeUsed: false, current: false })).toBe('paused');
    expect(weekLook({ weekStart: '', state: 'broken', freezeUsed: false, current: false })).toBe('open');
  });

  it('the poster has every week, its dates and its count', () => {
    const p = posterData(archive?.history ?? [], 'sam');
    expect(p.weeks).toHaveLength(40);
    expect(p.summary).toBe(`${p.kept} weeks kept, together`);
    expect(p.dates).toMatch(/^[A-Z][a-z]{2} \d{1,2}, \d{4} to [A-Z][a-z]{2} \d{1,2}, \d{4}$/);
    expect(longDate('2026-03-02')).toBe('Mar 2, 2026');
    expect(posterData([], 'sam')).toMatchObject({ weeks: [], dates: '', kept: 0 });
  });

  it('lays every week inside the page, in columns of 13, for 1 to 520 weeks', () => {
    for (const n of [1, 13, 14, 40, 104, 520]) {
      const l = posterLayout(n, POSTER_W, POSTER_H);
      expect(l.slots).toHaveLength(n);
      expect(l.columns).toBe(Math.ceil(n / WEEKS_PER_COLUMN));
      for (const slot of l.slots) {
        expect(slot.x).toBeGreaterThanOrEqual(0);
        expect(slot.x + slot.w).toBeLessThanOrEqual(POSTER_W);
        expect(slot.y).toBeGreaterThan(400);
        expect(slot.y + slot.h).toBeLessThan(POSTER_H - 380);
        expect(slot.w).toBeGreaterThan(0);
      }
    }
    // Oldest at the top left, reading down.
    const l = posterLayout(14, POSTER_W, POSTER_H);
    expect(l.slots[1].y).toBeGreaterThan(l.slots[0].y);
    expect(l.slots[13].x).toBeGreaterThan(l.slots[12].x);
    expect(l.titleSize(30)).toBeLessThan(l.titleSize(12));
  });
});

describe('timer faces and app icons', () => {
  const coal = { timerFace: 'coal' as const, appIcon: 'Lake' as const };

  it('show only while the family has Plus and it’s switched on', () => {
    expect(effectiveLook(coal, { visible: true, active: true })).toEqual(coal);
    expect(effectiveLook(coal, { visible: true, active: false })).toEqual(DEFAULT_LOOK);
    expect(effectiveLook(coal, { visible: false, active: true })).toEqual(DEFAULT_LOOK);
  });

  it('are kept per person on this phone, and bad values fall back', async () => {
    await saveLooks({ sam: coal });
    expect(await loadLooks()).toEqual({ sam: coal });
    expect(parseLooks('{"sam":{"timerFace":"neon","appIcon":"Gold"}}')).toEqual({ sam: DEFAULT_LOOK });
    expect(parseLooks('nope')).toEqual({});
  });
});
