import React from 'react';
import { InvitePanel } from '../../components/InvitePanel';
import { OnboardingFrame } from '../../components/OnboardingFrame';
import { useSendInvite } from '../../state/useSendInvite';
import { RootStackScreenProps } from '../../navigation/types';
import { stepOf } from './steps';

/** The main step for a founder: the streak only starts when a second person joins. */
export function OnboardingInviteScreen({ navigation }: RootStackScreenProps<'OnboardingInvite'>) {
  const invite = useSendInvite();
  const goNext = () => navigation.navigate('ReminderTime');

  return (
    <OnboardingFrame
      title="Invite your family"
      subtitle="Your streak starts when the second person joins, so this is the step that matters."
      step={stepOf('founder', 'OnboardingInvite')}
      onBack={() => navigation.goBack()}
      primaryLabel={invite.fallback ? 'Done' : 'Send invite'}
      onPrimary={async () => {
        if (invite.fallback) {
          await invite.commit();
          goNext();
        } else if (await invite.send()) {
          goNext();
        }
      }}
      secondaryLabel="I’ll do it later"
      onSecondary={goNext}
    >
      <InvitePanel code={invite.code} name={invite.name} onName={invite.setName} fallback={invite.fallback} />
    </OnboardingFrame>
  );
}
