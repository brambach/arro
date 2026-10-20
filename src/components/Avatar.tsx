import React, { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { depth, onMember, radii } from '../theme/tokens';
import { weights } from '../theme/typography';

/**
 * A family member: their initial on their member color, or their photo. The
 * color circle is always drawn first at the final size, so a photo fades in
 * over it and nothing jumps when it loads.
 */
type Props = {
  name: string;
  /** The member's color (from the server, or memberColor() in preview data). */
  color: string;
  photoUri?: string | null;
  /** Diameter in points. 40 on Today's header, 38 in rows. */
  size?: number;
  /** Read out with the name; leave off when the row already says it. */
  accessible?: boolean;
};

export function Avatar({ name, color, photoUri, size = 40, accessible = false }: Props) {
  const [loaded, setLoaded] = useState(false);
  const initial = (name.trim()[0] ?? '?').toUpperCase();
  // The initial scales with the circle: 15 pt at 38 to 40 pt, as in the mockup.
  const fontSize = Math.round(size * 0.39);
  return (
    <View
      accessible={accessible}
      accessibilityRole={accessible ? 'image' : undefined}
      accessibilityLabel={accessible ? name : undefined}
      importantForAccessibility={accessible ? 'yes' : 'no-hide-descendants'}
      style={[styles.circle, { width: size, height: size, backgroundColor: color }]}
    >
      <Text style={[styles.initial, { fontSize, lineHeight: Math.round(fontSize * 1.2) }]} allowFontScaling={false}>
        {initial}
      </Text>
      {photoUri ? (
        <Image
          source={{ uri: photoUri }}
          onLoad={() => setLoaded(true)}
          style={[StyleSheet.absoluteFill, { borderRadius: size / 2, opacity: loaded ? 1 : 0 }]}
        />
      ) : null}
      <View style={[StyleSheet.absoluteFill, styles.edge, { borderRadius: size / 2 }]} pointerEvents="none" />
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { borderRadius: radii.round, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  initial: { color: onMember, fontWeight: weights.semibold },
  edge: { boxShadow: depth.avatar },
});
