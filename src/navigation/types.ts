import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { TimerResult } from '../state/timer';

export type RootStackParamList = {
  // Onboarding: only in the stack while there's no saved session.
  Welcome: undefined;
  JoinCode: undefined;
  InvitePreview: undefined;
  /** `returning`: from Welcome's "Sign in", for someone who already has an account (no name step). */
  SignIn: { returning?: boolean } | undefined;
  MeetFamily: undefined;
  NameFamily: undefined;
  /** Founder: Your rhythm (sessions a week, minimum, week start). Makes the family. */
  Rhythm: undefined;
  OnboardingPhoto: undefined;
  HowItWorks: undefined;
  OnboardingInvite: undefined;
  ReminderTime: undefined;
  /** `returning`: an existing account signing in on a phone that hasn't been asked yet. */
  NotificationsPrompt: { returning?: boolean } | undefined;
  // The app: only in the stack once there is one.
  Main: NavigatorScreenParams<MainTabParamList> | undefined;
  /** The due milestone (view.milestone), or a badge from Me. */
  Milestone: { kind: 'family' | 'personal'; weeks: number } | undefined;
  Settings: undefined;
  /** Settings > Family rules: the founder edits, everyone else reads. */
  FamilyRules: undefined;
  /** Settings > Apple Health. */
  HealthSettings: undefined;
  /** Settings > The wall: the wall wood (Plus woods only with plus_enabled). */
  Wall: undefined;
  /** Settings > About. */
  About: undefined;
  /**
   * The Plus sheet. M15 builds it; until then a placeholder screen stands in
   * (src/screens/PlusSeamScreen.tsx). `focus` opens it at a section.
   */
  Plus: { focus?: 'woods' | 'tips' | 'everyWeek' | 'poster' } | undefined;
  /** app_config().min_ios_build is above this build: the only screen. */
  UpdateRequired: undefined;
  /** Dev builds only: the release-only "can't reach Saunafam" screen, for captures. */
  CantReach: undefined;
  StreakRules: undefined;
  /** Settings > Take a break ("Pause me"). */
  TakeBreak: undefined;
  Notifications: undefined;
  /** A session by its anchor id (any row id works too). */
  SessionDetail: { sessionId: string };
  Nudge: { memberId?: string } | undefined;
  FamilyMembers: undefined;
  Invite: undefined;
  EditProfile: undefined;
  /**
   * The log form: blank, for yesterday, prefilled from the timer, or a refused
   * draft to fix (its client id).
   */
  LogSession: { day?: 'today' | 'yesterday'; fromTimer?: boolean; prefill?: TimerResult; draftId?: string } | undefined;
  /** Dev builds only: every token and component (src/screens/dev). */
  DesignSheet: undefined;
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
  namespace ReactNavigation {
    // React Navigation's documented way to type useNavigation(): an empty interface that extends the list.
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface RootParamList extends RootStackParamList {}
  }
}
