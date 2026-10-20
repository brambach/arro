import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { alpha, palette, space } from '../../theme/tokens';
import { maxFontScale, type } from '../../theme/typography';
import { Avatar } from '../../components/Avatar';
import { Card } from '../../components/Card';
import { FixedDigits } from '../../components/FixedDigits';
import { StepScreen } from '../../components/StepScreen';
import { useApp } from '../../state/AppState';
import { InviteError } from '../../state/backend';
import { rhythmSummary } from '../../state/buildView';
import { PREVIEW_FAMILY_NAME, PREVIEW_MEMBERS } from '../../data/preview';
import { RootStackScreenProps } from '../../navigation/types';
import { nextAfter, stepOf } from './steps';

export const MEET_FAMILY_COPY = {
  title: (familyName: string) => `Meet ${familyName}`,
  subtitle: (name: string) => `Welcome, ${name}. Here’s who you’ll sauna with.`,
  invitedBy: (name: string) => `${name} invited you.`,
  weeks: (n: number) => (n === 1 ? 'week together' : 'weeks together'),
  starting: 'The family streak starts with you.',
  join: 'Join the family',
  newCode: 'Ask them for a new code.',
  offline: 'Couldn’t join yet. Check your connection and try again.',
};

/**
 * Invitee, Meet the family: who's in, who invited you, the family streak in
 * weeks and the rhythm ("3 sessions a week, 10 minutes or more"). "Join the
 * family" joins on the server there and then; the steps after it set up this
 * phone.
 */
export function MeetFamilyScreen({ navigation }: RootStackScreenProps<'MeetFamily'>) {
  const { draft, online, lookUpInvite, joinInvitedFamily } = useApp();
  const invite = draft.invite;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Signed in now, the same code also returns names, colors, the streak and the rhythm.
  useEffect(() => {
    if (online && draft.userId) lookUpInvite().catch(() => undefined);
  }, [online, draft.userId, lookUpInvite]);

  const join = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await joinInvitedFamily();
      const next = nextAfter('invitee', 'MeetFamily');
      if (next) navigation.navigate(next as 'OnboardingPhoto');
    } catch (e) {
      setError(
        e instanceof InviteError ? (e.kind === 'notFound' ? `${e.message} ${MEET_FAMILY_COPY.newCode}` : e.message) : MEET_FAMILY_COPY.offline,
      );
    } finally {
      setBusy(false);
    }
  };

  // The preview family: Maya invited you to Sunday sauna, where Jo is too.
  const members = invite ? invite.members : PREVIEW_MEMBERS.slice(1);
  const inviter = invite ? invite.invitedBy : PREVIEW_MEMBERS[1].name;
  const familyName = invite?.familyName ?? PREVIEW_FAMILY_NAME;
  const streak = invite ? (invite.weekStreak ?? 0) : 8;
  const rhythm = rhythmSummary(invite?.goalPerWeek ?? 3, invite?.minMinutes ?? 10);

  return (
    <StepScreen
      title={MEET_FAMILY_COPY.title(familyName)}
      subtitle={MEET_FAMILY_COPY.subtitle(draft.name.trim() || 'friend')}
      step={stepOf('invitee', 'MeetFamily')}
      onBack={() => navigation.goBack()}
      primaryLabel={MEET_FAMILY_COPY.join}
      primaryDisabled={busy}
      onPrimary={join}
    >
      <Card padding={24}>
        <View style={styles.faces}>
          {members.map((m) => (
            <View key={m.name} style={styles.face}>
              <Avatar name={m.name} color={m.color} size={56} />
              <Text style={[type.bodySmallStrong, styles.faceName]}>{m.name}</Text>
            </View>
          ))}
        </View>
        {inviter ? <Text style={[type.bodySmall, styles.center, styles.invited]}>{MEET_FAMILY_COPY.invitedBy(inviter)}</Text> : null}
        <View style={styles.hairline} />
        {streak > 0 ? (
          <View style={styles.streak} accessible accessibilityLabel={`${streak} ${MEET_FAMILY_COPY.weeks(streak)}`}>
            <FixedDigits value={String(streak)} variant="display" color={palette.coal} />
            <Text style={type.heading} maxFontSizeMultiplier={maxFontScale.heading}>
              {MEET_FAMILY_COPY.weeks(streak)}
            </Text>
          </View>
        ) : (
          <Text style={[type.heading, styles.center]} maxFontSizeMultiplier={maxFontScale.heading}>
            {MEET_FAMILY_COPY.starting}
          </Text>
        )}
        <Text style={[type.bodySmall, styles.center, styles.rhythm]}>{rhythm}</Text>
      </Card>
      {error ? <Text style={[type.bodySmall, styles.error]}>{error}</Text> : null}
    </StepScreen>
  );
}

const styles = StyleSheet.create({
  faces: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: space.s24 },
  face: { alignItems: 'center', gap: space.s8 },
  faceName: { color: palette.char },
  center: { textAlign: 'center' },
  invited: { marginTop: space.s16 },
  hairline: { height: StyleSheet.hairlineWidth, backgroundColor: alpha.hairline, marginVertical: space.s20 },
  streak: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: space.s12, flexWrap: 'wrap' },
  rhythm: { marginTop: space.s8 },
  error: { color: palette.coal, marginTop: space.s16 },
});
