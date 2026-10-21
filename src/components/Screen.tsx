import React, { useEffect, useState } from 'react';
import { DeviceEventEmitter, RefreshControl, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import Animated, { useAnimatedRef, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { alpha, palette, space } from '../theme/tokens';
import { Backdrop } from './Backdrop';

/**
 * Screen scaffold: birch, with the sauna wall and its drifting haze behind it
 * (Backdrop, birch screens only) + top safe-area inset. The tab bar is a solid
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
  background = palette.birch,
  contentStyle,
  style,
  onRefresh,
}: Props) {
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.set(e.contentOffset.y);
  });
  const fade = useAnimatedStyle(() => ({ opacity: Math.max(0, Math.min(1, scrollY.value / space.s24)) }));
  // Dev builds with the capture driver (src/dev/DevDriver.tsx) can scroll the screen in front.
  useEffect(() => {
    if (!__DEV__ || process.env.EXPO_PUBLIC_DEV_DRIVER !== '1') return;
    const sub = DeviceEventEmitter.addListener('devScroll', (y: number) => scrollRef.current?.scrollTo({ y, animated: false }));
    return () => sub.remove();
  }, [scrollRef]);
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
        {background === palette.birch ? <Backdrop /> : null}
        {children}
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: background }, style]}>
      {background === palette.birch ? <Backdrop /> : null}
      <Animated.ScrollView
        ref={scrollRef}
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        refreshControl={
          pull ? (
            <RefreshControl refreshing={refreshing} onRefresh={pull} tintColor={palette.stone} progressViewOffset={insets.top} />
          ) : undefined
        }
        contentContainerStyle={[{ paddingTop: insets.top + space.s8, paddingBottom: space.s24 }, contentStyle]}
      >
        {children}
      </Animated.ScrollView>
      {background === palette.birch ? (
        // Content scrolling up fades out under the status bar instead of running into the clock.
        // Only once scrolled: at rest the haze's warm corner shows through.
        <Animated.View style={[styles.statusFade, { height: insets.top + space.s16 }, fade]} pointerEvents="none">
          <LinearGradient colors={[palette.birch, palette.birch, alpha.birchClear]} locations={[0, 0.55, 1]} style={StyleSheet.absoluteFill} />
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  statusFade: { position: 'absolute', top: 0, left: 0, right: 0 },
});
