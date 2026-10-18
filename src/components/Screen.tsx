import React, { useState } from 'react';
import { RefreshControl, ScrollView, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
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
  /** Pull to refresh. The spinner shows until the promise settles. */
  onRefresh?: () => Promise<unknown>;
};

export function Screen({
  children,
  scroll = true,
  background = colors.screen,
  contentStyle,
  style,
  onRefresh,
}: Props) {
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const pull = onRefresh
    ? () => {
        setRefreshing(true);
        onRefresh()
          .catch(() => undefined)
          .finally(() => setRefreshing(false));
      }
    : undefined;

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
        refreshControl={
          pull ? (
            <RefreshControl refreshing={refreshing} onRefresh={pull} tintColor={colors.muted} progressViewOffset={insets.top} />
          ) : undefined
        }
        contentContainerStyle={[{ paddingTop: insets.top + 6, paddingBottom: 24 }, contentStyle]}
      >
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });
