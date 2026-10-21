import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { alpha, space } from '../../theme/tokens';
import { maxFontScale, type } from '../../theme/typography';
import { Card } from '../../components/Card';
import { StoneMark } from '../../components/brand/StoneMark';
import { StepScreen } from '../../components/StepScreen';
import { useApp } from '../../state/AppState';
import { PREVIEW_FAMILY_NAME, PREVIEW_MEMBERS } from '../../data/preview';
import { RootStackScreenProps } from '../../navigation/types';
import { nextAfter, stepOf } from './steps';

export const INVITE_PREVIEW_COPY = {
  title: 'You’re invited',
  subtitle: 'Sign in next to see who’s in and join them.',
  count: (n: number) => (n === 1 ? '1 person is in' : `${n} people are in`),
  code: 'Code',
  continue: 'Continue',
};

/** Invitee, step 2: what the code opened. Before sign-in that's only the family's name and size. */
export function InvitePreviewScreen({ navigation }: RootStackScreenProps<'InvitePreview'>) {
  const { draft } = useApp();
  const familyName = draft.invite?.familyName ?? PREVIEW_FAMILY_NAME;
  const count = draft.invite?.memberCount ?? PREVIEW_MEMBERS.length;

  return (
    <StepScreen
      title={INVITE_PREVIEW_COPY.title}
      subtitle={INVITE_PREVIEW_COPY.subtitle}
      step={stepOf('invitee', 'InvitePreview')}
      onBack={() => navigation.goBack()}
      primaryLabel={INVITE_PREVIEW_COPY.continue}
      onPrimary={() => {
        const next = nextAfter('invitee', 'InvitePreview');
        if (next) navigation.navigate(next as 'SignIn');
      }}
    >
      <Card padding={24} style={styles.card}>
        <StoneMark width={72} />
        <Text style={[type.title, styles.center, styles.family]} maxFontSizeMultiplier={maxFontScale.title}>
          {familyName}
        </Text>
        <Text style={[type.bodySmall, styles.center]}>{INVITE_PREVIEW_COPY.count(count)}</Text>
        <View style={styles.hairline} />
        <View style={styles.codeRow} accessible accessibilityLabel={`${INVITE_PREVIEW_COPY.code} ${draft.joinCode.split('').join(' ')}`}>
          <Text style={type.caption}>{INVITE_PREVIEW_COPY.code}</Text>
          <Text style={[type.bodyStrong, styles.code]}>{draft.joinCode}</Text>
        </View>
      </Card>
    </StepScreen>
  );
}

const styles = StyleSheet.create({
  card: { alignItems: 'center' },
  center: { textAlign: 'center' },
  family: { marginTop: space.s16, marginBottom: space.s4 },
  hairline: { alignSelf: 'stretch', height: StyleSheet.hairlineWidth, backgroundColor: alpha.hairline, marginVertical: space.s20 },
  codeRow: { flexDirection: 'row', alignItems: 'baseline', gap: space.s12 },
  code: { letterSpacing: 2 },
});
