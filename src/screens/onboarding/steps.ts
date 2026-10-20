import type { RootStackParamList } from '../../navigation/types';

export type Role = 'founder' | 'invitee';
export type StepRoute = keyof RootStackParamList;

/**
 * The two onboarding paths (spec, section 3, Onboarding). Welcome comes before
 * both and isn't counted. Screens read their place in the path from here, so
 * changing the order is a change to this list only.
 *
 * Founder, 8 with Welcome: Sign in, Name your family, Your rhythm (the family is
 * made here, with its rhythm), How the streak works, Invite, Reminders,
 * Notifications.
 *
 * Invitee: Join code, You're invited, Sign in, Meet the family (joins there),
 * Photo, How it works, Reminders, Notifications.
 *
 * No step anywhere shows Plus (spec, Paid tier, "Never shown").
 */
export const PATHS: Record<Role, StepRoute[]> = {
  founder: ['SignIn', 'NameFamily', 'Rhythm', 'HowItWorks', 'OnboardingInvite', 'ReminderTime', 'NotificationsPrompt'],
  invitee: [
    'JoinCode',
    'InvitePreview',
    'SignIn',
    'MeetFamily',
    'OnboardingPhoto',
    'HowItWorks',
    'ReminderTime',
    'NotificationsPrompt',
  ],
};

/** "3 of 7": where a screen sits on a path, for the step dots. Index is 1 based. */
export function stepOf(role: Role, screen: StepRoute): { index: number; total: number } {
  const path = PATHS[role];
  return { index: Math.max(1, path.indexOf(screen) + 1), total: path.length };
}

/** The screen after `screen` on this path (null at the end). */
export function nextAfter(role: Role, screen: StepRoute): StepRoute | null {
  const path = PATHS[role];
  const i = path.indexOf(screen);
  if (i < 0) return null;
  return path[i + 1] ?? null;
}

/** Every onboarding route, for the dev deep links. */
export const ONBOARDING_ROUTES: StepRoute[] = ['Welcome', ...new Set([...PATHS.founder, ...PATHS.invitee])];

/** Name your family's placeholders, one after another (spec). */
export const FAMILY_NAME_PLACEHOLDERS = ['Sunday sauna', 'The Lake House', 'Kiuas crew'];

/** Your rhythm's choices (spec): sessions a week and the shortest session that counts. */
export const GOAL_CHOICES = [2, 3, 4, 5];
export const MINUTE_CHOICES = [5, 10, 15, 20];
