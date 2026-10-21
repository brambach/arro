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
import { PlusSheetScreen } from '../screens/PlusSheetScreen';
import { TimerFaceScreen } from '../screens/TimerFaceScreen';
import { AppIconScreen } from '../screens/AppIconScreen';
import { EveryWeekScreen } from '../screens/EveryWeekScreen';
import { HeatLogScreen } from '../screens/HeatLogScreen';
import { PosterScreen } from '../screens/PosterScreen';
import { UpdateRequiredScreen } from '../screens/UpdateRequiredScreen';
import { CantReachScreen } from '../screens/CantReachScreen';
import { palette } from '../theme/tokens';
import { MilestoneScreen } from '../screens/MilestoneScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { StreakRulesScreen } from '../screens/StreakRulesScreen';
import { TakeBreakScreen } from '../screens/TakeBreakScreen';
import { NotificationsScreen } from '../screens/NotificationsScreen';
import { SessionDetailScreen } from '../screens/SessionDetailScreen';
import { EditSessionScreen } from '../screens/EditSessionScreen';
import { PastWeekScreen } from '../screens/PastWeekScreen';
import { NudgeModalScreen } from '../screens/NudgeModalScreen';
import { FamilyMembersScreen } from '../screens/FamilyMembersScreen';
import { InviteScreen } from '../screens/InviteScreen';
import { EditProfileScreen } from '../screens/EditProfileScreen';
import { LogSessionScreen } from '../screens/LogSessionScreen';
import { TimerScreen } from '../screens/TimerScreen';
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
 * The timer room and the log sheet draw their own entrances (the door, the
 * sheet's rise) over the screen that opened them, so their routes are
 * transparent and the stack doesn't animate them.
 */
const overScreen = { presentation: 'transparentModal', animation: 'none' } as const;

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
          <Stack.Screen name="Milestone" component={MilestoneScreen} options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
          <Stack.Screen name="Settings" component={SettingsScreen} options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="StreakRules" component={StreakRulesScreen} options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="FamilyRules" component={FamilyRulesScreen} options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="HealthSettings" component={HealthSettingsScreen} options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="Wall" component={WallScreen} options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="About" component={AboutScreen} options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="Plus" component={PlusSheetScreen} options={{ presentation: 'transparentModal', animation: 'none' }} />
          <Stack.Screen name="TimerFace" component={TimerFaceScreen} options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="AppIcon" component={AppIconScreen} options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="EveryWeek" component={EveryWeekScreen} options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="HeatLog" component={HeatLogScreen} options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="Poster" component={PosterScreen} options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="TakeBreak" component={TakeBreakScreen} options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="SessionDetail" component={SessionDetailScreen} options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="EditSession" component={EditSessionScreen} options={{ presentation: 'modal' }} />
          <Stack.Screen name="PastWeek" component={PastWeekScreen} options={{ presentation: 'transparentModal', animation: 'none' }} />
          <Stack.Screen name="FamilyMembers" component={FamilyMembersScreen} options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="Invite" component={InviteScreen} options={{ presentation: 'modal' }} />
          <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ presentation: 'modal' }} />
          <Stack.Screen name="LogSession" component={LogSessionScreen} options={overScreen} />
          <Stack.Screen name="Timer" component={TimerScreen} options={{ ...overScreen, gestureEnabled: false }} />
          <Stack.Screen
            name="Nudge"
            component={NudgeModalScreen}
            options={{ presentation: 'transparentModal', animation: 'none' }}
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
