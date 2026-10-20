import React, { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { palette, space } from '../theme/tokens';
import { type } from '../theme/typography';
import { Avatar } from '../components/Avatar';
import { ConfirmSheet } from '../components/ConfirmSheet';
import { ListGroup, ListRow } from '../components/ListRow';
import { SolidButton } from '../components/SolidButton';
import { GroupNote, SubScreen } from '../components/SubScreen';
import { RootStackScreenProps } from '../navigation/types';
import { useApp, useView } from '../state/AppState';
import { MemberView } from '../state/buildView';

export const MEMBERS_COPY = {
  title: 'Family members',
  lead: (family: string, n: number) => `${n === 1 ? 'Just you' : `${n} people`} in ${family}. Up to 12 can join.`,
  you: 'You',
  invited: 'Invited',
  founder: 'Started the family',
  remove: 'Remove',
  removeTitle: (name: string) => `Remove ${name}?`,
  removeBody: (name: string) =>
    `${name} leaves the family, and their sessions go with them. Your family’s code changes, so they’d need a new one to join again.`,
  removeFailed: (name: string) => `Couldn’t remove ${name}. Check your connection and try again.`,
  founderNote: 'You started the family, so you can remove someone. Tap their name.',
  invite: 'Invite someone',
};

/** Settings > Family members (unchanged from Arro, in Löyly): everyone in join order, then people invited by name. */
export function FamilyMembersScreen({ navigation }: RootStackScreenProps<'FamilyMembers'>) {
  const view = useView();
  const { removeMember } = useApp();
  const [removing, setRemoving] = useState<MemberView | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const joined = view.allMembers.filter((m) => !m.invited);
  const canRemove = (m: MemberView) => view.isFounder && !m.invited && !m.isMe;

  const confirmRemove = async () => {
    if (!removing) return;
    setBusy(true);
    setError(null);
    try {
      await removeMember(removing.id);
    } catch {
      setError(MEMBERS_COPY.removeFailed(removing.name));
    } finally {
      setBusy(false);
      setRemoving(null);
    }
  };

  return (
    <SubScreen
      title={MEMBERS_COPY.title}
      lead={MEMBERS_COPY.lead(view.familyName, joined.length)}
      onBack={() => navigation.goBack()}
      footer={<SolidButton title={MEMBERS_COPY.invite} onPress={() => navigation.navigate('Invite')} />}
    >
      <ListGroup inset="leading">
        {view.allMembers.map((m, i) => (
          <ListRow
            key={m.id}
            title={m.isMe ? `${m.name} (${MEMBERS_COPY.you.toLowerCase()})` : m.name}
            subtitle={i === 0 && !m.invited ? MEMBERS_COPY.founder : undefined}
            value={m.invited ? MEMBERS_COPY.invited : canRemove(m) ? MEMBERS_COPY.remove : undefined}
            valueTone={m.invited ? 'quiet' : 'default'}
            leading={<Avatar name={m.name} color={m.color} photoUri={typeof m.photoUri === 'string' ? m.photoUri : null} size={38} />}
            onPress={canRemove(m) ? () => setRemoving(m) : undefined}
            accessibilityHint={canRemove(m) ? MEMBERS_COPY.removeTitle(m.name) : undefined}
          />
        ))}
      </ListGroup>
      {view.isFounder && joined.length > 1 ? <GroupNote>{MEMBERS_COPY.founderNote}</GroupNote> : null}
      {error ? <Text style={[type.bodySmall, styles.error]}>{error}</Text> : null}
      <ConfirmSheet
        visible={!!removing}
        title={removing ? MEMBERS_COPY.removeTitle(removing.name) : ''}
        body={removing ? MEMBERS_COPY.removeBody(removing.name) : ''}
        confirmLabel={MEMBERS_COPY.remove}
        onConfirm={confirmRemove}
        onCancel={() => setRemoving(null)}
        busy={busy}
      />
    </SubScreen>
  );
}

const styles = StyleSheet.create({
  error: { color: palette.coal, marginTop: space.s16, marginHorizontal: space.s8 },
});
