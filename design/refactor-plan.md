# Arro refactor plan

From the product review (positioning, design, UX, onboarding), October 2026.
This is a plan, not a spec. Check each library against the Expo SDK 57 docs
(https://docs.expo.dev/versions/v57.0.0/) before writing code for it. Read with
`design/market-research.md` (competitors, evidence, healthy-contact rules) and
`design/paid-plan.md` (how Arro charges).

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
- **Positioning: staying in touch with family in a healthy way.** The seven
  healthy-contact rules in `design/market-research.md` are product rules: no
  feed to scroll, no public shame for a missed day, no rankings, capped nudges,
  no red badges, private by design, easy to pause.
- **Backend: Supabase** (Postgres, Sign in with Apple, row-level security to keep
  each family private, edge functions to send pushes). Arro gets its own project
  in a new personal Supabase org on the free plan, not the existing `dervo-beta`
  one.
- **Family streak rule.** The family streak is the main number. A day counts when
  everyone moved or used a freeze. Personal streaks are secondary. The family
  streak starts when the second member joins.
- **What counts as a workout.** Any Health workout or any manual check-in, no
  minimum. Reconsider only if it gets gamed.
- **Freeze days.** One automatic freeze per person, used without asking on a
  missed day. It refills once a week: a freeze used on a day is back exactly 7
  days later (`private.freeze_refill_days()`, pinned by a test).
- **No backdating.** A workout can be logged for the member's own today or
  yesterday only, Health workouts included, so nobody can fill in an old day to
  repair a broken family streak. Enforced by the `workouts_check_date` trigger.
  A phone that's offline for more than a day loses its Health workouts from before
  yesterday.
- **A timezone can't be used to backdate.** Members set their own timezone, and
  the server can't tell where they really are, so the trigger also refuses any
  date before yesterday in UTC (migration `20261005000006`). The cost: a member
  west of UTC can't log "yesterday" in the hours when their local date is behind
  the UTC date (about 7pm to midnight in New York, 5pm to midnight in Los
  Angeles). Today is never affected. What's left: a member east of UTC who claims
  a timezone behind theirs can still reach up to a day past their real yesterday
  for part of the day. Closing that needs a trusted location, which the database
  doesn't have. Limiting how often the timezone can change was rejected: it
  wouldn't hold anything the floor doesn't.
- **"Today" across timezones.** Each person's own local calendar day.
- **The paid plan stays as is.** v1 free, then Arro Family ($39.99 a year per
  family) in the first update, as in `design/paid-plan.md`.
- **App Store name: "Arro: Family Move Streak".** Agreed, not yet reserved or
  cleared in App Store Connect.
- **Domain: arrofamily.com.** Agreed, not yet bought.
- **Apple Developer Program: an individual account.** The user's own name will be
  the App Store seller, and they're fine with that.
- **iPhone only for v1.** Set `ios.supportsTablet` to `false` in `app.json` so
  there's no iPad review or iPad screenshots.

## Open decisions

1. **A domain** for invite links, the privacy policy and a simple landing page.
   Agreed: arrofamily.com (Oct 2026). **Not bought yet.** See "Domain" below.
2. ~~**Freeze cadence.**~~ **Decided (Oct 2026): weekly.** One automatic freeze
   per person, back 7 days after it's used.
3. ~~**The paid plan.**~~ **Decided (Oct 2026): it stays as is.** v1 free, then
   Arro Family ($39.99 a year per family) in the first update
   (`design/paid-plan.md`).
4. ~~**The App Store name.**~~ **Decided (Oct 2026): "Arro: Family Move Streak".**
   "Arro" on its own is taken (a travel app, a taxi app, a credit card app), so it
   needs the suffix. **Not yet reserved:** nobody has checked that App Store
   Connect will accept it.

## Domain

Yes, a domain costs money, but not much: about $10.46 a year for a .com at
Cloudflare, which sells at cost. A .app is $8.20 the first year, then $14.20. The
Apple Developer Program ($99 a year) is the bigger cost.

What it's for:
- Invite links (universal links need an `apple-app-site-association` file on a
  domain Arro controls).
- The privacy policy and support URLs App Store Connect requires.
- A one-page landing site for the App Store listing.

**Free option:** a Vercel subdomain (`arro-something.vercel.app`) can serve the
association file, the privacy policy and a landing page. Vercel's own guide uses
`applinks:<name>.vercel.app`; it needs a `vercel.json` rule to serve the file as
JSON. The catch: moving to a real domain later breaks every invite link already
sent. Join codes would still work.

**Decision:** arrofamily.com, agreed in Oct 2026 but not bought yet. The name
it's built on is decided (open decision 4) and not yet reserved. It's the
cheapest part of the launch and it's in every invite your family gets. Until it's
bought, nothing in phases 0-4 needs it.

## Phase 0 - Clean up drift (Expo Go is fine)

- Rewrite `README.md`: new positioning, real screen list (Today, This Week, Feed,
  Me, Run detail, Nudge, Family members, Settings, Milestone).
- Remove the unused `@expo-google-fonts/literata` and `@expo-google-fonts/nunito`
  dependencies (nothing in `src/` imports them).
- `app.json`: `ios.supportsTablet: false` (iPhone only).
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
   the current family streak. Before sign-in the server only returns the family
   name and member count; names, faces and the streak come after sign-in
   (`preview_invite`).
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
- **Design for the day the streak breaks** (see the evidence in the market scan):
  - "Days together this year" under the family streak, a number that never
    resets. After a break, Today leads with it and the longest streak, never a 0.
  - A "Back at it, together" card on day 1 after a break. No copy says who missed.
  - A starter goal for every new family, "Your first 30 days together", with a
    milestone card at the end.
- **"I moved today" leads.** It's the first choice in "How you move" and the
  biggest button on Today. No other app in the market scan accepts it.
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
- Streak and freeze calculation on the server, per local day, plus "days together
  this year".
- A `family_plans` table (family, payer, product, status, expiry) that members
  can read and only the service role writes. It stays empty until phase 7, but
  having it now means the paid plan needs no schema change.
- In-app account deletion (App Store requirement) in Settings.
- Replace `src/data/family.ts` with data hooks. Keep the fake data as a preview
  family for App Review and for empty-state previews.
- The database spells it `colour` and the app's `Member` type spells it `color`;
  the hooks need to map between them.

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
- The evening nudge goes to people who already moved today, about family members
  who haven't, between 19:00 and 21:00 in the recipient's own zone (user's
  decision). pg_cron queues it every 15 minutes and calls `send-push` with the
  Vault secrets `project_url` and `anon_key` (migration 20261005000008).
- No tab badges or red dots (keeps the existing spec rule).

## Phase 5 - Invite links

- iOS universal links need the domain, an `apple-app-site-association` file
  served over HTTPS, and `ios.associatedDomains` in `app.json`.
- Links don't survive an App Store install reliably, so every invite also carries
  a short code, and the welcome screen asks for it.

## Phase 6 - App Store

- `app.json`: add `ios.bundleIdentifier` (missing now) and a Health usage
  description. `supportsTablet` is already `false` from phase 0.
- Reserve the App Store name "Arro: Family Move Streak" (open decision 4). Not
  done yet; App Store Connect may still refuse it.
- Real launcher icon. Done: option A, a clay tile with a paper "a"
  (`design/app-store/icon-options.md`).
- Privacy policy and support URLs, App Privacy labels (health, photos, name,
  email). Health data is never used for ads (Guideline 5.1.3).
- Review notes with a demo account that's already in a family, so the reviewer
  isn't stuck at the invite step.
- Screenshots: Today, Log today, Feed with cheers, a milestone card.
- EAS Build and Submit, then TestFlight with the family before public release.
- v1 ships free, with no in-app purchases (see `design/paid-plan.md`, Timing).

## Phase 7 - Arro Family (first update after launch)

Details in `design/paid-plan.md`.

- App Store Connect: Paid Applications Agreement, tax and banking, Small Business
  Program, one subscription group with annual ($39.99) and monthly ($5.99)
  products, a 7-day trial on the annual one.
- RevenueCat (`react-native-purchases`, development build), app user id = the
  Supabase user id, one `family` entitlement.
- An edge function for the RevenueCat webhook that writes `family_plans`.
- The paid features: history past the current month, monthly and yearly recaps,
  custom family goals, a second circle, alternate app icons.
- Our own paywall screen in the flat theme, with the disclosures and Restore
  Purchases button App Review requires.
- First paywall: the first monthly recap. Never in invitee onboarding or on a
  missed day.
