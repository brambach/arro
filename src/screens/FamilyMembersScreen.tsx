import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radii } from '../theme/tokens';
import { weights } from '../theme/typography';
import { AvatarRing } from '../components/AvatarRing';
import { ChevronLeft, ChevronRight, PlusIcon, UserPlusIcon } from '../components/Icons';
import { familyList, familyRelationships } from '../data/family';
import { RootStackScreenProps } from '../navigation/types';

export function FamilyMembersScreen({ navigation }: RootStackScreenProps<'FamilyMembers'>) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10} accessibilityLabel="Back">
          <ChevronLeft />
        </Pressable>
        <Text style={styles.headerTitle}>Family members</Text>
        <Pressable hitSlop={10} accessibilityLabel="Add member">
          <PlusIcon />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 22, paddingBottom: insets.bottom + 24 }}>
        <Text style={styles.groupLabel}>The crew</Text>
        <View style={styles.card}>
          {familyList.map((m, i) => (
            <View key={m.id} style={[styles.row, i < familyList.length - 1 && styles.rowBorder]}>
              <AvatarRing member={m} size={40} />
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{m.name}</Text>
                <Text style={styles.rel}>{familyRelationships[m.id]}</Text>
              </View>
              <View style={[styles.dot, { backgroundColor: m.color }]} />
            </View>
          ))}
        </View>

        <Pressable style={[styles.card, styles.inviteRow]}>
          <View style={styles.inviteIcon}>
            <UserPlusIcon size={21} color={colors.primary} />
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
  headerTitle: { fontSize: 16, fontWeight: weights.semibold, color: colors.ink },
  groupLabel: { fontSize: 13, fontWeight: weights.semibold, color: colors.muted, marginBottom: 4 },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    paddingHorizontal: 16,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 12 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  name: { fontSize: 15, fontWeight: weights.semibold, color: colors.ink },
  rel: { fontSize: 12.5, color: colors.faint, marginTop: 1 },
  dot: { width: 9, height: 9, borderRadius: 5 },
  inviteRow: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 14, marginTop: 16 },
  inviteIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F6ECE0',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
