import React, { useCallback, useEffect, useState } from 'react';
import { AppState as RNAppState, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing } from '../theme/tokens';
import { type, weights } from '../theme/typography';
import { ChoiceRow } from '../components/ChoiceRow';
import { ChevronLeft } from '../components/Icons';
import { ReminderSlot } from '../data/types';
import { useApp } from '../state/AppState';
import { showError } from '../state/confirm';
import { NotificationPermission, notificationPermission } from '../state/notifications';
import { RootStackScreenProps } from '../navigation/types';
import { REMINDER_SLOTS } from './onboarding/ReminderTimeScreen';
import { Backdrop } from '../components/Backdrop';

/**
 * Settings > Notifications: the daily reminder's time, or none, and whether
 * notifications are on at all. Picking a time or "Turn on notifications" asks iOS
 * the first time; after a "Don't Allow" only the iPhone's Settings app can turn it
 * back on, so the screen says so and links there.
 */
export function NotificationsScreen({ navigation }: RootStackScreenProps<'Notifications'>) {
  const insets = useSafeAreaInsets();
  const { session, setReminder, turnOnNotifications } = useApp();
  const [permission, setPermission] = useState<NotificationPermission | null>(null);
  const [busy, setBusy] = useState(false);
  const wanted = !!session?.me.remindersWanted;
  const current = session?.me.reminder ?? 'evening';

  const check = useCallback(() => {
    notificationPermission().then(setPermission);
  }, []);

  // Coming back from the iPhone's Settings app picks up a change made there.
  useEffect(() => {
    check();
    const sub = RNAppState.addEventListener('change', (state) => {
      if (state === 'active') check();
    });
    return () => sub.remove();
  }, [check]);

  const choose = async (slot: ReminderSlot | null) => {
    if (busy) return;
    if (slot === null ? !wanted : wanted && slot === current) return;
    setBusy(true);
    try {
      const result = await setReminder(slot === null ? { wanted: false } : { wanted: true, slot });
      if (result) setPermission(result);
    } catch {
      showError('Couldn’t change your reminder', 'Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  const turnOn = async () => {
    if (busy) return;
    setBusy(true);
    try {
      setPermission(await turnOnNotifications());
    } finally {
      setBusy(false);
    }
  };

  const blocked = permission === 'denied';

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <Backdrop />
      <View style={styles.topBar}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10} accessibilityLabel="Back">
          <ChevronLeft />
        </Pressable>
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.gutter, paddingBottom: insets.bottom + 24 }}>
        <Text style={type.title}>Notifications</Text>
        <Text style={styles.sub}>One reminder a day, only if you haven’t moved yet.</Text>
        <View style={{ marginTop: 18 }}>
          {REMINDER_SLOTS.map((s) => (
            <ChoiceRow
              key={s.slot}
              title={s.title}
              body={`Reminder at ${s.time}`}
              selected={wanted && current === s.slot}
              onPress={() => choose(s.slot)}
            />
          ))}
          <ChoiceRow title="No reminder" selected={!wanted} onPress={() => choose(null)} />
        </View>
        {permission === 'unavailable' ? (
          <Text style={styles.note}>Notifications aren’t available in this version of Arro.</Text>
        ) : permission === 'undetermined' ? (
          <>
            <Text style={styles.note}>
              Notifications are off, so cheers and nudges from your family don’t reach you yet.
            </Text>
            <Pressable onPress={turnOn} disabled={busy} accessibilityRole="button" hitSlop={8} style={styles.link}>
              <Text style={styles.linkText}>Turn on notifications</Text>
            </Pressable>
          </>
        ) : blocked ? (
          <>
            <Text style={styles.note}>
              Notifications for Arro are off in the iPhone’s Settings, so cheers, nudges and reminders don’t arrive yet. Turn
              on Allow Notifications there.
            </Text>
            <Pressable onPress={() => Linking.openSettings()} accessibilityRole="button" hitSlop={8} style={styles.link}>
              <Text style={styles.linkText}>Open iPhone Settings</Text>
            </Pressable>
          </>
        ) : (
          <Text style={styles.note}>
            Arro also lets you know when someone cheers you on or joins your family, and at most once an evening who
            still has today. No red badges.
          </Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.screen },
  topBar: { paddingHorizontal: 16, paddingVertical: 6 },
  sub: { ...type.body, marginTop: 6 },
  note: { fontSize: 13, lineHeight: 18, color: colors.faint, marginTop: 2 },
  link: { marginTop: 10, alignSelf: 'flex-start' },
  linkText: { fontSize: 15, fontWeight: weights.semibold, color: colors.ink, textDecorationLine: 'underline' },
});
