import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { MilestoneScreen } from '../screens/MilestoneScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { RunDetailScreen } from '../screens/RunDetailScreen';
import { NudgeModalScreen } from '../screens/NudgeModalScreen';
import { FamilyMembersScreen } from '../screens/FamilyMembersScreen';
import { MainTabs } from './MainTabs';
import { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <Stack.Navigator initialRouteName="Onboarding" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      <Stack.Screen name="Main" component={MainTabs} />
      <Stack.Screen name="Milestone" component={MilestoneScreen} options={{ presentation: 'modal' }} />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="RunDetail"
        component={RunDetailScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="FamilyMembers"
        component={FamilyMembersScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="Nudge"
        component={NudgeModalScreen}
        options={{ presentation: 'transparentModal', animation: 'fade' }}
      />
    </Stack.Navigator>
  );
}
