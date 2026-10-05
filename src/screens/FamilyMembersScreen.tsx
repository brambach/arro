import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radii, shadows, spacing } from '../theme/tokens';
import { type } from '../theme/typography';
import { AvatarRing } from '../components/AvatarRing';
import { ChevronLeft, ChevronRight, PlusIcon, UserPlusIcon } from '../components/Icons';
import { useView } from '../state/AppState';
import { RootStackScreenProps } from '../navigation/types';

export function FamilyMembersScreen({ navigation }: RootStackScreenProps<'FamilyMembers'>) {
  const insets = useSafeAreaInsets();
  const { allMembers } = useView();

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10} accessibilityLabel="Back">
          <ChevronLeft />
        </Pressable>
        <Text style={styles.headerTitle}>Family members</Text>
        <Pressable onPress={() => navigation.navigate('Invite')} hitSlop={10} accessibilityRole="button" accessibilityLabel="Add member">
          <PlusIcon color={colors.ink} />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: spacing.gutter, paddingBottom: insets.bottom + 24 }}>
        <Text style={styles.groupLabel}>The crew</Text>
        <View style={styles.card}>
          {allMembers.map((m, i) => (
            <View key={m.id} style={[styles.row, i < allMembers.length - 1 && styles.rowBorder]}>
              <AvatarRing member={m} size={40} />
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{m.name}</Text>
                {m.relationship ? <Text style={styles.rel}>{m.relationship}</Text> : null}
              </View>
              <View style={[styles.dot, { backgroundColor: m.color }]} />
            </View>
          ))}
        </View>

        <Pressable
          onPress={() => navigation.navigate('Invite')}
          accessibilityRole="button"
          accessibilityLabel="Invite a family member"
          style={[styles.card, styles.inviteRow]}
        >
          <View style={styles.inviteIcon}>
            <UserPlusIcon size={21} color={colors.inkSoft} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>Invite a family member</Text>
            <Text style={styles.rel}>Send an invite link</Text>
          </View>
          <ChevronRight />
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.screen },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 40, paddingHorizontal: 16 },
  headerTitle: { ...type.name },
  groupLabel: { ...type.label, color: colors.muted, marginBottom: 6 },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.card,
    paddingHorizontal: 16,
    ...shadows.card,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 12 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  name: { ...type.name },
  rel: { ...type.meta, marginTop: 1 },
  dot: { width: 9, height: 9, borderRadius: 5 },
  inviteRow: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 14, marginTop: 16 },
  inviteIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.screen,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
