import React, { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { palette, space } from '../../theme/tokens';
import { type } from '../../theme/typography';
import { ChoiceTiles } from '../../components/ChoiceTiles';
import { StepScreen } from '../../components/StepScreen';
import { ListGroup } from '../../components/ListRow';
import { ToggleRow } from '../../components/ToggleRow';
import { useApp } from '../../state/AppState';
import { RootStackScreenProps } from '../../navigation/types';
import { GOAL_CHOICES, MINUTE_CHOICES, nextAfter, stepOf } from './steps';

export const RHYTHM_COPY = {
  title: 'Your rhythm',
  subtitle: 'What everyone in the family aims for each week. You can change it later.',
  goal: 'How many sessions a week?',
  goalSub: 'a week',
  minutes: 'What counts as a session?',
  minutesSub: 'minutes',
  sunday: 'Week starts on Sunday instead',
  weekNote: 'Weeks run Monday to Sunday. This one can’t change after today.',
  weekNoteSunday: 'Weeks run Sunday to Saturday. This one can’t change after today.',
  weekLocked: 'The week start is set now. The goal and minimum can still change.',
  continue: 'Continue',
  error: 'Couldn’t make your family yet. Check your connection and try again.',
};

/**
 * Your rhythm (new in build 9): the goal (2 to 5 a week, default 3), the
 * shortest session that counts (5 to 20 minutes, default 10), and, only here,
 * a Sunday week start. Continue makes the family on the server with all of it,
 * so the invite step has a real code.
 */
export function RhythmScreen({ navigation }: RootStackScreenProps<'Rhythm'>) {
  const { draft, updateDraft, saveRhythm } = useApp();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const locked = !!draft.remote;
  const sunday = draft.weekStartsOn === 7;

  const onContinue = async () => {
    setSaving(true);
    setError(null);
    try {
      await saveRhythm();
      const next = nextAfter('founder', 'Rhythm');
      if (next) navigation.navigate(next as 'HowItWorks');
    } catch {
      setError(RHYTHM_COPY.error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <StepScreen
      title={RHYTHM_COPY.title}
      subtitle={RHYTHM_COPY.subtitle}
      step={stepOf('founder', 'Rhythm')}
      onBack={() => navigation.goBack()}
      primaryLabel={RHYTHM_COPY.continue}
      primaryDisabled={saving}
      onPrimary={onContinue}
    >
      <Text style={[type.bodyStrong, styles.question]} accessibilityRole="header">
        {RHYTHM_COPY.goal}
      </Text>
      <ChoiceTiles
        accessibilityLabel={RHYTHM_COPY.goal}
        options={GOAL_CHOICES.map((g) => ({ value: g, label: String(g), sub: RHYTHM_COPY.goalSub, accessibilityLabel: `${g} sessions a week` }))}
        value={draft.goal}
        onChange={(goal) => updateDraft({ goal })}
      />

      <Text style={[type.bodyStrong, styles.question, styles.second]} accessibilityRole="header">
        {RHYTHM_COPY.minutes}
      </Text>
      <ChoiceTiles
        accessibilityLabel={RHYTHM_COPY.minutes}
        options={MINUTE_CHOICES.map((m) => ({ value: m, label: String(m), sub: RHYTHM_COPY.minutesSub, accessibilityLabel: `${m} minutes or more` }))}
        value={draft.minMinutes}
        onChange={(minMinutes) => updateDraft({ minMinutes })}
      />

      <ListGroup style={styles.sunday}>
        <ToggleRow
          title={RHYTHM_COPY.sunday}
          value={sunday}
          onValueChange={(on) => updateDraft({ weekStartsOn: on ? 7 : 1 })}
          disabled={locked}
        />
      </ListGroup>
      <Text style={[type.label, styles.note]}>
        {locked ? RHYTHM_COPY.weekLocked : sunday ? RHYTHM_COPY.weekNoteSunday : RHYTHM_COPY.weekNote}
      </Text>
      {error ? <Text style={[type.bodySmall, styles.error]}>{error}</Text> : null}
    </StepScreen>
  );
}

const styles = StyleSheet.create({
  question: { marginBottom: space.s12 },
  second: { marginTop: space.s32 },
  sunday: { marginTop: space.s32 },
  note: { marginTop: space.s8, marginHorizontal: space.s8 },
  error: { color: palette.coal, marginTop: space.s16 },
});
