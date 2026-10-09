import React, { useEffect, useState } from 'react';
import { AppState as RNAppState, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radii, spacing, shadows } from '../theme/tokens';
import { type, weights } from '../theme/typography';
import { AvatarRing } from '../components/AvatarRing';
import { BellIcon, ChevronLeft, ChevronRight, LockIcon, PulseIcon, TargetIcon, UsersIcon } from '../components/Icons';
import { settings } from '../data/family';
import { Preview } from '../state/buildView';
import { confirmAction, showError } from '../state/confirm';
import { useApp, useView } from '../state/AppState';
import { NotificationPermission, notificationPermission } from '../state/notifications';
import { RootStackScreenProps } from '../navigation/types';
import { REMINDER_SLOTS } from './onboarding/ReminderTimeScreen';

// Ink icons on a paper tile: one quiet set instead of five bright hues.
const ICONS: Record<string, React.ReactNode> = {
  pulse: <PulseIcon color={colors.inkSoft} />,
  users: <UsersIcon size={18} color={colors.inkSoft} strokeWidth={1.9} />,
  target: <TargetIcon color={colors.inkSoft} />,
  bell: <BellIcon color={colors.inkSoft} />,
  lock: <LockIcon color={colors.inkSoft} />,
};

// The live pages on arrofamily.com, the same ones the App Store listing links to.
const LINKS: Record<string, string> = {
  privacy: 'https://arrofamily.com/privacy',
  help: 'https://arrofamily.com/support',
};

const openLink = (url: string) =>
  Linking.openURL(url).catch(() => showError('Couldn’t open the page', `It’s at ${url.replace('https://', '')}.`));

/** Prototype only: look at the fake family in different moments. Gone from release builds. */
const PREVIEWS: { label: string; value: Preview | null }[] = [
  { label: 'My family', value: null },
  { label: 'Demo family', value: 'demo' },
  { label: 'Day 1 after a break', value: 'afterBreak' },
  { label: 'First 30 days done', value: 'goalDone' },
];

