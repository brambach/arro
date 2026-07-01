/**
 * ALL fake data for the Arro prototype. No backend, Strava, auth, or maps.
 * Values transcribed from the final "Arro Mockups.dc.html" direction.
 */
import { memberColors } from '../theme/tokens';
import {
  FeedItem,
  Member,
  MemberId,
  MilestoneData,
  ProfileStat,
  RecentRun,
  WeekRow,
  WeekStripDay,
} from './types';

export const members: Record<MemberId, Member> = {
  bryce: {
    id: 'bryce',
    name: 'Bryce',
    ...memberColors.bryce,
    streak: 24,
    today: 'kept',
    meta: '3.2 mi · Brisbane · 6:21 AM',
    location: 'Brisbane',
    relationship: 'You',
    photoUri: null,
  },
  whit: {
    id: 'whit',
    name: 'Whit',
    ...memberColors.whit,
    streak: 31,
    today: 'kept',
    meta: '4.0 mi · lunch loop · 12:45 PM',
    relationship: 'Brother',
    photoUri: null,
  },
  darcey: {
    id: 'darcey',
    name: 'Darcey',
    ...memberColors.darcey,
    streak: 12,
    today: 'still',
    meta: 'Still has today · usually evenings',
    relationship: 'Sister',
    photoUri: null,
  },
};

/** Family in display order (host first). */
export const familyOrder: MemberId[] = ['bryce', 'whit', 'darcey'];
export const familyList: Member[] = familyOrder.map((id) => members[id]);
export const currentUser = members.bryce;

// ─── Today ───────────────────────────────────────────────────────────────────
export const today = {
  dateLabel: 'Sunday, June 30',
  greeting: 'Good morning, Bryce.',
  keptCount: 2,
  total: 3,
  /** The person who still has today (drives the "cheer her on" CTA). */
  pendingId: 'darcey' as MemberId,
  cheerPrompt: 'Darcey’s still got today',
  cheerCta: 'cheer her on',
};

// ─── Family Feed ─────────────────────────────────────────────────────────────
export const feed: FeedItem[] = [
  {
    id: 'f1',
    memberId: 'bryce',
    kind: 'kept',
    title: 'Bryce kept Day 24',
    meta: '3.2 mi before work · Brisbane',
    time: '6:21 AM',
    cheer: 'Darcey cheered: “Already tomorrow over here 🌏”',
    hearts: 4,
  },
  {
    id: 'f2',
    memberId: 'whit',
    kind: 'kept',
    title: 'Whit kept Day 31',
    meta: '4.0 mi lunch loop',
    time: '12:45 PM',
    cheer: 'Bryce cheered: “machine 💪”',
    hearts: 3,
  },
  {
    id: 'f3',
    memberId: 'darcey',
    kind: 'still',
    title: 'Darcey still has today',
    meta: 'Usually an evening run · 5:30 PM',
    cheer: 'Go Darce 💪',
  },
];

// ─── This Week ───────────────────────────────────────────────────────────────
export const week = {
  headline: 'This week, your family moved 6 of 7 days.',
  summary: 'Bryce kept the streak alive in Brisbane. Darcey still has today.',
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
    { dow: 'Mon', date: '24', state: 'kept', avatars: ['bryce', 'darcey', 'whit'] },
    { dow: 'Tue', date: '25', state: 'kept', avatars: ['bryce', 'whit'] },
    { dow: 'Wed', date: '26', state: 'kept', avatars: ['bryce', 'darcey', 'whit'] },
    { dow: 'Thu', date: '27', state: 'kept', avatars: ['bryce', 'whit'] },
    { dow: 'Fri', date: '28', state: 'kept', avatars: ['bryce', 'darcey'] },
    { dow: 'Sat', date: '29', state: 'freeze', avatars: ['bryce'], badge: 'Freeze day' },
    { dow: 'Sun', date: '30', state: 'today', avatars: ['bryce', 'whit'], badge: 'Today' },
  ] as WeekRow[],
};

// ─── Milestone ───────────────────────────────────────────────────────────────
export const milestone: MilestoneData = {
  memberId: 'bryce',
  day: 30,
  title: 'Bryce kept\n30 days',
  subtitle: 'One month running in Brisbane.',
  motto: 'Every day forward, together.',
  dateLine: 'June 30 · streak still alive',
  cheeredBy: ['darcey', 'whit'],
  photoUri: null,
};

// ─── Profile / Me — Bryce ────────────────────────────────────────────────────
export const profile = {
  memberId: 'bryce' as MemberId,
  location: 'Brisbane, Australia',
  stats: [
    { label: 'Current streak', value: '24', unit: 'days', accent: true },
    { label: 'Longest streak', value: '31', unit: 'days' },
    { label: 'Runs this month', value: '18' },
    { label: 'Total miles', value: '86.4', unit: 'mi' },
  ] as ProfileStat[],
  recentRuns: [
    { memberId: 'bryce', when: 'Today · 6:21 AM', dist: '3.2 mi', place: 'Brisbane' },
    { memberId: 'bryce', when: 'Yesterday · 6:10 AM', dist: '3.0 mi', place: 'Brisbane' },
    { memberId: 'bryce', when: 'Fri, Jun 28 · 6:42 AM', dist: '3.1 mi', place: 'Brisbane' },
  ] as RecentRun[],
  milestones: [30, 20, 10, 7],
};

// ─── Settings ────────────────────────────────────────────────────────────────
export const settings = {
  connection: [
    { key: 'strava', label: 'Strava connection', value: 'Connected', icon: 'strava', tint: '#F26A1B' },
    { key: 'members', label: 'Family members', value: '3 members', icon: 'users', tint: '#4F97CF' },
    { key: 'rules', label: 'Streak rules', value: '1 run per day', icon: 'target', tint: '#4FA06B' },
    { key: 'notifications', label: 'Notifications', value: '', icon: 'bell', tint: '#E0654E' },
    { key: 'privacy', label: 'Privacy', value: 'Family only', icon: 'lock', tint: '#7B7FD0' },
  ],
  about: [
    { key: 'help', label: 'Help & FAQ', value: '', glyph: '?' },
    { key: 'about', label: 'About Arro', value: 'Version 1.0.0', glyph: 'i' },
  ],
};
