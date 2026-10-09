import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { colors, depth } from '../theme/tokens';
import { weights } from '../theme/typography';
import { TabFeed, TabMe, TabToday, TabWeek } from './Icons';

const TABS: Record<string, { label: string; render: (c: string) => React.ReactNode }> = {
  Today: { label: 'Today', render: (c) => <TabToday color={c} /> },
  ThisWeek: { label: 'This Week', render: (c) => <TabWeek color={c} /> },
  Feed: { label: 'Feed', render: (c) => <TabFeed color={c} /> },
  Me: { label: 'Me', render: (c) => <TabMe color={c} /> },
};

/**
 * Bottom tab bar: a raised paper bar, lifted by a soft shadow cast upward and a
 * light top edge rather than a hairline. Content sits above it, nothing scrolls
 * under. 4 fixed tabs, no badges, no "More". The active tab's icon sits on a
 * small raised pill (like the active row in Dervo's sidebar) and is clay;
 * inactive tabs are warm grey.
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
            <View style={[styles.iconWrap, focused && styles.iconWrapOn]}>{tab.render(color)}</View>
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
    backgroundColor: colors.card,
    boxShadow: '0px -1px 0px 0px rgba(70,50,25,0.05), 0px -10px 28px -14px rgba(90,60,35,0.22), ' + depth.sheen,
    paddingTop: 7,
    paddingHorizontal: 6,
  },
  tab: { flex: 1, alignItems: 'center', gap: 2 },
  iconWrap: { width: 54, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  iconWrapOn: { backgroundColor: colors.white, boxShadow: `${depth.lift}, ${depth.sheen}` },
  label: { fontSize: 11 },
});
