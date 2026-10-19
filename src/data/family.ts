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
    id: 'sam',
    name: 'Sam',
    streak: 24,
    today: 'kept',
    meta: 'Run · 5.2 km · 32 min · 6:21 AM',
    todayWorkoutId: 'sam-today',
    location: 'New York',
    relationship: 'You',
    photoUri: null,
  },
  {
    id: 'maya',
    name: 'Maya',
    streak: 12,
    today: 'still',
    meta: 'Still has today · usually evenings',
    relationship: 'Sister',
    photoUri: null,
  },
  {
    id: 'jo',
    name: 'Jo',
    streak: 31,
    today: 'kept',
    meta: 'Gym · 45 min · 12:45 PM',
    todayWorkoutId: 'jo-today',
    relationship: 'Brother',
    photoUri: null,
  },
];

/** Family Members screen order: join order. */
export const familyMembersList: Member[] = joined.map((m, i) => ({ ...m, color: memberColor(i) }));

export const members: Record<MemberId, Member> = Object.fromEntries(
  familyMembersList.map((m) => [m.id, m]),
);

/** Today's list order: whoever kept it first, then whoever still has today. */
export const familyOrder: MemberId[] = ['sam', 'jo', 'maya'];
export const familyList: Member[] = familyOrder.map((id) => members[id]);
export const currentUser = members.sam;

// ─── Workouts ────────────────────────────────────────────────────────────────
export const workouts: Record<string, WorkoutDetail> = {
  'sam-today': {
    id: 'sam-today',
    memberId: 'sam',
    type: 'run',
    source: 'health',
    when: 'Today · 6:21 AM',
    duration: '32 min',
    place: 'New York',
    note: 'Before work. Already tomorrow over here 🌏',
    cheeredBy: ['maya', 'jo'],
    comments: [],
    distance: '5.2 km',
    // A loop around the Central Park reservoir, already trimmed at both ends.
    route: [
      [40.7888, -73.9591], [40.7881, -73.9588], [40.7871, -73.9589], [40.786, -73.9594], [40.7849, -73.96],
      [40.784, -73.9608], [40.783, -73.9616], [40.7821, -73.9626], [40.7816, -73.9636], [40.7814, -73.9646],
      [40.7818, -73.9652], [40.7823, -73.9656], [40.783, -73.9658], [40.7838, -73.9659], [40.7848, -73.9657],
      [40.7859, -73.9653], [40.787, -73.9644], [40.7879, -73.9634], [40.7885, -73.9624], [40.7888, -73.9615],
      [40.789, -73.9606],
    ].map(([latitude, longitude]) => ({ latitude, longitude })),
  },
  'jo-today': {
    id: 'jo-today',
    memberId: 'jo',
    type: 'gym',
    source: 'manual',
    when: 'Today · 12:45 PM',
    duration: '45 min',
    note: 'Lunch session. Legs, unfortunately.',
    cheeredBy: ['sam'],
    comments: [],
  },
  'sam-yesterday': {
    id: 'sam-yesterday',
    memberId: 'sam',
    type: 'yoga',
    source: 'manual',
    when: 'Yesterday · 6:10 AM',
    duration: '20 min',
    note: 'Slow one on the balcony.',
    cheeredBy: ['maya'],
    comments: [],
  },
  'sam-fri': {
    id: 'sam-fri',
    memberId: 'sam',
    type: 'walk',
    source: 'health',
    when: 'Fri, Jun 28 · 6:42 AM',
    duration: '40 min',
    distance: '3.6 km',
    place: 'New York',
    cheeredBy: ['jo'],
    comments: [],
  },
};

// ─── Today ───────────────────────────────────────────────────────────────────
export const today = {
  dateLabel: 'Sunday, June 30',
  greeting: 'Good morning, Sam.',
  keptCount: 2,
  total: 3,
  /** The person who still has today (drives the "cheer her on" CTA). */
  pendingId: 'maya' as MemberId,
  cheerPrompt: 'Maya’s still got today',
  cheerCta: 'cheer her on',
};

// ─── Family Feed ─────────────────────────────────────────────────────────────
export const feed: FeedItem[] = [
  {
    id: 'f1',
    memberId: 'sam',
    kind: 'kept',
    title: 'Sam kept Day 24',
    meta: 'Run · 5.2 km · 32 min',
    time: '6:21 AM',
    cheer: 'Maya cheered: “Already tomorrow over here 🌏”',
    hearts: 4,
    workoutId: 'sam-today',
    route: workouts['sam-today'].route,
  },
  {
    id: 'f2',
    memberId: 'jo',
    kind: 'kept',
    title: 'Jo kept Day 31',
    meta: 'Gym · 45 min · checked in',
    time: '12:45 PM',
    cheer: 'Sam cheered: “machine 💪”',
    hearts: 3,
    workoutId: 'jo-today',
  },
  {
    id: 'f3',
    memberId: 'maya',
    kind: 'still',
    title: 'Maya still has today',
    meta: 'Usually moves in the evening · 5:30 PM',
    cheer: 'Go Maya 💪',
  },
];

// ─── This Week ───────────────────────────────────────────────────────────────
export const week = {
  headline: 'This week, your family moved 6 of 7 days.',
  summary: 'Sam kept the streak alive in New York. Maya still has today.',
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
    { dow: 'Mon', date: '24', state: 'kept', avatars: ['sam', 'maya', 'jo'] },
    { dow: 'Tue', date: '25', state: 'kept', avatars: ['sam', 'jo'] },
    { dow: 'Wed', date: '26', state: 'kept', avatars: ['sam', 'maya', 'jo'] },
    { dow: 'Thu', date: '27', state: 'kept', avatars: ['sam', 'jo'] },
    { dow: 'Fri', date: '28', state: 'kept', avatars: ['sam', 'maya'] },
    { dow: 'Sat', date: '29', state: 'freeze', avatars: ['sam'], badge: 'Freeze day' },
    { dow: 'Sun', date: '30', state: 'today', avatars: ['sam', 'jo'], badge: 'Today' },
  ] as WeekRow[],
};

// ─── Milestone ───────────────────────────────────────────────────────────────
export const milestone: MilestoneData = {
  memberId: 'sam',
  day: 30,
  title: 'Sam kept\n30 days',
  subtitle: 'A month of showing up, from New York.',
  motto: 'Every day forward, together.',
  dateLine: 'June 30 · streak still alive',
  cheeredBy: ['maya', 'jo'],
  photoUri: null,
};

/** The card at the end of "Your first 30 days together". */
export const familyMilestone: MilestoneData = {
  memberId: 'sam',
  day: 30,
  title: '30 days\ntogether',
  subtitle: 'Your first month, the whole family.',
  motto: 'Every day forward, together.',
  dateLine: 'June 30 · streak still alive',
  cheeredBy: ['maya', 'jo'],
  photoUri: null,
};

// ─── Profile / Me — Sam ──────────────────────────────────────────────────────
export const profile = {
  memberId: 'sam' as MemberId,
  location: 'New York, USA',
  stats: [
    { label: 'Current streak', value: '24', unit: 'days' },
    { label: 'Longest streak', value: '31', unit: 'days' },
    { label: 'Workouts this month', value: '31' },
    { label: 'Active days', value: '29', unit: 'of 30' },
  ] as ProfileStat[],
  recentWorkouts: [workouts['sam-today'], workouts['sam-yesterday'], workouts['sam-fri']] as RecentWorkout[],
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