export function SettingsScreen({ navigation }: RootStackScreenProps<'Settings'>) {
  const insets = useSafeAreaInsets();
  const { session, signOut, deleteAccount, preview, setPreview } = useApp();
  const onServer = !!session?.remote;
  const view = useView();
  const [permission, setPermission] = useState<NotificationPermission | null>(null);

  // Back from Settings > Notifications or the iPhone's Settings app picks up a change.
  useEffect(() => {
    const check = () => notificationPermission().then(setPermission);
    check();
    const unfocus = navigation.addListener('focus', check);
    const sub = RNAppState.addEventListener('change', (state) => {
      if (state === 'active') check();
    });
    return () => {
      unfocus();
      sub.remove();
    };
  }, [navigation]);

  const notificationsOff = permission === 'denied' || permission === 'undetermined';
  const rows = settings.connection.map((row) =>
    row.key === 'moving' ? { ...row, value: session?.me.moveMethod === 'health' ? 'Apple Health' : 'I moved today' }
    : row.key === 'members' ? { ...row, value: `${view.allMembers.length} ${view.allMembers.length === 1 ? 'member' : 'members'}` }
    : row.key === 'notifications'
      ? {
          ...row,
          value:
            !notificationsOff && session?.me.remindersWanted
              ? (REMINDER_SLOTS.find((s) => s.slot === session.me.reminder)?.time ?? '')
              : permission === 'granted' ? 'On' : 'Off',
        }
    : row,
  );
  const onSignOut = async () => {
    const ok = await confirmAction(
      'Sign out?',
      onServer
        ? 'Your family and streak stay safe. Sign in with Apple again to come back.'
        : 'This preview keeps your family on this phone only, so signing out clears it.',
      'Sign out',
    );
    if (ok) await signOut();
  };
  // App Store rule: an app with accounts lets people delete theirs from inside it.
  const onDelete = async () => {
    const ok = await confirmAction(
      'Delete your account?',
      onServer
        ? 'This deletes your account and every workout you’ve logged. Your family keeps going without you. If you’re the last one in it, the family is deleted too. You can’t undo this.'
        : 'This deletes the family and workouts saved on this phone. You can’t undo this.',
      'Delete account',
    );
    if (!ok) return;
    try {
      await deleteAccount();
    } catch {
      showError('Couldn’t delete your account', 'Nothing was deleted. Check your connection and try again.');
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10} accessibilityLabel="Back">
          <ChevronLeft />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: spacing.gutter, paddingBottom: insets.bottom + 24 }}
      >
        <View style={styles.titleRow}>
          <Text style={type.title}>Settings</Text>
          <AvatarRing member={view.me} size={36} />
        </View>

        <View style={[styles.card, { marginTop: 16 }]}>
          {rows.map((row, i) => (
            <Pressable
              key={row.key}
              onPress={
                row.key === 'moving'
                  ? () => navigation.navigate('MoveMethod')
                  : row.key === 'members'
                    ? () => navigation.navigate('FamilyMembers')
                    : row.key === 'rules'
                      ? () => navigation.navigate('StreakRules')
                      : row.key === 'notifications'
                        ? () => navigation.navigate('Notifications')
                        : LINKS[row.key]
                          ? () => openLink(LINKS[row.key])
                          : undefined
              }
              accessibilityRole="button"
              accessibilityLabel={row.label}
              style={[styles.row, i < rows.length - 1 && styles.rowBorder]}
            >
              <View style={styles.iconTile}>{ICONS[row.icon]}</View>
              <Text style={styles.label}>{row.label}</Text>
              {row.value ? <Text style={styles.value}>{row.value}</Text> : null}
              <ChevronRight />
            </Pressable>
          ))}
        </View>

        <View style={[styles.card, { marginTop: 14 }]}>
          {settings.about.map((row, i) => {
            // About Arro only shows the version, so it has no arrow.
            const link = LINKS[row.key];
            return (
              <Pressable
                key={row.key}
                onPress={link ? () => openLink(link) : undefined}
                disabled={!link}
                accessibilityRole={link ? 'link' : 'text'}
                accessibilityLabel={row.value ? `${row.label}, ${row.value}` : row.label}
                style={[styles.row, i < settings.about.length - 1 && styles.rowBorder]}
              >
                <View style={styles.iconTile}>
                  <Text style={styles.glyph}>{row.glyph}</Text>
                </View>
                <Text style={styles.label}>{row.label}</Text>
                {row.value ? <Text style={styles.value}>{row.value}</Text> : null}
                {link ? <ChevronRight /> : null}
              </Pressable>
            );
          })}
        </View>

        {__DEV__ ? (
          <>
            <Text style={styles.previewLabel}>Prototype preview</Text>
            <View style={styles.card}>
              {PREVIEWS.map((p, i) => (
                <Pressable
                  key={p.label}
                  onPress={() => setPreview(p.value)}
                  accessibilityRole="button"
                  accessibilityLabel={p.label}
                  style={[styles.row, i < PREVIEWS.length - 1 && styles.rowBorder]}
                >
                  <Text style={styles.label}>{p.label}</Text>
                  {preview === p.value ? <Text style={styles.value}>Showing</Text> : null}
                </Pressable>
              ))}
            </View>
          </>
        ) : null}

        <Pressable onPress={onSignOut} accessibilityRole="button" accessibilityLabel="Sign out" style={styles.signOut}>
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>
        <Pressable onPress={onDelete} accessibilityRole="button" accessibilityLabel="Delete account" style={styles.delete}>
          <Text style={styles.deleteText}>Delete account</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.screen },
  topBar: { paddingHorizontal: 16, paddingVertical: 6 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4 },
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.card,
    ...shadows.card,
    paddingHorizontal: 15,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 11 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  iconTile: {
    width: 30,
    height: 30,
    borderRadius: radii.icon,
    backgroundColor: colors.screen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyph: { color: colors.inkSoft, fontSize: 15, fontWeight: weights.semibold },
  label: { flex: 1, fontSize: 16, fontWeight: weights.regular, color: colors.ink },
  value: { ...type.meta, color: colors.faint2 },
  previewLabel: { ...type.label, color: colors.muted, marginTop: 20, marginBottom: 6 },
  signOut: {
    marginTop: 14,
    backgroundColor: colors.card,
    borderRadius: radii.button,
    ...shadows.card,
    paddingVertical: 14,
    alignItems: 'center',
  },
  signOutText: { fontSize: 16, fontWeight: weights.semibold, color: colors.ink },
  delete: { marginTop: 6, paddingVertical: 14, alignItems: 'center' },
  deleteText: { fontSize: 15, fontWeight: weights.medium, color: colors.muted },
});
