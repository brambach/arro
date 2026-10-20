import React from 'react';
import { InvitePanel } from '../components/InvitePanel';
import { SolidButton } from '../components/SolidButton';
import { SubScreen } from '../components/SubScreen';
import { useSendInvite } from '../state/useSendInvite';
import { useView } from '../state/AppState';
import { RootStackScreenProps } from '../navigation/types';

export const INVITE_COPY = {
  title: 'Invite someone',
  lead: (family: string) => `Send them the message, or read them the code. Joining ${family} takes about a minute.`,
  send: 'Send invite',
  done: 'Done',
};

/** Invite from inside the app (Family members, Today's invite line): the share sheet with the message, code and link. */
export function InviteScreen({ navigation }: RootStackScreenProps<'Invite'>) {
  const invite = useSendInvite();
  const { familyName } = useView();
  return (
    <SubScreen
      modal
      title={INVITE_COPY.title}
      lead={INVITE_COPY.lead(familyName)}
      onBack={() => navigation.goBack()}
      footer={
        <SolidButton
          title={invite.fallback ? INVITE_COPY.done : INVITE_COPY.send}
          onPress={async () => {
            if (invite.fallback) {
              await invite.commit();
              navigation.goBack();
            } else if (await invite.send()) {
              navigation.goBack();
            }
          }}
        />
      }
    >
      <InvitePanel code={invite.code} link={invite.link} name={invite.name} onName={invite.setName} fallback={invite.fallback} />
    </SubScreen>
  );
}
