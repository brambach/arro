import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native';
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
  /** `returning`: an existing account signing in on a phone that hasn't been asked yet. */
  NotificationsPrompt: { returning?: boolean } | undefined;
  // The app: only in the stack once there is one.
  Main: NavigatorScreenParams<MainTabParamList> | undefined;
  /** family: the end of the first 30 days · personal: a run of `days` in a row on Me. */
  Milestone: { kind: 'family' } | { kind: 'personal'; days: number };
  Settings: undefined;
  StreakRules: undefined;
  MoveMethod: undefined;
  Notifications: undefined;
  WorkoutDetail: { workoutId: string };
  /** Every route one member has recorded, on one map. */
  Map: { memberId: string };
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
