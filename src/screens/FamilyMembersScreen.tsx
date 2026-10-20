import React from 'react';
import { RootStackScreenProps } from '../navigation/types';
import { useApp, useView } from '../state/AppState';
import { MemberView } from '../state/buildView';
import { confirmAction, showError } from '../state/confirm';
import { Btn, P, PlainScreen, Row } from './plain';

/** Everyone in the family, plain until M10. The founder can remove people. */
export function FamilyMembersScreen({ navigation }: RootStackScreenProps<'FamilyMembers'>) {
  const { allMembers, me, isFounder } = useView();
  const { removeMember } = useApp();
  const canRemove = (m: MemberView) => isFounder && !m.invited && m.id !== me.id;

  const askToRemove = async (m: MemberView) => {
    const ok = await confirmAction(
      `Remove ${m.name}?`,
      `${m.name} leaves the family and their sessions go with them. Your family’s code changes, so they’d need a new one to join again.`,
      'Remove',
    );
    if (!ok) return;
    try {
      await removeMember(m.id);
    } catch {
      showError(`Couldn’t remove ${m.name}`, 'Check your connection and try again.');
    }
  };

  return (
    <PlainScreen title="Family members" onBack={() => navigation.goBack()}>
      {allMembers.map((m) => (
        <Row key={m.id} label={m.name} value={m.isMe ? 'You' : m.invited ? 'Invited' : canRemove(m) ? 'Remove' : undefined} onPress={canRemove(m) ? () => askToRemove(m) : undefined} />
      ))}
      {isFounder ? <P muted>Only the person who started the family can remove someone.</P> : null}
      <Btn title="Invite someone" onPress={() => navigation.navigate('Invite')} />
    </PlainScreen>
  );
}
