/**
 * ALL fake data for the Arro prototype. No backend, Apple Health, auth, or maps.
 * Workouts are a mix of types and sources: Apple Health or a manual check-in.
 */
import { memberColor } from '../theme/tokens';
import {
  FeedItem,
  Member,
  MemberId,
  MilestoneData,
  ProfileStat,
  RecentWorkout,
  WeekRow,
  WeekStripDay,
  WorkoutDetail,
} from './types';

/** Everyone in the family, in the order they joined. Colours are assigned from that order. */
const joined: Omit<Member, 'color'>[] = [
  {
    id: 'bryce',
    name: 'Bryce',
    streak: 24,
    today: 'kept',
    meta: 'Run · 5.2 km · 32 min · 6:21 AM',
    todayWorkoutId: 'bryce-today',
    location: 'Brisbane',
    relationship: 'You',
    photoUri: null,
  },
  {
    id: 'mom',
    name: 'Mom',
    streak: 12,
    today: 'still',
    meta: 'Still has today · usually evenings',
    photoUri: null,
  },
  {
    id: 'dad',
    name: 'Dad',
    streak: 31,
    today: 'kept',
    meta: 'Gym · 45 min · 12:45 PM',
    todayWorkoutId: 'dad-today',
    photoUri: null,
  },
  {
    id: 'grandma',
    name: 'Grandma',
    streak: 19,
    today: 'kept',
    meta: 'Walk · 25 min · 9:10 AM',
    todayWorkoutId: 'grandma-today',
    photoUri: null,
  },
];

/** Family Members screen order: join order. */
export const familyMembersList: Member[] = joined.map((m, i) => ({ ...m, color: memberColor(i) }));

export const members: Record<MemberId, Member> = Object.fromEntries(
  familyMembersList.map((m) => [m.id, m]),
);

/** Today's list order: whoever kept it first, then whoever still has today. */
export const familyOrder: MemberId[] = ['bryce', 'grandma', 'dad', 'mom'];
export const familyList: Member[] = familyOrder.map((id) => members[id]);
export const currentUser = members.bryce;

// ─── Workouts ────────────────────────────────────────────────────────────────
export const workouts: Record<string, WorkoutDetail> = {
  'bryce-today': {
    id: 'bryce-today',
    memberId: 'bryce',
    type: 'run',
    source: 'health',
    when: 'Today · 6:21 AM',
    duration: '32 min',
    place: 'Brisbane',
    note: 'Before work. Already tomorrow over here 🌏',
    cheeredBy: ['mom', 'dad', 'grandma'],
    distance: '5.2 km',
    // A loop through New Farm Park and along the river, already trimmed at both ends.
    route: [
      [-27.4648, 153.0466], [-27.4659, 153.0471], [-27.4668, 153.0478], [-27.468, 153.0483], [-27.469, 153.049],
      [-27.4702, 153.0496], [-27.4712, 153.0503], [-27.4719, 153.0511], [-27.4722, 153.052], [-27.4721, 153.0531],
      [-27.4718, 153.054], [-27.4711, 153.0547], [-27.47, 153.0552], [-27.469, 153.0551], [-27.468, 153.0548],
      [-27.4671, 153.0542], [-27.4662, 153.0535], [-27.4655, 153.0526], [-27.465, 153.0515], [-27.4645, 153.0505],
      [-27.4642, 153.0495],
    ].map(([latitude, longitude]) => ({ latitude, longitude })),
  },
  'dad-today': {
    id: 'dad-today',
    memberId: 'dad',
    type: 'gym',
    source: 'manual',
    when: 'Today · 12:45 PM',
    duration: '45 min',
    note: 'Lunch session. Legs, unfortunately.',
    cheeredBy: ['bryce', 'grandma'],
  },
  'grandma-today': {
    id: 'grandma-today',
    memberId: 'grandma',
    type: 'walk',
    source: 'manual',
    when: 'Today · 9:10 AM',
    duration: '25 min',
    note: 'Lovely morning for it.',
    cheeredBy: ['mom', 'dad'],
  },
  'bryce-yesterday': {
    id: 'bryce-yesterday',
    memberId: 'bryce',
    type: 'yoga',
    source: 'manual',
    when: 'Yesterday · 6:10 AM',
    duration: '20 min',
    note: 'Slow one on the balcony.',
    cheeredBy: ['mom'],
  },
  'bryce-fri': {
    id: 'bryce-fri',
    memberId: 'bryce',
    type: 'walk',
    source: 'health',
    when: 'Fri, Jun 28 · 6:42 AM',
    duration: '40 min',
    distance: '3.6 km',
    place: 'Brisbane',
    cheeredBy: ['grandma'],
  },
};

// ─── Today ───────────────────────────────────────────────────────────────────
export const today = {
  dateLabel: 'Sunday, June 30',
  greeting: 'Good morning, Bryce.',
  keptCount: 3,
  total: 4,
  /** The person who still has today (drives the "cheer her on" CTA). */
  pendingId: 'mom' as MemberId,
  cheerPrompt: 'Mom’s still got today',
  cheerCta: 'cheer her on',
};

