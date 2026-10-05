import { RootStackParamList } from '../../navigation/types';

type Role = 'founder' | 'invitee';

/** The onboarding order for each path. Screens read their place in it from here. */
const PATHS: Record<Role, (keyof RootStackParamList)[]> = {
  founder: ['SignIn', 'NameFamily', 'HowItWorks', 'HowYouMove', 'OnboardingInvite', 'ReminderTime', 'NotificationsPrompt'],
  invitee: [
    'JoinCode',
    'InvitePreview',
    'SignIn',
    'MeetFamily',
    'OnboardingPhoto',
    'HowItWorks',
    'HowYouMove',
    'ReminderTime',
    'NotificationsPrompt',
  ],
};

export function stepOf(role: Role, screen: keyof RootStackParamList): { index: number; total: number } {
  const path = PATHS[role];
  return { index: Math.max(1, path.indexOf(screen) + 1), total: path.length };
}

/** The screen after `screen` on this path (null at the end). */
export function nextAfter(role: Role, screen: keyof RootStackParamList): keyof RootStackParamList | null {
  const path = PATHS[role];
  return path[path.indexOf(screen) + 1] ?? null;
}
