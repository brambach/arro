import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { layout, palette, space } from '../theme/tokens';
import { maxFontScale, type } from '../theme/typography';
import { Backdrop } from './Backdrop';
import { StoneMark } from './brand/StoneMark';
import { Settle } from './Settle';

/**
 * A whole-screen notice with nowhere else to go (Update required, This build
 * can't reach Saunafam): the stone, a Fraunces title, a line, and the actions
 * at the bottom. One settle arrival.
 */
type Props = {
  title: string;
  body: string;
  children?: React.ReactNode;
};

export function NoticeScreen({ title, body, children }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom + space.s16 }]}>
      <Backdrop />
      <View style={styles.middle}>
        <Settle index={0} style={styles.center}>
          <StoneMark width={96} />
          <Text style={[type.title, styles.text, styles.title]} accessibilityRole="header" maxFontSizeMultiplier={maxFontScale.title}>
            {title}
          </Text>
          <Text style={[type.body, styles.text, styles.body]}>{body}</Text>
        </Settle>
      </View>
      {children ? <Settle index={1}>{children}</Settle> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.birch, paddingHorizontal: layout.inset },
  middle: { flex: 1, justifyContent: 'center' },
  center: { alignItems: 'center' },
  text: { textAlign: 'center' },
  title: { marginTop: space.s32 },
  body: { color: palette.smoke, marginTop: space.s12 },
});
