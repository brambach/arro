import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { WelcomeScreen } from '../screens/onboarding/WelcomeScreen';
import { JoinCodeScreen } from '../screens/onboarding/JoinCodeScreen';
import { InvitePreviewScreen } from '../screens/onboarding/InvitePreviewScreen';
import { SignInScreen } from '../screens/onboarding/SignInScreen';
import { MeetFamilyScreen } from '../screens/onboarding/MeetFamilyScreen';
import { NameFamilyScreen } from '../screens/onboarding/NameFamilyScreen';
import { OnboardingPhotoScreen } from '../screens/onboarding/OnboardingPhotoScreen';
import { HowItWorksScreen } from '../screens/onboarding/HowItWorksScreen';
import { HowYouMoveScreen } from '../screens/onboarding/HowYouMoveScreen';
import { OnboardingInviteScreen } from '../screens/onboarding/OnboardingInviteScreen';
import { ReminderTimeScreen } from '../screens/onboarding/ReminderTimeScreen';
import { NotificationsPromptScreen } from '../screens/onboarding/NotificationsPromptScreen';
import { MilestoneScreen } from '../screens/MilestoneScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { StreakRulesScreen } from '../screens/StreakRulesScreen';
import { MoveMethodScreen } from '../screens/MoveMethodScreen';
import { NotificationsScreen } from '../screens/NotificationsScreen';
import { WorkoutDetailScreen } from '../screens/WorkoutDetailScreen';
import { NudgeModalScreen } from '../screens/NudgeModalScreen';
import { FamilyMembersScreen } from '../screens/FamilyMembersScreen';
import { InviteScreen } from '../screens/InviteScreen';
import { EditProfileScreen } from '../screens/EditProfileScreen';
import { LogTodayScreen } from '../screens/LogTodayScreen';
import { useApp } from '../state/AppState';
import { MainTabs } from './MainTabs';
import { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * Onboarding shows only when there's no saved session. Finishing it (or signing out)
 * changes which screens exist, and the stack moves over by itself.
 */
export function RootNavigator() {
  const { ready, session } = useApp();
  if (!ready) return null; // the animated splash covers the moment the session is read

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {session ? (
        <>
          <Stack.Screen name="Main" component={MainTabs} />
          <Stack.Screen name="Milestone" component={MilestoneScreen} options={{ presentation: 'modal' }} />
          <Stack.Screen name="Settings" component={SettingsScreen} options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="StreakRules" component={StreakRulesScreen} options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="MoveMethod" component={MoveMethodScreen} options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="WorkoutDetail" component={WorkoutDetailScreen} options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="FamilyMembers" component={FamilyMembersScreen} options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="Invite" component={InviteScreen} options={{ presentation: 'modal' }} />
          <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ presentation: 'modal' }} />
          <Stack.Screen name="LogToday" component={LogTodayScreen} options={{ presentation: 'modal' }} />
          <Stack.Screen
            name="Nudge"
            component={NudgeModalScreen}
            options={{ presentation: 'transparentModal', animation: 'fade' }}
          />
        </>
      ) : (
        <>
          <Stack.Screen name="Welcome" component={WelcomeScreen} />
          <Stack.Screen name="JoinCode" component={JoinCodeScreen} />
          <Stack.Screen name="InvitePreview" component={InvitePreviewScreen} />
          <Stack.Screen name="SignIn" component={SignInScreen} />
          <Stack.Screen name="MeetFamily" component={MeetFamilyScreen} />
          <Stack.Screen name="NameFamily" component={NameFamilyScreen} />
          <Stack.Screen name="OnboardingPhoto" component={OnboardingPhotoScreen} />
          <Stack.Screen name="HowItWorks" component={HowItWorksScreen} />
          <Stack.Screen name="HowYouMove" component={HowYouMoveScreen} />
          <Stack.Screen name="OnboardingInvite" component={OnboardingInviteScreen} />
          <Stack.Screen name="ReminderTime" component={ReminderTimeScreen} />
          <Stack.Screen name="NotificationsPrompt" component={NotificationsPromptScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}
