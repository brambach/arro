import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing } from '../theme/tokens';
import { type } from '../theme/typography';
import { ChoiceRow } from '../components/ChoiceRow';
import { PrimaryButton } from '../components/PrimaryButton';
import { TextButton } from '../components/TextButton';
import { ChevronLeft } from '../components/Icons';
import { useApp, useView } from '../state/AppState';
import { showError } from '../state/confirm';
import { daysBetween, dayKey } from '../state/dates';
import { RootStackScreenProps } from '../navigation/types';
import { Backdrop } from '../components/Backdrop';

const LENGTHS = [
  { days: 1, label: 'Just today' },
  { days: 3, label: 'Three days' },
  { days: 7, label: 'A week' },
  { days: 14, label: 'Two weeks' },
];

/**
 * Settings > Take a break ("Pause me"): for a holiday or being unwell. While it
 * lasts you're not expected, so the family streak carries on without you and your
 * own streak waits. Your family sees that you're away and until when, not why.
 */
export function TakeBreakScreen({ navigation }: RootStackScreenProps<'TakeBreak'>) {
  const insets = useSafeAreaInsets();
  const { takeBreak, endBreak } = useApp();
  const { myBreak } = useView();
  const daysLeft = myBreak ? daysBetween(dayKey(), myBreak.endsOn) + 1 : null;
  const [days, setDays] = useState(daysLeft && LENGTHS.some((l) => l.days === daysLeft) ? daysLeft : 3);
  const [busy, setBusy] = useState(false);

  const run = async (action: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    try {
      await action();
      navigation.goBack();
    } catch {
      showError('Couldn’t save your break', 'Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <Backdrop />
      <View style={styles.topBar}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10} accessibilityLabel="Back">
          <ChevronLeft />
        </Pressable>
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.gutter, paddingBottom: insets.bottom + 24 }}>
        <Text style={type.title}>{myBreak ? `On a break until ${myBreak.until}` : 'Take a break'}</Text>
        <Text style={styles.sub}>
          Away, unwell, or just need a few days? The family streak carries on without you, and yours waits for you.
        </Text>
        <View style={{ marginTop: 18 }}>
          {LENGTHS.map((l) => (
            <ChoiceRow
              key={l.days}
              title={l.label}
              body={l.days === 1 ? 'Back tomorrow' : `Starting today, for ${l.days} days`}
              selected={days === l.days}
              onPress={() => setDays(l.days)}
            />
          ))}
        </View>
        <Text style={styles.note}>
          Your family sees you’re on a break and when you’re back, never why. Moving while you’re away still counts.
        </Text>
        <PrimaryButton
          title={myBreak ? 'Change my break' : 'Start my break'}
          onPress={() => run(() => takeBreak(days))}
          disabled={busy}
          style={{ marginTop: 22 }}
        />
        {myBreak ? (
          <View style={{ marginTop: 16, alignItems: 'center' }}>
            <TextButton label="I’m back, end it now" onPress={() => run(endBreak)} />
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.screen },
  topBar: { paddingHorizontal: 16, paddingVertical: 6 },
  sub: { ...type.body, marginTop: 6 },
  note: { fontSize: 13, lineHeight: 18, color: colors.faint, marginTop: 2 },
});
