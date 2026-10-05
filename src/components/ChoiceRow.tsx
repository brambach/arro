import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii } from '../theme/tokens';
import { weights } from '../theme/typography';
import { Check } from './Icons';

/** A tappable choice in a single-choice list: icon, title, one line of help, a check when picked. */
type Props = {
  title: string;
  body?: string;
  icon?: React.ReactNode;
  tag?: string;
  selected: boolean;
  onPress: () => void;
};

export function ChoiceRow({ title, body, icon, tag, selected, onPress }: Props) {
  // Some icons default to white (they're made for the Settings tiles), so give
  // one without its own colour the soft ink, or it vanishes on the card.
  const tinted =
    React.isValidElement<{ color?: string }>(icon) && icon.props.color === undefined
      ? React.cloneElement(icon, { color: colors.inkSoft })
      : icon;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      style={[styles.row, selected && styles.rowSelected]}
    >
      {tinted ? <View style={styles.icon}>{tinted}</View> : null}
      <View style={{ flex: 1 }}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{title}</Text>
          {tag ? (
            <View style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ) : null}
        </View>
        {body ? <Text style={styles.body}>{body}</Text> : null}
      </View>
      <View style={[styles.radio, selected && styles.radioOn]}>{selected ? <Check size={14} color={colors.white} /> : null}</View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.card,
    paddingVertical: 15,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  rowSelected: { borderColor: colors.primary },
  icon: { width: 28, alignItems: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 16, fontWeight: weights.semibold, color: colors.ink },
  body: { fontSize: 14.5, lineHeight: 20, color: colors.muted, marginTop: 3 },
  tag: { backgroundColor: colors.todayPillBg, borderRadius: radii.pill, paddingVertical: 2, paddingHorizontal: 8 },
  tagText: { fontSize: 12, fontWeight: weights.semibold, color: colors.todayPillText },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOn: { backgroundColor: colors.primary, borderColor: colors.primary },
});
