import React from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import { Member } from '../data/types';
import { AvatarRing } from './AvatarRing';

/** Overlapping row of member avatars with white borders. */
export function AvatarStack({
  members,
  size = 40,
  overlap = 10,
  whiteBorder = 2,
  style,
}: {
  members: Member[];
  size?: number;
  overlap?: number;
  whiteBorder?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[{ flexDirection: 'row' }, style]}>
      {members.map((m, i) => (
        <AvatarRing
          key={m.id}
          member={m}
          size={size}
          ringWidth={2.5}
          whiteBorder={whiteBorder}
          state="today"
          badge="none"
          style={i > 0 ? { marginLeft: -overlap } : undefined}
        />
      ))}
    </View>
  );
}
