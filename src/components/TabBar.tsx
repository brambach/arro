import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { colors } from '../theme/tokens';
import { fonts } from '../theme/typography';
import { TabFeed, TabMe, TabToday, TabTrail } from './Icons';

/** Base clearance a scroll view should leave so content clears the tab bar. */
export const TAB_BAR_HEIGHT = 84;

const TABS: Record<
  string,
  { label: string; render: (color: string, active: boolean) => React.ReactNode }
> = {
  Today: { label: 'Today', render: (c, active) => <TabToday color={c} active={active} /> },
  Trail: { label: 'Trail', render: (c) => <TabTrail color={c} /> },
  Feed: { label: 'Feed', render: (c) => <TabFeed color={c} /> },
  Me: { label: 'Me', render: (c) => <TabMe color={c} /> },
};

/**
 * Custom bottom tab bar (Spec §6). 4 fixed tabs, top fade so content scrolls
 * under, active = primary/filled, inactive = faint/outline. No badges.
 * Rendered absolutely so screens fill the full height behind the fade.
 */
export function TabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <LinearGradient
        pointerEvents="box-none"
        colors={['rgba(255,251,244,0)', colors.surface]}
        locations={[0, 0.4]}
        style={[styles.grad, { paddingBottom: Math.max(insets.bottom, 10), height: 84 + insets.bottom }]}
      >
        <View style={styles.row}>
          {state.routes.map((route, index) => {
            const focused = state.index === index;
            const color = focused ? colors.primary : colors.tabInactive;
            const tab = TABS[route.name];
            if (!tab) return null;

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!focused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            };

            return (
              <Pressable
                key={route.key}
                accessibilityRole="button"
                accessibilityState={{ selected: focused }}
                accessibilityLabel={tab.label}
                onPress={onPress}
                style={styles.tab}
              >
                {tab.render(color, focused)}
                <Text
                  style={[
                    styles.label,
                    { color, fontFamily: focused ? fonts.sansHeavy : fonts.sansLabel },
                  ]}
                >
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  grad: { justifyContent: 'flex-start', paddingTop: 14, paddingHorizontal: 26 },
  row: { flexDirection: 'row', justifyContent: 'space-around' },
  tab: { alignItems: 'center', gap: 4, minWidth: 56 },
  label: { fontSize: 11 },
});
