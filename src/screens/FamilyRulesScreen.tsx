import React, { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { palette, space } from '../theme/tokens';
import { type } from '../theme/typography';
import { ChoiceTiles } from '../components/ChoiceTiles';
import { ListGroup, ListRow } from '../components/ListRow';
import { SolidButton } from '../components/SolidButton';
import { GroupLabel, GroupNote, SubScreen } from '../components/SubScreen';
import { RootStackScreenProps } from '../navigation/types';
import { useApp, useView } from '../state/AppState';
import { rhythmSummary } from '../state/buildView';
import { GOAL_CHOICES, MINUTE_CHOICES } from './onboarding/steps';

export const FAMILY_RULES_COPY = {
  title: 'Family rules',
  lead: 'What everyone aims for each week. A change starts at the beginning of next week, so nobody’s week moves under them.',
  leadReadOnly: (founder: string) => `${founder} started the family, so ${founder} sets the rhythm. Here’s what it is.`,
  thisWeek: 'This week',
  next: 'Next week',
  goal: 'Sessions a week',
  goalValue: (n: number) => (n === 1 ? '1 session' : `${n} sessions`),
  minutes: 'Counts from',
  minutesValue: (n: number) => `${n} minutes`,
  weekStart: 'Week starts on',
  weekStartNote: 'Set when the family started. It can’t change.',
  sessionsQuestion: 'How many sessions a week?',
  minutesQuestion: 'What counts as a session?',
  save: 'Save for next week',
  saved: (label: string) => `Saved. ${label}.`,
  failed: 'Couldn’t save the rules. Check your connection and try again.',
};

/** Tile choices, plus the family's own number if it's outside them (the server allows 1 to 7, and 1 to 60 minutes). */
export function withCurrent(choices: number[], current: number): number[] {
  return choices.includes(current) ? choices : [...choices, current].sort((a, b) => a - b);
}

/**
 * Settings > Family rules (new). The founder changes the goal and the minimum;
 * set_family_rules starts them next week and says when ("Starting Monday,
 * Oct 26"). Everyone else reads them. The week start shows, locked.
 */
export function FamilyRulesScreen({ navigation }: RootStackScreenProps<'FamilyRules'>) {
  const view = useView();
  const { setRules } = useApp();
  const r = view.rules;
  const target = r.pendingChange ?? { goal: r.goal, minMinutes: r.minMinutes };
  const [goal, setGoal] = useState(target.goal);
  const [minMinutes, setMinMinutes] = useState(target.minMinutes);
  const [busy, setBusy] = useState(false);
  const [line, setLine] = useState<{ text: string; tone: 'stone' | 'coal' } | null>(null);
  const founder = view.allMembers.find((m) => !m.invited)?.name ?? 'The founder';
  const changed = goal !== target.goal || minMinutes !== target.minMinutes;

  const save = async () => {
    setBusy(true);
    setLine(null);
    try {
      const starting = await setRules(goal, minMinutes);
      setLine({ text: FAMILY_RULES_COPY.saved(starting), tone: 'stone' });
    } catch {
      setLine({ text: FAMILY_RULES_COPY.failed, tone: 'coal' });
    } finally {
      setBusy(false);
    }
  };

  const summary = (
    <>
      <GroupLabel first>{FAMILY_RULES_COPY.thisWeek}</GroupLabel>
      <ListGroup>
        <ListRow title={FAMILY_RULES_COPY.goal} value={FAMILY_RULES_COPY.goalValue(r.goal)} />
        <ListRow title={FAMILY_RULES_COPY.minutes} value={FAMILY_RULES_COPY.minutesValue(r.minMinutes)} />
        <ListRow title={FAMILY_RULES_COPY.weekStart} value={r.weekStartDay} valueTone="quiet" />
      </ListGroup>
      <GroupNote>{FAMILY_RULES_COPY.weekStartNote}</GroupNote>
      {r.pendingChange ? (
        <>
          <GroupLabel>{FAMILY_RULES_COPY.next}</GroupLabel>
          <ListGroup>
            <ListRow title={r.pendingChange.label} subtitle={rhythmSummary(r.pendingChange.goal, r.pendingChange.minMinutes)} />
          </ListGroup>
        </>
      ) : null}
    </>
  );

  if (!r.canEdit) {
    return (
      <SubScreen title={FAMILY_RULES_COPY.title} lead={FAMILY_RULES_COPY.leadReadOnly(founder)} onBack={() => navigation.goBack()}>
        {summary}
      </SubScreen>
    );
  }

  return (
    <SubScreen
      title={FAMILY_RULES_COPY.title}
      lead={FAMILY_RULES_COPY.lead}
      onBack={() => navigation.goBack()}
      footer={<SolidButton title={FAMILY_RULES_COPY.save} onPress={save} disabled={!changed || busy} />}
    >
      {summary}
      <Text style={[type.bodyStrong, styles.question]} accessibilityRole="header">
        {FAMILY_RULES_COPY.sessionsQuestion}
      </Text>
      <ChoiceTiles
        accessibilityLabel={FAMILY_RULES_COPY.sessionsQuestion}
        options={withCurrent(GOAL_CHOICES, goal).map((g) => ({ value: g, label: String(g), sub: 'a week', accessibilityLabel: `${g} sessions a week` }))}
        value={goal}
        onChange={setGoal}
      />
      <Text style={[type.bodyStrong, styles.question]} accessibilityRole="header">
        {FAMILY_RULES_COPY.minutesQuestion}
      </Text>
      <ChoiceTiles
        accessibilityLabel={FAMILY_RULES_COPY.minutesQuestion}
        options={withCurrent(MINUTE_CHOICES, minMinutes).map((m) => ({ value: m, label: String(m), sub: 'minutes', accessibilityLabel: `${m} minutes or more` }))}
        value={minMinutes}
        onChange={setMinMinutes}
      />
      {line ? <Text style={[type.bodySmall, styles.line, line.tone === 'coal' && styles.coal]}>{line.text}</Text> : null}
    </SubScreen>
  );
}

const styles = StyleSheet.create({
  question: { marginTop: space.s32, marginBottom: space.s12, marginHorizontal: space.s8 },
  line: { color: palette.smoke, marginTop: space.s16, marginHorizontal: space.s8 },
  coal: { color: palette.coal },
});
