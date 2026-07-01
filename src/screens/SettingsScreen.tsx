import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, gradients, radii, shadows } from '../theme/tokens';
import { fonts, type } from '../theme/typography';
import { AvatarStack } from '../components/AvatarStack';
import { BellIcon, ChevronRight, Snowflake, StravaWave } from '../components/Icons';
import { Toggle } from '../components/Toggle';
import { familyList, settings } from '../data/family';
import { RootStackScreenProps } from '../navigation/types';

export function SettingsScreen({ navigation }: RootStackScreenProps<'Settings'>) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10} style={styles.backBtn}>
          <View style={{ transform: [{ scaleX: -1 }] }}>
            <ChevronRight size={16} color={colors.inkSoft} />
          </View>
        </Pressable>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 24, gap: 18 }}
      >
        {/* Connection */}
        <Group label="Connection">
          <View style={styles.card}>
            <View style={styles.rowPad}>
              <LinearGradient colors={gradients.appIcon} style={styles.iconTile}>
                <StravaWave size={22} />
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={type.name}>Strava</Text>
                <View style={styles.connectedRow}>
                  <View style={styles.greenDot} />
                  <Text style={styles.connected}>Connected as {settings.strava.handle}</Text>
                </View>
              </View>
              <Text style={styles.manage}>Manage</Text>
            </View>
          </View>
        </Group>

        {/* Family */}
        <Group label="Family group">
          <Pressable style={styles.card}>
            <View style={styles.rowPad}>
              <AvatarStack members={familyList.slice(0, 3)} size={32} overlap={10} />
              <View style={{ flex: 1, marginLeft: 4 }}>
                <Text style={type.name}>{settings.family.name}</Text>
                <Text style={styles.rowSub}>
                  {settings.family.memberCount} members · {settings.family.role}
                </Text>
              </View>
              <ChevronRight size={14} />
            </View>
          </Pressable>
        </Group>

        {/* Streak rules */}
        <Group label="Streak rules">
          <View style={styles.card}>
            <View style={styles.rulesRow}>
              <View style={[styles.smallTile, { backgroundColor: '#EAF4EE' }]}>
                <StravaWave size={18} color={colors.kept} />
              </View>
              <Text style={styles.ruleLabel}>Minimum run distance</Text>
              <View style={styles.rightRow}>
                <Text style={styles.ruleValue}>{settings.rules.minDistance}</Text>
                <ChevronRight size={14} />
              </View>
            </View>
            <Divider inset={63} />
            <View style={styles.rulesRow}>
              <View style={[styles.smallTile, { backgroundColor: colors.freezeTileBg }]}>
                <Snowflake size={18} color={colors.freeze} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.ruleLabel}>Freeze days</Text>
                <Text style={styles.rowSub}>Keeps a streak alive on a rest day</Text>
              </View>
              <Text style={styles.freezeChip}>{settings.rules.freezeDaysLeft} left</Text>
            </View>
            <Divider inset={63} />
            <View style={styles.rulesRow}>
              <View style={[styles.smallTile, { backgroundColor: colors.goldChipBg }]}>
                <BellIcon size={18} color={colors.warn} />
              </View>
              <Text style={styles.ruleLabel}>Daily reminders</Text>
              <Toggle value={settings.rules.dailyReminders} />
            </View>
          </View>
        </Group>

        {/* Notifications */}
        <Group label="Notifications">
          <View style={styles.card}>
            <View style={styles.notifyRow}>
              <Text style={styles.ruleLabel}>When family keeps a streak</Text>
              <Toggle value={settings.notifications.familyKeeps} />
            </View>
            <Divider inset={16} />
            <View style={styles.notifyRow}>
              <Text style={styles.ruleLabel}>Someone cheers you on</Text>
              <Toggle value={settings.notifications.someoneCheers} />
            </View>
          </View>
        </Group>
      </ScrollView>
    </View>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View>
      <Text style={styles.groupLabel}>{label}</Text>
      {children}
    </View>
  );
}

function Divider({ inset }: { inset: number }) {
  return <View style={[styles.divider, { marginLeft: inset }]} />;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.card,
  },
  headerTitle: { fontFamily: fonts.serif, fontSize: 26, color: colors.ink, letterSpacing: -0.4 },
  groupLabel: {
    fontFamily: fonts.sansHeavy,
    fontSize: 12,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: colors.faint,
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.card,
    overflow: 'hidden',
    ...shadows.card,
  },
  rowPad: { flexDirection: 'row', alignItems: 'center', gap: 13, padding: 16 },
  iconTile: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectedRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  greenDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.kept },
  connected: { fontFamily: fonts.sansBody, fontSize: 12.5, color: colors.kept },
  manage: { fontFamily: fonts.sansHeavy, fontSize: 12.5, color: colors.faint },
  rowSub: { fontFamily: fonts.sansBody, fontSize: 12.5, color: colors.muted, marginTop: 1 },
  rulesRow: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 14, paddingHorizontal: 16 },
  smallTile: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ruleLabel: { flex: 1, fontFamily: fonts.sansLabel, fontSize: 14.5, color: colors.ink },
  rightRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ruleValue: { fontFamily: fonts.sansHeavy, fontSize: 14, color: colors.primary },
  freezeChip: {
    fontFamily: fonts.sansHeavy,
    fontSize: 13,
    color: colors.freeze,
    backgroundColor: colors.freezeTileBg,
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 11,
    overflow: 'hidden',
  },
  notifyRow: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 14, paddingHorizontal: 16 },
  divider: { height: 1, backgroundColor: colors.hairline },
});
