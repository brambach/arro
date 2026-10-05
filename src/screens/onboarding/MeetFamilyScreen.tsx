import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme/tokens';
import { weights } from '../../theme/typography';
import { AvatarRing } from '../../components/AvatarRing';
import { Card } from '../../components/Card';
import { OnboardingFrame } from '../../components/OnboardingFrame';
import { DEMO_FAMILY_NAME, useApp } from '../../state/AppState';
import { familyMembersList } from '../../data/family';
import { RootStackScreenProps } from '../../navigation/types';
import { stepOf } from './steps';

/** After sign-in the server can say who's in the family and how the streak is going. */
export function MeetFamilyScreen({ navigation }: RootStackScreenProps<'MeetFamily'>) {
  const { draft } = useApp();
  const founder = familyMembersList[0];

  return (
    <OnboardingFrame
      title={`${founder.name} invited you to ${DEMO_FAMILY_NAME}`}
      subtitle={`Welcome, ${draft.name.trim() || 'friend'}. Here’s who’s in.`}
      step={stepOf('invitee', 'MeetFamily')}
      onBack={() => navigation.goBack()}
      primaryLabel="Join the family"
      onPrimary={() => navigation.navigate('OnboardingPhoto')}
    >
      <Card padding={18}>
        <View style={styles.faces}>
          {familyMembersList.map((m) => (
            <View key={m.id} style={styles.face}>
              <AvatarRing member={m} size={52} />
              <Text style={styles.faceName}>{m.name}</Text>
            </View>
          ))}
        </View>
        <View style={styles.streakRow}>
          <Text style={styles.streakNumber}>Day 24</Text>
          <Text style={styles.streakLabel}>family streak, and still going</Text>
        </View>
      </Card>
    </OnboardingFrame>
  );
}

const styles = StyleSheet.create({
  faces: { flexDirection: 'row', justifyContent: 'space-around' },
  face: { alignItems: 'center', gap: 6 },
  faceName: { fontSize: 13.5, fontWeight: weights.semibold, color: colors.ink },
  streakRow: {
    marginTop: 18,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.dividerSoft,
    alignItems: 'center',
  },
  streakNumber: { fontSize: 26, fontWeight: weights.bold, letterSpacing: -0.4, color: colors.primary },
  streakLabel: { fontSize: 13, color: colors.muted, marginTop: 2 },
});
