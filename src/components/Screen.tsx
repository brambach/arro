import React from 'react';
import {
  ScrollView,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/tokens';
import { TAB_BAR_HEIGHT } from './TabBar';

/**
 * Shared screen scaffold: applies the top safe-area inset, a background, and
 * (for scrolling screens) bottom clearance for the floating tab bar.
 */
type Props = {
  children: React.ReactNode;
  scroll?: boolean;
  background?: string;
  withTabBar?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
};

export function Screen({
  children,
  scroll = true,
  background = colors.surface,
  withTabBar = true,
  contentStyle,
  style,
}: Props) {
  const insets = useSafeAreaInsets();
  const bottomPad = (withTabBar ? TAB_BAR_HEIGHT : 0) + insets.bottom + 12;

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
        contentContainerStyle={[{ paddingTop: insets.top + 6, paddingBottom: bottomPad }, contentStyle]}
      >
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
