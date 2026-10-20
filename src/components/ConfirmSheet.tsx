import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { depth, palette, radii, space } from '../theme/tokens';
import { maxFontScale, type } from '../theme/typography';
import { Sheet } from './Sheet';
import { SolidButton } from './SolidButton';
import { TextAction } from './TextAction';

/**
 * A designed confirm, in place of the system alert: a Fraunces title, a plain
 * body, an optional warning in an aspen tray (the Plus payer note), one solid
 * button and a plain-text Cancel. Tapping the scrim cancels too.
 */
type Props = {
  visible: boolean;
  title: string;
  body: string;
  /** Said first, in a tray: something the person has to know before they go on. */
  warning?: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
};

export function ConfirmSheet({ visible, title, body, warning, confirmLabel, cancelLabel = 'Cancel', onConfirm, onCancel, busy }: Props) {
  return (
    <Sheet visible={visible} onDismiss={busy ? undefined : onCancel} dismissLabel={cancelLabel}>
      <Text style={type.headingStrong} accessibilityRole="header" maxFontSizeMultiplier={maxFontScale.heading}>
        {title}
      </Text>
      {warning ? (
        <View style={styles.tray}>
          <Text style={type.bodyStrong}>{warning}</Text>
        </View>
      ) : null}
      <Text style={[type.body, styles.body]}>{body}</Text>
      <SolidButton title={confirmLabel} onPress={onConfirm} disabled={busy} style={styles.confirm} />
      <TextAction label={cancelLabel} onPress={onCancel} disabled={busy} style={styles.cancel} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  tray: { backgroundColor: palette.aspen, borderRadius: radii.field, padding: space.s16, marginTop: space.s16, boxShadow: depth.sunk },
  body: { color: palette.smoke, marginTop: space.s16 },
  confirm: { marginTop: space.s24 },
  cancel: { marginTop: space.s8 },
});
