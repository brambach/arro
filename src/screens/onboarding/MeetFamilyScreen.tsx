import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme/tokens';
import { type, weights } from '../../theme/typography';
import { AvatarRing } from '../../components/AvatarRing';
import { Card } from '../../components/Card';
import { OnboardingFrame } from '../../components/OnboardingFrame';
import { DEMO_FAMILY_NAME, useApp } from '../../state/AppState';
import { InviteError } from '../../state/backend';
import { showError } from '../../state/confirm';
import { familyMembersList } from '../../data/family';
import { Member } from '../../data/types';
import { RootStackScreenProps } from '../../navigation/types';
import { nextAfter, stepOf } from './steps';

/**
 * After sign-in the server can say who's in the family and how the streak is going.
 * "Join the family" joins it on the server there and then; the steps after it set
 * up this phone.
 */
export function MeetFamilyScreen({ navigation }: RootStackScreenProps<'MeetFamily'>) {
  const { draft, online, lookUpInvite, joinInvitedFamily } = useApp();
  const invite = draft.invite;
  const [busy, setBusy] = useState(false);

  const join = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await joinInvitedFamily();
      navigation.navigate(nextAfter('invitee', 'MeetFamily') as 'HowItWorks');
    } catch (e) {
      showError(
        'Couldn’t join yet',
        e instanceof InviteError
          ? e.kind === 'notFound'
            ? `${e.message} Ask your family for a new code.`
            : e.message
          : 'Check your connection and try again.',
      );
    } finally {
      setBusy(false);
    }
  };

  // Signed in now, the same code also returns names, colours and the streak.
  useEffect(() => {
    if (online && draft.userId) lookUpInvite().catch(() => undefined);
  }, [online, draft.userId, lookUpInvite]);

  const members: Member[] = invite
    ? invite.members.map((m, i) => ({ id: `invitee-preview-${i}`, name: m.name, color: m.color, streak: 0, today: 'still', meta: '' }))
    : familyMembersList;
  const inviter = invite ? invite.invitedBy ?? members[0]?.name ?? 'Your family' : familyMembersList[0].name;
  const familyName = invite?.familyName ?? DEMO_FAMILY_NAME;
  const streak = invite ? invite.familyStreak : 24;

  return (
    <OnboardingFrame
      title={`${inviter} invited you to ${familyName}`}
      subtitle={`Welcome, ${draft.name.trim() || 'friend'}. Here’s who’s in.`}
      step={stepOf('invitee', 'MeetFamily')}
      onBack={() => navigation.goBack()}
      primaryLabel="Join the family"
      primaryDisabled={busy}
      onPrimary={join}
    >
      <Card padding={18}>
        <View style={styles.faces}>
          {members.map((m) => (
            <View key={m.id} style={styles.face}>
              <AvatarRing member={m} size={52} />
              <Text style={styles.faceName}>{m.name}</Text>
            </View>
          ))}
        </View>
        {streak ? (
          <View style={styles.streakRow}>
            <Text style={styles.streakNumber}>Day {streak}</Text>
            <Text style={styles.streakLabel}>family streak, and still going</Text>
          </View>
        ) : (
          <View style={styles.streakRow}>
            <Text style={styles.streakLabel}>The family streak starts with you.</Text>
          </View>
        )}
      </Card>
    </OnboardingFrame>
  );
}

const styles = StyleSheet.create({
  faces: { flexDirection: 'row', justifyContent: 'space-around' },
  face: { alignItems: 'center', gap: 6 },
  faceName: { fontSize: 14, fontWeight: weights.semibold, color: colors.ink },
  streakRow: {
    marginTop: 18,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.dividerSoft,
    alignItems: 'center',
  },
  streakNumber: { ...type.bigNumber, fontSize: 34, lineHeight: 36 },
  streakLabel: { ...type.body, marginTop: 2 },
});
