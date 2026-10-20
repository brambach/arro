import { describe, expect, it } from '@jest/globals';
import { FAMILY_NAME_PLACEHOLDERS, GOAL_CHOICES, MINUTE_CHOICES, ONBOARDING_ROUTES, PATHS, nextAfter, stepOf } from '../steps';

describe('onboarding steps', () => {
  it('founder path: sign in, name, rhythm, rules, invite, reminders, notifications (8 with Welcome)', () => {
    expect(['Welcome', ...PATHS.founder]).toEqual([
      'Welcome',
      'SignIn',
      'NameFamily',
      'Rhythm',
      'HowItWorks',
      'OnboardingInvite',
      'ReminderTime',
      'NotificationsPrompt',
    ]);
  });

  it('invitee path: code, invited, sign in, meet, photo, rules, reminders, notifications', () => {
    expect(PATHS.invitee).toEqual([
      'JoinCode',
      'InvitePreview',
      'SignIn',
      'MeetFamily',
      'OnboardingPhoto',
      'HowItWorks',
      'ReminderTime',
      'NotificationsPrompt',
    ]);
  });

  it('never routes to Plus anywhere in onboarding', () => {
    expect(ONBOARDING_ROUTES).not.toContain('Plus');
    expect([...PATHS.founder, ...PATHS.invitee]).not.toContain('Plus');
  });

  it('walks each path in order and ends', () => {
    for (const role of ['founder', 'invitee'] as const) {
      const path = PATHS[role];
      path.forEach((screen, i) => expect(nextAfter(role, screen)).toBe(path[i + 1] ?? null));
    }
    expect(nextAfter('founder', 'JoinCode')).toBeNull();
  });

  it('says where a screen sits, 1 based', () => {
    expect(stepOf('founder', 'SignIn')).toEqual({ index: 1, total: 7 });
    expect(stepOf('founder', 'Rhythm')).toEqual({ index: 3, total: 7 });
    expect(stepOf('invitee', 'NotificationsPrompt')).toEqual({ index: 8, total: 8 });
    // Shared screens read their own path.
    expect(stepOf('invitee', 'HowItWorks')).toEqual({ index: 6, total: 8 });
  });

  it('offers the spec choices', () => {
    expect(GOAL_CHOICES).toEqual([2, 3, 4, 5]);
    expect(MINUTE_CHOICES).toEqual([5, 10, 15, 20]);
    expect(FAMILY_NAME_PLACEHOLDERS).toEqual(['Sunday sauna', 'The Lake House', 'Kiuas crew']);
  });
});
