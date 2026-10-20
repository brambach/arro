// Runs with TZ=America/Los_Angeles (package.json "test").
import { describe, expect, it } from '@jest/globals';
import { FamilySnapshot } from '../../data/types';
import { PREVIEW_SCENARIOS, PreviewScenarioId, buildPreviewScenario, previewFamily } from '../../data/preview';
import {
  NO_OPTIMISTIC,
  ViewInput,
  applyOptimistic,
  buildView,
  familyLine,
  hoursLabel,
  pastStatusLabel,
  pastWeekOutcome,
  placeholderFamily,
  startingLabel,
  weekDots,
  whenLabel,
} from '../buildView';
import { recordNagShown, EMPTY_NAG } from '../plus';
import type { OutboxEntry } from '../outbox';

// Real Tuesday 20 October 2026; the preview clock is Thursday the 22nd at 4:10 PM.
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
    milestones: sc.milestonesShown ? undefined : {},
    ...overrides,
  });
}

describe('every preview scenario', () => {
  it.each(PREVIEW_SCENARIOS.map((s) => s.id))('%s builds a view', (id) => {
    const v = viewFor(id);
    expect(v.me.id).toBe('sam');
    expect(v.today.greeting).toMatch(/^Good (morning|afternoon|evening), Sam\.$/);
  });
});

describe('Today', () => {
  const v = viewFor('family');

  it('greets with the date and time of day', () => {
    expect(v.today.dateLabel).toBe('Thursday, October 22');
    expect(v.today.greeting).toBe('Good afternoon, Sam.');
  });

  it('shows your slat: dots and "2 of 3 this week"', () => {
    expect(v.today.you).toEqual({ dots: [true, true, false], countedDays: 2, goal: 3, kept: false, label: '2 of 3 this week' });
  });

  it('the family line only names progress, never you or anyone at 0', () => {
    expect(v.today.familyLine).toBe('Maya has kept this week. Jo’s on 1.');
    expect(familyLine([
      { name: 'Maya', countedDays: 3, kept: true, onBreak: false },
      { name: 'Jo', countedDays: 4, kept: true, onBreak: false },
      { name: 'Sam', countedDays: 1, kept: false, onBreak: false },
    ])).toBe('Maya and Jo have kept this week. Sam’s on 1.');
    expect(familyLine([
      { name: 'Jo', countedDays: 0, kept: false, onBreak: false },
      { name: 'Ana', countedDays: 2, kept: false, onBreak: true },
    ])).toBeNull();
    expect(familyLine([
      { name: 'Jo', countedDays: 1, kept: false, onBreak: false },
      { name: 'Ana', countedDays: 2, kept: false, onBreak: false },
    ])).toBe('Jo’s on 1 and Ana’s on 2.');
  });

  it('the family streak: "8 weeks together"', () => {
    expect(v.today.streak).toMatchObject({ kind: 'building', value: 8, label: 'weeks together', familyStreak: 8 });
    expect(v.today.soloInvite).toBeNull();
    expect(v.today.backAtIt).toBeNull();
  });

  it('family list: dots, "Kept" and "1 of 3", and what a tap does', () => {
    expect(v.today.family.map((r) => [r.member.name, r.dots.map((d) => (d ? '●' : '○')).join(''), r.status, r.tap.kind])).toEqual([
      ['Sam', '●●○', '2 of 3', 'session'],
      ['Maya', '●●●', 'Kept', 'session'],
      ['Jo', '●○○', '1 of 3', 'nudge'],
    ]);
    // Kept opens their latest session.
    const maya = v.today.family[1].tap;
    expect(maya.kind === 'session' && v.sessions[maya.sessionId].title).toBe('Maya had a sauna');
  });

  it('a break reads "On a break until Saturday", and isn’t a nudge', () => {
    const jo = viewFor('onBreak').today.family.find((r) => r.member.name === 'Jo');
    expect(jo).toMatchObject({ status: 'On a break until Saturday', state: 'break', tap: { kind: 'none' } });
  });

  it('solo founder: the streak starts when someone joins; invited people read "Invited"', () => {
    const s = viewFor('solo');
    expect(s.today.streak.kind).toBe('solo');
    expect(s.today.soloInvite).toEqual({ title: 'Your family streak starts when someone joins', action: 'Invite someone' });
    expect(s.today.familyLine).toBeNull();
    expect(s.today.family.map((r) => [r.member.name, r.status, r.tap.kind])).toEqual([
      ['Sam', '2 of 3', 'session'],
      ['Maya', 'Invited', 'invite'],
    ]);
  });

  it('after a broken streak: weeks together this year first, and a card that never says who', () => {
    const b = viewFor('brokenStreak');
    expect(b.today.streak).toMatchObject({ kind: 'broken', value: 7, label: 'weeks together this year', familyStreak: 0 });
    expect(b.today.backAtIt).toEqual({ title: 'Back at it, together', body: 'A new streak starts this week. Every session counts toward it.' });
    expect(JSON.stringify(b.today.backAtIt)).not.toMatch(/Jo|Maya|Sam/);
  });

  it('"Log yesterday’s" while yesterday is open, nothing once it closes', () => {
    expect(v.today.forgot).toEqual({ kind: 'yesterday', label: 'Log yesterday’s', date: '2026-10-21' });
    expect(viewFor('family', { yesterdayOpen: false }).today.forgot).toBeNull();
  });

  it('Monday morning, last week not kept: "Did you sauna on Sunday? Log it"', () => {
    expect(viewFor('mondayOpen').today.forgot).toEqual({ kind: 'lastDay', label: 'Did you sauna on Sunday? Log it', date: '2026-10-18' });
  });

  it('a session in the outbox shows at once as yours, and counts', () => {
    const o = viewFor('offline');
    expect(o.offline).toBe(true);
    expect(o.today.waiting).toBe(1);
    expect(o.today.you).toMatchObject({ countedDays: 3, kept: true, label: 'Kept this week' });
    const first = o.feed.sections[0].cards[0];
    expect(first).toMatchObject({ title: 'You had a sauna', pending: true, mine: true, canEdit: false, canCheer: false });
  });

  it('a session the server already has isn’t shown twice', () => {
    const sc = buildPreviewScenario('offline', REAL);
    const family = sc.family as FamilySnapshot;
    const entry = sc.outbox[0];
    const onServer: FamilySnapshot = {
      ...family,
      sessions: [{ ...family.sessions[0], id: 'srv', memberId: 'sam', loggedBy: 'sam', sharedId: null, clientId: entry.input.clientId }, ...family.sessions],
    };
    const v2 = viewFor('offline', { family: onServer });
    expect(v2.today.waiting).toBe(0);
    expect(v2.feed.sections[0].cards.filter((c) => c.pending)).toHaveLength(0);
  });

  it('a refused draft: "Couldn’t save this one. Tap to fix it"', () => {
    expect(viewFor('draft').today.drafts).toEqual([{ clientId: '00000000-0000-4000-8000-0000000c0ffe', label: 'Couldn’t save this one. Tap to fix it' }]);
  });

  it('loading and error render as just you, with the status', () => {
    expect(viewFor('loading')).toMatchObject({ status: 'loading' });
    expect(viewFor('error')).toMatchObject({ status: 'error', offline: true });
  });

  it('the update screen when this build is under min_ios_build', () => {
    expect(viewFor('updateRequired').updateRequired).toBe(true);
    expect(viewFor('family').updateRequired).toBe(false);
  });
});

