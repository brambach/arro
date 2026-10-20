import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme/tokens';
import { type, weights } from '../../theme/typography';
import { Card } from '../../components/Card';
import { ArroMark } from '../../components/Icons';
import { OnboardingFrame } from '../../components/OnboardingFrame';
import { useApp } from '../../state/AppState';
import { PREVIEW_FAMILY_NAME, PREVIEW_MEMBERS } from '../../data/preview';
import { RootStackScreenProps } from '../../navigation/types';
import { stepOf } from './steps';

/** Before sign-in the server only says the family's name and how many people are in it. */
export function InvitePreviewScreen({ navigation }: RootStackScreenProps<'InvitePreview'>) {
  const { draft } = useApp();
  // The server's answer, or the preview family when there's no server.
  const familyName = draft.invite?.familyName ?? PREVIEW_FAMILY_NAME;
  const count = draft.invite?.memberCount ?? PREVIEW_MEMBERS.length;

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
  family: { ...type.title, textAlign: 'center', marginTop: 14 },
  count: { ...type.body, marginTop: 4 },
  codeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 18 },
  codeLabel: { ...type.meta },
  code: { fontSize: 15, fontWeight: weights.semibold, letterSpacing: 2, color: colors.inkSoft },
});
