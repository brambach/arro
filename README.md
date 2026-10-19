# Arro

A daily workout streak for families who live apart. Everyone moves a little,
everyone sees it, and the family keeps one streak together. Any workout counts:
a walk, the gym, yoga, a swim, a run. Nobody's competing, and a walk counts the
same as a marathon.

Arro is about staying in touch in a healthy way: one moment a day, not a feed to
scroll. A missed day is never public ("Darcey still has today", never "Darcey
broke the streak"), there are no rankings, and nudges are capped.

Workouts come from Apple Health or a manual "I moved today" check-in. Not
Strava: its API terms only allow showing a user's activity to that same user,
which rules out a family feed.

**Status:** in TestFlight. Sign in with Apple, families on a hosted Supabase
project, Apple Health, routes, photos and push notifications all work. iPhone
only for v1. The landing page is [arrofamily.com](https://arrofamily.com)
(source in `site/`).

## Read next

- [`design/refactor-plan.md`](design/refactor-plan.md): decisions made and the build phases.
- [`design/market-research.md`](design/market-research.md): competitors, positioning and the healthy-contact rules.
- [`design/paid-plan.md`](design/paid-plan.md): how Arro will charge.

`design/Arro-Spec.html` and `design/Arro.dc.html` describe an older warm/serif
direction. The app's flat iOS look in `src/theme/` wins where they disagree.

## Run it

```bash
npm install
npx expo start --web   # quick look in a browser, on local data (react-native-web)
npx expo run:ios       # a dev build on the simulator or a phone
```

Without `.env.local` (`EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`)
the app runs on a family kept on the phone. A release build without them refuses
to start. Builds for TestFlight: `design/app-store/testflight.md`.

## Checks

```bash
npm run typecheck      # TypeScript
npm test               # Jest: dates, Health sync and the screens' view model
supabase test db       # pgTAP: row-level security, streaks, invites, pushes (needs Docker)
```

GitHub Actions runs all three, plus `deno check` on the edge functions, on every
pull request.

## Stack

- **Expo SDK 57** · React Native 0.86 · React 19 · TypeScript (strict)
- **React Navigation 7**: native-stack (Onboarding, Tabs, modals and pushed screens)
  with a custom bottom tab bar
- **react-native-svg**: logo, checks, icons, streak rings, the small route drawings in the feed
- **react-native-maps**: routes on Apple Maps (workout page and each person's map)
- **expo-image-manipulator**: shrinks photos before they upload
- **expo-linear-gradient**: photo overlays
- **expo-haptics**: cheer feedback
- **Supabase**: Postgres with row-level security, Storage for photos, and edge
  functions in `supabase/functions` (`send-push`, `delete-account`, `remove-member`)
- **@appeeky/expo-healthkit**: reads workouts and routes from Apple Health
- Instrument Serif for headings, the system font for everything else.
  Animations use React Native's built-in `Animated` API.

## Structure

```
App.tsx                 providers, navigation, animated splash
src/theme/              tokens.ts (colours, member palette, spacing, radii, shadows) · typography.ts
src/data/               types.ts · family.ts (the preview family) · workouts.ts (labels, helpers)
src/state/              AppState (the app's state) · backend (every Supabase call) · buildView (the screens' data)
src/components/         AvatarRing, StreakRing, WorkoutCard, CheerButton, TabBar, Icons...
src/navigation/         RootNavigator · MainTabs · types
src/screens/            one file per screen below; onboarding/ for the first-run steps
supabase/               migrations, pgTAP tests, edge functions
site/                   arrofamily.com
design/                 visual direction, research, the paid plan, App Store material
```

## Screens

| Screen | File | Reach it via |
|---|---|---|
| Onboarding | `onboarding/*.tsx` | app launch: **Start a family** or **I have an invite** |
| Today | `TodayScreen.tsx` | **Today** tab |
| This Week | `ThisWeekScreen.tsx` | **This Week** tab |
| Feed | `FeedScreen.tsx` | **Feed** tab |
| Me | `ProfileScreen.tsx` | **Me** tab |
| Workout detail | `WorkoutDetailScreen.tsx` | tap a kept post in Feed, or a recent workout on Me |
| Nudge | `NudgeModalScreen.tsx` | **Nudge** on Today, or tap someone who still has today |
| Family members | `FamilyMembersScreen.tsx` | Settings, **Family members** |
| Settings | `SettingsScreen.tsx` | gear icon on Me |
| Milestone | `MilestoneScreen.tsx` | the 30-day badge on Me |
