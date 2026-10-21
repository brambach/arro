// Runs with TZ=America/Los_Angeles (package.json "test").
// "Never shown where it shouldn't be" (spec, Paid tier, Definition of done):
// the Plus sheet and the quiet card never appear in onboarding, the timer, the
// log form, after saving, on a milestone, after a missed week, for a family
// that already has Plus, or with plus_enabled false. Three ways: the rule
// itself (plusMayShow, nagCardState), the views built from the preview
// scenarios, and the source of every screen that must never show it.
import { describe, expect, it } from '@jest/globals';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { PreviewScenarioId, buildPreviewScenario, previewFamily } from '../../data/preview';
import { ViewInput, buildView, placeholderFamily } from '../buildView';
import { EMPTY_NAG, NEVER_PLUS_PLACES, nagEligibleFrom, PlusPlace, dismissNag, nagCardState, plusMayShow, recordNagShown, turnOffNag } from '../plus';
import { addDays } from '../dates';

const REAL = new Date(2026, 9, 20, 9);

function viewFor(id: PreviewScenarioId, overrides: Partial<ViewInput> = {}) {
  const sc = buildPreviewScenario(id, REAL);
  const family = sc.family ?? placeholderFamily({ id: 'sam', name: 'Sam', color: '#5F8794', joinedOn: '2026-10-01' }, 'Sunday sauna', sc.now);
  return buildView({
    myId: 'sam',
    family,
    now: sc.now,
    status: sc.status,
    offline: sc.offline,
    outbox: sc.outbox,
    drafts: sc.drafts,
    invited: sc.invited,
    timer: sc.timer,
    config: sc.config,
    appBuild: 9,
    unit: 'C',
    yesterdayOpen: true,
    ...overrides,
  });
}

const PLUS_ON = { ...buildPreviewScenario('plusEnabled', REAL).config };

describe('the rule: where Plus may ever appear', () => {
  const places: PlusPlace[] = ['onboarding', 'joining', 'timer', 'logForm', 'afterSave', 'weekKept', 'milestone', 'missedWeek', 'freeze', 'break', 'nudge', 'push', 'localNotification', 'email'];

  it('never in onboarding, joining, the timer, the log form, after saving, a milestone, a missed week, a freeze, a break, a nudge, a push or an email', () => {
    expect([...NEVER_PLUS_PLACES].sort()).toEqual([...places].sort());
    for (const place of places) {
      expect(plusMayShow(place, { plusEnabled: true, asked: true })).toBe(false);
      expect(plusMayShow(place, { plusEnabled: true, asked: false })).toBe(false);
    }
  });

  it('only where someone taps, in Settings, The wall, Week and Me; and the quiet card on Week', () => {
    for (const place of ['settings', 'wall', 'me'] as PlusPlace[]) {
      expect(plusMayShow(place, { plusEnabled: true, asked: true })).toBe(true);
      expect(plusMayShow(place, { plusEnabled: true, asked: false })).toBe(false);
    }
    expect(plusMayShow('week', { plusEnabled: true, asked: false })).toBe(true);
  });

  it('nowhere at all while plus_enabled is false', () => {
    for (const place of [...places, 'settings', 'wall', 'week', 'me'] as PlusPlace[]) {
      expect(plusMayShow(place, { plusEnabled: false, asked: true })).toBe(false);
    }
  });
});

