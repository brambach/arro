import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { memberColor, radii, space } from '../../theme/tokens';
import { type } from '../../theme/typography';
import { Avatar } from '../../components/Avatar';
import { StepScreen } from '../../components/StepScreen';
import { TextAction } from '../../components/TextAction';
import { useApp } from '../../state/AppState';
import { PREVIEW_MEMBERS } from '../../data/preview';
import { pickPhoto } from '../../state/photos';
import { RootStackScreenProps } from '../../navigation/types';
import { nextAfter, stepOf } from './steps';

export const PHOTO_COPY = {
  title: 'Add a photo',
  subtitle: 'So your family sees your face, not only a letter. You can skip this.',
  choose: 'Choose a photo',
  change: 'Choose a different photo',
  color: 'Your color is picked for you, so nobody in the family shares one.',
  continue: 'Continue',
  skip: 'Skip for now',
};

/** Invitee: an optional photo. The color is the next one in the palette after the people already in. */
export function OnboardingPhotoScreen({ navigation }: RootStackScreenProps<'OnboardingPhoto'>) {
  const { draft, updateDraft } = useApp();
  const color = memberColor(draft.invite?.memberCount ?? PREVIEW_MEMBERS.length);
  const goNext = () => {
    const next = nextAfter('invitee', 'OnboardingPhoto');
    if (next) navigation.navigate(next as 'HowItWorks');
  };

  return (
    <StepScreen
      title={PHOTO_COPY.title}
      subtitle={PHOTO_COPY.subtitle}
      step={stepOf('invitee', 'OnboardingPhoto')}
      onBack={() => navigation.goBack()}
      primaryLabel={draft.photoUri ? PHOTO_COPY.continue : PHOTO_COPY.skip}
      onPrimary={goNext}
    >
      <View style={styles.center}>
        <Avatar name={draft.name || '?'} color={color} photoUri={draft.photoUri} size={128} accessible />
        <TextAction
          label={draft.photoUri ? PHOTO_COPY.change : PHOTO_COPY.choose}
          onPress={async () => {
            const uri = await pickPhoto('square');
            if (uri) updateDraft({ photoUri: uri });
          }}
          style={styles.choose}
        />
        <View style={styles.colorRow}>
          <View style={[styles.dot, { backgroundColor: color }]} />
          <Text style={[type.label, styles.colorText]}>{PHOTO_COPY.color}</Text>
        </View>
      </View>
    </StepScreen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', paddingTop: space.s8 },
  choose: { marginTop: space.s16 },
  colorRow: { flexDirection: 'row', alignItems: 'center', gap: space.s8, marginTop: space.s24, paddingHorizontal: space.s16 },
  dot: { width: 12, height: 12, borderRadius: radii.round },
  colorText: { flexShrink: 1 },
});
