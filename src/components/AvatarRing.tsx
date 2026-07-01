import React from 'react';
import { Image, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors } from '../theme/tokens';
import { weights } from '../theme/typography';
import { Member, PhotoSource } from '../data/types';

/**
 * Avatar — a flat solid-colour circle with a white initial, or a photo when one
 * is set. No ring, badge, or glow (the flat direction expresses state with pills
 * and rows, not avatar chrome). Kept the file/name for import stability.
 */
type Props = {
  member?: Member;
  name?: string;
  color?: string;
  photoUri?: PhotoSource;
  size?: number;
  /** White border, used when avatars overlap in a stack. */
  border?: number;
  borderColor?: string;
  style?: StyleProp<ViewStyle>;
};

export function AvatarRing({
  member,
  name,
  color,
  photoUri,
  size = 40,
  border = 0,
  borderColor = colors.white,
  style,
}: Props) {
  const resolvedName = name ?? member?.name ?? '?';
  const resolvedColor = color ?? member?.color ?? colors.primary;
  const resolvedPhoto = photoUri ?? member?.photoUri ?? null;

  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: resolvedColor,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          borderWidth: border,
          borderColor,
        },
        style,
      ]}
    >
      {resolvedPhoto ? (
        <Image
          source={typeof resolvedPhoto === 'string' ? { uri: resolvedPhoto } : resolvedPhoto}
          style={StyleSheet.absoluteFill}
        />
      ) : (
        <Text
          style={{
            color: colors.white,
            fontWeight: weights.semibold,
            fontSize: Math.round(size * 0.4),
          }}
        >
          {resolvedName.charAt(0).toUpperCase()}
        </Text>
      )}
    </View>
  );
}
