import React from 'react';
import { StyleProp, StyleSheet, Text, TextInput, TextInputProps, View, ViewStyle } from 'react-native';
import { colors, radii, shadows } from '../theme/tokens';
import { weights } from '../theme/typography';

/** A labelled single-line (or multiline) text box in the flat card style. */
type Props = TextInputProps & { label?: string; wrapStyle?: StyleProp<ViewStyle> };

export function TextField({ label, wrapStyle, style, multiline, ...rest }: Props) {
  return (
    <View style={wrapStyle}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={colors.faint3}
        multiline={multiline}
        style={[styles.input, multiline && styles.multiline, style]}
        {...rest}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 14, fontWeight: weights.semibold, color: colors.muted, marginBottom: 6 },
  input: {
    backgroundColor: colors.sunk,
    borderRadius: radii.button,
    ...shadows.sunk,
    paddingHorizontal: 16,
    height: 52,
    fontSize: 16,
    color: colors.ink,
  },
  multiline: { height: undefined, minHeight: 84, paddingTop: 14, paddingBottom: 14, textAlignVertical: 'top' },
});
