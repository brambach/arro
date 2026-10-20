import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { palette, space } from '../theme/tokens';
import { type } from '../theme/typography';
import { ChoiceList } from '../components/ChoiceList';
import { ConfirmSheet } from '../components/ConfirmSheet';
import { SolidButton } from '../components/SolidButton';
import { GroupNote, SubScreen } from '../components/SubScreen';
import { TextAction } from '../components/TextAction';
import { RootStackScreenProps } from '../navigation/types';
import { useApp, useView } from '../state/AppState';
import { BreakError } from '../state/backend';
import { nextBreakDay } from '../state/breaks';
import { dayKey, untilLabel } from '../state/dates';
import { BreakKey, breakOptions } from '../state/settingsCopy';

export const TAKE_BREAK_COPY = {
  title: 'Take a break',
  onBreakTitle: (until: string) => `On a break until ${until}`,
  lead: 'Away, unwell, or just need some time? While you’re on a break the family streak carries on without you, and yours waits.',
  family: 'Your family sees that you’re on a break and when you’re back, never why. A session while you’re away still counts.',
  limit: 'A break can be up to two weeks, and up to 14 days in any 30.',
  full: (from: string | null) =>
    `You’ve had 14 days of breaks in the last 30, which is the most there can be.${from ? ` You can take another from ${from}.` : ''}`,
  doesntFit: 'Over the limit right now',
  start: 'Start my break',
  change: 'Change my break',
  end: 'I’m back, end it now',
  endTitle: 'End your break?',
  endBody: 'You’re back in this week from today. Sessions from today count toward it.',
  endConfirm: 'End my break',
  failed: 'Couldn’t save your break. Check your connection and try again.',
};

/**
 * Settings > Take a break: Rest of this week, One week, Two weeks. The server's
 * limits stay (1 to 14 days counting today, at most 14 paused days in any 30),
 * and lengths that wouldn't fit say so instead of failing. "I'm back, end it
 * now" ends a running break.
 */
export function TakeBreakScreen({ navigation }: RootStackScreenProps<'TakeBreak'>) {
  const { takeBreak, endBreak } = useApp();
  const view = useView();
  const today = dayKey();
  const options = breakOptions(view.myPauses, today, view.rules.weekStartsOn);
  const firstFit = options.find((o) => o.fits)?.key ?? null;
  const [picked, setPicked] = useState<BreakKey | null>(null);
  const chosen = options.find((o) => o.key === (picked ?? firstFit) && o.fits) ?? null;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const nothingFits = !firstFit;
  const from = nothingFits ? nextBreakDay(view.myPauses, today) : null;

  const run = async (action: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await action();
      navigation.goBack();
    } catch (e) {
      setError(e instanceof BreakError ? e.message : TAKE_BREAK_COPY.failed);
    } finally {
      setBusy(false);
      setConfirmEnd(false);
    }
  };

  return (
    <SubScreen
      title={view.myBreak ? TAKE_BREAK_COPY.onBreakTitle(view.myBreak.until) : TAKE_BREAK_COPY.title}
      lead={TAKE_BREAK_COPY.lead}
      onBack={() => navigation.goBack()}
      footer={
        <>
          <SolidButton
            title={view.myBreak ? TAKE_BREAK_COPY.change : TAKE_BREAK_COPY.start}
            onPress={() => chosen && run(() => takeBreak(chosen.days))}
            disabled={busy || !chosen}
          />
          {view.myBreak ? <TextAction label={TAKE_BREAK_COPY.end} onPress={() => setConfirmEnd(true)} style={styles.end} /> : null}
        </>
      }
    >
      {nothingFits ? (
        <Text style={[type.body, styles.full]}>{TAKE_BREAK_COPY.full(from ? untilLabel(from, today) : null)}</Text>
      ) : null}
      <ChoiceList
        accessibilityLabel="How long"
        value={chosen?.key ?? null}
        onChange={(key) => setPicked(key)}
        items={options.map((o) => ({
          value: o.key,
          title: o.title,
          subtitle: o.fits ? o.detail : TAKE_BREAK_COPY.doesntFit,
          disabled: !o.fits,
        }))}
      />
      <GroupNote>{TAKE_BREAK_COPY.limit}</GroupNote>
      <View style={styles.family}>
        <Text style={[type.bodySmall]}>{TAKE_BREAK_COPY.family}</Text>
      </View>
      {error ? <Text style={[type.bodySmall, styles.error]}>{error}</Text> : null}
      <ConfirmSheet
        visible={confirmEnd}
        title={TAKE_BREAK_COPY.endTitle}
        body={TAKE_BREAK_COPY.endBody}
        confirmLabel={TAKE_BREAK_COPY.endConfirm}
        onConfirm={() => run(endBreak)}
        onCancel={() => setConfirmEnd(false)}
        busy={busy}
      />
    </SubScreen>
  );
}

const styles = StyleSheet.create({
  full: { color: palette.smoke, marginBottom: space.s16, marginHorizontal: space.s8 },
  family: { marginTop: space.s24, marginHorizontal: space.s8 },
  error: { color: palette.coal, marginTop: space.s16, marginHorizontal: space.s8 },
  end: { marginTop: space.s8 },
});
