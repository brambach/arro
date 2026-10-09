import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, radii, shadows } from '../theme/tokens';
import { weights } from '../theme/typography';

/** A small toggle pill: workout types, durations, Today/Yesterday. */
export function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={[styles.chip, selected && styles.chipOn]}
    >
      <Text style={[styles.text, selected && styles.textOn]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: colors.card,
    ...shadows.card,
    paddingVertical: 9,
    paddingHorizontal: 16,
  },
  chipOn: { backgroundColor: colors.accentTint, borderColor: colors.primary },
  text: { fontSize: 15, fontWeight: weights.medium, color: colors.inkSoft },
  textOn: { color: colors.primaryPress, fontWeight: weights.semibold },
});
