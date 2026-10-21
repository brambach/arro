import { describe, expect, it } from '@jest/globals';
import type { NavigationState, PartialState } from '@react-navigation/native';
import { closesOntoToday } from '../closesOntoToday';

type State = PartialState<NavigationState>;
const tabs = (index: number): State => ({ index, routes: [{ name: 'Today' }, { name: 'ThisWeek' }, { name: 'Feed' }, { name: 'Me' }] });
const stack = (below: { name: string; state?: State }, top = 'LogSession'): State => ({
  index: 1,
  routes: [below, { name: top }],
});

describe('closesOntoToday', () => {
  it('is true over the tabs on Today, and over tabs never visited (they open on Today)', () => {
    expect(closesOntoToday(stack({ name: 'Main', state: tabs(0) }))).toBe(true);
    expect(closesOntoToday(stack({ name: 'Main' }))).toBe(true);
    expect(closesOntoToday(stack({ name: 'Main', state: tabs(0) }, 'Timer'))).toBe(true);
  });

  it('is false over another tab, another screen, or nothing', () => {
    expect(closesOntoToday(stack({ name: 'Main', state: tabs(2) }))).toBe(false);
    expect(closesOntoToday(stack({ name: 'SessionDetail' }))).toBe(false);
    expect(closesOntoToday({ index: 0, routes: [{ name: 'LogSession' }] })).toBe(false);
    expect(closesOntoToday(undefined)).toBe(false);
  });
});
