import React from 'react';
import { ScrollView, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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
  /** A low morning wash of warmth behind the top of the screen. */
  glow?: boolean;
};

export function Screen({
  children,
  scroll = true,
  background = colors.screen,
  contentStyle,
  style,
  glow = false,
}: Props) {
  const insets = useSafeAreaInsets();
  const wash = glow ? (
    <LinearGradient
      colors={['#FFEBD8', 'rgba(255,243,230,0.6)', 'rgba(251,249,245,0)']}
      locations={[0, 0.45, 1]}
      style={[styles.glow, { height: insets.top + 300 }]}
      pointerEvents="none"
    />
  ) : null;

  if (!scroll) {
    return (
      <View style={[styles.root, { backgroundColor: background, paddingTop: insets.top }, style]}>
        {wash}
        {children}
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: background }, style]}>
      {wash}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[{ paddingTop: insets.top + 6, paddingBottom: 24 }, contentStyle]}
      >
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  glow: { position: 'absolute', top: 0, left: 0, right: 0 },
});
