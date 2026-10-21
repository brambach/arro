import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { TimerResult } from '../state/timer';
import type { WallWood } from '../data/types';
import type { AppIconName, TimerFace } from '../state/look';

/** A frame on screen, in window coordinates. */
export type DoorFrame = { x: number; y: number; width: number; height: number; radius: number; tone: 'ember' | 'char' };

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
   * The Plus sheet (src/screens/PlusSheetScreen.tsx). `focus` opens it at a
   * feature or the tip jar. `wood`, `face` or `icon`: what was being tried on
   * ("Keep this wood with Plus"), kept once the purchase lands.
   */
  Plus: { focus?: PlusFocus; wood?: WallWood; face?: TimerFace; icon?: AppIconName } | undefined;
  /** Me > Timer face: pick one, or try a Plus face on. */
  TimerFace: undefined;
  /** Me > App icon: pick one, or try a Plus icon on. */
  AppIcon: undefined;
  /** Week > See every week (Plus): the whole wall, back to the first week. */
  EveryWeek: undefined;
  /** Me > Heat log (Plus): the family's stats. Without Plus, a blurred preview. */
  HeatLog: undefined;
  /** Week > Print the wall (Plus): the wall poster, to save or print. */
  Poster: undefined;
  /** app_config().min_ios_build is above this build: the only screen. */
  UpdateRequired: undefined;
  /** Dev builds only: the release-only "can't reach Saunafam" screen, for captures. */
  CantReach: undefined;
  StreakRules: undefined;
  /** Settings > Take a break ("Pause me"). */
  TakeBreak: undefined;
  Notifications: undefined;
  /** A session by its anchor id (any row id works too). `reply` opens with the comment field ready. */
  SessionDetail: { sessionId: string; reply?: boolean };
  /** The logger changes a session's details (M9). */
  EditSession: { sessionId: string };
  /** A past week from Week: who went, and on which days (M9). */
  PastWeek: { weekStart: string };
  Nudge: { memberId?: string } | undefined;
  FamilyMembers: undefined;
  Invite: undefined;
  EditProfile: undefined;
  /**
   * The log form: blank, for yesterday, prefilled from the timer, or a refused
   * draft to fix (its client id).
   */
  LogSession:
    | {
        day?: 'today' | 'yesterday';
        fromTimer?: boolean;
        prefill?: TimerResult;
        draftId?: string;
        /** The 3-hour prompt's "Log it": the timer's minutes aren't real, so the form asks. */
        askTime?: boolean;
      }
    | undefined;
  /**
   * The timer room. `origin` is the frame (window coordinates) it grows from:
   * the Start button, or the slim timer bar. Without one it fades in.
   * `started`: this tap starts the timer, at `startAt` (the tap). The room starts
   * it once the door has landed, so Today doesn't redraw under the door.
   */
  Timer: { origin?: DoorFrame; started?: boolean; startAt?: string } | undefined;
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

/** Where the Plus sheet opens from, so it can start at that feature. */
export type PlusFocus = 'woods' | 'tips' | 'everyWeek' | 'poster' | 'heatLog' | 'timerFace' | 'appIcon' | 'card';
