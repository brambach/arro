import React from 'react';
import { ScrollView, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/tokens';

/**
 * Screen scaffold: flat background + top safe-area inset. The tab bar is a solid
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
        {children}
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: background }, style]}>
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
