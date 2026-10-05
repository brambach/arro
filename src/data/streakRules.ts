/** Streak and freeze rules. Shown once in onboarding and again in Settings > Streak rules. */
export const streakRules = [
  {
    title: 'One streak for the whole family',
    body: 'A day counts when everyone has moved or used a freeze. The streak starts when the second person joins.',
  },
  {
    title: 'Any movement counts',
    body: 'A walk, a class, a swim, or a tap on “I moved today”. No minimum, and nobody is ranked.',
  },
  {
    title: 'One freeze each',
    body: 'If you can’t move one day, your freeze covers it automatically. It comes back 7 days after you use it.',
  },
  {
    title: 'Today or yesterday',
    body: 'You can log today or yesterday, not older days. That keeps every day honest.',
  },
  {
    title: 'Days together never reset',
    body: 'Under the streak is a count of the days your family has moved together this year. A break never takes it back.',
  },
  {
    title: 'Your own day',
    body: 'Your day runs midnight to midnight where you are, so it works across time zones.',
  },
] as const;
