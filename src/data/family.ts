/**
 * ALL fake data for the Arro prototype lives here.
 * No backend, no Strava, no auth — every screen reads from these constants.
 * Values are transcribed from the setup brief + the locked frames in Arro.dc.html.
 */
import { memberColors } from '../theme/tokens';
import {
  FeedItem,
  KeptRun,
  Member,
  MemberId,
  MilestoneData,
  ProfileBadge,
  RecentRun,
  WeekDay,
} from './types';

export const members: Record<MemberId, Member> = {
  bryce: {
    id: 'bryce',
    name: 'Bryce',
    ...memberColors.bryce,
    streak: 24,
    today: 'kept',
    location: 'Brisbane',
    photoUri: null,
  },
  darcey: {
    id: 'darcey',
    name: 'Darcey',
    ...memberColors.darcey,
    streak: 12,
    today: 'kept',
    photoUri: null,
  },
  whit: {
    id: 'whit',
    name: 'Whit',
    ...memberColors.whit,
    streak: 31,
    today: 'kept',
    photoUri: null,
  },
};

/** Family in display order (host first). */
export const familyOrder: MemberId[] = ['bryce', 'darcey', 'whit'];
export const familyList: Member[] = familyOrder.map((id) => members[id]);

/** The signed-in person. */
export const currentUser = members.bryce;

// ─── Today ──────────────────────────────────────────────────────────────────
export const today = {
  dateLabel: 'Sunday · June 30',
  greeting: 'Good morning',
  keptCount: 3,
  total: 3,
  /** Members who've kept it today, in the order the Today screen lists them. */
  onTheBoard: ['bryce', 'whit', 'darcey'] as MemberId[],
  /** Members who still have today. */
  stillToday: [] as MemberId[],
};

/** One-line run summaries for the members who kept today. */
export const keptRuns: Record<string, KeptRun> = {
  bryce: { memberId: 'bryce', day: 24, meta: '3.2 mi sunrise run · Brisbane' },
  whit: { memberId: 'whit', day: 31, meta: '4.0 mi lunch run' },
  darcey: { memberId: 'darcey', day: 12, meta: '2.1 mi around the park' },
};

// ─── Activity Feed (frame 4a) ─────────────────────────────────────────────────
export const feed: FeedItem[] = [
  {
    id: 'f1',
    memberId: 'bryce',
    day: 24,
    detail: 'a 3.2 mi sunrise run along the Brisbane River',
    keptBadge: true,
    reactions: [
      { emoji: '👏', count: 4 },
      { emoji: '🔥', count: 3 },
      { emoji: '🧡', count: 6 },
      { emoji: '🏃', count: 2 },
    ],
  },
  {
    id: 'f2',
    memberId: 'whit',
    day: 31,
    detail: 'longest streak in the family right now',
    time: '5h',
    reactions: [
      { emoji: '🔥', count: 11 },
      { emoji: '👏', count: 7 },
      { emoji: '🏃', count: 3 },
    ],
  },
  {
    id: 'f3',
    memberId: 'darcey',
    day: 12,
    detail: 'a 2.1 mi loop around the park',
    time: '6h',
    reactions: [
      { emoji: '🧡', count: 4 },
      { emoji: '👏', count: 2 },
    ],
  },
];

// ─── Weekly Recap / Trail (frame 3a) ──────────────────────────────────────────
export const week = {
  range: 'Week of Jun 24 – 30',
  headline: 'Every day forward,\ntogether.',
  keptDays: 6,
  totalDays: 7,
  runsTogether: 17,
  quote: 'Nobody ran alone this week.',
  days: [
    { label: 'M', state: 'kept' },
    { label: 'T', state: 'kept' },
    { label: 'W', state: 'freeze' },
    { label: 'T', state: 'kept' },
    { label: 'F', state: 'kept' },
    { label: 'S', state: 'kept' },
    { label: 'S', state: 'today' },
  ] as WeekDay[],
};

// ─── Milestone Photo Card (frame 6b) ──────────────────────────────────────────
export const milestone: MilestoneData = {
  memberId: 'bryce',
  day: 30,
  title: 'Bryce kept\n30 days',
  subtitle: 'One month running in Brisbane 🌅',
  quote: 'Every day forward, together.',
  dateLine: 'June 30 · streak still alive',
  cheeredBy: ['whit', 'darcey'],
  photoUri: null,
};

// ─── Profile / Me (frame 5a) — Bryce ─────────────────────────────────────────
export const profile = {
  memberId: 'bryce' as MemberId,
  tagline: 'Running daily in Brisbane',
  currentStreak: 24,
  goal: 30,
  stats: [
    { value: 41, label: 'Longest streak' },
    { value: 128, label: 'Cheers received' },
    { value: 86, label: 'Total runs' },
  ],
  badges: [
    { day: 7, label: 'first week', reached: true },
    { day: 14, label: 'two weeks', reached: true },
    { day: 30, label: 'one month', reached: true },
    { day: 50, label: '26 to go', reached: false, toGo: 26 },
  ] as ProfileBadge[],
  recentRuns: [
    {
      title: 'Sunrise run · Kangaroo Point',
      meta: 'Today · 3.2 mi',
      day: 24,
      tint: ['#FFCF9E', '#F79A4E'],
    },
    {
      title: 'Riverside loop',
      meta: 'Yesterday · 2.8 mi',
      day: 23,
      tint: ['#CFE6D6', '#8FC7A2'],
    },
  ] as RecentRun[],
};

// ─── Settings (frame 7a) ─────────────────────────────────────────────────────
export const settings = {
  strava: { handle: 'bryce_runs', connected: true },
  family: { name: 'The Family', memberCount: 3, role: "you're the host" },
  rules: {
    minDistance: '1.0 mi',
    freezeDaysLeft: 2,
    dailyReminders: true,
  },
  notifications: {
    familyKeeps: true,
    someoneCheers: false,
  },
};
