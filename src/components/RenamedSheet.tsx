import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { palette, space } from '../theme/tokens';
import { maxFontScale, type } from '../theme/typography';
import { RENAMED_SHEET } from '../state/settingsCopy';
import { StoneMark } from './brand/StoneMark';
import { Sheet } from './Sheet';
import { SolidButton } from './SolidButton';
import { TextAction } from './TextAction';

/**
 * "Arro is now Saunafam" (spec, section 7): once, for testers who were signed
 * in before build 9 (saunafam.welcomed.v1). Got it closes it. The founder also
 * gets Change the rhythm, which closes it and opens Family rules.
 */
type Props = {
  visible: boolean;
  founder: boolean;
  goal: number;
  minMinutes: number;
  onGotIt: () => void;
  onChangeRhythm: () => void;
};

export function RenamedSheet({ visible, founder, goal, minMinutes, onGotIt, onChangeRhythm }: Props) {
  return (
    <Sheet visible={visible}>
      <View style={styles.mark}>
        <StoneMark width={64} />
      </View>
      <Text style={[type.title, styles.center]} accessibilityRole="header" maxFontSizeMultiplier={maxFontScale.title}>
        {RENAMED_SHEET.title}
      </Text>
      <Text style={[type.body, styles.center, styles.body]}>{RENAMED_SHEET.body(goal, minMinutes)}</Text>
      <SolidButton title={RENAMED_SHEET.gotIt} onPress={onGotIt} style={styles.button} />
      {founder ? <TextAction label={RENAMED_SHEET.changeRhythm} onPress={onChangeRhythm} style={styles.second} /> : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  mark: { alignItems: 'center', marginBottom: space.s16 },
  center: { textAlign: 'center' },
  body: { color: palette.smoke, marginTop: space.s12 },
  button: { marginTop: space.s32 },
  second: { marginTop: space.s8 },
});
