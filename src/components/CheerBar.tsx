import React, { useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { colors, radii } from '../theme/tokens';
import { fonts } from '../theme/typography';
import { Reaction } from '../data/types';

/** A single rising 🧡 that floats up once per tap (Spec §7). */
function useRisingHeart() {
  const anim = useRef(new Animated.Value(0)).current;
  const [visible, setVisible] = useState(false);

  const fire = () => {
    setVisible(true);
    anim.setValue(0);
    Animated.timing(anim, {
      toValue: 1,
      duration: 650,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start(() => setVisible(false));
  };

  const node = visible ? (
    <Animated.Text
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: -6,
        alignSelf: 'center',
        fontSize: 16,
        opacity: anim.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 0.9, 0] }),
        transform: [
          { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [0, -60] }) },
          { scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) },
        ],
      }}
    >
      🧡
    </Animated.Text>
  ) : null;

  return { fire, node };
}

/** Reaction chip: emoji + count, tap → optimistic +1, pop, rising heart. */
function ReactionChip({ reaction }: { reaction: Reaction }) {
  const [count, setCount] = useState(reaction.count);
  const [active, setActive] = useState(false);
  const scale = useRef(new Animated.Value(1)).current;
  const heart = useRisingHeart();

  const onPress = () => {
    const next = !active;
    setActive(next);
    setCount((c) => c + (next ? 1 : -1));
    if (next) heart.fire();
    Animated.sequence([
      Animated.timing(scale, { toValue: 1.14, duration: 130, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 5, tension: 140, useNativeDriver: true }),
    ]).start();
  };

  return (
    <Pressable onPress={onPress}>
      <Animated.View
        style={[
          styles.chip,
          { transform: [{ scale }] },
          active && { backgroundColor: colors.peach },
        ]}
      >
        {heart.node}
        <Text style={styles.chipEmoji}>{reaction.emoji}</Text>
        <Text style={[styles.chipCount, active && { color: colors.primaryPress }]}>{count}</Text>
      </Animated.View>
    </Pressable>
  );
}

/** CheerBar (Spec §8) — row of reaction chips with optimistic increment. */
export function CheerBar({
  reactions,
  note,
  style,
}: {
  reactions: Reaction[];
  note?: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.bar, style]}>
      {reactions.map((r, i) => (
        <ReactionChip key={`${r.emoji}-${i}`} reaction={r} />
      ))}
      {note && <Text style={styles.note}>{note}</Text>}
    </View>
  );
}

/** Soft cheer button (Spec §5) — pill CTA used to nudge someone who still has today. */
export function CheerButton({ style }: { style?: StyleProp<ViewStyle> }) {
  const [cheered, setCheered] = useState(false);
  const scale = useRef(new Animated.Value(1)).current;
  const heart = useRisingHeart();

  const onPress = () => {
    if (!cheered) {
      setCheered(true);
      heart.fire();
    } else {
      setCheered(false);
    }
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.96, duration: 100, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 5, tension: 160, useNativeDriver: true }),
    ]).start();
  };

  return (
    <Pressable onPress={onPress} style={style}>
      <Animated.View
        style={[
          styles.cheerBtn,
          { transform: [{ scale }] },
          cheered && { backgroundColor: colors.cheerBgPress },
        ]}
      >
        {heart.node}
        <Text style={styles.cheerEmoji}>🧡</Text>
        <Text style={styles.cheerLabel}>{cheered ? 'Cheered' : 'Cheer'}</Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.reactionChip,
    borderRadius: radii.pill,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  chipEmoji: { fontSize: 13 },
  chipCount: { fontFamily: fonts.sansHeavy, fontSize: 13, color: colors.reactionInk },
  note: { fontFamily: fonts.sansBody, fontSize: 12, color: colors.faint, marginLeft: 2 },
  cheerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.cheerBg,
    borderRadius: radii.pill,
    paddingVertical: 9,
    paddingHorizontal: 15,
  },
  cheerEmoji: { fontSize: 13 },
  cheerLabel: { fontFamily: fonts.sansHeavy, fontSize: 13.5, color: colors.primaryPress },
});
