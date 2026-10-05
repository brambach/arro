import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radii } from '../theme/tokens';
import { type, weights } from '../theme/typography';
import { AvatarRing } from '../components/AvatarRing';
import { BellIcon, ChevronLeft, ChevronRight, LockIcon, PulseIcon, TargetIcon, UsersIcon } from '../components/Icons';
import { settings } from '../data/family';
import { Preview } from '../state/buildView';
import { confirmAction } from '../state/confirm';
import { useApp, useView } from '../state/AppState';
import { RootStackScreenProps } from '../navigation/types';

const ICONS: Record<string, React.ReactNode> = {
  pulse: <PulseIcon />,
  users: <UsersIcon size={18} color="#fff" strokeWidth={1.9} />,
  target: <TargetIcon />,
  bell: <BellIcon />,
  lock: <LockIcon />,
};

/** Prototype only: look at the fake family in different moments. Gone from release builds. */
const PREVIEWS: { label: string; value: Preview | null }[] = [
  { label: 'My family', value: null },
  { label: 'Demo family', value: 'demo' },
  { label: 'Day 1 after a break', value: 'afterBreak' },
  { label: 'First 30 days done', value: 'goalDone' },
];

export function SettingsScreen({ navigation }: RootStackScreenProps<'Settings'>) {
  const insets = useSafeAreaInsets();
  const { session, signOut, preview, setPreview } = useApp();
  const view = useView();
  const rows = settings.connection.map((row) =>
    row.key === 'moving' ? { ...row, value: session?.me.moveMethod === 'health' ? 'Apple Health' : 'I moved today' }
    : row.key === 'members' ? { ...row, value: `${view.allMembers.length} ${view.allMembers.length === 1 ? 'member' : 'members'}` }
    : row,
  );
  const onSignOut = async () => {
    const ok = await confirmAction('Sign out?', 'This preview keeps your family on this phone only, so signing out clears it.', 'Sign out');
    if (ok) await signOut();
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
        contentContainerStyle={{ paddingHorizontal: 22, paddingBottom: insets.bottom + 24 }}
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
                row.key === 'members'
                  ? () => navigation.navigate('FamilyMembers')
                  : row.key === 'rules'
                    ? () => navigation.navigate('StreakRules')
                    : undefined
              }
              accessibilityRole="button"
              accessibilityLabel={row.label}
              style={[styles.row, i < rows.length - 1 && styles.rowBorder]}
            >
              <View style={[styles.iconTile, { backgroundColor: row.tint }]}>{ICONS[row.icon]}</View>
              <Text style={styles.label}>{row.label}</Text>
              {row.value ? <Text style={styles.value}>{row.value}</Text> : null}
              <ChevronRight />
            </Pressable>
          ))}
        </View>

        <View style={[styles.card, { marginTop: 14 }]}>
          {settings.about.map((row, i) => (
            <View key={row.key} style={[styles.row, i < settings.about.length - 1 && styles.rowBorder]}>
              <View style={[styles.iconTile, { backgroundColor: '#A49A8B' }]}>
                <Text style={styles.glyph}>{row.glyph}</Text>
              </View>
              <Text style={styles.label}>{row.label}</Text>
              {row.value ? <Text style={styles.value}>{row.value}</Text> : null}
              <ChevronRight />
            </View>
          ))}
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
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    paddingHorizontal: 15,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 11 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  iconTile: { width: 30, height: 30, borderRadius: radii.icon, alignItems: 'center', justifyContent: 'center' },
  glyph: { color: '#fff', fontSize: 15, fontWeight: weights.bold },
  label: { flex: 1, fontSize: 15, fontWeight: weights.medium, color: colors.ink },
  value: { fontSize: 13, color: colors.faint2 },
  previewLabel: { fontSize: 13, fontWeight: weights.semibold, color: colors.muted, marginTop: 20, marginBottom: 6 },
  signOut: {
    marginTop: 14,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.button,
    paddingVertical: 14,
    alignItems: 'center',
  },
  signOutText: { fontSize: 15, fontWeight: weights.semibold, color: colors.primary },
});
