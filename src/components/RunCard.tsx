import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/tokens';
import { fonts, type } from '../theme/typography';
import { FeedItem } from '../data/types';
import { members } from '../data/family';
import { AvatarRing } from './AvatarRing';
import { CheerBar } from './CheerBar';
import { Card } from './Card';
import { Check } from './Icons';

/**
 * RunCard (Spec §8) — a feed entry: header (who kept which day + what they ran)
 * plus a CheerBar. The freshest item carries a green check; older ones a timestamp.
 */
export function RunCard({ item, onPress }: { item: FeedItem; onPress?: () => void }) {
  const member = members[item.memberId];

  return (
    <Card
      radius={24}
      onPress={onPress}
      style={item.keptBadge && { borderWidth: 1, borderColor: 'rgba(238,123,58,0.1)' }}
    >
      <View style={styles.header}>
        <AvatarRing member={member} size={44} state="today" badge="none" />
        <View style={styles.middle}>
          <Text style={type.name}>
            {member.name} kept Day {item.day}
          </Text>
          <Text style={styles.detail}>{item.detail}</Text>
        </View>
        {item.keptBadge ? (
          <View style={styles.checkBadge}>
            <Check size={13} />
          </View>
        ) : (
          <Text style={styles.time}>{item.time}</Text>
        )}
      </View>
      <CheerBar reactions={item.reactions} note={item.note} style={styles.cheer} />
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  middle: { flex: 1 },
  detail: { fontFamily: fonts.sansBody, fontSize: 12.5, color: colors.muted, marginTop: 2 },
  time: { fontFamily: fonts.sansLabel, fontSize: 12, color: colors.tabInactive },
  checkBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.kept,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cheer: { marginTop: 13 },
});
