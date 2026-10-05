import React from 'react';
import { Pressable, StyleProp, StyleSheet, Text, TextStyle } from 'react-native';
import { colors } from '../theme/tokens';
import { weights } from '../theme/typography';

/** A quiet text-only action ("Invite a family member", "Log yesterday"). */
export function TextButton({
  label,
  onPress,
  style,
}: {
  label: string;
  onPress: () => void;
  style?: StyleProp<TextStyle>;
}) {
  return (
    <Pressable onPress={onPress} hitSlop={8} accessibilityRole="button" accessibilityLabel={label}>
      <Text style={[styles.text, style]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({ text: { fontSize: 15, fontWeight: weights.semibold, color: colors.ink, textDecorationLine: 'underline' } });
