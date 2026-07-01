import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors } from '../theme/tokens';
import { type } from '../theme/typography';

/**
 * SectionHeader (Spec §8) — overline label + optional count, tinted by context.
 */
type Props = {
  title: string;
  count?: number | string;
  tint?: string;
  style?: StyleProp<ViewStyle>;
};

export function SectionHeader({ title, count, tint = colors.faint, style }: Props) {
  return (
    <View style={[styles.row, style]}>
      <Text style={[type.overline, { color: tint }]}>{title}</Text>
      {count !== undefined && <Text style={styles.count}>{count}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  count: {
    ...type.label,
    color: colors.faint,
  },
});
