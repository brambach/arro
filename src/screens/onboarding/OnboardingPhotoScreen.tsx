import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme/tokens';
import { weights } from '../../theme/typography';
import { memberColor } from '../../theme/tokens';
import { AvatarRing } from '../../components/AvatarRing';
import { OnboardingFrame } from '../../components/OnboardingFrame';
import { TextButton } from '../../components/TextButton';
import { useApp } from '../../state/AppState';
import { familyMembersList } from '../../data/family';
import { pickPhoto } from '../../state/photos';
import { RootStackScreenProps } from '../../navigation/types';
import { stepOf } from './steps';

/** Optional photo. The colour is automatic: the next one in the palette after the people already in. */
export function OnboardingPhotoScreen({ navigation }: RootStackScreenProps<'OnboardingPhoto'>) {
  const { draft, updateDraft } = useApp();
  const color = memberColor(familyMembersList.length);

  return (
    <OnboardingFrame
      title="Add a photo"
      subtitle="So your family sees a face, not a letter. You can skip this."
      step={stepOf('invitee', 'OnboardingPhoto')}
      onBack={() => navigation.goBack()}
      primaryLabel={draft.photoUri ? 'Continue' : 'Skip for now'}
      onPrimary={() => navigation.navigate('HowItWorks')}
    >
      <View style={styles.center}>
        <AvatarRing name={draft.name || '?'} color={color} photoUri={draft.photoUri} size={120} />
        <TextButton
          label={draft.photoUri ? 'Choose a different photo' : 'Choose a photo'}
          onPress={async () => {
            const uri = await pickPhoto();
            if (uri) updateDraft({ photoUri: uri });
          }}
          style={styles.choose}
        />
        <View style={styles.colorRow}>
          <View style={[styles.dot, { backgroundColor: color }]} />
          <Text style={styles.colorText}>Your colour is picked for you</Text>
        </View>
      </View>
    </OnboardingFrame>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', paddingTop: 12 },
  choose: { fontSize: 15.5, marginTop: 18 },
  colorRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 22 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  colorText: { fontSize: 13, fontWeight: weights.medium, color: colors.muted },
});
