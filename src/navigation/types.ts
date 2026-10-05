import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';

export type RootStackParamList = {
  // Onboarding: only in the stack while there's no saved session.
  Welcome: undefined;
  JoinCode: undefined;
  InvitePreview: undefined;
  SignIn: undefined;
  MeetFamily: undefined;
  NameFamily: undefined;
  OnboardingPhoto: undefined;
  HowItWorks: undefined;
  HowYouMove: undefined;
  OnboardingInvite: undefined;
  ReminderTime: undefined;
  NotificationsPrompt: undefined;
  // The app: only in the stack once there is one.
  Main: undefined;
  Milestone: { kind?: 'family' } | undefined;
  Settings: undefined;
  StreakRules: undefined;
  MoveMethod: undefined;
  Notifications: undefined;
  WorkoutDetail: { workoutId: string };
  Nudge: { memberId?: string } | undefined;
  FamilyMembers: undefined;
  Invite: undefined;
  EditProfile: undefined;
  LogToday: { day?: 'today' | 'yesterday' } | undefined;
};

export type MainTabParamList = {
  Today: undefined;
  ThisWeek: undefined;
  Feed: undefined;
  Me: undefined;
};

export type RootStackScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<
  RootStackParamList,
  T
>;

export type MainTabScreenProps<T extends keyof MainTabParamList> = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, T>,
  NativeStackScreenProps<RootStackParamList>
>;

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
