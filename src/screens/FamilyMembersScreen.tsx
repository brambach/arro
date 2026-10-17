import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radii, shadows, spacing } from '../theme/tokens';
import { type } from '../theme/typography';
import { AvatarRing } from '../components/AvatarRing';
import { ChevronLeft, ChevronRight, PlusIcon, UserPlusIcon } from '../components/Icons';
import { useApp, useView } from '../state/AppState';
import { confirmAction, showError } from '../state/confirm';
import { Member } from '../data/types';
import { RootStackScreenProps } from '../navigation/types';
import { Backdrop } from '../components/Backdrop';

export function FamilyMembersScreen({ navigation }: RootStackScreenProps<'FamilyMembers'>) {
  const insets = useSafeAreaInsets();
  const { allMembers, me, canRemoveMembers } = useView();
  const { removeMember } = useApp();

  // Only the person who started the family can remove someone, and never themselves.
  const canRemove = (m: Member) => canRemoveMembers && !m.invited && m.id !== me.id;

  const askToRemove = async (m: Member) => {
    const ok = await confirmAction(
      `Remove ${m.name}?`,
      `${m.name} leaves the family and their workouts go with them. Your family’s code changes, so they’d need a new one to join again.`,
      'Remove',
    );
    if (!ok) return;
    try {
      await removeMember(m.id);
    } catch {
      showError(`Couldn’t remove ${m.name}`, 'Check your connection and try again.');
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <Backdrop />
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
            <Pressable
              key={m.id}
              // People who've joined have a map; someone only invited doesn't yet.
              onPress={m.invited ? undefined : () => navigation.navigate('Map', { memberId: m.id })}
              onLongPress={canRemove(m) ? () => askToRemove(m) : undefined}
              disabled={m.invited}
              accessibilityRole={m.invited ? undefined : 'button'}
              accessibilityLabel={m.invited ? m.name : `${m.name}, open their map`}
              accessibilityActions={canRemove(m) ? [{ name: 'remove', label: `Remove ${m.name} from the family` }] : undefined}
              onAccessibilityAction={(e) => e.nativeEvent.actionName === 'remove' && askToRemove(m)}
              style={[styles.row, i < allMembers.length - 1 && styles.rowBorder]}
            >
              <AvatarRing member={m} size={40} />
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{m.name}</Text>
                {m.relationship ? <Text style={styles.rel}>{m.relationship}</Text> : null}
              </View>
              {m.invited ? null : <ChevronRight />}
            </Pressable>
          ))}
        </View>
        {canRemoveMembers && allMembers.some(canRemove) ? (
          <Text style={styles.hint}>To remove someone, touch and hold their name.</Text>
        ) : null}

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
            <Text style={styles.rel}>Send your family’s code</Text>
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
    borderRadius: radii.card,
    paddingHorizontal: 16,
    ...shadows.card,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 12 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  name: { ...type.name },
  rel: { ...type.meta, marginTop: 1 },
  hint: { ...type.meta, marginTop: 8, marginHorizontal: 4 },
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
