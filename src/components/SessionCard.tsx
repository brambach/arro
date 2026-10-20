import React, { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { alpha, depth, palette, radii, space } from '../theme/tokens';
import { timing } from '../theme/motion';
import { type } from '../theme/typography';
import type { FeedCard, MemberView } from '../state/buildView';
import type { PhotoSource } from '../data/types';
import { Avatar } from './Avatar';
import { Card } from './Card';
import { CheerControl } from './CheerControl';
import { Icon } from './Icon';
import { StatusNote } from './StatusNote';
import { TextAction } from './TextAction';

/**
 * One session in the feed: who ("Maya, Jo and you had a sauna together"),
 * when and where, the details ("20 min · Traditional · 85°C"), a lake
 * snowflake for a cold plunge, the photo, the note, cheers and who gave them,
 * and the latest comments. A shared session is one card. Tapping it opens the
 * session; Reply opens it with the comment field ready.
 */
type Props = {
  card: FeedCard;
  onOpen: () => void;
  onReply: () => void;
  onCheer: () => void;
  onUncheer: () => void;
};

export function SessionCard({ card, onOpen, onReply, onCheer, onUncheer }: Props) {
  const latest = card.comments.slice(-2);
  const more = card.comments.length - latest.length;
  return (
    <Card onPress={onOpen} accessibilityLabel={`${card.title}. ${card.when}. ${card.details}`} accessibilityHint="Opens the session">
      <SessionHeader card={card} />
      <SessionFacts card={card} />
      {card.photoUri ? <SessionPhoto uri={card.photoUri} style={styles.photo} /> : null}
      {card.note ? <Text style={[type.body, styles.note]}>{card.note}</Text> : null}
      {card.pending ? (
        <View style={styles.pending}>
          <StatusNote icon="timer" text="Waiting to send. It goes as soon as you’re back online." />
        </View>
      ) : null}

      {latest.length ? (
        <View style={styles.comments}>
          {more > 0 ? <Text style={type.label}>{more === 1 ? '1 more comment' : `${more} more comments`}</Text> : null}
          {latest.map((c) => (
            <Text key={c.id} style={[type.bodySmall, c.pending && styles.faint]} numberOfLines={2}>
              <Text style={styles.commenter}>{c.mine ? 'You' : c.member.name} </Text>
              {c.body}
            </Text>
          ))}
        </View>
      ) : null}

      {!card.pending ? (
        <View style={styles.footer}>
          {card.canCheer ? (
            <CheerControl label={card.cheerLabel} cheered={card.cheers.byMe} onCheer={onCheer} onUncheer={onUncheer} />
          ) : (
            <View style={styles.cheersOnly}>
              <Icon name={card.cheers.count ? 'heartFilled' : 'heart'} size={20} color={card.cheers.count ? palette.ember : palette.pebble} />
              <Text style={type.label}>{card.cheers.line ?? 'No cheers yet'}</Text>
            </View>
          )}
          <TextAction label="Reply" onPress={onReply} size="bodySmall" style={styles.reply} />
        </View>
      ) : null}
      {card.canCheer && card.cheers.line ? <Text style={[type.label, styles.cheerLine]}>{card.cheers.line}</Text> : null}
    </Card>
  );
}

/** Avatars and the title, with when and where under it. */
export function SessionHeader({ card, large = false }: { card: FeedCard; large?: boolean }) {
  return (
    <View style={styles.head}>
      <AvatarCluster members={card.members} />
      <View style={styles.headText}>
        <Text style={large ? type.heading : type.bodyStrong} accessibilityRole={large ? 'header' : undefined}>
          {card.title}
        </Text>
        <Text style={type.label}>{[card.when, card.place].filter(Boolean).join(' · ')}</Text>
      </View>
    </View>
  );
}

/** "20 min · Traditional · 85°C", then the cold plunge and rounds. */
export function SessionFacts({ card }: { card: FeedCard }) {
  return (
    <View style={styles.facts}>
      <Text style={type.bodySmall}>
        {card.details}
        {card.rounds > 1 ? ` · ${card.rounds} rounds` : ''}
      </Text>
      {card.coldPlunge ? (
        <View style={styles.plunge} accessible accessibilityLabel={`Cold plunge${card.coldMinutes ? `, ${card.coldMinutes} minutes` : ''}`}>
          <Icon name="snowflake" size={18} color={palette.lake} />
          <Text style={[type.bodySmallStrong, styles.lake]}>
            Cold plunge{card.coldMinutes ? ` · ${card.coldMinutes} min` : ''}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

/** Up to four faces, overlapping a little, each with a steam ring so they read apart. */
export function AvatarCluster({ members }: { members: MemberView[] }) {
  const shown = members.slice(0, 4);
  return (
    <View style={styles.cluster} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {shown.map((m, i) => (
        <View key={m.id} style={[styles.ring, i > 0 && styles.overlap]}>
          <Avatar name={m.name} color={m.color} photoUri={typeof m.photoUri === 'string' ? m.photoUri : null} size={34} />
        </View>
      ))}
    </View>
  );
}

/**
 * A session photo at a fixed 4:3, so the card's height never changes when it
 * loads: an aspen tray first, then the picture fades in over it.
 */
export function SessionPhoto({ uri, style }: { uri: PhotoSource; style?: object }) {
  const [failed, setFailed] = useState(false);
  const o = useSharedValue(0);
  const fade = useAnimatedStyle(() => ({ opacity: o.value }));
  const source = typeof uri === 'number' ? uri : uri ? { uri } : null;
  return (
    <View style={[styles.photoBox, style]} accessibilityRole="image" accessibilityLabel="Photo from the session">
      {source && !failed ? (
        <Animated.View style={[StyleSheet.absoluteFill, fade]}>
          <Image
            source={source}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
            onLoad={() => o.set(withTiming(1, timing.utility))}
            onError={() => setFailed(true)}
          />
        </Animated.View>
      ) : null}
      {failed ? (
        <View style={styles.photoMissing}>
          <Icon name="photo" size={24} color={palette.pebble} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: space.s12 },
  headText: { flex: 1, minWidth: 0 },
  cluster: { flexDirection: 'row' },
  ring: { borderRadius: radii.round, borderWidth: 2, borderColor: palette.steam },
  overlap: { marginLeft: -space.s12 },
  facts: { marginTop: space.s12, gap: space.s4 },
  plunge: { flexDirection: 'row', alignItems: 'center', gap: space.s4 },
  lake: { color: palette.lake },
  photo: { marginTop: space.s16 },
  photoBox: { aspectRatio: 4 / 3, borderRadius: radii.field, overflow: 'hidden', backgroundColor: palette.aspen, boxShadow: depth.sunk },
  photoMissing: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center' },
  note: { marginTop: space.s12 },
  pending: { marginTop: space.s12 },
  comments: { marginTop: space.s12, gap: space.s4 },
  commenter: { fontWeight: '600', color: palette.char },
  faint: { opacity: 0.6 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: space.s12,
    paddingTop: space.s4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: alpha.hairline,
  },
  cheersOnly: { flexDirection: 'row', alignItems: 'center', gap: space.s8, paddingVertical: space.s8, flex: 1 },
  reply: { alignSelf: 'auto' },
  cheerLine: { marginTop: space.s4 },
});
