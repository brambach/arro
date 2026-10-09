import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radii } from '../theme/tokens';
import { weights } from '../theme/typography';
import { FeedItem, Member } from '../data/types';
import { AvatarRing } from './AvatarRing';
import { Card } from './Card';
import { CheerButton } from './CheerButton';
import { Heart } from './Icons';
import { PhotoSlot } from './PhotoSlot';
import { RouteThumb } from './RouteThumb';

/**
 * WorkoutCard — a feed entry. A kept post shows its photo and route when it has
 * them, then a cheer line + heart count; a still-has-today post shows a nudge
 * line + a Cheer button.
 */
export function WorkoutCard({
  item,
  member,
  onPress,
  onCheer,
}: {
  item: FeedItem;
  member: Member;
  onPress?: () => void;
  onCheer?: () => Promise<unknown>;
}) {
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

      <Media item={item} />

      {item.cheer ? (
        <View style={styles.footer}>
          <Text style={styles.cheerLine} numberOfLines={1}>
            {item.cheer}
          </Text>
          {item.kind === 'kept' ? (
            <View style={styles.hearts}>
              <Heart size={15} color={colors.inkSoft} />
              <Text style={styles.heartCount}>{item.hearts}</Text>
            </View>
          ) : (
            <CheerButton variant="outline" onCheer={onCheer} />
          )}
        </View>
      ) : null}
    </Card>
  );
}

/** The photo and route side by side, or whichever one there is, full width. */
function Media({ item }: { item: FeedItem }) {
  const route = item.route;
  if (!item.photoUri && !route) return null;
  if (item.photoUri && route) {
    return (
      <View style={styles.media}>
        <PhotoSlot uri={item.photoUri} style={[styles.square, styles.mediaHalf]} />
        <RouteThumb routes={[route]} width={160} height={160} style={[styles.square, styles.mediaHalf]} />
      </View>
    );
  }
  return (
    <View style={styles.media}>
      {item.photoUri ? (
        <PhotoSlot uri={item.photoUri} style={styles.photoWide} />
      ) : (
        <RouteThumb routes={[route!]} width={320} height={130} style={styles.routeWide} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  media: { flexDirection: 'row', gap: 8, marginTop: 12 },
  mediaHalf: { flex: 1 },
  square: { aspectRatio: 1, borderRadius: 12 },
  photoWide: { flex: 1, aspectRatio: 4 / 3, borderRadius: 12 },
  routeWide: { flex: 1, aspectRatio: 320 / 130, borderRadius: 12 },
  card: { paddingHorizontal: 16 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  middle: { flex: 1, minWidth: 0 },
  titleRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 },
  title: { fontSize: 16, fontWeight: weights.semibold, color: colors.ink },
  time: { fontSize: 13, color: colors.faint2 },
  meta: { fontSize: 14, color: colors.muted, marginTop: 2 },
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
  cheerLine: { flex: 1, minWidth: 0, fontSize: 14, color: colors.inkSoft },
  hearts: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  heartCount: { fontSize: 13, fontWeight: weights.semibold, color: colors.faint2 },
});