describe('Week', () => {
  const w = viewFor('family').week;

  it('three numbers', () => {
    expect(w.numbers).toEqual([
      { key: 'streak', value: 8, label: 'Weeks in a row' },
      { key: 'longest', value: 8, label: 'Longest streak' },
      { key: 'thisYear', value: 8, label: 'Together this year' },
    ]);
  });

  it('the wall: a slat a week, oldest first, then this week', () => {
    expect(w.wall.slats.map((s) => `${s.state[0]}${s.freezeUsed ? '*' : ''}`).join(' ')).toBe('c c c c* c c c c p');
    expect(w.wall.slats[w.wall.slats.length - 1].current).toBe(true);
    expect(w.wall.wood).toBe('birch');
  });

  it('your Mon to Sun strip', () => {
    expect(w.myStrip.map((d) => `${d.letter}${d.went ? '●' : d.future ? '·' : '○'}${d.isToday ? '!' : ''}`).join(' ')).toBe('M● T○ W● T○! F· S· S·');
  });

  it('a Sunday-start week starts the strip on Sunday', () => {
    expect(viewFor('sundayStart').week.myStrip.map((d) => d.letter).join('')).toBe('SMTWTFS');
  });

  it('past weeks: "Week of Oct 12: kept", and a freeze without a name', () => {
    expect(w.past.map((p) => p.label)).toEqual([
      'Week of Oct 12: kept',
      'Week of Oct 5: kept',
      'Week of Sep 28: kept',
      'Week of Sep 21: kept',
      'Week of Sep 14: kept, a freeze was used',
      'Week of Sep 7: kept',
      'Week of Aug 31: kept',
      'Week of Aug 24: kept',
    ]);
    const freezeWeek = w.past[4];
    // Maya's freeze, seen by Sam: she reads "Not kept", never "missed" or "froze".
    expect(freezeWeek.members.map((m) => [m.member.name, m.status])).toEqual([
      ['Sam', 'Kept'],
      ['Maya', 'Not kept'],
      ['Jo', 'Kept'],
    ]);
    expect(freezeWeek.members[0].daysLabel).toMatch(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)(, \w{3})* and \w{3}$/);
  });

  it('only your own view names your freeze', () => {
    expect(viewFor('mondayOpen').week.past[0].label).toBe('Week of Oct 12: kept, your freeze was used');
    expect(pastWeekOutcome('counted', true, 'kept')).toBe('kept, a freeze was used');
    expect(pastWeekOutcome('broken', false, 'missed')).toBe('not kept');
    expect(pastWeekOutcome('skip', false, 'paused')).toBe('everyone was on a break');
    expect(pastWeekOutcome(null, false, 'joined')).toBe('your first week');
    expect(pastStatusLabel('frozen', true)).toBe('Your freeze covered it');
    expect(pastStatusLabel('not_kept', false)).toBe('Not kept');
    expect(pastStatusLabel('missed', true)).toBe('Not kept');
  });

  it('Plus items and the quiet card only with plus_enabled', () => {
    expect(w).toMatchObject({ seeEveryWeek: false, printWall: false, nag: 'hidden' });
    const p = viewFor('plusEnabled').week;
    expect(p).toMatchObject({ seeEveryWeek: true, printWall: true, nag: 'new' });
    expect(viewFor('plusEnabled', { nag: recordNagShown(EMPTY_NAG, '2026-10-22') }).week.nag).toBe('showing');
    expect(viewFor('plusActive').week.nag).toBe('hidden');
    expect(viewFor('plusActive').week.wall.wood).toBe('cedar');
  });
});

