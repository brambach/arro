# Arro refactor plan

From the product review (positioning, design, UX, onboarding), October 2026.
This is a plan, not a spec. Check each library against the Expo SDK 57 docs
(https://docs.expo.dev/versions/v57.0.0/) before writing code for it.

## Decisions made

- **Arro is a family workouts streak app, not a running app.** It's a small,
  private place where a family shows up for each other every day. The streak is
  the reason to open it; the family is the reason to keep going. Any workout
  counts: walk, gym, yoga, swim, run.
- **A workout counts through Apple Health or a manual "I moved today" check-in.**
  Not Strava: since Nov 2024 Strava's API terms only allow showing a user's
  activity to that same user, which rules out a family feed.
- **Keep the current flat "clean native iOS" look** (`src/theme/tokens.ts`,
  `src/theme/typography.ts`). `Arro-Spec.html` and `Arro.dc.html` describe an
  older warm/serif direction and get updated to match, not the other way round.
- **Design onboarding for the invited family member first**, not the founder.

## Open decisions

1. **Backend.** Recommendation: Supabase (Postgres, Sign in with Apple, row-level
   security to keep each family private, edge functions to send pushes).
   Alternatives: Firebase, Convex.
2. **Family streak rule.** Recommendation: the family streak is the main number,
   and a day counts when everyone moved or used a freeze. Personal streaks are
   secondary. Starts when the second member joins.
3. **What counts as a workout.** Recommendation: any Health workout or any manual
   check-in, no minimum. Reconsider if it gets gamed.
4. **Freeze days.** Recommendation: one automatic freeze per person per week.
5. **"Today" across timezones.** Recommendation: each person's local calendar day.
6. **Platforms for v1.** Recommendation: iPhone only. Apple Health is iOS-only, and
   `supportsTablet: true` in `app.json` means iPad screenshots and iPad review.
7. **A domain** for invite links, the privacy policy and a simple landing page.

## Phase 0 - Clean up drift (Expo Go is fine)

- Rewrite `README.md`: new positioning, real screen list (Today, This Week, Feed,
  Me, Run detail, Nudge, Family members, Settings, Milestone).
- Remove the unused `@expo-google-fonts/literata` and `@expo-google-fonts/nunito`
  dependencies (nothing in `src/` imports them).
- Rename runs to workouts across the code:
  - `src/data/types.ts`: `RecentRun` -> `RecentWorkout`, `RunDetail` ->
    `WorkoutDetail`, add a `WorkoutType` (walk, run, gym, yoga, swim, ride, other)
    and `source: 'health' | 'manual'`.
  - `src/components/RunCard.tsx` -> `WorkoutCard.tsx`.
  - `src/screens/RunDetailScreen.tsx` -> `WorkoutDetailScreen.tsx`. The route map
    becomes optional (only for Health workouts that have a route); the default
    card shows type, duration, an optional photo and a note.
  - Profile stats: "Runs this month" -> "Workouts this month", "Total miles" ->
    "Active days" or "Total minutes".
- Copy: onboarding rows, "one run at a time" in `FeedScreen.tsx`, "1 run per day"
  in settings data, "One month running" in milestone data.
- Make family members data-driven: `MemberId` is currently the keys of
  `memberColors` in `tokens.ts`. Replace it with a string id and a member palette
  that gets assigned when someone joins.

## Phase 1 - Onboarding and family on local state (still fake backend)

New root flow in `src/navigation/RootNavigator.tsx`: show onboarding only when
there's no saved session, instead of `initialRouteName="Onboarding"` every launch.

Founder path:
1. Welcome: one line of positioning, "Start a family" / "I have an invite".
2. Sign in (stubbed until phase 2).
3. Name the family.
4. How you move: Apple Health (automatic) or check in by hand.
5. Invite (main step): share sheet with a prefilled message, link and a short
   join code. "I'll do it later" is secondary.
6. "When do you usually move?" morning / lunch / evening. This sets the reminder
   and the "usually evenings" line on Today. Then the notification pre-prompt.
7. Today in its waiting state.

Invitee path:
1. Link or code -> "Bryce invited you to join <family>" with member faces and
   the current family streak.
2. Sign in.
3. Optional photo. Colour assigned automatically.
4. How you move.
5. Reminder time and notification pre-prompt.
6. Today, with "Log today" as the main action.

Also in this phase:
- A **Log today** action on `TodayScreen.tsx`: workout type, optional duration,
  optional photo, optional note.
- **Empty and waiting states** on Today, Feed and This Week for a family of one
  and for invited-but-not-joined members. The "2 of 3 kept it today" card needs a
  version for 1 of 1.
- Wire up the dead controls: the "+" and "Invite a family member" in
  `FamilyMembersScreen.tsx`, "Edit profile" on `ProfileScreen.tsx`, "Sign out" in
  `SettingsScreen.tsx`.
- Explain freeze days and streak rules once, in onboarding and in Settings >
  Streak rules.

## Phase 2 - Backend and sign-in (needs a development build)

- Sign in with Apple via `expo-apple-authentication` (SDK 57: ~57.0.2), with
  `ios.usesAppleSignIn: true` in `app.json`.
- Tables: families, members (family, name, colour, photo, timezone, reminder
  time), invites (code, family, expiry), workouts (member, local date, type,
  duration, source, Health id for dedupe, photo, note), cheers, nudges.
- Row-level security so members only read their own family.
- Streak and freeze calculation on the server, per local day.
- In-app account deletion (App Store requirement) in Settings.
- Replace `src/data/family.ts` with data hooks. Keep the fake data as a preview
  family for App Review and for empty-state previews.

## Phase 3 - Apple Health

- Community module; none is first-party in Expo. Candidates to evaluate:
  `EvanBacon/apple-health` (hooks, background delivery) and
  `@appeeky/expo-healthkit` (says it's tested on SDK 57). Neither runs in Expo Go.
- Read workouts only. Ask for permission at the "How you move" step, with clear
  purpose text.
- Background delivery so a workout logged on a watch keeps the streak without
  opening Arro.
- Dedupe: one Health workout per Health id; a manual check-in and a Health workout
  on the same day count once.

## Phase 4 - Notifications

- `expo-notifications` (SDK 57: ~57.0.21), development build, APNs key via EAS.
- Send: someone cheered you; a family member joined; daily reminder at the chosen
  time if you haven't moved; a gentle evening "X still has today" nudge, at most
  once a day.
- No tab badges or red dots (keeps the existing spec rule).

## Phase 5 - Invite links

- iOS universal links need the domain, an `apple-app-site-association` file
  served over HTTPS, and `ios.associatedDomains` in `app.json`.
- Links don't survive an App Store install reliably, so every invite also carries
  a short code, and the welcome screen asks for it.

## Phase 6 - App Store

- `app.json`: add `ios.bundleIdentifier` (missing now), set `supportsTablet`
  per open decision 6, and add a Health usage description.
- Real launcher icon (`assets/icon.png` is still the Expo template).
- Privacy policy URL, App Privacy labels (health, photos, name, email).
- Review notes with a demo account that's already in a family, so the reviewer
  isn't stuck at the invite step.
- Screenshots: Today, Log today, Feed with cheers, a milestone card.
- EAS Build and Submit, then TestFlight with the family before public release.
