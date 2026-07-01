import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { TabBar } from '../components/TabBar';
import { TodayScreen } from '../screens/TodayScreen';
import { ThisWeekScreen } from '../screens/ThisWeekScreen';
import { FeedScreen } from '../screens/FeedScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { MainTabParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();

export function MainTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }} tabBar={(props) => <TabBar {...props} />}>
      <Tab.Screen name="Today" component={TodayScreen} />
      <Tab.Screen name="ThisWeek" component={ThisWeekScreen} />
      <Tab.Screen name="Feed" component={FeedScreen} />
      <Tab.Screen name="Me" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