describe('Feed', () => {
  const f = viewFor('family').feed;

  it('this week and last week, newest first', () => {
    expect(f.sections.map((s) => s.title)).toEqual(['This week', 'Last week']);
    const times = f.sections.flatMap((s) => s.cards.map((c) => c.startedAt));
    expect([...times].sort().reverse()).toEqual(times);
  });

  it('a shared session is one card: "Maya, Jo and you had a sauna together"', () => {
    const shared = f.sections[0].cards.find((c) => c.members.length === 3);
    expect(shared).toMatchObject({
      title: 'Maya, Jo and you had a sauna together',
      details: '25 min · Wood-fired · 85°C',
      when: 'Yesterday · 7:30 PM',
      place: 'Lake cabin',
      coldPlunge: true,
      note: 'Three rounds and the lake. Perfect.',
      mine: false,
      imIn: true,
      canRemoveMe: true,
      canEdit: false,
      canCheer: false,
      quickReplies: ['Felt great', 'Needed that'],
    });
    expect(shared?.members.map((m) => m.name)).toEqual(['Maya', 'Sam', 'Jo']);
    expect(shared?.cheers).toMatchObject({ count: 1, line: 'You cheered', byMe: true });
    expect(shared?.comments.map((c) => [c.member.name, c.body, c.canDelete])).toEqual([
      ['Jo', 'Cold plunge hero', false],
      ['Sam', 'Needed that', true],
    ]);
    // Every row of it finds the same card.
    for (const row of shared?.rows ?? []) expect(viewFor('family').sessions[row.id].id).toBe(shared?.id);
  });

  it('names the logger first and others in join order when you’re not in it', () => {
    const sc = buildPreviewScenario('family', REAL);
    const asJo = buildView({ myId: 'jo', family: sc.family as FamilySnapshot, now: sc.now, config: sc.config, appBuild: 9, unit: 'C', yesterdayOpen: true });
    const shared = asJo.feed.sections[0].cards.find((c) => c.members.length === 3);
    expect(shared?.title).toBe('Maya, Sam and you had a sauna together');
  });

  it('someone else’s session: "Cheer Maya on", and the quick replies', () => {
    const maya = f.sections[0].cards.find((c) => c.title === 'Maya had a sauna' && c.note === 'Quiet one after work.');
    expect(maya).toMatchObject({ canCheer: true, cheerLabel: 'Cheer Maya on', mine: false, imIn: false });
    expect(maya?.cheers.line).toBe('Jo cheered');
    expect(maya?.quickReplies.slice(0, 3)).toEqual(['Nice heat', 'Jealous', 'Save me a spot']);
    const plunge = f.sections.flatMap((s) => s.cards).find((c) => !c.imIn && c.coldPlunge);
    expect(plunge?.quickReplies).toContain('Cold plunge hero');
    const noPlunge = f.sections.flatMap((s) => s.cards).find((c) => !c.imIn && !c.coldPlunge);
    expect(noPlunge?.quickReplies).not.toContain('Cold plunge hero');
  });

  it('your own: "You had a sauna", editable', () => {
    const mine = f.sections[0].cards.find((c) => c.title === 'You had a sauna');
    expect(mine).toMatchObject({ mine: true, canEdit: true, canDelete: true, canRemoveMe: false });
  });

  it('a short session shows like any other, never marked as not counting', () => {
    const short = f.sections[0].cards.find((c) => c.details.startsWith('8 min'));
    expect(short?.title).toBe('Jo had a sauna');
    expect(JSON.stringify(short)).not.toMatch(/n[’']t count|not count|short/i);
  });

  it('°F by region', () => {
    const shared = viewFor('family', { unit: 'F' }).feed.sections[0].cards.find((c) => c.members.length === 3);
    expect(shared?.details).toBe('25 min · Wood-fired · 185°F');
  });

  it('an empty family has an empty feed', () => {
    expect(viewFor('newFamily').feed).toEqual({ sections: [], empty: true });
  });

  it('when labels', () => {
    expect(whenLabel('2026-10-22', new Date(2026, 9, 22, 6, 21).toISOString(), '2026-10-22')).toBe('Today · 6:21 AM');
    expect(whenLabel('2026-10-21', new Date(2026, 9, 21, 18, 0).toISOString(), '2026-10-22')).toBe('Yesterday · 6:00 PM');
    expect(whenLabel('2026-10-12', new Date(2026, 9, 12, 19, 5).toISOString(), '2026-10-22')).toBe('Mon, Oct 12 · 7:05 PM');
  });
});

describe('Me', () => {
  const p = viewFor('family').profile;

  it('stats, favorites, last three sessions and badges', () => {
    expect(p.name).toBe('Sam');
    expect(p.familyName).toBe('Sunday sauna');
    expect(p.stats.map((s) => [s.label, s.value])).toEqual([
      ['Weeks in a row', '8'],
      ['Longest streak', '8'],
      ['Sessions this month', expect.any(String)],
      ['Hours in the heat this year', expect.any(String)],
    ]);
    expect(p.favoritePlace).toBe('Home');
    expect(p.favoriteType).not.toBeNull();
    expect(p.recent).toHaveLength(3);
    expect(p.recent.every((c) => c.imIn)).toBe(true);
    expect(p.badges.map((b) => [b.label, b.earned])).toEqual([
      ['4 weeks', true],
      ['8 weeks', true],
      ['12 weeks', false],
      ['26 weeks', false],
      ['52 weeks', false],
    ]);
    expect(p.plusRows).toBe(false);
    expect(viewFor('plusEnabled').profile.plusRows).toBe(true);
  });

  it('hours: one decimal under 10, whole after', () => {
    expect([0, 30, 150, 600, 1234].map(hoursLabel)).toEqual(['0', '0.5', '2.5', '10', '21']);
  });
});

describe('everything else', () => {
  it('rules, with a change waiting for next week', () => {
    const sc = buildPreviewScenario('family', REAL);
    const family = sc.family as FamilySnapshot;
    const v = viewFor('family', { family: { ...family, rules: [...family.rules, { effectiveFrom: '2026-10-26', goalPerWeek: 2, minMinutes: 15 }] } });
    expect(v.rules).toMatchObject({
      goal: 3,
      minMinutes: 10,
      weekStartDay: 'Monday',
      summary: '3 sessions a week, 10 minutes or more',
      pendingChange: { goal: 2, minMinutes: 15, label: 'Starting Monday, Oct 26' },
      canEdit: true,
    });
    expect(startingLabel('2026-10-25')).toBe('Starting Sunday, Oct 25');
  });

  it('milestones: the 8-week one is due until it’s been shown', () => {
    expect(viewFor('milestone').milestone).toEqual({
      kind: 'family',
      weeks: 8,
      title: '8 weeks together',
      subtitle: 'Sunday sauna has kept 8 weeks in a row.',
    });
    expect(viewFor('family').milestone).toBeNull();
  });

  it('Plus row: "Plus, from Maya" only when switched on', () => {
    expect(viewFor('plusActive').plus).toEqual({ visible: true, active: true, rowLabel: 'Plus, from Maya', wood: 'cedar', payerIsMe: false });
    expect(viewFor('family').plus.visible).toBe(false);
  });

  it('companions for "Sat with someone?" are the joined others', () => {
    expect(viewFor('family').sessionCompanions.map((m) => m.name)).toEqual(['Maya', 'Jo']);
    expect(viewFor('solo').sessionCompanions).toEqual([]);
  });

  it('dots fill up to the goal', () => {
    expect(weekDots(4, 3)).toEqual([true, true, true]);
    expect(weekDots(0, 2)).toEqual([false, false]);
  });
});

describe('optimistic changes', () => {
  const sc = buildPreviewScenario('family', REAL);
  const family = sc.family as FamilySnapshot;
  const maya = family.sessions.find((s) => s.memberId === 'maya' && s.note === 'Quiet one after work.');
  const mayaId = maya?.id ?? '';
  const shared = family.sessions.find((s) => s.sharedId && s.memberId === 'sam');

  it('a cheer shows at once, and taking it back hides it', () => {
    const on = buildView({ ...base(), optimistic: { ...NO_OPTIMISTIC, cheers: { [mayaId]: true } } });
    expect(on.sessions[mayaId].cheers).toMatchObject({ count: 2, byMe: true, line: 'You and Jo cheered' });
    const off = applyOptimistic(family, { ...NO_OPTIMISTIC, cheers: { [shared?.sharedId ?? '']: false } }, 'sam');
    expect(off.cheers.filter((c) => c.memberId === 'sam')).toEqual([]);
  });

  it('a comment shows at once, marked pending', () => {
    const v = buildView({
      ...base(),
      optimistic: { ...NO_OPTIMISTIC, comments: [{ id: 'p1', sessionId: mayaId, memberId: 'sam', body: 'Nice heat', createdAt: '2026-10-22T23:00:00Z', pending: true }] },
    });
    expect(v.sessions[mayaId].comments.map((c) => [c.body, c.pending, c.canDelete])).toEqual([['Nice heat', true, true]]);
  });

  it('Remove me takes only your row; the rest stays one card', () => {
    const v = buildView({ ...base(), optimistic: { ...NO_OPTIMISTIC, removedRows: [shared?.id ?? ''] } });
    const card = v.sessions[shared?.sharedId ?? ''];
    expect(card.title).toBe('Maya and Jo had a sauna together');
    expect(v.today.you.countedDays).toBe(2); // the server's count holds until the refresh
  });

  it('Delete takes the whole session', () => {
    const v = buildView({ ...base(), optimistic: { ...NO_OPTIMISTIC, removedSessions: [shared?.sharedId ?? ''] } });
    expect(v.sessions[shared?.sharedId ?? '']).toBeUndefined();
  });

  it('Edit profile shows the new name everywhere', () => {
    const v = buildView({ ...base(), optimistic: { ...NO_OPTIMISTIC, profile: { name: 'Sammy' } } });
    expect(v.me.name).toBe('Sammy');
    expect(v.today.greeting).toBe('Good afternoon, Sammy.');
  });

  function base(): ViewInput {
    return { myId: 'sam', family, now: sc.now, config: sc.config, appBuild: 9, unit: 'C', yesterdayOpen: true };
  }
});

describe('the preview family', () => {
  it('is Sunday sauna: Sam, Maya and Jo, 8 weeks together with one freeze', () => {
    const f = previewFamily(buildPreviewScenario('family', REAL).now);
    expect(f.name).toBe('Sunday sauna');
    expect(f.members.map((m) => m.name)).toEqual(['Sam', 'Maya', 'Jo']);
    expect(f.week).toMatchObject({ familyStreak: 8, longestStreak: 8 });
    const freezes = new Set(f.history.filter((h) => h.freezeUsed).map((h) => h.weekStart));
    expect(freezes.size).toBe(1);
  });

  it('logs in the preview show as saved, not waiting', () => {
    const sc = buildPreviewScenario('family', REAL);
    const sent: OutboxEntry = { ...buildPreviewScenario('offline', REAL).outbox[0] };
    const v = buildView({ myId: 'sam', family: sc.family as FamilySnapshot, now: sc.now, config: sc.config, appBuild: 9, unit: 'C', yesterdayOpen: true, previewSent: [sent] });
    expect(v.today.waiting).toBe(0);
    expect(v.feed.sections[0].cards[0]).toMatchObject({ title: 'You had a sauna', pending: false });
    expect(v.today.you.kept).toBe(true);
  });
});
