import type { NotificationTap } from '../state/notifications';

/**
 * Where a tapped notification lands (spec section 4, "Pushes", and
 * docs/saunafam/API.md). Pure, so every trigger is tested:
 *
 * - session, shared, session_cheer, session_comment: that session;
 * - nudge: the Nudge sheet, for the person who nudged (cheer them back);
 * - weekend: the Week tab;
 * - joined: Family members;
 * - the timer's two local notifications: the timer room while it's running,
 *   else Today (it was finished or discarded since);
 * - a weekly reminder: Today, where Start a session is.
 */
export type TapRoute =
  | { name: 'SessionDetail'; params: { sessionId: string } }
  | { name: 'Nudge'; params: { memberId: string } }
  | { name: 'Main'; params: { screen: 'Today' | 'ThisWeek' } }
  | { name: 'FamilyMembers' }
  | { name: 'Timer'; params: Record<string, never> };

export function tapRoute(tap: NotificationTap, state: { timerRunning: boolean }): TapRoute {
  switch (tap.kind) {
    case 'session':
    case 'shared':
    case 'session_cheer':
    case 'session_comment':
      return { name: 'SessionDetail', params: { sessionId: tap.sessionId } };
    case 'nudge':
      return { name: 'Nudge', params: { memberId: tap.memberId } };
    case 'weekend':
      return { name: 'Main', params: { screen: 'ThisWeek' } };
    case 'joined':
      return { name: 'FamilyMembers' };
    case 'timer':
      return state.timerRunning ? { name: 'Timer', params: {} } : { name: 'Main', params: { screen: 'Today' } };
    case 'reminder':
      return { name: 'Main', params: { screen: 'Today' } };
  }
}
