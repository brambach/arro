import React, { useEffect, useRef } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { colors } from '../theme/tokens';
import { weights } from '../theme/typography';
import { springs, useReduceMotion } from '../theme/motion';
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
 * "More". Active = orange, inactive = warm grey. Choosing a tab gives a light
 * tick, and its icon lifts with a small orange dot settling underneath.
 */
export function TabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const tab = TABS[route.name];
        if (!tab) return null;

        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) {
            if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
            navigation.navigate(route.name);
          }
        };

        return <Tab key={route.key} label={tab.label} render={tab.render} focused={focused} onPress={onPress} />;
      })}
    </View>
  );
}

function Tab({
  label,
  render,
  focused,
  onPress,
}: {
  label: string;
  render: (c: string) => React.ReactNode;
  focused: boolean;
  onPress: () => void;
}) {
  const reduceMotion = useReduceMotion();
  const on = useRef(new Animated.Value(focused ? 1 : 0)).current;
  const press = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (reduceMotion) {
      on.setValue(focused ? 1 : 0);
      return;
    }
    Animated.spring(on, { toValue: focused ? 1 : 0, ...springs.pop, useNativeDriver: true }).start();
  }, [focused, reduceMotion, on]);

  const color = focused ? colors.primary : colors.tabInactive;
  const sink = (toValue: number) =>
    Animated.spring(press, { toValue, ...springs.press, useNativeDriver: true }).start();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={label}
      onPress={onPress}
      onPressIn={() => sink(0.9)}
      onPressOut={() => sink(1)}
      style={styles.tab}
    >
      <Animated.View
        style={{
          transform: [
            { scale: press },
            { translateY: on.interpolate({ inputRange: [0, 1], outputRange: [0, -1.5] }) },
            { scale: on.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] }) },
          ],
        }}
      >
        {render(color)}
      </Animated.View>
      <Text style={[styles.label, { color, fontWeight: focused ? weights.semibold : weights.medium }]}>{label}</Text>
      <Animated.View
        style={[
          styles.dot,
          { opacity: on, transform: [{ scale: on.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }) }] },
        ]}
      />
    </Pressable>
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
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.primary, marginTop: -1 },
});
