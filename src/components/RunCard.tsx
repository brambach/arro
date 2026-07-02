import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radii } from '../theme/tokens';
import { weights } from '../theme/typography';
import { FeedItem } from '../data/types';
import { members } from '../data/family';
import { AvatarRing } from './AvatarRing';
import { Card } from './Card';
import { CheerButton } from './CheerButton';
import { Heart } from './Icons';

/**
 * RunCard — a feed entry. A kept post shows a cheer line + heart count; a
 * still-has-today post shows a nudge line + a Cheer button.
 */
export function RunCard({ item, onPress }: { item: FeedItem; onPress?: () => void }) {
  const member = members[item.memberId];

  return (
    <Card radius={radii.card} padding={14} style={styles.card} onPress={onPress}>
      <View style={styles.header}>
        <AvatarRing member={member} size={38} />
        <View style={styles.middle}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{item.title}</Text>
            {item.time ? <Text style={styles.time}>{item.time}</Text> : null}
          </View>
          <Text style={styles.meta}>{item.meta}</Text>
        </View>
      </View>

      {item.cheer ? (
        <View style={styles.footer}>
          <Text style={styles.cheerLine} numberOfLines={1}>
            {item.cheer}
          </Text>
          {item.kind === 'kept' ? (
            <View style={styles.hearts}>
              <Heart size={15} color={colors.primary} />
              <Text style={styles.heartCount}>{item.hearts}</Text>
            </View>
          ) : (
            <CheerButton variant="outline" />
          )}
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { paddingHorizontal: 16 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  middle: { flex: 1, minWidth: 0 },
  titleRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 },
  title: { fontSize: 15, fontWeight: weights.semibold, color: colors.ink },
  time: { fontSize: 12, color: colors.faint2 },
  meta: { fontSize: 13, color: colors.muted, marginTop: 2 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 12,
    paddingTop: 11,
    borderTopWidth: 1,
    borderTopColor: colors.dividerSoft,
  },
  cheerLine: { flex: 1, minWidth: 0, fontSize: 13, color: colors.inkSoft },
  hearts: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  heartCount: { fontSize: 12.5, fontWeight: weights.semibold, color: colors.faint2 },
});