// ─── Family Feed ─────────────────────────────────────────────────────────────
export const feed: FeedItem[] = [
  {
    id: 'f1',
    memberId: 'bryce',
    kind: 'kept',
    title: 'Bryce kept Day 24',
    meta: 'Run · 5.2 km · 32 min',
    time: '6:21 AM',
    cheer: 'Mom cheered: “So proud of you”',
    hearts: 4,
    workoutId: 'bryce-today',
    route: workouts['bryce-today'].route,
  },
  {
    id: 'f2',
    memberId: 'grandma',
    kind: 'kept',
    title: 'Grandma kept Day 19',
    meta: 'Walk · 25 min · checked in',
    time: '9:10 AM',
    cheer: 'Mom cheered: “Lovely morning for it!”',
    hearts: 3,
    workoutId: 'grandma-today',
  },
  {
    id: 'f3',
    memberId: 'dad',
    kind: 'kept',
    title: 'Dad kept Day 31',
    meta: 'Gym · 45 min · checked in',
    time: '12:45 PM',
    cheer: 'Bryce cheered: “Go Dad 💪”',
    hearts: 3,
    workoutId: 'dad-today',
  },
  {
    id: 'f4',
    memberId: 'mom',
    kind: 'still',
    title: 'Mom still has today',
    meta: 'Usually moves in the evening · 5:30 PM',
    cheer: 'Go Mom 💪',
  },
];

// ─── This Week ───────────────────────────────────────────────────────────────
export const week = {
  headline: 'This week, your family moved 6 of 7 days.',
  summary: 'Bryce kept the streak alive in Brisbane. Mom still has today.',
  /** Compact strip: 5 kept, 1 freeze (Sat), today (Sun). */
  strip: [
    { label: 'M', state: 'kept' },
    { label: 'T', state: 'kept' },
    { label: 'W', state: 'kept' },
    { label: 'T', state: 'kept' },
    { label: 'F', state: 'kept' },
    { label: 'S', state: 'freeze' },
    { label: 'S', state: 'today' },
  ] as WeekStripDay[],
  rows: [
    { dow: 'Mon', date: '24', state: 'kept', avatars: ['bryce', 'mom', 'dad', 'grandma'] },
    { dow: 'Tue', date: '25', state: 'kept', avatars: ['bryce', 'mom', 'dad', 'grandma'] },
    { dow: 'Wed', date: '26', state: 'kept', avatars: ['bryce', 'mom', 'dad', 'grandma'] },
    { dow: 'Thu', date: '27', state: 'kept', avatars: ['bryce', 'mom', 'dad', 'grandma'] },
    { dow: 'Fri', date: '28', state: 'kept', avatars: ['bryce', 'mom', 'dad', 'grandma'] },
    { dow: 'Sat', date: '29', state: 'freeze', avatars: ['bryce', 'dad', 'grandma'], badge: 'Freeze day' },
    { dow: 'Sun', date: '30', state: 'today', avatars: ['bryce', 'dad', 'grandma'], badge: 'Today' },
  ] as WeekRow[],
};

// ─── Milestone ───────────────────────────────────────────────────────────────
export const milestone: MilestoneData = {
  memberId: 'bryce',
  day: 30,
  title: 'Bryce kept\n30 days',
  subtitle: 'A month of showing up, from Brisbane.',
  motto: 'Every day forward, together.',
  dateLine: 'June 30 · streak still alive',
  cheeredBy: ['mom', 'dad', 'grandma'],
  photoUri: null,
};

/** The card at the end of "Your first 30 days together". */
export const familyMilestone: MilestoneData = {
  memberId: 'bryce',
  day: 30,
  title: '30 days\ntogether',
  subtitle: 'Your first month, the whole family.',
  motto: 'Every day forward, together.',
  dateLine: 'June 30 · streak still alive',
  cheeredBy: ['mom', 'dad', 'grandma'],
  photoUri: null,
};

// ─── Profile / Me — Bryce ────────────────────────────────────────────────────
export const profile = {
  memberId: 'bryce' as MemberId,
  location: 'Brisbane, Australia',
  stats: [
    { label: 'Current streak', value: '24', unit: 'days' },
    { label: 'Longest streak', value: '31', unit: 'days' },
    { label: 'Workouts this month', value: '31' },
    { label: 'Active days', value: '29', unit: 'of 30' },
  ] as ProfileStat[],
  recentWorkouts: [workouts['bryce-today'], workouts['bryce-yesterday'], workouts['bryce-fri']] as RecentWorkout[],
  milestones: [30, 20, 10, 7],
};

// ─── Settings ────────────────────────────────────────────────────────────────
export const settings = {
  connection: [
    { key: 'moving', label: 'How you move', value: 'Apple Health', icon: 'pulse' },
    { key: 'members', label: 'Family members', value: `${familyMembersList.length} members`, icon: 'users' },
    { key: 'rules', label: 'Streak rules', value: 'Move once a day', icon: 'target' },
    { key: 'notifications', label: 'Notifications', value: '', icon: 'bell' },
    { key: 'privacy', label: 'Privacy', value: 'Family only', icon: 'lock' },
  ],
  about: [
    { key: 'help', label: 'Help & FAQ', value: '', glyph: '?' },
    { key: 'about', label: 'About Arro', value: 'Version 1.0.0', glyph: 'i' },
  ],
};
