import React from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import { colors } from '../theme/tokens';
import { Member } from '../data/types';
import { AvatarRing } from './AvatarRing';

/** Overlapping row of flat avatars with white borders. */
export function AvatarStack({
  members,
  size = 28,
  overlap = 8,
  borderColor = colors.white,
  style,
}: {
  members: Member[];
  size?: number;
  overlap?: number;
  borderColor?: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[{ flexDirection: 'row' }, style]}>
      {members.map((m, i) => (
        <AvatarRing
          key={m.id}
          member={m}
          size={size}
          border={2}
          borderColor={borderColor}
          style={i > 0 ? { marginLeft: -overlap } : undefined}
        />
      ))}
    </View>
  );
}
