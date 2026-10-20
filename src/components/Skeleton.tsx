import React from 'react';
import { DimensionValue, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { depth, palette, radii, space } from '../theme/tokens';
import { Card } from './Card';

/**
 * Loading placeholders: aspen shapes at the exact size of what's coming, so
 * nothing jumps when it arrives. Still, with no shimmer and never a spinner on
 * a blank screen. Used only when nothing is cached yet (view.status 'loading');
 * a cached family always paints at once.
 */
export function Bone({ width, height, radius = radii.slatSmall, style }: { width: DimensionValue; height: number; radius?: number; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.bone, { width, height, borderRadius: radius }, style]} />;
}

/** A list card of `rows` people-shaped rows, 60 pt each, like the family list. */
export function RowsSkeleton({ rows = 3, rowHeight = 60 }: { rows?: number; rowHeight?: number }) {
  return (
    <Card padding={0}>
      <View style={styles.rows}>
        {Array.from({ length: rows }, (_, i) => (
          <View key={i} style={[styles.row, { height: rowHeight }]}>
            <Bone width={38} height={38} radius={radii.round} />
            <View style={styles.rowText}>
              <Bone width="40%" height={14} />
              <Bone width="64%" height={10} />
            </View>
            <Bone width={44} height={12} />
          </View>
        ))}
      </View>
    </Card>
  );
}

/** Loading: a placeholder the size of one feed card. */
export function CardSkeleton({ height = 156 }: { height?: number }) {
  return (
    <Card>
      <View style={[styles.card, { height: height - space.s40 }]}>
        <View style={styles.cardHead}>
          <Bone width={38} height={38} radius={radii.round} />
          <View style={styles.rowText}>
            <Bone width="58%" height={14} />
            <Bone width="34%" height={10} />
          </View>
        </View>
        <Bone width="72%" height={12} />
        <Bone width="48%" height={12} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  bone: { backgroundColor: palette.aspen, boxShadow: depth.sunk },
  rows: { paddingVertical: space.s4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.s12, paddingHorizontal: space.s20 },
  rowText: { flex: 1, gap: space.s8 },
  card: { gap: space.s16 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: space.s12 },
});
