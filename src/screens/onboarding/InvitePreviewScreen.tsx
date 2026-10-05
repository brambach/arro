import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme/tokens';
import { weights } from '../../theme/typography';
import { Card } from '../../components/Card';
import { ArroMark } from '../../components/Icons';
import { OnboardingFrame } from '../../components/OnboardingFrame';
import { DEMO_FAMILY_NAME, useApp } from '../../state/AppState';
import { familyMembersList } from '../../data/family';
import { RootStackScreenProps } from '../../navigation/types';
import { stepOf } from './steps';

/** Before sign-in the server only says the family's name and how many people are in it. */
export function InvitePreviewScreen({ navigation }: RootStackScreenProps<'InvitePreview'>) {
  const { draft } = useApp();
  // The server's answer, or the preview family when there's no server.
  const familyName = draft.invite?.familyName ?? DEMO_FAMILY_NAME;
  const count = draft.invite?.memberCount ?? familyMembersList.length;

  return (
    <OnboardingFrame
      title="You’re invited"
      subtitle="Sign in to see who’s in and join them."
      step={stepOf('invitee', 'InvitePreview')}
      onBack={() => navigation.goBack()}
      primaryLabel="Continue"
      onPrimary={() => navigation.navigate('SignIn')}
    >
      <Card padding={24} style={styles.card}>
        <ArroMark size={44} />
        <Text style={styles.family}>{familyName}</Text>
        <Text style={styles.count}>
          {count} {count === 1 ? 'person is' : 'people are'} in
        </Text>
        <View style={styles.codeRow}>
          <Text style={styles.codeLabel}>Code</Text>
          <Text style={styles.code}>{draft.joinCode}</Text>
        </View>
      </Card>
    </OnboardingFrame>
  );
}

const styles = StyleSheet.create({
  card: { alignItems: 'center' },
  family: { fontSize: 24, fontWeight: weights.bold, letterSpacing: -0.4, color: colors.ink, marginTop: 14 },
  count: { fontSize: 14.5, color: colors.muted, marginTop: 4 },
  codeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 18 },
  codeLabel: { fontSize: 12.5, color: colors.faint },
  code: { fontSize: 15, fontWeight: weights.semibold, letterSpacing: 2, color: colors.inkSoft },
});
