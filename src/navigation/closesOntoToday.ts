import type { NavigationState, PartialState } from '@react-navigation/native';

/** Whether closing the sheet on top of this stack shows Today: the route under it is the tabs, on Today. */
export function closesOntoToday(state: NavigationState | PartialState<NavigationState> | undefined): boolean {
  if (!state?.routes.length) return false;
  const top = state.index ?? state.routes.length - 1;
  const below = state.routes[top - 1];
  if (below?.name !== 'Main') return false;
  const tabs = below.state;
  // Tabs never visited yet: they open on Today.
  if (!tabs?.routes.length) return true;
  return tabs.routes[tabs.index ?? 0]?.name === 'Today';
}
