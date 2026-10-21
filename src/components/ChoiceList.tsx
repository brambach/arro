import React, { Fragment, useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { alpha, depth, layout, palette, radii, space } from '../theme/tokens';
import { timing } from '../theme/motion';
import { type } from '../theme/typography';
import { Card } from './Card';
import { Icon } from './Icon';

/**
 * One choice from a short list, as rows in a steam card (Take a break's
 * lengths, the wall woods, the preview scenarios). The whole row is the target.
 * The picked row's mark fills with ember and a steam check, crossfading; the
 * others are a small aspen dent. A row that can't be picked has no mark, a
 * stone title, and says why in its subtitle.
 */
export type ChoiceItem<T> = {
  value: T;
  title: string;
  subtitle?: string;
  /** Something on the left: a wood swatch, an icon. */
  leading?: React.ReactNode;
  disabled?: boolean;
};

type Props<T> = {
  items: ChoiceItem<T>[];
  value: T | null;
  onChange: (value: T) => void;
  accessibilityLabel: string;
};

export function ChoiceList<T extends string | number>({ items, value, onChange, accessibilityLabel }: Props<T>) {
  return (
    <Card padding={0}>
      <View accessibilityRole="radiogroup" accessibilityLabel={accessibilityLabel} style={styles.clip}>
        {items.map((item, i) => (
          <Fragment key={String(item.value)}>
            {i > 0 ? <View style={styles.hairline} /> : null}
            <ChoiceRowItem item={item} picked={item.value === value} onPress={() => onChange(item.value)} />
          </Fragment>
        ))}
      </View>
    </Card>
  );
}

function ChoiceRowItem<T>({ item, picked, onPress }: { item: ChoiceItem<T>; picked: boolean; onPress: () => void }) {
  const press = useSharedValue(0);
  const wash = useAnimatedStyle(() => ({ opacity: press.value }));
  return (
    <Pressable
      onPress={onPress}
      disabled={item.disabled}
      onPressIn={() => {
        press.set(withTiming(1, timing.utility));
      }}
      onPressOut={() => {
        press.set(withTiming(0, timing.utility));
      }}
      accessibilityRole="radio"
      accessibilityState={{ selected: picked, disabled: !!item.disabled }}
      accessibilityLabel={[item.title, item.subtitle].filter(Boolean).join(', ')}
      style={styles.row}
    >
      <Animated.View style={[StyleSheet.absoluteFill, styles.wash, wash]} pointerEvents="none" />
      {item.leading ? <View>{item.leading}</View> : null}
      <View style={styles.text}>
        <Text style={[type.bodyStrong, item.disabled && styles.off]}>{item.title}</Text>
        {item.subtitle ? <Text style={type.bodySmall}>{item.subtitle}</Text> : null}
      </View>
      {item.disabled ? null : <PickMark picked={picked} />}
    </Pressable>
  );
}

/** The round mark at the end of a choice row. */
export function PickMark({ picked }: { picked: boolean }) {
  const on = useSharedValue(picked ? 1 : 0);
  useEffect(() => {
    on.set(withTiming(picked ? 1 : 0, timing.utility));
  }, [picked, on]);
  const fill = useAnimatedStyle(() => ({ opacity: on.value, transform: [{ scale: 0.8 + 0.2 * on.value }] }));
  return (
    <View style={styles.mark}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.markOn, fill]}>
        <Icon name="check" size={16} color={palette.steam} strokeWidth={2.4} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  clip: { borderRadius: radii.card, overflow: 'hidden', paddingVertical: space.s4 },
  hairline: { height: StyleSheet.hairlineWidth, backgroundColor: alpha.hairline, marginLeft: space.s20 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s12,
    minHeight: layout.row,
    paddingHorizontal: space.s20,
    paddingVertical: space.s12,
  },
  wash: { backgroundColor: alpha.press },
  text: { flex: 1, minWidth: 0 },
  mark: { width: 24, height: 24, borderRadius: radii.round, backgroundColor: palette.aspen, boxShadow: depth.sunk },
  markOn: { borderRadius: radii.round, backgroundColor: palette.ember, alignItems: 'center', justifyContent: 'center' },
  off: { color: palette.stone },
});
