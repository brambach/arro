import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { palette, space } from '../theme/tokens';
import { type } from '../theme/typography';
import { Icon, IconName } from './Icon';

/**
 * A quiet line under a screen's title about the app's own state: offline,
 * sessions waiting to send. Stone, small, with a mark; never a banner, never
 * red. It sits in the flow at a fixed height so the screen doesn't jump when
 * it goes.
 */
export function StatusNote({ icon, text }: { icon: IconName; text: string }) {
  return (
    <View style={styles.row} accessible accessibilityRole="text" accessibilityLabel={text} accessibilityLiveRegion="polite">
      <Icon name={icon} size={18} color={palette.stone} />
      <Text style={[type.label, styles.text]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.s8 },
  text: { flex: 1 },
});
