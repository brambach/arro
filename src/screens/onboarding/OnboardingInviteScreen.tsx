import React from 'react';
import { InvitePanel } from '../../components/InvitePanel';
import { StepScreen } from '../../components/StepScreen';
import { useSendInvite } from '../../state/useSendInvite';
import { RootStackScreenProps } from '../../navigation/types';
import { nextAfter, stepOf } from './steps';

export const ONBOARDING_INVITE_COPY = {
  title: 'Invite your family',
  subtitle: 'The family streak starts when the second person joins, so this is the step that counts.',
  send: 'Send invite',
  done: 'Done',
  later: 'I’ll do it later',
};

/** The founder's invite step: the share sheet with the message, the code and the link. */
export function OnboardingInviteScreen({ navigation }: RootStackScreenProps<'OnboardingInvite'>) {
  const invite = useSendInvite();
  const goNext = () => {
    const next = nextAfter('founder', 'OnboardingInvite');
    if (next) navigation.navigate(next as 'ReminderTime');
  };

  return (
    <StepScreen
      title={ONBOARDING_INVITE_COPY.title}
      subtitle={ONBOARDING_INVITE_COPY.subtitle}
      step={stepOf('founder', 'OnboardingInvite')}
      onBack={() => navigation.goBack()}
      primaryLabel={invite.fallback ? ONBOARDING_INVITE_COPY.done : ONBOARDING_INVITE_COPY.send}
      onPrimary={async () => {
        if (invite.fallback) {
          await invite.commit();
          goNext();
        } else if (await invite.send()) {
          goNext();
        }
      }}
      secondaryLabel={ONBOARDING_INVITE_COPY.later}
      onSecondary={goNext}
    >
      <InvitePanel code={invite.code} link={invite.link} name={invite.name} onName={invite.setName} fallback={invite.fallback} />
    </StepScreen>
  );
}
