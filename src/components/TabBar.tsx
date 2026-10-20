import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { depth, palette, space } from '../theme/tokens';
import { type, weights } from '../theme/typography';
import { Icon, IconName } from './Icon';

const TABS: Record<string, { label: string; icon: IconName }> = {
  Today: { label: 'Today', icon: 'today' },
  ThisWeek: { label: 'Week', icon: 'week' },
  Week: { label: 'Week', icon: 'week' },
  Feed: { label: 'Feed', icon: 'feed' },
  Me: { label: 'Me', icon: 'me' },
};

/**
 * The tab bar: birch, a grain hairline along the top, four custom icons at
 * 28 pt. The active tab's icon is ember and its label coal (ember is too light
 * for 12 pt text); the rest are stone. No badges, no pills.
 */
export function TabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, space.s8) }]}>
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const tab = TABS[route.name];
        if (!tab) return null;
        // Ember for the icon; the label takes coal, since ember text is under 4.5:1 on birch.
        const color = focused ? palette.ember : palette.stone;
        const labelColor = focused ? palette.coal : palette.stone;
        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
        };
        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={tab.label}
            onPress={onPress}
            style={styles.tab}
          >
            <Icon name={tab.icon} size={28} color={color} />
            {/* Like the system tab bar, labels grow only a little at the largest text sizes. */}
            <Text
              style={[type.tab, { color: labelColor, fontWeight: focused ? weights.semibold : weights.medium }]}
              maxFontSizeMultiplier={1.3}
              numberOfLines={1}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: palette.birch,
    boxShadow: depth.tabBar,
    paddingTop: space.s8,
    paddingHorizontal: space.s16,
  },
  tab: { flex: 1, alignItems: 'center', gap: space.s4 },
});
