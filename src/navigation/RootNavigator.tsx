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
import { OnboardingInviteScreen } from '../screens/onboarding/OnboardingInviteScreen';
import { ReminderTimeScreen } from '../screens/onboarding/ReminderTimeScreen';
import { NotificationsPromptScreen } from '../screens/onboarding/NotificationsPromptScreen';
import { RhythmScreen } from '../screens/onboarding/RhythmScreen';
import { FamilyRulesScreen } from '../screens/FamilyRulesScreen';
import { HealthSettingsScreen } from '../screens/HealthSettingsScreen';
import { WallScreen } from '../screens/WallScreen';
import { AboutScreen } from '../screens/AboutScreen';
import { PlusSeamScreen } from '../screens/PlusSeamScreen';
import { UpdateRequiredScreen } from '../screens/UpdateRequiredScreen';
import { CantReachScreen } from '../screens/CantReachScreen';
import { palette } from '../theme/tokens';
import { MilestoneScreen } from '../screens/MilestoneScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { StreakRulesScreen } from '../screens/StreakRulesScreen';
import { TakeBreakScreen } from '../screens/TakeBreakScreen';
import { NotificationsScreen } from '../screens/NotificationsScreen';
import { SessionDetailScreen } from '../screens/SessionDetailScreen';
import { NudgeModalScreen } from '../screens/NudgeModalScreen';
import { FamilyMembersScreen } from '../screens/FamilyMembersScreen';
import { InviteScreen } from '../screens/InviteScreen';
import { EditProfileScreen } from '../screens/EditProfileScreen';
import { LogSessionScreen } from '../screens/LogSessionScreen';
import { DesignSheetScreen } from '../screens/dev/DesignSheetScreen';
import { useApp } from '../state/AppState';
import { MainTabs } from './MainTabs';
import { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * Dev builds can open straight onto a screen for captures:
 * EXPO_PUBLIC_DEV_SCREEN=DesignSheet npx expo start.
 */
const devStart = __DEV__ && process.env.EXPO_PUBLIC_DEV_SCREEN === 'DesignSheet' ? 'DesignSheet' : undefined;

/**
 * Onboarding shows only when there's no saved session. Finishing it (or signing out)
 * changes which screens exist, and the stack moves over by itself.
 */
export function RootNavigator() {
  const { ready, session, view } = useApp();
  if (!ready) return null; // the animated splash covers the moment the session is read
  // A build under app_config().min_ios_build gets one screen and nothing else.
  const updateRequired = !!session && !!view?.updateRequired;

  return (
    <Stack.Navigator
      // Birch behind every screen, so a push or a modal never shows a white frame.
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: palette.birch } }}
      initialRouteName={devStart}
    >
      {updateRequired ? (
        <Stack.Screen name="UpdateRequired" component={UpdateRequiredScreen} options={{ animation: 'fade' }} />
      ) : session ? (
        <>
          <Stack.Screen name="Main" component={MainTabs} />
          <Stack.Screen name="Milestone" component={MilestoneScreen} options={{ presentation: 'modal' }} />
          <Stack.Screen name="Settings" component={SettingsScreen} options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="StreakRules" component={StreakRulesScreen} options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="FamilyRules" component={FamilyRulesScreen} options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="HealthSettings" component={HealthSettingsScreen} options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="Wall" component={WallScreen} options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="About" component={AboutScreen} options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="Plus" component={PlusSeamScreen} options={{ presentation: 'modal' }} />
          <Stack.Screen name="TakeBreak" component={TakeBreakScreen} options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="SessionDetail" component={SessionDetailScreen} options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="FamilyMembers" component={FamilyMembersScreen} options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="Invite" component={InviteScreen} options={{ presentation: 'modal' }} />
          <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ presentation: 'modal' }} />
          <Stack.Screen name="LogSession" component={LogSessionScreen} options={{ presentation: 'modal' }} />
          <Stack.Screen
            name="Nudge"
            component={NudgeModalScreen}
            options={{ presentation: 'transparentModal', animation: 'fade' }}
          />
        </>
      ) : (
        <>
          <Stack.Screen name="Welcome" component={WelcomeScreen} options={{ animation: 'fade' }} />
          <Stack.Screen name="JoinCode" component={JoinCodeScreen} />
          <Stack.Screen name="InvitePreview" component={InvitePreviewScreen} />
          <Stack.Screen name="SignIn" component={SignInScreen} />
          <Stack.Screen name="MeetFamily" component={MeetFamilyScreen} />
          <Stack.Screen name="NameFamily" component={NameFamilyScreen} />
          <Stack.Screen name="Rhythm" component={RhythmScreen} />
          <Stack.Screen name="OnboardingPhoto" component={OnboardingPhotoScreen} />
          <Stack.Screen name="HowItWorks" component={HowItWorksScreen} />
          <Stack.Screen name="OnboardingInvite" component={OnboardingInviteScreen} />
          <Stack.Screen name="ReminderTime" component={ReminderTimeScreen} />
          <Stack.Screen name="NotificationsPrompt" component={NotificationsPromptScreen} />
        </>
      )}
      {__DEV__ ? (
        <>
          <Stack.Screen name="DesignSheet" component={DesignSheetScreen} options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="CantReach" component={CantReachScreen} options={{ animation: 'fade' }} />
        </>
      ) : null}
    </Stack.Navigator>
  );
}
