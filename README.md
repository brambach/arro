# Arro

A warm, private running-streak ritual for families. Each member eventually connects
Strava; for now this is a **static, high-fidelity front-end prototype** running on
**fake data only** — no backend, no auth, no Strava, no database.

> Design source of truth: `Arro Spec.html` (tokens, components, motion) and
> `Arro.dc.html` (locked visual frames). This app translates those, it does not redesign them.

## Run it

```bash
npm install         # already run during setup
npx expo start      # then press "i" for the iOS simulator (or "a" for Android)
# or go straight to a simulator:
npx expo start --ios
```

Requires the Expo Go app (or a dev build) / an iOS Simulator or Android emulator.

## Stack

- **Expo SDK 57** · React Native 0.86 · React 19 · TypeScript
- **React Navigation 7** — native-stack (Onboarding → Tabs → Milestone modal / Settings)
  with a fully custom bottom tab bar
- **react-native-svg** — logo, checks, tab icons, conic streak rings
- **expo-linear-gradient** — buttons, avatars, hero bands, photo overlays
- **@expo-google-fonts/literata + /nunito** — the two type families from the spec
- Animations use the built-in RN `Animated` API (no Reanimated)

## Structure

```
App.tsx                 fonts + providers + navigation
src/theme/              tokens.ts (colors/spacing/radii/shadows) · typography.ts
src/data/               types.ts · family.ts  ← ALL fake data lives here
src/components/         11 spec components + helpers (Screen, Card, Toggle, Icons, motion)
src/navigation/         RootNavigator · MainTabs · types
src/screens/            Onboarding · Today · Trail · Feed · Milestone · Profile · Settings
```

## Screens (mapped to the locked design frames)

| Screen | Frame | Reach it via |
|---|---|---|
| Onboarding / Connect Strava | 1a | app launch → **Connect Strava** enters the app |
| Today / Family Home | 2a + 2c | **Today** tab |
| Weekly Recap / Trail | 3a | **Trail** tab |
| Activity Feed | 4a | **Feed** tab |
| Profile / Me | 5a | **Me** tab |
| Milestone Photo Card | 6b | tap the highlighted (checked) feed card, or a reached milestone badge on Profile |
| Settings | 7a | gear icon, top-right of Profile |

## Reusable components (Spec §8)

`AvatarRing` · `StreakRing` · `MemberRow` · `RunCard` · `CheerBar` (+ `CheerButton`) ·
`DayPill` · `SectionHeader` · `PrimaryButton` · `TabBar` · `MilestoneShareCard` · `WeeklyRecapCard`

## What's intentionally fake / static

- **Everyone's data** — members, streaks, runs, feed, week, milestone, profile stats, and
  settings all come from `src/data/family.ts`.
- **Avatars** are colored-initials placeholders. Every avatar accepts an optional
  `photoUri`; set it (in `family.ts` / component props) and real photos appear with no
  refactor.
- **Milestone/Trail photos** render a warm placeholder until a real `photoUri` is supplied.
- **Interactions are optimistic-only**: cheer chips/buttons increment locally, toggles flip
  locally, "Connect Strava" just enters the app, and Share/Manage are no-ops.
- **The launcher icon** (`assets/icon.png`) is still the Expo template art; the in-app Arro
  mark is the real one.

Everything is componentized so Strava/backend/auth can be layered in later without
rewriting the UI.