describe('the views: no rows, no locks, no card where they don’t belong', () => {
  it('plus_enabled false: no Plus rows on Week, Me or Settings, no card, no wall row', () => {
    const v = viewFor('family');
    expect(v.plus.visible).toBe(false);
    expect(v.plus.rowLabel).toBeNull();
    expect(v.week).toMatchObject({ seeEveryWeek: false, printWall: false, nag: 'hidden' });
    expect(v.profile.plusRows).toBe(false);
    expect(v.week.wall.nail).toBe(false);
  });

  it('a family that already has Plus never sees the card', () => {
    expect(viewFor('plusActive').week.nag).toBe('hidden');
    expect(viewFor('plusMine').week.nag).toBe('hidden');
    expect(viewFor('plusFounding').week.nag).toBe('hidden');
  });

  it('the card would show for the same family without Plus', () => {
    expect(viewFor('plusEnabled').week.nag).toBe('new');
  });

  it('not after a missed week', () => {
    // 14 weeks, Jo missed the last two: a freeze covers one, the last one is broken.
    const sc = buildPreviewScenario('plusEnabled', REAL);
    const rot = [[1, 3, 5], [0, 2, 6], [1, 4, 6]];
    const family = previewFamily(sc.now, {
      pastWeeks: 14,
      days: (m, w) => (m === 'jo' && (w === -1 || w === -2) ? [2] : w === 0 ? [0] : rot[Math.abs(w) % 3]),
    });
    const weeks = [...new Map(family.history.map((h) => [h.weekStart, h])).values()].sort((a, b) => a.weekStart.localeCompare(b.weekStart));
    expect(weeks[weeks.length - 1].familyState).toBe('broken');
    // Plenty of kept weeks before it, so only the loss holds the card back.
    expect(nagEligibleFrom(weeks.map((w) => ({ weekStart: w.weekStart, state: w.familyState })), 8, '2026-10-22')).not.toBeNull();
    expect(viewFor('plusEnabled', { family }).week.nag).toBe('hidden');
  });

  it('not while you’re on a break', () => {
    const sc = buildPreviewScenario('plusEnabled', REAL);
    const today = '2026-10-22';
    const family = previewFamily(sc.now, {}, (f) => {
      f.pauses = [{ memberId: 'sam', startsOn: addDays(today, -1), endsOn: addDays(today, 3) }];
    });
    expect(viewFor('plusEnabled', { family }).week.nag).toBe('hidden');
  });

  it('not next to a milestone card', () => {
    const v = viewFor('plusEnabled', { milestones: {} });
    expect(v.milestone).not.toBeNull();
    expect(v.week.nag).toBe('hidden');
  });

  it('not for someone who joined less than 4 weeks ago, nor on first launch', () => {
    const sc = buildPreviewScenario('plusEnabled', REAL);
    const family = previewFamily(sc.now, {}, (f) => {
      f.members = f.members.map((m) => (m.id === 'sam' ? { ...m, joinedOn: '2026-10-10', joinedAt: '2026-10-10T17:00:00.000Z' } : m));
    });
    expect(viewFor('plusEnabled', { family }).week.nag).toBe('hidden');
    // A brand-new family has no kept weeks: nothing to wait for, nothing shown.
    expect(viewFor('newFamily', { config: PLUS_ON }).week.nag).toBe('hidden');
  });
});

describe('the nag cap', () => {
  const input = { plusEnabled: true, familyHasPlus: false, joinedOn: '2026-01-01', eligibleFrom: '2026-10-20' };
  it('once every 60 days, 3 times ever, never after Don’t show this again', () => {
    let m = dismissNag(recordNagShown(EMPTY_NAG, '2026-10-20'));
    expect(nagCardState({ ...input, today: '2026-12-18', memory: m })).toBe('hidden');
    expect(nagCardState({ ...input, today: '2026-12-19', memory: m })).toBe('new');
    m = dismissNag(recordNagShown(m, '2026-12-19'));
    m = dismissNag(recordNagShown(m, '2027-02-17'));
    expect(nagCardState({ ...input, today: '2029-01-01', memory: m })).toBe('hidden');
    expect(nagCardState({ ...input, today: '2026-10-21', memory: turnOffNag(EMPTY_NAG) })).toBe('hidden');
  });
});

describe('the source: screens that must never show Plus don’t reach it', () => {
  const src = join(__dirname, '..', '..');
  const read = (p: string) => readFileSync(join(src, p), 'utf8');
  const forbidden = [
    ...readdirSync(join(src, 'screens/onboarding'))
      .filter((f) => f.endsWith('.tsx') || f.endsWith('.ts'))
      .map((f) => `screens/onboarding/${f}`),
    'screens/TimerScreen.tsx',
    'screens/LogSessionScreen.tsx',
    'screens/MilestoneScreen.tsx',
    'screens/NudgeModalScreen.tsx',
    'screens/TakeBreakScreen.tsx',
    'screens/PastWeekScreen.tsx',
    'screens/TodayScreen.tsx',
    'screens/FeedScreen.tsx',
    'state/notifications.ts',
    'state/reminders.ts',
  ];
  // The Plus route, the sheet, the quiet card and the Plus copy.
  const reachesPlus = /navigate\(\s*['"]Plus['"]|PlusSheet|PLUS_CARD_COPY|PLUS_COPY|from '\.\.?\/(state\/)?plusFlow'|nagCardState/;

  it.each(forbidden)('%s', (file) => {
    expect(read(file)).not.toMatch(reachesPlus);
  });

  it('pushes and local notifications never mention Plus', () => {
    const copy = readFileSync(join(src, '..', 'design/copy/notifications.md'), 'utf8');
    expect(copy).not.toMatch(/\bPlus\b/);
    for (const f of ['state/notifications.ts', 'state/reminders.ts']) expect(read(f)).not.toMatch(/\bPlus\b/);
  });
});
