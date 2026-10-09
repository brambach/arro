import React from 'react';
import { ScrollView, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/tokens';
import { Backdrop } from './Backdrop';

/**
 * Screen scaffold: paper background with the contour map and dawn light behind it
 * (Backdrop, paper screens only) + top safe-area inset. The tab bar is a solid
 * bar rendered by the navigator, so scrolling content just needs a little bottom
 * breathing room, not tab clearance.
 */
type Props = {
  children: React.ReactNode;
  scroll?: boolean;
  background?: string;
  contentStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
};

export function Screen({
  children,
  scroll = true,
  background = colors.screen,
  contentStyle,
  style,
}: Props) {
  const insets = useSafeAreaInsets();

  if (!scroll) {
    return (
      <View style={[styles.root, { backgroundColor: background, paddingTop: insets.top }, style]}>
        {background === colors.screen ? <Backdrop /> : null}
        {children}
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: background }, style]}>
      {background === colors.screen ? <Backdrop /> : null}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[{ paddingTop: insets.top + 6, paddingBottom: 24 }, contentStyle]}
      >
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });
