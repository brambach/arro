import React from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { alpha, layout, palette, space } from '../theme/tokens';
import { timing } from '../theme/motion';
import { type } from '../theme/typography';
import type { FamilyRow } from '../state/buildView';
import { Avatar } from './Avatar';
import { EmberDots } from './EmberDots';
import { Icon } from './Icon';

/**
 * One person in a family list (Today, Week), as the mockup draws it: their
 * avatar, name and latest session, this week's mini dots and a status on the
 * right in a fixed column, so the dots line up down the list. "Kept" is moss.
 *
 * Someone on a break shows the break in place of their latest session, with a
 * pause mark where the dots go. Someone invited reads "Invited".
 * `compact` drops the second line (Week's rows).
 */
type Props = {
  row: FamilyRow;
  onPress?: () => void;
  compact?: boolean;
  /** What a tap does, for VoiceOver ("Sends Maya a nudge"). */
  hint?: string;
};

export function PersonRow({ row, onPress, compact = false, hint }: Props) {
  const press = useSharedValue(0);
  const wash = useAnimatedStyle(() => ({ opacity: press.value }));
  const name = row.member.isMe ? 'You' : row.member.name;
  const onBreak = row.state === 'break';
  const invited = row.state === 'invited';
  // Compact rows (Week) drop the latest session, but never the break: it's the only place it shows.
  const subtitle = onBreak ? row.status : compact ? null : invited ? 'Hasn’t joined yet' : row.latest;
  const status = onBreak ? null : row.status;
  // At the accessibility text sizes the dots and status move under the name, so nothing truncates.
  const stacked = useWindowDimensions().fontScale > 1.5;
  const lines = stacked ? undefined : 1;
  const marks = (
    <>
      {onBreak ? (
        <Icon name="pause" size={20} color={palette.pebble} />
      ) : row.dots.length ? (
        <EmberDots count={row.dots.length} filled={row.dots.filter(Boolean).length} size="mini" />
      ) : null}
      {status ? (
        <Text
          style={[type.bodySmall, styles.status, stacked && styles.statusStacked, row.state === 'kept' ? styles.kept : invited ? styles.quiet : null]}
          numberOfLines={lines}
        >
          {status}
        </Text>
      ) : null}
    </>
  );

  const content = (
    <View style={[styles.row, { minHeight: compact ? layout.rowCompact + space.s8 : layout.row }]}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.wash, wash]} pointerEvents="none" />
      <Avatar name={row.member.name} color={row.member.color} photoUri={typeof row.member.photoUri === 'string' ? row.member.photoUri : null} size={38} />
      <View style={styles.text}>
        <Text style={type.bodyStrong} numberOfLines={lines}>
          {name}
        </Text>
        {subtitle ? (
          <Text style={type.label} numberOfLines={lines}>
            {subtitle}
          </Text>
        ) : null}
        {stacked ? <View style={styles.marksStacked}>{marks}</View> : null}
      </View>
      {stacked ? null : marks}
    </View>
  );

  const label = [name, status ?? row.status, subtitle && subtitle !== row.status ? subtitle : null].filter(Boolean).join(', ');
  if (!onPress) {
    return (
      <View accessible accessibilityLabel={label}>
        {content}
      </View>
    );
  }
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => {
        press.set(withTiming(1, timing.utility));
      }}
      onPressOut={() => {
        press.set(withTiming(0, timing.utility));
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
    >
      {content}
    </Pressable>
  );
}

/** What tapping a row does, for VoiceOver. */
export function rowHint(row: FamilyRow): string | undefined {
  switch (row.tap.kind) {
    case 'nudge':
      return `Cheer ${row.member.name} on`;
    case 'session':
      return row.member.isMe ? 'Opens your latest session' : `Opens ${row.member.name}’s latest session`;
    case 'invite':
      return 'Opens the invite';
    default:
      return undefined;
  }
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s12,
    paddingHorizontal: space.s20,
    paddingVertical: space.s8,
  },
  wash: { backgroundColor: alpha.press },
  text: { flex: 1, minWidth: 0 },
  // A fixed column, right-aligned, so the dots line up down the list.
  status: { minWidth: 52, textAlign: 'right', color: palette.smoke, fontWeight: '500' },
  statusStacked: { minWidth: 0, textAlign: 'left' },
  marksStacked: { flexDirection: 'row', alignItems: 'center', gap: space.s12, marginTop: space.s4 },
  kept: { color: palette.moss, fontWeight: '600' },
  quiet: { color: palette.stone },
});
