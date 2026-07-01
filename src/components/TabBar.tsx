import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { colors } from '../theme/tokens';
import { weights } from '../theme/typography';
import { TabFeed, TabMe, TabToday, TabWeek } from './Icons';

const TABS: Record<string, { label: string; render: (c: string) => React.ReactNode }> = {
  Today: { label: 'Today', render: (c) => <TabToday color={c} /> },
  ThisWeek: { label: 'This Week', render: (c) => <TabWeek color={c} /> },
  Feed: { label: 'Feed', render: (c) => <TabFeed color={c} /> },
  Me: { label: 'Me', render: (c) => <TabMe color={c} /> },
};

/**
 * Bottom tab bar (final direction): a solid bar with a hairline top border —
 * content sits above it, nothing scrolls under. 4 fixed tabs, no badges, no
 * "More". Active = orange, inactive = warm grey.
 */
export function TabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const color = focused ? colors.primary : colors.tabInactive;
        const tab = TABS[route.name];
        if (!tab) return null;

        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
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
            {tab.render(color)}
            <Text style={[styles.label, { color, fontWeight: focused ? weights.semibold : weights.medium }]}>
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
    backgroundColor: colors.tabBarBg,
    borderTopWidth: 1,
    borderTopColor: colors.tabBarBorder,
    paddingTop: 9,
    paddingHorizontal: 6,
  },
  tab: { flex: 1, alignItems: 'center', gap: 4 },
  label: { fontSize: 10 },
});
