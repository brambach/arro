import React from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors } from '../theme/tokens';
import { weights } from '../theme/typography';

/**
 * SectionHeader — a bold section label with an optional accent action on the right
 * (e.g. "Family today · Nudge", "Recent runs · See all").
 */
type Props = {
  title: string;
  action?: string;
  onAction?: () => void;
  titleColor?: string;
  style?: StyleProp<ViewStyle>;
};

export function SectionHeader({ title, action, onAction, titleColor = colors.muted, style }: Props) {
  return (
    <View style={[styles.row, style]}>
      <Text style={[styles.title, { color: titleColor }]}>{title}</Text>
      {action ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text style={styles.action}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 13, fontWeight: weights.semibold },
  action: { fontSize: 13, fontWeight: weights.semibold, color: colors.primary },
});
