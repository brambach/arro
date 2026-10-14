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
 * them, then who cheered and a Cheer button (not on your own); a still-has-today
 * post shows a nudge line + a Cheer button.
 */
export function WorkoutCard({
  item,
  member,
  onPress,
  onCheer,
  cheerLine,
  cheered,
}: {
  item: FeedItem;
  member: Member;
  onPress?: () => void;
  /** A kept post: cheer it (left out on your own). A still post: send a nudge. */
  onCheer?: () => Promise<unknown>;
  /** A kept post: "Mom and Dad cheered", or null. */
  cheerLine?: string | null;
  /** A kept post you've cheered. */
  cheered?: boolean;
}) {
  const kept = item.kind === 'kept';
  const showFooter = kept ? !!cheerLine || !!onCheer : !!item.cheer;
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

      {showFooter ? (
        <View style={styles.footer}>
          {kept ? (
            <View style={styles.cheerers}>
              {cheerLine ? <Heart size={14} color={colors.primary} /> : null}
              <Text style={styles.cheerLine} numberOfLines={2}>
                {cheerLine ?? ''}
              </Text>
            </View>
          ) : (
            <Text style={styles.cheerLine} numberOfLines={1}>
              {item.cheer}
            </Text>
          )}
          {onCheer ? (
            <CheerButton
              variant="outline"
              onCheer={onCheer}
              cheered={kept && cheered}
              accessibilityLabel={kept ? `Cheer ${member.name}` : `Send ${member.name} a cheer`}
            />
          ) : null}
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
  cheerers: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 6 },
  cheerLine: { flex: 1, minWidth: 0, fontSize: 14, color: colors.inkSoft },
});
