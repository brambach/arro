import React, { Children, Fragment, isValidElement } from 'react';
import { Pressable, StyleProp, StyleSheet, Text, useWindowDimensions, View, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { alpha, layout, palette, radii, space } from '../theme/tokens';
import { timing } from '../theme/motion';
import { type } from '../theme/typography';
import { Card } from './Card';

/**
 * A list row: tappable across its whole width when it has `onPress`. It shows a
 * value on the right when it has one ("3 a week", "Kept") and nothing
 * otherwise. No chevrons, no arrows.
 *
 * Put rows in a `ListGroup`, which draws the card and the hairlines between them.
 */
type RowProps = {
  title: string;
  subtitle?: string;
  /** Text on the right. */
  value?: string;
  /** `kept` is moss and 600 ("Kept"); `quiet` is stone. */
  valueTone?: 'default' | 'kept' | 'quiet';
  /** An avatar or icon on the left. */
  leading?: React.ReactNode;
  /** Something on the right before the value: dots, a toggle. */
  trailing?: React.ReactNode;
  onPress?: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
};

export function ListRow({
  title,
  subtitle,
  value,
  valueTone = 'default',
  leading,
  trailing,
  onPress,
  accessibilityLabel,
  accessibilityHint,
  style,
}: RowProps) {
  const press = useSharedValue(0);
  const wash = useAnimatedStyle(() => ({ opacity: press.value }));
  // At the large Dynamic Type sizes, text wraps instead of being cut off, and the value moves under the title.
  const { fontScale } = useWindowDimensions();
  const large = fontScale >= 1.3;
  const lines = large ? undefined : 1;
  // At the accessibility sizes the leading icon goes above the text, so a long word like "yesterday’s" gets the whole width and never breaks inside.
  const stacked = leading != null && fontScale >= ACCESSIBILITY_SCALE;

  const content = (
    <View style={[styles.row, stacked && styles.stacked, { minHeight: subtitle ? layout.row : layout.rowCompact }, style]}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.wash, wash]} pointerEvents="none" />
      {leading ? <View>{leading}</View> : null}
      <View style={[styles.text, stacked && styles.stackedText]}>
        <Text style={type.bodyStrong} numberOfLines={lines}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={type.label} numberOfLines={lines}>
            {subtitle}
          </Text>
        ) : null}
        {/* Large type: the value goes under the title, so neither is squeezed. */}
        {value && large ? (
          <Text style={[type.bodySmall, valueTone === 'kept' ? styles.kept : valueTone === 'quiet' ? styles.quiet : styles.value]}>{value}</Text>
        ) : null}
      </View>
      {trailing}
      {value && !large ? (
        <Text
          style={[
            type.bodySmall,
            valueTone === 'kept' && styles.kept,
            valueTone === 'quiet' && styles.quiet,
            valueTone === 'default' && styles.value,
          ]}
          numberOfLines={1}
        >
          {value}
        </Text>
      ) : null}
    </View>
  );

  const label = accessibilityLabel ?? [title, subtitle, value].filter(Boolean).join(', ');
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
      accessibilityHint={accessibilityHint}
    >
      {content}
    </Pressable>
  );
}

/**
 * A card of rows with hairlines between them. The hairline starts after the
 * leading avatar (`inset="leading"`, the default when rows have one) or at the
 * text's edge.
 */
export function ListGroup({
  children,
  inset = 'text',
  style,
}: {
  children: React.ReactNode;
  inset?: 'leading' | 'text';
  style?: StyleProp<ViewStyle>;
}) {
  const rows = Children.toArray(children).filter(isValidElement);
  // Stacked rows start their text at the row's edge, so the hairline does too.
  const { fontScale } = useWindowDimensions();
  const leadingInset = inset === 'leading' && fontScale < ACCESSIBILITY_SCALE;
  return (
    <Card padding={0} style={style}>
      <View style={styles.clip}>
        {rows.map((row, i) => (
          <Fragment key={row.key ?? i}>
            {i > 0 ? <View style={[styles.hairline, { marginLeft: leadingInset ? space.s72 : space.s20 }]} /> : null}
            {row}
          </Fragment>
        ))}
      </View>
    </Card>
  );
}

/** iOS's first accessibility text size (AX1) is about 1.65 times the default. */
const ACCESSIBILITY_SCALE = 1.6;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s12,
    paddingHorizontal: space.s20,
    paddingVertical: space.s8,
  },
  wash: { backgroundColor: alpha.press },
  stacked: { flexWrap: 'wrap', alignItems: 'flex-start', paddingVertical: space.s12 },
  text: { flex: 1, minWidth: 0 },
  stackedText: { flexBasis: '100%' },
  value: { color: palette.smoke },
  quiet: { color: palette.stone },
  kept: { color: palette.moss, fontWeight: '600' },
  clip: { borderRadius: radii.card, overflow: 'hidden', paddingVertical: space.s4 },
  hairline: { height: StyleSheet.hairlineWidth, backgroundColor: alpha.hairline },
});
