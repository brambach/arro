import React from 'react';
import { NoticeScreen } from '../components/NoticeScreen';
import { SolidButton } from '../components/SolidButton';
import { RootStackScreenProps } from '../navigation/types';

/**
 * SEAM FOR M15. The Plus route exists so Settings (Saunafam Plus, Leave a tip)
 * and The wall ("Keep this wood with Plus", `{ focus: 'woods' }`) can open it.
 * M15 replaces this file with the Plus sheet and keeps the route name and
 * params (RootStackParamList.Plus). Nothing reaches it while plus_enabled is
 * false, since none of those rows show.
 */
export function PlusSeamScreen({ navigation, route }: RootStackScreenProps<'Plus'>) {
  return (
    <NoticeScreen title="Saunafam Plus" body={`The Plus sheet comes with M15${route.params?.focus ? ` (opened at ${route.params.focus})` : ''}.`}>
      <SolidButton title="Close" onPress={() => navigation.goBack()} />
    </NoticeScreen>
  );
}
