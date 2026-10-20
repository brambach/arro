import React from 'react';
import { RootStackScreenProps } from '../navigation/types';
import { useApp, useView } from '../state/AppState';
import { milestoneView } from '../state/buildView';
import { Btn, P, PlainScreen } from './plain';

/**
 * A milestone, plain until M9 builds the wall moment. With no params it's the
 * one that's due (view.milestone), marked shown on close; with params it's a
 * badge opened from Me.
 */
export function MilestoneScreen({ navigation, route }: RootStackScreenProps<'Milestone'>) {
  const view = useView();
  const { markMilestoneShown } = useApp();
  const m = route.params ? milestoneView(route.params, view.familyName) : view.milestone;
  const close = () => {
    if (!route.params) markMilestoneShown();
    navigation.goBack();
  };
  return (
    <PlainScreen title={m?.title ?? 'Milestone'} onBack={close}>
      {m ? <P>{m.subtitle}</P> : null}
      <Btn title="Done" onPress={close} />
    </PlainScreen>
  );
}
