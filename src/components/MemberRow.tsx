import React from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors } from '../theme/tokens';
import { fonts, type } from '../theme/typography';
import { AvatarState, Member } from '../data/types';
import { AvatarRing } from './AvatarRing';

/**
 * MemberRow (Spec §8) — avatar + name + subtitle + trailing (streak / check / cheer).
 */
type Props = {
  member: Member;
  subtitle: string;
  subtitleColor?: string;
  avatarState?: AvatarState;
  glow?: boolean;
  avatarSize?: number;
  trailing?: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

export function MemberRow({
  member,
  subtitle,
  subtitleColor = colors.muted,
  avatarState = 'today',
  glow = false,
  avatarSize = 50,
  trailing,
  onPress,
  style,
}: Props) {
  const Body = (
    <View style={[styles.row, style]}>
      <AvatarRing member={member} size={avatarSize} state={avatarState} glow={glow} />
      <View style={styles.middle}>
        <Text style={type.name}>{member.name}</Text>
        <Text style={[styles.subtitle, { color: subtitleColor }]}>{subtitle}</Text>
      </View>
      {trailing}
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => pressed && { opacity: 0.7 }}>
        {Body}
      </Pressable>
    );
  }
  return Body;
}

/** Right-aligned streak value block ("24 / DAYS") tinted by member colour. */
export function StreakValue({ value, color }: { value: number; color: string }) {
  return (
    <View style={{ alignItems: 'flex-end' }}>
      <Text style={{ fontFamily: fonts.serif, fontSize: 17, color }}>{value}</Text>
      <Text style={styles.daysLabel}>DAYS</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 13 },
  middle: { flex: 1 },
  subtitle: { fontFamily: fonts.sansBody, fontSize: 12.5, marginTop: 2 },
  daysLabel: {
    fontFamily: fonts.sansLabel,
    fontSize: 10,
    letterSpacing: 0.3,
    color: colors.faint,
    marginTop: 1,
  },
});
