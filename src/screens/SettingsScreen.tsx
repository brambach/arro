import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radii } from '../theme/tokens';
import { type, weights } from '../theme/typography';
import { AvatarRing } from '../components/AvatarRing';
import { BellIcon, ChevronLeft, ChevronRight, LockIcon, StravaIcon, TargetIcon, UsersIcon } from '../components/Icons';
import { currentUser, settings } from '../data/family';
import { RootStackScreenProps } from '../navigation/types';

const ICONS: Record<string, React.ReactNode> = {
  strava: <StravaIcon />,
  users: <UsersIcon size={18} color="#fff" strokeWidth={1.9} />,
  target: <TargetIcon />,
  bell: <BellIcon />,
  lock: <LockIcon />,
};

export function SettingsScreen({ navigation }: RootStackScreenProps<'Settings'>) {
  const insets = useSafeAreaInsets();

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
          <AvatarRing member={currentUser} size={36} />
        </View>

        <View style={[styles.card, { marginTop: 16 }]}>
          {settings.connection.map((row, i) => (
            <View key={row.key} style={[styles.row, i < settings.connection.length - 1 && styles.rowBorder]}>
              <View style={[styles.iconTile, { backgroundColor: row.tint }]}>{ICONS[row.icon]}</View>
              <Text style={styles.label}>{row.label}</Text>
              {row.value ? <Text style={styles.value}>{row.value}</Text> : null}
              <ChevronRight />
            </View>
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

        <Pressable style={styles.signOut}>
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
