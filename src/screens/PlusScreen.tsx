import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { RootStackScreenProps } from '../navigation/types';
import { layout, space } from '../theme/tokens';
import { maxFontScale, type } from '../theme/typography';
import { Backdrop } from '../components/Backdrop';
import { TextAction } from '../components/TextAction';

/**
 * Placeholder for the Plus sheet, which M15 builds. Week and Me open it with
 * `focus` ("everyWeek", "poster", "heatLog", "timerFace", "appIcon", "card")
 * so M15 can open the sheet at that feature. Only reachable when plus_enabled.
 */
export function PlusScreen({ navigation }: RootStackScreenProps<'Plus'>) {
  return (
    <View style={styles.root}>
      <Backdrop />
      <Text style={type.title} maxFontSizeMultiplier={maxFontScale.title} accessibilityRole="header">
        Saunafam Plus
      </Text>
      <Text style={[type.bodySmall, styles.body]}>The streak is free, for everyone, for good. Plus is for families who’d like a little more from the wall.</Text>
      <TextAction label="Not now" onPress={() => navigation.goBack()} style={styles.close} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: layout.inset, paddingTop: space.s40 },
  body: { marginTop: space.s12 },
  close: { alignSelf: 'flex-start', marginTop: space.s24 },
});
