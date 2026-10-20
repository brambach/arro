import React, { useEffect, useState } from 'react';
import { NavigationContainerRefWithCurrent } from '@react-navigation/native';
import { RenamedSheet } from '../components/RenamedSheet';
import { useSplashLeaving } from '../components/splashSignal';
import { durations } from '../theme/motion';
import { useApp } from '../state/AppState';
import { setDevOverrides, useDevOverrides } from '../state/devTools';
import { RootStackParamList } from './types';

/**
 * Things that sit over the whole app. For now: "Arro is now Saunafam", once,
 * after the splash and after Today has settled in, so the two arrivals don't
 * fight. Never over onboarding (no session) or the update screen.
 */
export function AppOverlays({ navigation }: { navigation: NavigationContainerRefWithCurrent<RootStackParamList> }) {
  const { session, view, welcomeDue, dismissWelcome } = useApp();
  const dev = useDevOverrides();
  const splashGone = useSplashLeaving();
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    if (!splashGone) return;
    const id = setTimeout(() => setSettled(true), durations.settle);
    return () => clearTimeout(id);
  }, [splashGone]);

  const due = welcomeDue || dev.renamedSheet !== null;
  const visible = settled && due && !!session && !!view && !view.updateRequired;
  const founder = dev.renamedSheet ? dev.renamedSheet === 'founder' : !!view?.isFounder;

  const close = () => {
    dismissWelcome();
    setDevOverrides({ renamedSheet: null });
  };

  return (
    <RenamedSheet
      visible={visible}
      founder={founder}
      goal={view?.rules.goal ?? 3}
      minMinutes={view?.rules.minMinutes ?? 10}
      onGotIt={close}
      onChangeRhythm={() => {
        close();
        if (navigation.isReady()) navigation.navigate('FamilyRules');
      }}
    />
  );
}
