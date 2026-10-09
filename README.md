# Arro

A daily workout streak for families who live apart. Everyone moves a little,
everyone sees it, and the family keeps one streak together. Any workout counts:
a walk, the gym, yoga, a swim, a run. Nobody's competing, and a walk counts the
same as a marathon.

Arro is about staying in touch in a healthy way: one moment a day, not a feed to
scroll. A missed day is never public ("Darcey still has today", never "Darcey
broke the streak"), there are no rankings, and nudges are capped.

Workouts will come from Apple Health or a manual "I moved today" check-in. Not
Strava: its API terms only allow showing a user's activity to that same user,
which rules out a family feed.

**Status:** a front-end prototype on **fake data only**. There's no backend,
sign-in, Apple Health or notifications yet. iPhone only for v1.

## Read next

- [`design/refactor-plan.md`](design/refactor-plan.md): decisions made and the build phases.
- [`design/market-research.md`](design/market-research.md): competitors, positioning and the healthy-contact rules.
- [`design/paid-plan.md`](design/paid-plan.md): how Arro will charge.

`design/Arro-Spec.html` and `design/Arro.dc.html` describe an older warm/serif
direction. The app's flat iOS look in `src/theme/` wins where they disagree.

## Run it

```bash
npm install
npx expo start         # scan the QR code with Expo Go, or press "i" for the iOS simulator
npx expo start --web   # quick look in a browser (react-native-web)
```

## Stack

- **Expo SDK 57** · React Native 0.86 · React 19 · TypeScript (strict)
- **React Navigation 7**: native-stack (Onboarding, Tabs, modals and pushed screens)
  with a custom bottom tab bar
- **react-native-svg**: logo, checks, icons, streak rings, the small route drawings in the feed
- **react-native-maps**: routes on Apple Maps (workout page and each person's map)
- **expo-image-manipulator**: shrinks photos before they upload
- **expo-linear-gradient**: photo overlays
- **expo-haptics**: cheer feedback
- System font only. Animations use React Native's built-in `Animated` API.

## Structure

```
App.tsx                 providers, navigation, animated splash
src/theme/              tokens.ts (colours, member palette, spacing, radii, shadows) · typography.ts
src/data/               types.ts · family.ts (ALL fake data) · workouts.ts (labels, helpers)
src/components/         AvatarRing, StreakRing, WorkoutCard, CheerButton, TabBar, Icons...
src/navigation/         RootNavigator · MainTabs · types
src/screens/            one file per screen below
```

## Screens

| Screen | File | Reach it via |
|---|---|---|
| Onboarding | `OnboardingScreen.tsx` | app launch, **Get started** enters the app |
| Today | `TodayScreen.tsx` | **Today** tab |
| This Week | `ThisWeekScreen.tsx` | **This Week** tab |
| Feed | `FeedScreen.tsx` | **Feed** tab |
| Me | `ProfileScreen.tsx` | **Me** tab |
| Workout detail | `WorkoutDetailScreen.tsx` | tap a kept post in Feed, or a recent workout on Me |
| Nudge | `NudgeModalScreen.tsx` | **Nudge** on Today, or tap someone who still has today |
| Family members | `FamilyMembersScreen.tsx` | Settings, **Family members** |
| Settings | `SettingsScreen.tsx` | gear icon on Me |
| Milestone | `MilestoneScreen.tsx` | the 30-day badge on Me |

## What's fake

- **Everyone's data**: members, streaks, workouts, feed, week, milestone, profile
  stats and settings all come from `src/data/family.ts`.
- **Workouts** are a mix of types (run, gym, yoga, walk) and sources (Apple Health,
  manual check-in). The route map only shows for a Health workout that has one.
- **Members** have string ids. Each gets a colour from `memberPalette` in
  `src/theme/tokens.ts`, in the order they joined.
- **Avatars and photos** are coloured initials and placeholders until a `photoUri`
  is set.
- **Interactions are local only**: cheers count up, "Get started"
  just enters the app, and Share, Invite and Edit profile do nothing yet.
- **The launcher icon** (`assets/icon.png`) is still the Expo template art.
