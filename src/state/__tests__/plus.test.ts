// Runs with TZ=America/Los_Angeles (package.json "test").
import { describe, expect, it } from '@jest/globals';
import { addDays } from '../dates';
import {
  EMPTY_NAG,
  NagInput,
  dismissNag,
  loadNagMemory,
  nagCardState,
  nagEligibleFrom,
  parseNagMemory,
  plusRowLabel,
  plusVisible,
  recordNagShown,
  saveNagMemory,
  tuesdayAfterWeek,
  turnOffNag,
} from '../plus';
import { PREVIEW_OFFERING, PreviewPurchases, createPurchases } from '../purchases';
import { NO_PLUS } from '../backend';

// Eight counted weeks from Monday 24 August 2026: the 8th starts Monday 12 October.
const FIRST = '2026-08-24';
const weeks = Array.from({ length: 8 }, (_, i) => ({ weekStart: addDays(FIRST, i * 7), state: 'counted' as const }));

const input = (overrides: Partial<NagInput> = {}): NagInput => ({
  plusEnabled: true,
  familyHasPlus: false,
  joinedOn: '2026-08-01',
  today: '2026-10-20',
  eligibleFrom: '2026-10-20',
  memory: EMPTY_NAG,
  ...overrides,
});

describe('Plus is never shown', () => {
  it('anywhere while plus_enabled is false', () => {
    expect(plusVisible({ plusEnabled: false })).toBe(false);
    expect(nagCardState(input({ plusEnabled: false }))).toBe('hidden');
  });

  it('to a family that already has Plus', () => {
    expect(nagCardState(input({ familyHasPlus: true }))).toBe('hidden');
  });

  it('to anyone who joined less than 4 weeks ago', () => {
    expect(nagCardState(input({ joinedOn: '2026-09-23' }))).toBe('hidden');
    expect(nagCardState(input({ joinedOn: '2026-09-22' }))).toBe('new');
  });
});

describe('the quiet card', () => {
  it('first appears the Tuesday after the family’s 8th kept week', () => {
    expect(tuesdayAfterWeek('2026-10-12')).toBe('2026-10-20');
    // A Sunday-start week: Sunday 11 to Saturday 17 October, then Tuesday the 20th.
    expect(tuesdayAfterWeek('2026-10-11')).toBe('2026-10-20');
    expect(nagEligibleFrom(weeks, 8, '2026-10-25')).toBe('2026-10-20');
    expect(nagCardState(input({ today: '2026-10-19' }))).toBe('hidden');
    expect(nagCardState(input({ today: '2026-10-20' }))).toBe('new');
  });

  it('counts only kept weeks, and waits when there are fewer than 8', () => {
    const mixed = [...weeks.slice(0, 4), { weekStart: addDays(FIRST, 28), state: 'broken' as const }, ...weeks.slice(5)];
    expect(nagEligibleFrom(mixed, 7, '2026-10-25')).toBeNull();
    expect(nagCardState(input({ eligibleFrom: null }))).toBe('hidden');
  });

  it('is eligible now when the 8th kept week is older than the history on the phone', () => {
    // 4 kept weeks on the phone, 12 in all: the 8th is long gone, so it's now.
    expect(nagEligibleFrom(weeks.slice(4), 12, '2026-10-25')).toBe('2026-10-25');
    // 4 on the phone, 10 in all: 6 are older, so the 8th is the 2nd on the phone.
    expect(nagEligibleFrom(weeks.slice(4), 10, '2026-10-25')).toBe(tuesdayAfterWeek(weeks[5].weekStart));
  });

  it('stays up until Not now, then waits 60 days, 3 times ever', () => {
    let memory = recordNagShown(EMPTY_NAG, '2026-10-20');
    expect(nagCardState(input({ memory, today: '2026-10-22' }))).toBe('showing');
    memory = dismissNag(memory);
    expect(nagCardState(input({ memory, today: '2026-12-18' }))).toBe('hidden'); // 59 days
    expect(nagCardState(input({ memory, today: '2026-12-19' }))).toBe('new'); // 60 days
    memory = dismissNag(recordNagShown(memory, '2026-12-19'));
    memory = dismissNag(recordNagShown(memory, '2027-02-17'));
    expect(memory.shows).toHaveLength(3);
    expect(nagCardState(input({ memory, today: '2028-01-01' }))).toBe('hidden');
  });

  it('Don’t show this again turns it off for good', () => {
    const memory = turnOffNag(recordNagShown(EMPTY_NAG, '2026-10-20'));
    expect(nagCardState(input({ memory, today: '2027-06-01' }))).toBe('hidden');
  });

  it('is stored per member on the phone', async () => {
    await saveNagMemory({ sam: recordNagShown(EMPTY_NAG, '2026-10-20') });
    expect(await loadNagMemory()).toEqual({ sam: { shows: [{ on: '2026-10-20', dismissed: false }], off: false } });
    expect(parseNagMemory('{bad')).toEqual({});
  });
});

describe('the Plus row', () => {
  it('reads "Plus, from Maya", "Plus" for the payer, or nothing without it', () => {
    expect(plusRowLabel({ ...NO_PLUS, active: true, payerName: 'Maya' })).toBe('Plus, from Maya');
    expect(plusRowLabel({ ...NO_PLUS, active: true, payerName: 'Sam', payerIsMe: true })).toBe('Plus');
    expect(plusRowLabel({ ...NO_PLUS, active: true, payerName: null })).toBe('Plus');
    expect(plusRowLabel(NO_PLUS)).toBeNull();
  });
});

describe('PreviewPurchases', () => {
  it('succeeds, and restore finds what was bought', async () => {
    const p = new PreviewPurchases();
    expect(await p.getOffering()).toEqual(PREVIEW_OFFERING);
    expect(await p.restore()).toEqual({ status: 'nothing' });
    expect(await p.purchase('annual')).toEqual({ status: 'purchased' });
    expect(await p.restore()).toEqual({ status: 'restored' });
  });

  it('a tip buys nothing to restore', async () => {
    const p = new PreviewPurchases();
    await p.purchase('tip_small');
    expect(await p.restore()).toEqual({ status: 'nothing' });
  });

  it('can be told to fail, cancel, go pending, find nothing, or be offline', async () => {
    const p = new PreviewPurchases('cancel');
    expect(await p.purchase('annual')).toEqual({ status: 'cancelled' });
    p.setBehavior('pending');
    expect(await p.purchase('annual')).toEqual({ status: 'pending' });
    p.setBehavior('fail');
    expect((await p.purchase('lifetime')).status).toBe('failed');
    expect((await p.restore()).status).toBe('failed');
    p.setBehavior('offline');
    expect(await p.getOffering()).toBeNull();
    expect(await p.purchase('annual')).toEqual({ status: 'offline' });
    expect(await p.restore()).toEqual({ status: 'offline' });
    p.setBehavior('succeed');
    await p.purchase('annual');
    p.setBehavior('nothingToRestore');
    expect(await p.restore()).toEqual({ status: 'nothing' });
  });

  it('remembers who and which family, and forgets on log out', async () => {
    const p = new PreviewPurchases();
    await p.logIn('user-1');
    await p.setFamily('fam');
    await p.purchase('annual');
    expect([p.userId, p.familyId]).toEqual(['user-1', 'fam']);
    await p.logOut();
    expect(p.userId).toBeNull();
    expect(await p.restore()).toEqual({ status: 'nothing' });
  });

  it('is what this build uses until RevenueCat lands in M15', () => {
    expect(createPurchases()).toBeInstanceOf(PreviewPurchases);
  });
});
