import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Image,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { colors } from '../theme/tokens';
import { fonts } from '../theme/typography';
import { AvatarState, Member } from '../data/types';
import { Check, Snowflake } from './Icons';

/**
 * AvatarRing (Spec §4 / §8) — photo avatar inside a member-colour ring,
 * with state expressed by the ring colour + a corner badge.
 * Falls back to colour-tinted initials when there's no photoUri, so real
 * images drop in later with no structural change.
 */
type BadgeKind = 'check' | 'snow' | 'dot' | 'none' | 'auto';

type Props = {
  member?: Member;
  name?: string;
  color?: string;
  soft?: string;
  photoUri?: string | null;
  size?: number;
  ringWidth?: number;
  state?: AvatarState;
  badge?: BadgeKind;
  badgeSize?: number;
  glow?: boolean;
  whiteBorder?: number;
  style?: StyleProp<ViewStyle>;
};

export function AvatarRing({
  member,
  name,
  color,
  soft,
  photoUri,
  size = 50,
  ringWidth = 2.5,
  state = 'today',
  badge = 'auto',
  badgeSize,
  glow = false,
  whiteBorder = 0,
  style,
}: Props) {
  const resolvedName = name ?? member?.name ?? '?';
  const resolvedColor = color ?? member?.color ?? colors.primary;
  const resolvedSoft = soft ?? member?.soft ?? colors.warmFill;
  const resolvedPhoto = photoUri ?? member?.photoUri ?? null;

  const ringColor =
    state === 'missed'
      ? colors.ringMuted
      : state === 'freeze'
        ? colors.freezeRing
        : resolvedColor;

  const avatarOpacity = state === 'missed' ? 0.7 : 1;

  const kind: Exclude<BadgeKind, 'auto'> =
    badge === 'auto'
      ? state === 'kept'
        ? 'check'
        : state === 'freeze'
          ? 'snow'
          : 'none'
      : badge;

  const bSize = badgeSize ?? Math.min(30, Math.max(18, Math.round(size * 0.4)));

  return (
    <View style={[{ width: size + ringWidth * 2, height: size + ringWidth * 2 }, style]}>
      <View
        style={{
          padding: ringWidth,
          borderRadius: 999,
          backgroundColor: ringColor,
          borderWidth: whiteBorder,
          borderColor: colors.white,
        }}
      >
        {resolvedPhoto ? (
          <Image
            source={{ uri: resolvedPhoto }}
            style={{ width: size, height: size, borderRadius: size / 2, opacity: avatarOpacity }}
          />
        ) : (
          <View
            style={{
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: resolvedSoft,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: avatarOpacity,
            }}
          >
            <Text
              style={{
                fontFamily: fonts.sansHeavy,
                fontSize: Math.round(size * 0.4),
                color: resolvedColor,
              }}
            >
              {resolvedName.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
      </View>

      {kind !== 'none' && (
        <Badge kind={kind} size={bSize} glow={glow} />
      )}
    </View>
  );
}

function Badge({
  kind,
  size,
  glow,
}: {
  kind: 'check' | 'snow' | 'dot';
  size: number;
  glow: boolean;
}) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!glow) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1300, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1300, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [glow, pulse]);

  const bg = kind === 'snow' ? colors.freeze : kind === 'dot' ? '#F6ECDB' : colors.kept;

  return (
    <View style={[styles.badgeWrap, { width: size, height: size }]}>
      {glow && (
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: colors.kept,
            opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] }),
            transform: [
              { scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.8] }) },
            ],
          }}
        />
      )}
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: bg,
          borderWidth: 2.5,
          borderColor: colors.white,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {kind === 'check' && <Check size={size * 0.5} />}
        {kind === 'snow' && <Snowflake size={size * 0.55} color="#fff" />}
        {kind === 'dot' && (
          <View
            style={{
              width: size * 0.28,
              height: size * 0.28,
              borderRadius: size,
              backgroundColor: '#C9B49A',
            }}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  badgeWrap: {
    position: 'absolute',
    right: -3,
    bottom: -3,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
