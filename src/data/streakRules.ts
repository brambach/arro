/**
 * The streak rules list, shown in onboarding and Settings > Streak rules
 * (spec, section 3, "Rules list"). Rule 2 and 3 follow the family's own rhythm.
 */
import { WeekStartsOn } from './types';

export interface StreakRule {
  title: string;
  body: string;
}

export interface RulesRhythm {
  goal: number;
  minMinutes: number;
  weekStartsOn: WeekStartsOn;
}

export const DEFAULT_RHYTHM: RulesRhythm = { goal: 3, minMinutes: 10, weekStartsOn: 1 };

/** The seven rules for a family's rhythm. */
export function streakRulesFor({ goal, minMinutes, weekStartsOn }: RulesRhythm): StreakRule[] {
  const sessions = goal === 1 ? '1 session' : `${goal} sessions`;
  const week = weekStartsOn === 7 ? 'Sunday to Saturday' : 'Monday to Sunday';
  return [
    { title: 'One streak', body: 'One streak for the whole family. It starts when the second person joins.' },
    {
      title: 'Your part',
      body: `Each of you does ${sessions} a week, ${minMinutes} minutes or more. Two in one day counts once.`,
    },
    { title: 'The week', body: `The week runs ${week}, in your own time zone.` },
    {
      title: 'One freeze',
      body: 'Everyone has one freeze. Miss a week and it’s used for you. It comes back after 4 weeks.',
    },
    {
      title: 'Breaks',
      body: 'Going away? Take a break. A break of 4 days or more in a week means that week doesn’t count against you.',
    },
    { title: 'Together', body: 'Sat together? One of you logs it for everyone.' },
    { title: 'No rankings', body: 'Nobody is ranked, and a missed week is never pinned on anyone.' },
  ];
}

/** The default rhythm's rules, for places that don't know the family yet. */
export const streakRules: StreakRule[] = streakRulesFor(DEFAULT_RHYTHM);
