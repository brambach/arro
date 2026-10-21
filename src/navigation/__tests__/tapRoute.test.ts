import { describe, expect, it } from '@jest/globals';
import { tapRoute } from '../tapRoute';
import { parseTap } from '../../state/notifications';

const off = { timerRunning: false };

describe('tapRoute: every push and local notification lands on its screen', () => {
  it.each(['session', 'shared', 'session_cheer', 'session_comment'] as const)('%s opens the session', (kind) => {
    const tap = parseTap({ kind, sessionId: 's-anchor', memberId: 'm-maya', cheererId: 'm-jo', commentId: 'c1' });
    if (!tap) throw new Error(`${kind} didn't parse`);
    expect(tapRoute(tap, off)).toEqual({ name: 'SessionDetail', params: { sessionId: 's-anchor' } });
  });

  it('nudge opens the Nudge sheet for whoever nudged', () => {
    expect(tapRoute({ kind: 'nudge', memberId: 'm-sam' }, off)).toEqual({ name: 'Nudge', params: { memberId: 'm-sam' } });
  });

  it('weekend opens the Week tab', () => {
    expect(tapRoute({ kind: 'weekend', weekStart: '2026-10-19' }, off)).toEqual({ name: 'Main', params: { screen: 'ThisWeek' } });
  });

  it('joined opens Family members', () => {
    expect(tapRoute({ kind: 'joined', memberId: 'm-jo' }, off)).toEqual({ name: 'FamilyMembers' });
  });

  it('the timer’s notifications open the room while it runs, else Today', () => {
    expect(tapRoute({ kind: 'timer' }, { timerRunning: true })).toEqual({ name: 'Timer', params: {} });
    expect(tapRoute({ kind: 'timer' }, off)).toEqual({ name: 'Main', params: { screen: 'Today' } });
  });

  it('a weekly reminder opens Today', () => {
    expect(tapRoute({ kind: 'reminder' }, { timerRunning: true })).toEqual({ name: 'Main', params: { screen: 'Today' } });
  });

  it('the server’s payloads parse as sent (migration 20261021000005 and build 8’s joined)', () => {
    expect(parseTap({ kind: 'weekend', memberId: 'm-maya', weekStart: '2026-10-19' })).toEqual({ kind: 'weekend', weekStart: '2026-10-19' });
    expect(parseTap({ kind: 'joined', memberId: 'm-jo' })).toEqual({ kind: 'joined', memberId: 'm-jo' });
    expect(parseTap({ kind: 'moved', workoutId: 'w1' })).toBeNull();
  });
});
