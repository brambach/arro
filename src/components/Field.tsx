import React, { forwardRef, useState } from 'react';
import { StyleProp, StyleSheet, Text, TextInput, TextInputProps, View, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { depth, palette, radii, space } from '../theme/tokens';
import { timing } from '../theme/motion';
import { type } from '../theme/typography';

/**
 * A designed text field: a steam well with a hairline ring, a label above in
 * 13 pt, and an ember focus ring that fades in (opacity only). A hint or an
 * error sits below; errors are coal, never red.
 *
 * Every TextInput prop passes through. `multiline` grows from three lines.
 */
type Props = TextInputProps & {
  label: string;
  hint?: string;
  error?: string;
  wrapStyle?: StyleProp<ViewStyle>;
};

export const Field = forwardRef<TextInput, Props>(function Field(
  { label, hint, error, wrapStyle, style, multiline, onFocus, onBlur, ...rest },
  ref,
) {
  const focus = useSharedValue(0);
  const [focused, setFocused] = useState(false);
  const ring = useAnimatedStyle(() => ({ opacity: focus.value }));
  const note = error ?? hint;

  return (
    <View style={wrapStyle}>
      <Text style={[type.labelStrong, styles.label, focused && styles.labelOn]}>{label}</Text>
      <View style={styles.well}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.ring, ring]} pointerEvents="none" />
        <TextInput
          ref={ref}
          accessibilityLabel={label}
          accessibilityHint={note}
          placeholderTextColor={palette.stone}
          selectionColor={palette.ember}
          cursorColor={palette.ember}
          multiline={multiline}
          onFocus={(e) => {
            setFocused(true);
            focus.set(withTiming(1, timing.utility));
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            focus.set(withTiming(0, timing.utility));
            onBlur?.(e);
          }}
          style={[type.body, styles.input, multiline && styles.multiline, style]}
          {...rest}
        />
      </View>
      {note ? <Text style={[type.label, styles.note, error ? styles.error : null]}>{note}</Text> : null}
    </View>
  );
});

const styles = StyleSheet.create({
  label: { color: palette.smoke, marginBottom: space.s8 },
  labelOn: { color: palette.char },
  well: { backgroundColor: palette.steam, borderRadius: radii.field, boxShadow: depth.card },
  ring: { borderRadius: radii.field, boxShadow: depth.focus },
  input: { minHeight: 52, paddingHorizontal: space.s16, paddingVertical: space.s12 },
  multiline: { minHeight: 104, textAlignVertical: 'top' },
  note: { marginTop: space.s8 },
  error: { color: palette.coal },
});
