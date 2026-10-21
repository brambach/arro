# Saunafam build 9: progress

The running memory for this build. Source of truth for what to build is
`design/saunafam-spec.md` (a copy of the spec). Update this file at the end of
every milestone: status, proof paths, decisions.

Branch: `feat/saunafam` (the brief names this branch; the spec's
`saunafam/build-9` is not used). Draft PR "Saunafam: build 9" against main.

## How to run the checks here

```bash
npm run typecheck
npm run lint                      # npx expo lint
npm test
supabase db start                 # or: supabase db reset, after changing migrations
scripts/test-db.sh                # pgTAP; see note below
DENO_NO_PACKAGE_JSON=1 deno check supabase/functions/*/index.ts
DENO_NO_PACKAGE_JSON=1 deno test --allow-read=supabase/functions supabase/functions/
```

- Docker here is Colima, which only mounts the home folder. The checkout lives
  under /tmp, so `supabase test db` can't see the test files ("no pgTAP tests
  found"). `scripts/test-db.sh` runs the same pg_prove image but copies the
  files into the container. CI still uses `supabase test db`.
- Local Supabase CLI is 2.117.0; CI pins 2.121.0.

## Milestones

| # | Status | Proof | Notes |
|---|---|---|---|
| M0 | done | `design/saunafam-lint-baseline.txt`, `design/saunafam-rename-list.txt` | baseline below |
| M1 | done (db track, branch `saunafam/db`) | `supabase/migrations/20261021000001_saunafam_families.sql`, `20261021000002_sessions.sql`, `supabase/tests/database/sessions.test.sql` (68 tests) | pgTAP 260/260 after M1. See "DB track" below |
| M2 | done (db track) | `supabase/migrations/20261021000003_weekly_streaks.sql`, `supabase/tests/database/weekly_streak.test.sql` (52 tests) | pgTAP 312/312. 12 members x 52 weeks: about 7 ms for the family summary, 7 ms for all member summaries |
| M3 | done (db track) | `supabase/migrations/20261021000004_session_social.sql`, `20261021000005_saunafam_pushes.sql`, `supabase/tests/database/saunafam_push.test.sql` (59 tests), `design/copy/notifications.md` | pgTAP 371/371 |
| M4 | done (db track) | `supabase/functions/remove-member/index.ts`, `delete-account/index.ts` (comments), `supabase/drafts/build10_cleanup.sql` | `deno check` clean. The cleanup draft was run inside a rolled-back transaction on the local database and goes through |
| M15-server | done (db track) | `supabase/migrations/20261021000006_saunafam_plus.sql`, `supabase/tests/database/plus.test.sql` (32 tests), `supabase/functions/revenuecat-webhook/`, `supabase/functions/sync-plus/`, `supabase/functions/_shared/plus.ts`, `delete-account` dry run, `docs/saunafam/API.md` | pgTAP 403/403 across 11 files. Deno: 48 tests pass. App half of M15 isn't this track |
| M15 | done, switched off (branch `saunafam/plus`) | `design/screenshots/saunafam/INDEX.md` ("Saunafam Plus", 46 screenshots), `design/recordings/saunafam/plus-preview-flow.mov`, `src/state/__tests__/plusFlow.test.ts`, `plusNever.test.ts`, `plusExtras.test.ts`, `design/copy/app-copy.md` ("Saunafam Plus") | Jest 382/382 in 29 suites. StoreKit recording not possible here (see M15 below). See M15 below |
| M5 | done (branch `saunafam/app`) | `src/state/__tests__/*.test.ts(x)`, `docs/saunafam/DATA-LAYER.md` | Jest 197/197 in 13 suites. Typecheck clean, lint clean in `src/state` and `src/data`. See M5 below |
| M13 | done (branch `saunafam/site`) | `design/screenshots/saunafam/site/`, `design/screenshots/saunafam/invite-link-preview.png`, `design/recordings/saunafam/site-first-load.mp4`, `design/lighthouse/*.json`, `site/worker.test.mjs` | Lighthouse 100/100/100/100 on all four pages, CLS 0. See M13 below |
| M12 docs | done (branch `saunafam/docs`) | `README.md`, `AGENTS.md`, `AUDIT.md` (note), the "Written for Arro" line on `design/market-research.md`, `paid-plan.md`, `refactor-plan.md`, `visual-direction.md`, `Arro-Spec.html`, `Arro.dc.html`, `design/app-store/icon-options.md` | Docs half of section 6 only. `CLAUDE.md` is just `@AGENTS.md`, so unchanged. See "M12 and M14 docs" below |
| M14 docs | done (branch `saunafam/docs`) | `design/app-store/listing.md`, `app-privacy.md`, `review-notes.md`, `screenshots.md`, `support.md`, `testflight.md`, `hosting.md`, `README.md`; `design/copy/app-copy.md` (skeleton) | Listing, age rating, privacy labels, products. Not the screenshot script (`scripts/` is the app track). Apple screenshot sizes changed: see below |
| M14 shots | done (branch `saunafam/shots`) | `design/app-store/screenshots/6.9/`, `6.3/`, `raw/`, `scripts/app-store-shots.mjs`, `scripts/app-store/capture.mjs` | Six framed, captioned screenshots at 1320 x 2868 and 1206 x 2622, size and alpha checked by the script. See "M14: App Store screenshots" below |
| M16 | done (branch `saunafam/review`) | `design/recordings/saunafam/m16/` (16 clips), `design/screenshots/saunafam/review/` (one per screen, 42), `docs/saunafam/review/` (6 stills, 2 clips), `src/dev/FpsProbe.tsx` | Every motion moment recorded on one fresh Debug build of the merged app, watched frame by frame, frame rates probed. Six fixes, each re-recorded. Jest 385/385 in 30 suites, lint 0. See "M16: self-review" below |

## M5: app data layer

Built on branch `saunafam/app` (worktree `/tmp/luna-arro/wt-app`). The guide for
the screen agents is `docs/saunafam/DATA-LAYER.md`.

**Checks:** `npm run typecheck` clean. `npm test`: 13 suites, 197 tests
(weeks 25, outbox 17, timer 19, buildView 62, plus and purchases 15, reminders
and taps 13, milestones 8, saunas and backend mapping 12, session storage 6,
AppState smoke 2, plus the old breaks, dates and joinCode suites). `npx eslint
src/state src/data` clean. `npx expo export` for iOS and web both build, and the
web build loaded in headless Chromium with a build 8 `arro.session.v1` seeded:
Today, Week, Feed and Me rendered with no console errors.

**Decisions**
- D5.1 `src/state/weeks.ts` mirrors the server's week rules on the phone. It
  makes the preview family's statuses and streaks from its sessions, and lets a
  session still in the outbox fill your dots at once. It uses one "today" for
  everyone, where the server uses each member's own zone. Real families always
  show the server's numbers plus your pending sessions for this week only.
- D5.2 No NetInfo. The outbox sends on launch, on coming back to the app, after
  any request that works, and on a timer for the next one due (backoff 5 s
  doubling to 5 minutes). A round stops at the first network failure.
  Refusals are `22023`, `23514`, `22P02`, `42501` (except "sign in first") and
  `P0001`; they become drafts in `saunafam.draft.v1`. Anything else retries.
- D5.3 Client ids come from `expo-crypto` `randomUUID()` (SDK 57, synchronous,
  v4), with a Math.random v4 fallback where the native module isn't there (Jest,
  old dev builds). `expo-localization` `getLocales()[0].temperatureUnit` exists in
  SDK 57 (`'celsius' | 'fahrenheit' | null`); null falls back to the region rule
  (US, Liberia, Myanmar get °F).
- D5.4 The preview runs on its own clock: Thursday of the real week at 4:10 PM
  (Monday 8:10 AM for `mondayOpen`), so screenshots match whatever day they're
  taken. 4:10 PM keeps "Log yesterday's" open in US zones. The timer scenarios
  use the real clock.
- D5.5 Without Supabase settings, a dev build shows the `family` preview
  scenario with your name on Sam, and every action works in memory. Arro's
  local-only family is gone.
- D5.6 `arro.session.v1` keeps its key and version. `normalizeSession` reads the
  build 8 shape: the reminder slot becomes a time (evening 18:30), days default
  to Thursday and Saturday, and `workouts`, `moveMethod` and `dismissedHealth`
  are dropped. Reminder days are kept on the phone only; the server has
  `reminder_time` but no days.
- D5.7 The family line on Today leaves you out (your slat is right above it) and
  anyone on a break or at 0. A person on a break has no tap action (nudges skip
  them on the server anyway). Tapping yourself opens your latest session.
- D5.8 Feed titles say "You" when you logged it and put "you" last when someone
  else did: "Maya, Jo and you had a sauna together". Pushes keep the server's
  order (logger, then join order).
- D5.9 Future weeks' reminders say the full goal ("3 to go this week"); only this
  week's count what's done. They're rebuilt on every refresh, and skip break days.
- D5.10 Milestones show only the highest one reached and file the lower ones
  away, so someone at 9 weeks on a new phone sees 8, not 4 then 8. Kept per
  member.
- D5.11 The quiet Plus card counts a "showing" from when it's first on screen
  until "Not now". Eligible from the Tuesday after the 8th counted family week;
  if the phone's 12 weeks don't reach that far back but the server's longest or
  this-year count is at least 8, it's eligible now.
- D5.12 `APP_BUILD = 9` in `src/state/appBuild.ts` is compared with
  `min_ios_build`, instead of reading `ios.buildNumber`, which is still 8 until
  the release PR. Keep both in step.
- D5.13 The tab route is still named `ThisWeek` because the design track's
  `TabBar` keys on it. WorkoutDetail became `SessionDetail { sessionId }`,
  LogToday became `LogSession { day?, fromTimer?, prefill?, draftId? }`, and
  Milestone takes optional `{ kind, weeks }`.
- D5.14 Jest gets AsyncStorage's in-memory mock for every suite
  (`jest.setup.ts`). `react-test-renderer` 19.2.3 and its types are dev
  dependencies now, for the AppState smoke test.
- D5.15 Health background delivery is off in `app.json`
  (`isBackgroundDeliveryEnabled: false`); the HealthKit permission strings are
  left for M11. `react-native-maps` is uninstalled.

**Not done / for others**
- Screens are plain text stand-ins (`src/screens/plain.tsx`). M8 to M10 replace
  them. `WorkoutCard`, `DayPill`, `AvatarStack` still read the legacy display
  types at the bottom of `src/data/types.ts`; drop those types with them.
- `saveMindfulMinutes` is a no-op until M11. `createPurchases()` returns the
  preview fake until M15.
- Not run against a live Supabase: `backend.ts` is type-checked against API.md and
  its row mapping is unit tested, but no RPC was called (this task doesn't own the
  local database). Not run on the simulator either.
- `App.tsx` still says "This build can't reach Arro" (M12).
| M9 | done (branch `saunafam/screens`) | `design/screenshots/saunafam/INDEX.md` (58 screenshots), `design/recordings/saunafam/today-arrival.mov`, `checkin.mov`, `week-kept.mov`, `milestone.mov`, `tabs.mov` | Today, Week, Feed, SessionDetail, Me, Milestone, Nudge in every state. Jest 222/222 in 18 suites. See M9 below |
| M6 | done (branch `saunafam/design`) | `design/brand/brand-sheet.png`, `design/screenshots/saunafam/design-sheet-1.png` to `-6.png` and `design-sheet-room.png`, `node scripts/check-contrast.mjs`, `src/theme/__tests__/theme.test.ts` | Löyly tokens, type, motion, haptics, components, Design sheet. See `docs/saunafam/DESIGN-SYSTEM.md` and M6/M7 notes below |
| M7 | done (branch `saunafam/design`) | `design/brand/icon-explorations.png`, `design/brand/icon-sizes.png`, `design/recordings/saunafam/splash-cold.mov`, `design/screenshots/saunafam/splash-1.png` to `-3.png`, `splash-reduce-motion.mov` | Icon, wordmark, asset pipeline, native splash, AnimatedSplash |
| M10 | done (branch `saunafam/onboarding`) | `design/screenshots/saunafam/onboarding-*.png`, `settings-*.png`, `sheet-*.png`, `update.png`, `cant-reach.png`, `invite.png` (listed in `INDEX.md`), `design/recordings/saunafam/onboarding.mov`, `design/copy/app-copy.md`, `src/screens/onboarding/__tests__/steps.test.ts`, `src/state/__tests__/settingsCopy.test.ts` | Jest 227/227 in 16 suites. See M10 below |
| M8 | done (branch `saunafam/timer`) | `design/screenshots/saunafam/timer-*.png`, `log-form*.png`; `design/recordings/saunafam/timer-start.mov`, `timer-finish.mov`, `timer-loyly.mov`, `timer-round.mov`, `timer-reduce-motion.mov`, `timer-background.mov`; `src/state/__tests__/logForm.test.ts`, `timerRoom.test.ts`, `sessionPhoto.test.ts` | Timer room ("the door closes"), log sheet, StartSessionButton, TimerBar. See M8 below |
| M11 | done (branch `saunafam/native`) | `design/screenshots/saunafam/health-*.png`, `notification-*.png`, `camera-*.png` (listed in `INDEX.md`); `design/recordings/saunafam/notification-tap-timer.mov`, `notification-tap-push.mov`; `src/state/__tests__/health.test.ts`, `localization.test.ts`, `src/navigation/__tests__/tapRoute.test.ts` | Write-only Health, notification taps, camera, units. Jest 304/304 in 26 suites. See M11 below |

## M0 baseline (untouched main, b68cd61)

- `npm run typecheck`: clean.
- `npm test`: 6 suites, 54 tests pass.
- pgTAP: 7 files, 192 tests pass.
- `deno check`: clean.
- Lint (new, `eslint-config-expo` flat config): 66 errors, 12 warnings on the
  old code, almost all React Compiler `react-hooks/refs` and
  `set-state-in-effect` rules in files the rebuild replaces. Recorded in
  `design/saunafam-lint-baseline.txt`; fixed as files are rewritten, and lint
  must be clean before the end.
- Rename search (`grep -rnw 'Arro'`): 311 lines, saved to
  `design/saunafam-rename-list.txt`.
- Xcode 26.6 and iPhone 17 / 17 Pro / 17 Pro Max simulators are available.
- No open PRs, and no branch has a `2026102*` migration, so the spec's six
  migration versions are free.

## Decisions

- D1. pgTAP is run with `scripts/test-db.sh` locally (see above).

## M13: landing page, join preview, privacy and support

Built on branch `saunafam/site` (worktree `/tmp/luna-arro/wt-site`), only in
`site/`, `design/app-store/privacy-policy.md` and the proof folders.

**Lighthouse mobile** (Lighthouse 12.8.2, `npx wrangler dev --local-upstream
localhost:8787`, headless Chrome for Testing 156):

| Page | Performance | Accessibility | Best Practices | SEO | CLS | LCP |
|---|---|---|---|---|---|---|
| `/` | 100 | 100 | 100 | 100 | 0 | 1.5 s |
| `/privacy/` | 100 | 100 | 100 | 100 | 0 | 1.4 s |
| `/support/` | 100 | 100 | 100 | 100 | 0 | 1.4 s |
| `/join/ABC23456` | 100 | 100 | 100 | 100 | 0 | 1.4 s |

**curl against wrangler dev:**

```
200  /
200  /privacy/
200  /support/
200  /join/ABC23456        (title "Join with code ABC23456 · Saunafam", og:title has the code)
301  /join/abc23456/       Location /join/abc23456
301  /join/?code=abc23456  Location /join/ABC23456
404  /nope
```

wrangler dev rewrites every request to one host and ignores the Host
header, so `curl -H 'Host: arrofamily.com'` can't show the redirect there.
`node --test site/worker.test.mjs` (12 pass) calls the fetch handler with
fake requests instead:
`https://arrofamily.com/privacy/` 301 to `https://saunafam.com/privacy/`,
`https://www.arrofamily.com/support/?a=1&b=2` 301 to
`https://saunafam.com/support/?a=1&b=2`, `http://arrofamily.com/join/ABC23456`
301 to `https://saunafam.com/join/ABC23456`, `www.saunafam.com` and plain
http 301 to the https apex, and the apex serves files.

**Proof**
- Screenshots, full page: `design/screenshots/saunafam/site/home-360.png`,
  `home-390.png`, `home-768.png`, `home-1280.png`, `home-1920.png`,
  `join-390.png`.
- First load: `design/recordings/saunafam/site-first-load.mp4` (6.8 s, 1280
  wide, 0.2 MB): still frame, the settle, then the wall landing.
- Link preview: `design/screenshots/saunafam/invite-link-preview.png`, drawn
  by `site/scenes/link-preview.mjs` from the og:title, og:image, og:url and
  twitter:card the Worker actually served for `/join/ABC23456`.
- Social cards: `site/public/og/home.png`, `site/public/og/join.png` (1200 x
  630), from `site/scenes/render-og.mjs`.
- Reduced motion checked in Playwright: every settle item at opacity 1 with
  no transform, the wall shown, no glow loop.

**Decisions**
- D13.1 No public TestFlight link exists anywhere in the repo or the old
  site. Join the TestFlight and Get the app point at
  `mailto:support@saunafam.com?subject=TestFlight%20invite` and carry
  `data-testflight`; `site/README.md` says how to swap them.
- D13.2 `font-display: optional` with a preload, so Fraunces never swaps
  late. CLS stays 0 even on a slow first visit (that visit keeps a
  Georgia fallback with matched metrics).
- D13.3 The headline is the still first frame and never moves; the sub line,
  buttons and phone settle (1100 ms, 70 ms apart) 200 ms after fonts and a
  painted frame. That keeps the LCP element painted at once.
- D13.4 The join page drops `noindex` (it cost the SEO score) and uses a
  canonical to `https://saunafam.com/join/` instead, so codes don't get
  indexed as separate pages.
- D13.5 The worker writes the code into the join page server side with
  HTMLRewriter, so previews show it without JS. The page no longer reads
  the code in JS.
- D13.6 Caps labels on the site use smoke `#55504A`, not stone: stone on
  birch is about 3:1, under WCAG AA for 12 px text.
- D13.7 Temporary favicon set (stone on birch) at the exact names the icon
  pipeline will overwrite. The header wordmark is Fraunces text in one
  `<a class="wordmark">` until `assets/brand/wordmark.svg` lands.
- D13.8 Supabase region on the privacy page says "the United States", as
  the Arro policy did; the spec marks the exact region unverified.

**Not done / for others**
- `design/app-store/support.md` still has Arro's text (outside this task's
  files). The live support page is new.
- Deploy, DNS, Email Routing for support@saunafam.com: Bryce's steps, in
  `site/README.md`.
## DB track (branch `saunafam/db`)

The app's data layer reads `docs/saunafam/API.md`, the exact reference for
every RPC, table, push kind and edge function this track adds.

### Decisions

- D2. `arro.test.sql` had one assertion on the old palette (a joiner gets
  `#4F97CF`). The palette changed per spec, so it now expects lake `#5F8794`.
  Still 192 tests in the old files, all passing. Existing members keep the
  color they have; only people who join from now on get Löyly colors. The app
  should render `members.colour` as stored.
- D3. `family_rules` gets its first row from a trigger on `families` (any
  insert, not only `create_family`), so `rule_for_week` always finds a rule.
  A Sunday-start family's first rule is dated 2000-01-02, the Sunday before
  the spec's 2000-01-03.
- D4. `set_family_rules` also updates `families.goal_per_week` and
  `min_minutes` straight away (they show the rhythm going forward). This
  week's goal for display comes from `member_week_streaks.goal`.
- D5. The unique index for `client_id` is on `(logged_by, client_id) where
  logged_by = member_id`. It picks the same rows as the spec's `shared_id is
  null or shared_id = id`, but can't trip while a cascade is half done
  (removing a logger nulls the others' `shared_id` and `logged_by` in
  separate steps).
- D6. `log_session` takes `p_client_id` last with a null default (Postgres
  needs defaults after the first default) and raises 22023 when it's null.
  A participant whose own date window doesn't allow the date is skipped like
  a duplicate. A retry returns the existing rows plus anyone in `p_with` who
  isn't in them as skipped. Output order: anchor, then `p_with` order.
- D7. `update_session(p_session_id, p_changes jsonb)`: only keys present
  change, and a JSON null clears an optional field. Typed optional args
  couldn't tell "leave it" from "clear it".
- D8. The sessions delete policy allows your own rows except an anchor that
  still has others on it, so a logger can't orphan the group by deleting the
  anchor row. They use `delete_session`. When the last other person leaves,
  a trigger turns the anchor back into a solo session.
- D9. The week containing `saunafam_started_on` is treated like a join week
  for everyone: it counts if kept and never breaks. Nobody can log a
  session until they have build 9, so making week one expected would break
  every tester family in its first week.
- D10. `member_weeks` also returns `min_minutes`, `paused_days` and `days`;
  `member_week_summary` adds `counted_dates`, `min_minutes`,
  `longest_personal_streak` and `last_week_status` (for "Did you sauna on
  Sunday?"). `family_weeks` adds `freeze_used`.
- D11. History is `family_week_history(p_family_id, p_weeks default 12)`:
  one row per member per past week, newest first. Others' `frozen` and
  `missed` read `not_kept`; only your own row names your freeze. The weeks
  count goes through `private.history_weeks_allowed`, which M15 replaces to
  clamp at 12 without Plus.
- D12. Added `my_session_stats(p_family_id)` for the Me grid (sessions this
  month, minutes this year, favorite type and place) so the app doesn't
  fetch a year of rows. `preview_invite` gains `week_streak`,
  `goal_per_week` and `min_minutes` at the end; `family_streak` keeps the
  daily number for build 8.
- D13. Dropping Arro's push triggers (spec, section 4.5) breaks the old tests
  that assert those pushes. Their functions stay until build 10, so
  `push.test.sql`, `review.test.sql` and `workout_pushes.test.sql` now
  re-attach the three triggers inside their own rolled-back transaction and
  keep testing them. `push.test.sql`'s nudge assertion expects the new copy,
  because build 9 replaces the nudge push for everyone. Still 192 tests in
  the old files.
- D14. Session pushes are queued from `log_session` itself
  (`private.after_session_logged`), not a row trigger, because the shared
  title needs every row in first. A retry with the same `client_id` pushes
  nothing.
- D15. `shared` for a session under the family minimum says "Tap to see it."
  instead of "It counts toward your week.", which would be false. Bryce
  should check that line.
- D16. The nudge cap counts nudges saved to that person in their own current
  week (the push is skipped past 2, the nudge is still saved, like quiet
  hours). Pinned-time tests go through `private.nudge_push_allowed`.
- D17. "Weekend check-in" needs a server switch, since the server sends it:
  `members.weekend_checkin boolean default true`, which members update on
  their own row.
- D18. Weekend push "on a break" means on a break today. "Can't still make
  it" is goal minus counted days greater than the days left in their own
  week, today included. People in their first week aren't named.
- D19. `remove-member` (M4): confirmed it empties the whole member folder
  `<family>/<member>/` with the service role. Session photos are written
  flat to the logger's own folder (`uploadPhoto` in `src/state/backend.ts`),
  so they're covered. The list isn't recursive, which is fine while the app
  never writes subfolders. Not run against a live Storage bucket here.
- D20. `build10_cleanup.sql` rewrites `preview_invite` so `family_streak`
  carries the weekly number (the daily functions go). Workout photos have to
  be deleted before `workouts` is dropped, from `workouts.photo_path`; the
  file says how.
- D21. Plus product ids are `saunafam.plus.annual` and
  `saunafam.plus.lifetime` (spec, App Store Connect steps), in
  `private.plus_*_product()` and `_shared/plus.ts`. The entitlement is `plus`.
- D22. `family_plus` (and `givesPlus` in TypeScript) also checks
  `expires_at` for `trial`, `active` and `grace_period`. The spec doesn't, but a
  payer who moves family sends no more events for the old family, so without
  it that family would keep Plus forever. It always returns one row, plus a
  `wall_wood` column that falls back to birch without Plus; the family's pick
  stays in `families.wall_wood` for when Plus comes back.
- D23. `set_wall_wood` without Plus raises `SF402`, a code of its own so the
  app can show the try-on instead of an error.
- D24. Webhook rules (`_shared/plus.ts`, `decide`): an event from the current
  payer and product applies unless it's older than `last_event_at`. Anything
  else only replaces the plan if it gives Plus: Founding family beats yearly,
  then the later `expires_at`. Another payer's cancel or expiry never touches
  the family. A refund is `CANCELLATION` with `cancel_reason`
  `CUSTOMER_SUPPORT` and becomes `expired` at once. A `trial` period_type is
  stored as `trial`. Tips (no `plus` entitlement) are logged only.
  `SUBSCRIPTION_EXTENDED` and `REFUND_REVERSED` count as active; the spec
  doesn't list them.
- D25. The event row goes into `plus_events` before it's applied (duplicate
  check). If applying fails, the row is deleted again and the webhook
  answers 500, so RevenueCat's retry gets processed.
- D26. `sync-plus` treats the RevenueCat subscriber record as an event that
  happened now and runs it through the same `decide`, so a late webhook older
  than the sync is ignored.
- D27. `delete-account` gets `{ "dryRun": true }`, which deletes nothing and
  answers `paysForPlus` and the plans. Only a yearly plan that will renew
  counts (Founding family never charges again).
- D28. `revenuecat-webhook` needs JWT checks off at the gateway, because
  RevenueCat sends its own Authorization value. Added
  `[functions.revenuecat-webhook] verify_jwt = false` to
  `supabase/config.toml`; deploy with `--no-verify-jwt`.

### RevenueCat docs checked (20 Oct 2026)

From https://www.revenuecat.com/docs/integrations/webhooks/event-types-and-fields
and https://www.revenuecat.com/docs/integrations/webhooks :

- Body is `{ api_version, event }`; `event.id` and `event_timestamp_ms` are
  reused on retries.
- Event types used: `INITIAL_PURCHASE`, `RENEWAL`, `CANCELLATION`,
  `UNCANCELLATION`, `NON_RENEWING_PURCHASE`, `EXPIRATION`, `BILLING_ISSUE`,
  `PRODUCT_CHANGE`, `TRANSFER`, `SUBSCRIPTION_EXTENDED`, `REFUND_REVERSED`.
  Logged only: `TEST`, `SUBSCRIPTION_PAUSED`, `TEMPORARY_ENTITLEMENT_GRANT`,
  `INVOICE_ISSUANCE`, `VIRTUAL_CURRENCY_TRANSACTION`, `EXPERIMENT_ENROLLMENT`,
  `PURCHASE_REDEEMED`, `PRICE_INCREASE_CONSENT_*`, `SUBSCRIBER_ALIAS`.
- Fields used: `app_user_id`, `original_app_user_id`, `aliases`,
  `product_id`, `new_product_id`, `entitlement_ids`, `period_type` (`TRIAL`),
  `expiration_at_ms`, `grace_period_expiration_at_ms` (only on
  `BILLING_ISSUE`), `cancel_reason`, `transferred_from`, `transferred_to`,
  `subscriber_attributes` (`{ name: { value, updated_at_ms } }`).
- Refunds: `CANCELLATION` with `cancel_reason` `CUSTOMER_SUPPORT`. That
  settles the spec's unverified point.
- Only a 200 counts as success; up to 5 retries over about 80 minutes; 60 s
  timeout.
- The docs say a dashboard-set authorization header is sent with every
  request, but not its exact header name. The function reads `Authorization`
  (as the spec says) and accepts a `Bearer ` prefix. Unverified until Bryce
  sends a test event.
- REST: `GET https://api.revenuecat.com/v1/subscribers/{app_user_id}` with
  `Authorization: Bearer <secret key>` gets or creates the customer.
  `subscriber_attributes` only come back with a secret key. The
  subscription fields used (`expires_date`, `period_type`,
  `unsubscribe_detected_at`, `billing_issues_detected_at`,
  `grace_period_expires_date`, `refunded_at`) and `non_subscriptions` are
  listed on the docs page, but their meanings and `period_type` values
  aren't defined there (`normal` is the example; `trial` is assumed).
  Whether a refunded Founding family purchase disappears from
  `non_subscriptions` isn't documented; the webhook's refund handling covers
  it either way, but a sync right after a refund might restore it.

### Not verified on the DB track

- The Supabase-backed store (`_shared/plusSupabase.ts`) and the deployed
  functions weren't run end to end: `supabase start` here only brings up the
  database (the other containers stay stopped under Colima), so there was no
  local PostgREST, Auth or edge runtime. The Deno tests run the handlers
  against an in-memory store. The `delete-account` dry run (an embedded
  `families(name)` select) is type-checked only.
- `remove-member` against a real Storage bucket (D19).
- Nothing touched the hosted project.
- Pre-existing Supabase CLI comments in `supabase/config.toml` contain em
  dashes and "rather"; left as generated.

## M12 and M14 docs (branch `saunafam/docs`)

Worktree `/tmp/luna-arro/wt-docs`. Only docs: `README.md`, `AGENTS.md`,
`AUDIT.md`, `design/app-store/`, `design/copy/app-copy.md`, the line on the
Arro design docs. `design/saunafam-rename-list.txt` and `site/` untouched.

### Apple's screenshot sizes (checked 20 October 2026)

Read from the raw page
https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications
(no last-updated date on it). **The screenshot script depends on this.**

- The page no longer uses inch sizes. The only iPhone set it lists as
  required: "At least one screenshot for iPhone with Dynamic Island (medium
  display)", which is iPhone 17 Pro, 17, 16 Pro and so on, at **1206 x 2622**
  or 1179 x 2556 portrait.
- **6.9 inch, 1320 x 2868** ("iPhone with Dynamic Island (large display)",
  iPhone 17 Pro Max) is accepted, with no requirement line. It's optional now.
- **6.5 inch, 1284 x 2778** ("iPhone with Face ID (large display)"): "Required
  if app runs on iPhone and screenshots for iPhone with Dynamic Island (large
  display) aren't provided". So not needed when a 6.9 inch set is uploaded.
- The medium set's own fallback note points at the 6.5 inch set, not the 6.9
  inch one, so a 6.9 inch set alone may not cover the required medium set.
- Up to 10 per size, .jpeg, .jpg or .png, no alpha channel.

**Decision DOC1:** `scripts/app-store-shots.mjs` should render
`design/app-store/screenshots/6.9/` at 1320 x 2868 (iPhone 17 Pro Max
captures) and `design/app-store/screenshots/6.3/` at 1206 x 2622 (iPhone 17
Pro captures), check exact sizes and no alpha, and skip 6.5 inch. This changes
the spec's Definition of done (6.9 and 6.5). Details in
`design/app-store/screenshots.md`.

### Apple's age rating (checked 20 October 2026)

Read "Set an app age rating" and "Age ratings values and definitions" in App
Store Connect Help. The questionnaire screens themselves weren't seen. Answers
in `design/app-store/listing.md`:

- In-app controls: Parental Controls No, Age Assurance No.
- Capabilities: Unrestricted Web Access No, **User-Generated Content Yes**,
  **Social Media No**, **Messaging and Chat Yes**, Advertising No.
- Medical or Wellness: Medical or Treatment Information None, **Health or
  Wellness Topics Yes**.
- Everything else None or No. Age Categories and Override: Not Applicable.
- Expected: **9+** (from Health or Wellness Topics; 4+ if Bryce answers No).
  Brazil self-rated A12 (Messaging and chat), Korea All, Vietnam 12+.
- Bryce should confirm the under-13 Default, Social Media No (Yes would make
  it 13+) and Health or Wellness Yes.

### RevenueCat privacy guidance (checked 20 October 2026)

https://www.revenuecat.com/docs/platform-resources/apple-platform-resources/apple-app-privacy
(no date on the page): Purchases > Purchase History is required, with **App
Functionality and Analytics** both ("All RevenueCat users must select these two
options"). User ID applies (the Supabase user id is the RevenueCat app user
id). Contact Info only if attributes hold contact details (Saunafam only sets
`family_id`). Device ID only with ad-identifier integrations. Usage Data only
alongside analytics SDKs. RevenueCat collects locale and currency code, which
it says isn't location. The page doesn't cover the SDK's privacy manifest, and
I didn't check it.

### Other checks (20 October 2026)

- Field limits from Apple's "Required, localizable, and editable properties":
  name 30, subtitle 30, promotional text 170, description 4000, keywords 100
  bytes (each keyword more than two characters), review notes 4000 bytes.
- In-app purchase limits from "In-App Purchase information": display name 2 to
  30, description 45, product id 100.
- App Review Guidelines, last updated October 16, 2026: 3.1.2(a) "ongoing
  value" and 3.1.2(c) subscription information, read. Schedule 2 of the
  license agreement not read.
- Apple's standard EULA, https://www.apple.com/legal/internet-services/itunes/dev/stdeula/
  , returns 200.

### Counted

- Subtitle "Your shared sauna streak": 24 of 30.
- Promotional text: 139 of 170.
- Keywords: 100 of 100 bytes, 14 keywords, none repeating a word from the name
  or subtitle.
- Description: 2,836 of 4,000 with the Plus section, 1,687 for build 9.

### Decisions

- DOC2 The description's Plus section and subscription terms are pasted only
  with the version that turns Plus on (Guideline 2.3.1). Build 9's
  description stops after "Apple Health, if you want it".
- DOC3 App Privacy keeps **Fitness** for session data (Arro declared it for
  check-ins; the spec's list doesn't name it). Health and Precise Location go.
  Purchase History is App Functionality and Analytics, per RevenueCat, not
  App Functionality only as the spec says.
- DOC4 Purchase History can go in with build 9 if the RevenueCat SDK is
  configured at launch even with Plus off. The app track should say which.
- DOC5 Display names and descriptions for the Founding family product and
  the three tips are mine (the spec gives the yearly one only), all within
  Apple's limits.
- DOC6 Subscription terms in the listing say "Settings app: tap your name,
  then Subscriptions" and "Apple Account", Apple's current names. The spec's
  Plus sheet copy says "Settings, Apple ID, Subscriptions", left as the spec
  wrote it in `app-copy.md`.
- DOC7 Plus is cosmetic, so Guideline 3.1.2(a) "ongoing value" is a review
  risk for the yearly plan. Noted in `listing.md` with the fallback (Founding
  family only).
- DOC8 `support.md` copies the live M13 support page word for word, plus
  drafts of the Plus answers for when Plus goes live.
- DOC9 The AGENTS.md "Current" paragraph names `feat/saunafam` and draft PR
  #24, not `release/build-9`.

### Not verified

- The App Store Connect forms themselves (screenshot slots, the age rating
  questionnaire wording). Only Bryce can see them.
- Whether "Saunafam" is free as an app name (the spec searched; I didn't).
- Anything in the build 9 app code: the labels in `review-notes.md` and
  `app-privacy.md` come from the spec, and each file lists what to check.
## M6 and M7 notes (design system, icon and splash)

Checks at the end of M7: typecheck clean; Jest 7 suites, 61 tests; lint 53
errors and 10 warnings, all in old files the screen rebuild replaces (66 errors
at M0), none in the files M6 and M7 own; `check-contrast` 26 of 26 pairs pass;
`check-design` clean on the files M6 and M7 own, and still reports
204 hits in 43 files (12 color, 178 spacing, 14 arrow) in old screens and components until they're rebuilt (run
`node scripts/check-design.mjs` for the list).

Decisions:

- D2. Text stone is `#6C665F`, not the spec's `#8A837A` (3.0:1 on birch, under
  AA for 13 pt meta). The spec value stays as `pebble`, for graphics only.
- D3. Avatar initials are pure white: the mockup's `#FBF8F3` is 2.97:1 on brass.
- D4. Ember is never text on light backgrounds; ember-colored text is coal. The
  active tab's icon is ember, its label coal. Moss and lake text only at 15 pt
  600 and up. Labels on aspen take smoke. All in `src/theme/contrast.ts`.
- D5. "Large text" in the contrast check is 18 pt and up, or 14 pt and up at
  weight 600 (SF Pro Semibold counted as bold).
- D6. Fraunces is instanced from the variable font with fontTools at optical
  size 48, SOFT 100, WONK 0, weights 400 and 600 (`scripts/brand/build-fonts.py`).
  PostScript names `FrauncesSoft-Regular` and `FrauncesSoft-SemiBold`. The
  variable source is in `assets/fonts/source/` (OFL), not bundled.
- D7. Fraunces has no `tnum`: `FixedDigits` puts each digit in a box the width
  of the widest digit (`src/theme/fontMetrics.ts`, generated).
- D8. Reanimated 4.5.1 with react-native-worklets 0.10.1 (SDK 57 lists both in
  its install command; `babel-preset-expo` configures the plugin, no babel
  config needed). Jest uses their mocks (`jest.setup.js`).
- D9. App icon: SDK 57 documents both `ios.icon` as `{ light, dark, tinted }`
  and an Icon Composer `.icon` folder. This ships `{ light, dark, tinted }`
  PNGs (`assets/brand/out/icon-*-1024.png`); there's no Icon Composer here to
  make a `.icon`. Light and dark are opaque RGB, tinted is grayscale on
  transparent.
- D10. Icon direction E (`scripts/brand/stone-icon.mjs`), after the
  coordinator's review of D. A river stone resting on a bench: irregular
  silhouette, one shoulder lower, a curved underside, a soft specular top
  left, speckle only over 60 px, the ember brightest in a thin rim under the
  stone and spilling onto the bench. Steam is two tapered warm-white wisps
  (wide at the base, fading to nothing), softly blurred over 60 px. Three
  masters by size: over 60 px `icon.svg` (stone about 59% of the tile),
  21 to 60 px `icon-small.svg` (about 74%, two short bold wisps), 20 px and
  under and the favicon `icon-tiny.svg` (about 77%, no wisps). The tinted
  master is one solid tone with lighter steps for the rim and steam, no
  outline ring. A to D stay in `design/brand/icon-explorations.png` for
  comparison. The splash's `StoneMark` reads the same outline and glow
  geometry (`src/components/brand/stonePath.ts`, generated).
- D11. The native splash is plain birch with a transparent image. The JS splash
  opens on plain birch and draws the mark in, so a native mark would vanish and
  reappear. expo-splash-screen needs an image to use the background color
  (without one its storyboard falls back to system white; seen in the first
  recording), hence `assets/brand/out/splash-transparent.png`.
- D12. The wordmark's letter-spacing settle moves each outlined letter with a
  transform on the UI thread (the same look as letter spacing).
- D13. The splash wisps fade with the mark's exit (1200 to 1800 ms) instead of
  drifting over the next screen: drifting on top, they crossed Welcome's buttons.
  The next screen's own Backdrop haze carries the steam on.
- D14. React Native SVG on iOS draws objectBoundingBox radial gradients as
  circles on non-square shapes, and draws rgba `stopColor` as black.
  `SoftEllipse` scales a unit circle instead, and all alpha goes in
  `stopOpacity`.
- D15. The spring for slats dropping onto the wall is `springs.slat`; haptics
  for it fire at the spring's first arrival (`springTouchdownMs`), not at rest.
- D16. Brand sheets render as HTML in headless Chrome (`scripts/render-brand.mjs`,
  Chrome for Testing from the Playwright cache, or `CHROME_PATH`), so body
  text is the real SF Pro without committing SF files.
- D18. `site/public` pages link `favicon.ico` and `favicon.svg` ahead of the
  48 px PNG (index, 404, privacy, join, support).
- D17. The splash recordings are from a Release build with a placeholder
  `EXPO_PUBLIC_SUPABASE_URL` (local) and anon key, so the release gate lets it
  start. No network call happens before sign-in. The dev client can't show the
  native splash: its own launcher and download bar come first.

Unverified or open:

- Reduce Motion: `xcrun simctl spawn <udid> defaults write com.apple.Accessibility
  ReduceMotionEnabled -bool true` works (the app sees it on relaunch, and iOS
  swaps its own launch zoom for a fade). Recorded in `splash-reduce-motion.mov`:
  the finished mark fades in over 250 ms, holds 500, crossfades out over 250.
  That recording found a bug: Reanimated's default jumps every animation to its
  end under Reduce Motion, crossfades included. `App.tsx` now sets
  `ReducedMotionConfig` to `Never`, since the app handles Reduce Motion itself.
- The returning-user path (a 400 ms fade straight into Today) wasn't recorded:
  it needs a signed-in session, and the simulator here has none.
- Dynamic Type, VoiceOver and Perf Monitor readings weren't checked in M6 and M7.
- Android: the adaptive icon layers are generated but not seen on a device.
- The Plus woods (cedar, alder, charred pine) are drawn but not tuned against a
  screen that uses them.
- The tinted icon is a grayscale guess at Apple's guidance; it wasn't seen in
  iOS's tinted home screen mode.

## M10: onboarding, Settings and the app copy

Built on branch `saunafam/onboarding` (worktree `/tmp/luna-arro/wt-onboarding`).

**Checks:** `npm run typecheck` clean. `npm test`: 16 suites, 227 tests (new:
`steps.test.ts` 6, `settingsCopy.test.ts` 17). ESLint clean in every file M10
wrote or rebuilt. `node scripts/check-design.mjs` clean on the same files.
`node scripts/check-contrast.mjs`: 26 of 26 pairs pass (no new pairs: every
new text sits on a pair already listed). `grep -rnP "[\x{2013}\x{2014}]" src
design/copy` finds nothing.

**What's built**
- Founder path (Welcome, Sign in, Name your family, Your rhythm, How the streak
  works, Invite, Reminders, Notifications) and invitee path (Join code, You're
  invited, Sign in, Meet the family, Photo, How it works, Reminders,
  Notifications), in `src/screens/onboarding/steps.ts`. One shell,
  `src/components/StepScreen.tsx`: back mark, steps as mini ember dots, Fraunces
  title, one settle arrival (heading, content, footer, 70 ms apart).
- Settings and every row in the spec table, on `src/components/SubScreen.tsx`:
  Family rules (new), Take a break, Family members, Streak rules,
  Notifications (days, time, Weekend check-in), Apple Health (new), The wall
  (new), Saunafam Plus rows (only with plus_enabled), Privacy, Help & FAQ,
  About (new screen), Sign out, Delete account, and the dev-only Prototype
  preview, Preview App Store and Design sheet.
- Edit profile, Invite and `InvitePanel` (message, code, `saunafam.com/join/<code>`
  as the share sheet's link).
- "Arro is now Saunafam" sheet (`src/components/RenamedSheet.tsx`, hosted by
  `src/navigation/AppOverlays.tsx`), Update required (`UpdateRequiredScreen`,
  the only route while `view.updateRequired`), "This build can't reach
  Saunafam" (`CantReachScreen`, used by `App.tsx`).
- New components: `Settle`, `StepScreen`, `SubScreen` (with `GroupLabel`,
  `GroupNote`), `ChoiceTiles`, `ChoiceList` (with `PickMark`), `DayPicker`,
  `TimeStepper`, `Toggle`-based `ToggleRow`, `Sheet`, `ConfirmSheet`,
  `RenamedSheet`, `NoticeScreen`, `splashSignal`.
- State: `src/state/settingsCopy.ts` (labels, break lengths, Plus lines, sheet
  copy), `src/state/healthSettings.ts` (the switch in `saunafam.health.v1` and
  the `healthBridge` seam for M11), `src/state/devTools.ts` (dev-only capture
  switches).

**Dev deep links (compiled out of release: `DevLinks` only renders and listens
under `__DEV__`)**, scheme `com.arrofamily.arro`:
`dev/onboarding/<Route>?role=founder|invitee&name=Sam&family=...&code=...&returning=1`,
`dev/screen/<Route>?preview=<scenario>`, `dev/sheet/renamed?as=founder|member`,
`dev/confirm/signOut|delete`, `dev/flags?apple=1&paysForPlus=1&member=1`,
`dev/reset`. iOS 26 asks "Open in Arro?" for each; the capture scripts tapped
Open.

**Decisions**
- D10.1 The family is made at Your rhythm, not Name your family, because
  `create_family` fixes the week start and Your rhythm comes after the name.
  Name your family only renames once the family exists. Coming back to Your
  rhythm after that saves the goal and minimum with `set_family_rules` and
  shows the week start as set (`AppState.saveRhythm`).
- D10.2 "Family means whoever you sauna with." is on Welcome, under the
  headline, so both paths see it exactly once.
- D10.3 The spec's invitee path says "9 steps" but lists 8; it's the 8 plus
  Welcome. Step dots count from the first step after Welcome (founder 7,
  invitee 8).
- D10.4 Welcome draws the stone and wordmark exactly where the splash leaves
  them and lifts them the same 8 pt on the same curve as the splash's exit, so
  the two copies stay on top of each other while the splash fades (the first
  recording showed a ghosted wordmark when Welcome's mark sat still). The
  headline and buttons settle in as the mark lifts (`AnimatedSplash` gained an
  `onExit` prop, fired at 1200 ms). On a short screen or at large type the mark
  moves up out of the way instead.
- D10.5 Confirms (sign out, delete, end break, remove member) are a designed
  sheet (`ConfirmSheet`), not the system alert. Sign out names a running timer
  and unsent sessions. The delete sheet shows the Plus payer warning first, in
  an aspen tray, from `checkBeforeDelete()`.
- D10.6 The wall row shows only with plus_enabled (spec: "Woods and faces don't
  appear at all" while it's off). The try-on and "Leave a tip" open the `Plus`
  route; `PlusSeamScreen` stood in until M15 replaced it (now `PlusSheetScreen`), same route name and
  params (`{ focus: 'woods' | 'tips' | 'everyWeek' | 'poster' }`).
- D10.7 Settings' Plus quiet lines (ended, Apple couldn't renew for the payer,
  a plan from someone who left ending within a week) come from
  `plusNotice()`; `view.plus` now carries `status`, `product`, `expiresAt` and
  `payerName` for it.
- D10.8 The rest of this week, one week and two weeks are worked out from
  `view.todayKey` (new in `AppView`), so the preview's Thursday and the real
  day never disagree. Lengths over the server limits stay in the list, marked
  "Over the limit right now". On a break, the length it has is picked and
  "Change my break" waits for a different one.
- D10.9 In the preview, Take a break, I'm back, Family rules and Weekend
  check-in now change the scenario's family in memory (`changePreviewFamily`
  in AppState), so every state can be reached and captured.
- D10.10 Reminder time is a stepper (15 minutes a tap, VoiceOver adjustable),
  not a wheel: there's no date picker package, and the stepper is one
  designed control. Days follow the family's week start.
- D10.11 Apple Health keeps its switch on the phone (`saunafam.health.v1`), off
  by default. Until M11 replaces `healthBridge`, turning it on says "On. This
  test build can't write to Health yet, so nothing has gone there."
- D10.12 Real bugs fixed in design-system components, both for Dynamic Type:
  `SolidButton` had a fixed height and a one-line label, so labels were cut
  off at the largest sizes (now `minHeight` and wrapping); `ListRow` cut titles
  with "..." and squeezed them beside the value (from 1.3x the title wraps and
  the value moves under it). `StepScreen` and `SubScreen` stop pinning their
  footer from 1.35x, and `ChoiceTiles` and `DayPicker` wrap into a grid.
- D10.13 Removed components nothing used any more: `OnboardingFrame`,
  `ChoiceRow`, `TextButton`, `TextField`, `FadeInView`, `StreakRing`,
  `SectionHeader`, `Chip`. The em dashes in the comments of the old
  `WorkoutCard`, `DayPill`, `CheerButton`, `PhotoSlot`, `PrimaryButton` and
  `AvatarRing` became spaced hyphens so the dash check is clean; those files
  keep their pre-existing lint and design hits until M9 retires them.

**Recording:** `design/recordings/saunafam/onboarding.mov` (17 s, 0.5 MB, 60
fps, 604 wide): cold start with the splash into Welcome, then Start a family,
Sign in (typing Sam), Name your family (typing Sunday sauna), Your rhythm. A
static stretch on Welcome was cut out. Watched at 20 fps around the splash
handoff and the first push: no white frame, no ghosted mark after D10.4, the
pushes are the native iOS 26 stack transition on birch. Taps and typing were
driven from the Mac (CGEvents into the Simulator window), so no finger is
shown.

**Not done / for others**
- Sign in with Apple can't complete in the simulator; its button is captured
  (`onboarding-founder-2-sign-in-apple.png`) with a dev switch.
- Nothing ran against a live Supabase: Your rhythm's `create_family` and
  `set_family_rules`, the delete dry run and `setWeekendCheckin` are only
  type-checked against API.md.
- Apple Health writes are M11 (`healthBridge`, `saveMindfulMinutes`).
- The Plus sheet, tip jar and try-on purchase are M15 (`PlusSeamScreen`).
- VoiceOver was not run end to end; labels and roles are set on every control
  and checked in code only.
- `settings-notifications*.png` show "Saunafam hasn't asked yet" because the
  simulator never granted notifications.
## M9: the main screens

Built on branch `saunafam/screens` (worktree `/tmp/luna-arro/wt-screens`).
Today, Week (route still `ThisWeek`), Feed, SessionDetail, Me, Milestone and
Nudge, plus three routes of my own: `EditSession`, `PastWeek` and a `Plus`
placeholder for M15 (`{ focus?: string }`: `everyWeek`, `poster`, `heatLog`,
`timerFace`, `appIcon`, `card`).

**Checks:** `npm run typecheck` clean. `npm test`: 18 suites, 222 tests (new:
`checkIn`, `healthOffer`, `milestoneLayout`, `useShownWhenFocused`, and 8 more
in `buildView`). `npx eslint` clean on every file M9 touched.
`node scripts/check-design.mjs` clean on them. `node scripts/check-contrast.mjs`:
27 of 27 pairs (one added: moss on birch for "Kept" in the past-week sheet).

**Proof:** `design/screenshots/saunafam/INDEX.md` lists every screen and state.
Recordings in `design/recordings/saunafam/`: `today-arrival.mov` (returning
launch into Today's arrival), `checkin.mov` (the log sheet closes, the third
dot ignites, the ring fills), `week-kept.mov` (dot, beat, ember fill, sparks,
"Week kept, together"), `milestone.mov` (wall builds, number arrives, steam),
`tabs.mov` (four tabs and a SessionDetail push and pop). Each under 600 KB.

**How the captures were made.** No taps in the Simulator here (no cliclick,
no accessibility access for AppleScript). `src/dev/DevDriver.tsx` polls a small
server on the Mac (`localhost:8099`) for commands: pick a scenario, go to a
route, scroll, log a session, cheer, press Send a nudge or Share. It's mounted
in `App.tsx` only when `__DEV__` and `EXPO_PUBLIC_DEV_DRIVER=1`. The shared dev
client opens straight onto Metro with
`xcrun simctl launch <udid> com.arrofamily.arro --initialUrl http://localhost:8082`,
which skips the "Open in Arro?" prompt that `simctl openurl` raises.

**Fixed from the recordings and screenshots**
- The check-in played under the log sheet. Today now holds view changes while
  it's covered and hands them over once the sheet has gone
  (`useShownWhenFocused`); a rebuilt view arriving mid-hold no longer cuts the
  wait short (this was the bug in the second recording; tested).
- `simctl recordVideo --codec h264` dropped about a second of frames right
  after a sheet closed, which looked like the fill starting at 45% with no
  ignite. Rapid screenshots showed the app was right. Every recording is HEVC
  now, re-encoded to small H.264 for the repo.
- Sparks vanished on the ember slat (ember on ember, 3 to 5 pt). They start
  from the slat's top edge near its end now, and are 4 to 7 pt
  (`SparkBurst`, one line).
- "Kept this week" and "Week kept, together" crossfaded in the same place and
  read as a smudge. One goes out, then the other comes in.
- The milestone wall built during the screen's fade-in, so half of it was
  lost; it now waits for `transitionEnd`. The number waited for the last
  spring to settle (a dead second); it now arrives at the top slat's
  touchdown. Steam no longer sits there before the number.
- The nudge sheet changed height after sending. Both controls stay; the
  button reads "Sent".
- At the largest text size the Start button truncated, rows truncated names,
  the slat's "WEEK 9" grew out of the wood and tab labels broke mid-word.
  `SolidButton` caps its label at 1.6x, `ListRow` and `PersonRow` wrap (rows
  move their dots and status under the name), the slat label and tab labels
  cap at 1.3x. These are small fixes in M6 components.
- Content ran into the clock when scrolled. `Screen` fades in a birch strip
  under the status bar once you scroll (not at rest, so the haze's warm corner
  still shows).
- The comment field sat under the keyboard. It's docked above it now.
- The share image came out 3240 x 4050 with the art in one corner
  (`toDataURL` renders at screen scale). The SVG is now sized in points so it
  comes out at exactly 1080 x 1350; checked by pulling the PNG back to the Mac.

**Decisions**
- D9.1 Data-layer additions, each tested in `buildView.test.ts`: `FamilyRow.latest`
  ("Tonight · 20 min · 85°C", "Yesterday · 25 min with Maya and Jo"),
  `today.weekKept`, `today.slatLabel` ("Week 9"), `streak.headline` and
  `week.headline` ("Your first week together" instead of a big 0),
  `week.thisWeekLabel`, `PastWeekView.title` and `outcome`. The greeting lost
  its period to match the mockup. Week's number labels are now "weeks
  together", "Longest", "This year", as the mockup sets them.
- D9.2 New preview scenario `lastOne`: Maya and Jo have kept, you're on 2 of 3,
  so the next save keeps the family's week.
- D9.3 Check-in timing lives in `src/state/checkIn.ts` (tested): dot ignites
  (save haptic at its peak), a 180 ms beat (`moments.weekKept.hold`, added to
  motion.ts), the fill (week-kept haptic as it's full, sparks), then the line
  500 ms later. With Reduce Motion: the slat turns kept and the line crossfades.
- D9.4 Your avatar on Today wears a thin ember ring for this week's progress;
  it fills with the dot. The mockup has no ring; the spec's moment 5 asks for one.
- D9.5 Edit is its own sheet (`EditSession`), not M8's log form, since that
  form's route belongs to M8. It edits minutes, type, cold plunge, place, note
  and photo; date and people stay as logged.
- D9.6 Past weeks open a sheet (`PastWeek`) instead of expanding in place:
  growing a row's height isn't a transform.
- D9.7 The Apple Health offer shows once you have a saved session of your own,
  until answered, on iOS. The answer is kept in `saunafam.healthOffer.v1`
  (`src/state/healthOffer.ts`); M11 should read `'on'` and do the permission and
  writing. It sits under the family list, not above it.
- D9.8 The milestone share image is drawn as SVG and rasterized with
  react-native-svg's `toDataURL`, shared as a data URL with `Share.share`. No
  react-native-view-shot, so no new native module (the shared dev client
  doesn't have one). Over 13 weeks the wall goes into columns of 13.
- D9.9 Tabs other than Today also play one settle arrival on their first
  visit; coming back to a tab is instant.
- D9.10 `StartSessionButton` and `TimerBar` are placeholders at the paths M8 is
  filling; they navigate to a `Timer` route M8 adds.

**Not done / for others**
- No rollback screenshot: the preview never refuses a cheer or comment, so
  `NoticeToast` (the quiet rollback line) is unseen on the Simulator. Same for
  the nudge's "already" and "failed" lines.
- Haptics can't be seen in a recording; they're timed in code (`emberPeakMs`,
  `onFilled`, `springTouchdownMs`) and not felt on a device.
- No Reduce Motion recordings of these moments, and no Perf Monitor reading.
- Recordings start with the dev client's "Downloading 100%" bar on cold launch;
  `today-arrival.mov` is trimmed to start after it.
- Expired invite isn't on these screens (Invite and onboarding are M10).
- `src/screens/plain.tsx` stays: Settings, Notifications, Family members and the
  log form still import it.
## M8: the timer and the log form

Built on branch `saunafam/timer` (worktree `/tmp/luna-arro/wt-timer`).

**Checks:** typecheck clean; Jest 17 suites, 235 tests (logForm 19, timerRoom
8, sessionPhoto 3, theme 8 with the new overdamped spring test); lint clean in
every file M8 touched; `check-design` clean in them; `check-contrast` 32 of 32.

**What's in it**
- `src/screens/TimerScreen.tsx`: the room. The door morphs on `springs.morph`
  from the frame it was opened from (the Start button, ember; the timer bar,
  char), ember crossfading to char over 800 ms, the glow rising over 1.4 s, the
  medium haptic at the spring's touchdown (616 ms). Numerals (FixedDigits),
  caps lines, the dotted ember arc (`TimerArc`), "Time to cool off at 7:27 PM",
  glow-breathe and a warmer step every 5 minutes, a light tick and a VoiceOver
  line at each 5-minute mark, the target and type panel (tap the line under the
  numerals), Throw löyly (`LoylyBurst`), Add a round with the lake tint, Done,
  Cancel behind a designed confirm, the 3-hour prompt, and a "Back to Today"
  mark top left (the timer keeps running).
- `src/screens/LogSessionScreen.tsx`: `LogSessionSheet`, a designed sheet used
  by the `LogSession` route and, in place, by the timer. Logic in
  `src/state/logForm.ts` (prefill from the timer or a draft, validation, °F to
  °C, the start time). Photos in `src/state/sessionPhoto.ts`.
- `src/components/StartSessionButton.tsx`, `TimerBar.tsx` for M9; the stand-in
  Today uses both. Other new components are listed in DESIGN-SYSTEM.md.
- Routes: `Timer` (`{ origin?, started?, startAt? }`) and `LogSession` are
  transparent modals with no stack animation; each draws its own entrance.
- Dev only: `src/dev/DevCapture.tsx` drives captures from simctl links or a
  local command queue (`EXPO_PUBLIC_DEV_CAPTURE`), and `app.devSetTimer`. Both
  do nothing in a release build. `dev/onboard` skips onboarding with no server.

**Fixed from the recordings**
- The door started about 700 ms after the tap and skipped its first frames: the
  room's first draw (a full-screen SVG blur for the steam, and blurred halos on
  the arc) blocked the main thread. The steam is now a PNG drawn ahead of time
  (`scripts/render-room-steam.mjs`), the halos are radial gradients, and the
  door waits for the route's `transitionEnd` before moving. Tap to motion is
  now about 130 ms in a dev build.
- Starting the timer re-rendered Today under the door (the bar appeared, the
  button relabeled, the door's frame no longer matched). The timer now starts
  from the tap's time but is committed when the door lands.
- The room's contents faded in while the door was still small, over Today.
  They now wait for the door to land.
- The status bar turned light only after the door landed, so it sat dark on
  char for a moment, and changing it re-rendered the room mid-move. It's set
  imperatively (`StatusBar.setStyle`) when the door covers the top, and back
  when the room lightens.
- An overdamped spring stopped a hair short and left a sliver of Today at the
  edge: the door snaps to the exact frame when its spring rests.
- Done to sheet stalled for about 190 ms while the sheet mounted, so the room's
  fade jumped. The sheet now mounts parked below the screen while the glow
  cools, and its lower fields mount after it's up.
- The room lightened faster than the sheet rose (settle curve); it now uses
  the even `leave` ease.
- Throw löyly's drawn wisps read as thin lines, then as gray ribbons. They're
  now a blurred wisp image that rises, billows and fades.
- The phase words ("Cooling off", "Back in the heat") snapped; they fade in.
- While cooling off the numerals didn't dim (an animated opacity overrode the
  style); they dim to 72% now.
- At the largest Dynamic Type size the room overlapped itself and the löyly
  label clipped. Large text gets a scrolling room with no arc, and
  `SolidButton` grows instead of clipping.

**Decisions**
- D8.1 Done finishes the timer at once (clears it, cancels its notifications)
  and the log sheet opens over the lightening room. Closing that sheet asks
  "Throw this session away?", since nothing else has the time.
- D8.2 The sheet is birch, not steam, so the steam wells and tiles read on it.
- D8.3 "Log it" on the 3-hour prompt finishes the timer and asks for the real
  minutes (the field starts empty with a hint), keeping the start time.
- D8.4 The 5-minute tick fires only when the mark goes up by one while you're
  watching; coming back from the background just catches up, silently.
- D8.5 Saving is optimistic: the sheet closes at once and `haptics.save` fires
  as it finishes closing. "Jo already logged this one" arrives afterwards as
  `app.notice` (new `app.showNotice`), for Today to show.
- D8.6 The löyly haptic fires one stagger (90 ms) after the tap, as the first
  wisp shows.
- D8.7 The 4:3 crop is done in `sessionPhoto.ts`: SDK 57's picker crops only
  to a square on iOS (`aspect` is Android only). Note `photos.ts` still passes
  `aspect: [4, 3]` for workouts, which iOS ignores.
- D8.8 `app.json` gets a camera permission string ("Saunafam uses the camera
  only when you take a photo for a session..."). The shared dev client was
  built before it, so the camera needs the next native build.
- D8.9 A local-only session (no server) stores its timer too, so the timer
  survives being killed in a dev build. Prototype preview scenarios still keep
  theirs in memory.
- D8.10 "Sat with someone?" lists joined members; invited ones show grayed out with
  "Hasn't joined yet"; people on a break can be picked. The preview family has
  only Maya and Jo, so `log-form-shared-3.png` shows three people in the
  session (Sam, Maya, Jo), not three picked; the 3-person cap is unit tested.
- D8.11 The numerals stay at the type scale's 96 pt (the mockup is about 91 pt
  at this width); FixedDigits' even digit boxes make them a little wider.
- D8.12 Nothing about Plus appears in the timer or the form.

**Not done or not verified**
- Haptics and VoiceOver announcements can't be felt or heard on the simulator;
  their timing is in code and tests only. No Perf Monitor reading was taken,
  and frame timing from `simctl recordVideo` was noisy with three simulators
  running: the door and the finish show steady 16 to 25 ms frames in the
  cleaner runs, with occasional 40 ms gaps.
- The camera was not tried (no camera on the simulator, and no permission
  string in the current dev client). The library picker was not tried either.
- `timer-background.mov` is two recordings joined: the 2 minutes in Settings
  are cut out. Coming back shows iOS's snapshot from leaving (0:04) for a frame
  before 2:09.
- Screenshots after the dev client's relaunch show its floating Tools button
  (dev chrome).
- `design/screenshots/saunafam/INDEX.md` lines for these screens are left for
  M9, which owns that file.

## M14: App Store screenshots

Built on branch `saunafam/shots` (worktree `/tmp/luna-arro/wt-shots`), the
half of M14 the docs track left: the designed set. How to regenerate is in
`design/app-store/screenshots.md`.

**Checks:** `npm run typecheck` clean. `npm test`: 23 suites, 276 tests.
`npx eslint` clean on every file touched (the 30 errors `npm run lint` still
reports are in Arro's old `CheckInPop`, `CheerButton`, `PrimaryButton` and
`RollingText`, untouched). `node scripts/app-store-shots.mjs`: "All 12
screenshots are the exact size, with no alpha channel." Each output is read
back after writing: 1320 x 2868 or 1206 x 2622, PNG color type 2 (RGB).

**Proof:** `design/app-store/screenshots/6.9/1-timer.png` to `6-milestone.png`
and the same in `6.3/`; raw captures in `design/app-store/screenshots/raw/`.

**What's in it**
- `scripts/app-store-shots.mjs`: the frame and caption template as SVG
  (birch, the app's faint slats and warm corner, Fraunces Soft SemiBold
  captions at 106 px on the 6.9 grid with -2.2 tracking, a dark device frame
  with side buttons and a soft warm shadow, the wordmark over the first
  caption), rendered with resvg, flattened to RGB with pngjs, then checked.
- `scripts/app-store/capture.mjs`: the captures with no taps, through the dev
  driver; `scripts/app-store/sample-photo.mjs`: the feed card's photo.
- Dev only: `DevDriver` reads `EXPO_PUBLIC_DEV_DRIVER_URL` (default
  `http://localhost:8099`, so other agents' runs are unchanged) and takes three
  new commands: `photo` (a photo on the preview's shared session, through
  `setDevSharedPhoto` in `preview.ts`), `timer` (DevCapture's `dev/timer`)
  and `dev` (the screens' `form-*` commands).

**Fixed from the captures**
- Session photos came out about 21 pt narrower than the card, with a strip of
  card to their right (Yoga's `aspectRatio` with a stretched width). The
  photo box now has `width: '100%'` (`SessionCard.tsx`); the feed card, the
  session screen and the edit sheet all use it. No photo had been on screen
  before, so nothing had caught it.
- The timer's "Time to cool off at 6:38 PM" disagreed with the 9:41 status
  bar. The timer shot is taken in a POSIX time zone made for the moment
  (`SFM+04:13:44`, say), so it reads 9:41 PM.
- The numerals read 14:31: the room redraws once a second, so the shot waits
  1.2 s after the timer is set.
- A fresh dev client install showed Expo's developer menu over the app. The
  capture script turns its first-run screen and Tools button off first.

**Decisions**
- D14.1 Two sets, 6.9 and 6.3, as `screenshots.md` planned from Apple's page.
  No 6.5 set; the script can scale one from the 6.9 frames if App Store
  Connect still asks.
- D14.2 Every caption is two lines at one fixed baseline, so the six read as a
  strip; the device sits at the same place on each. The wordmark only on the
  first, where there's room above the caption.
- D14.3 No ember in the captions (the spec's "ember once at most"): every
  screen already has ember in it.
- D14.4 Today is scrolled so the streak card and all three family rows show;
  on 6.9 at rest that's already true, and scrolling would bring in the Apple
  Health offer.
- D14.5 The log form shows Maya and Jo picked, three people in the session
  (D8.10: the preview family has no fourth member).
- D14.6 The feed photo is drawn, not a stock photo: a lake at dusk from a
  dock, matching the session's "Lake cabin" and "Three rounds and the lake".

**Not done or not checked**
- App Store Connect's upload form itself (only Bryce can see it).
- "Yesterday · 25 min with Maya a..." truncates on Today's rows at both
  widths. That's the app's layout, not changed here.
- The battery shows the charging bolt, from the specified
  `--batteryState charged`. `discharging` at 100 would show a plain battery.

## M11: native features

Built on branch `saunafam/native` (worktree `/tmp/luna-arro/wt-native`), with
its own Debug simulator build (`npx expo prebuild --platform ios`, then
`xcodebuild -configuration Debug -sdk iphonesimulator`, Metro on 8084) on the
iPhone 17 Pro simulator `F5F8CE0B`, iOS 26.2. No preview family settings
(`.env.local`) in the worktree, so the app ran on the local preview family.

**Checks:** `npm run typecheck` clean. `npm test`: 26 suites, 304 tests (new:
`health.test.ts` 15, `tapRoute.test.ts` 10, `localization.test.ts` 3; one line
changed in `settingsCopy.test.ts`). ESLint clean in every file M11 touched; the
full `npm run lint` still reports 30 errors and 1 warning, all in
`CheckInPop`, `CheerButton`, `PrimaryButton` and `RollingText`, which M11 didn't
touch. `node scripts/check-design.mjs` clean on the touched files.
`npx expo export --platform ios` builds (4.7 MB Hermes bundle).

**What's built**
- Apple Health, write only (`src/state/health.ts`). `@appeeky/expo-healthkit`
  0.4.1 does what the spec needs on SDK 57: `requestAuthorization({ toShare:
  [mindful minutes] })` asks for write access alone, `getAuthorizationStatus`
  reports it, `saveCategorySample` writes an `HKCategoryTypeIdentifierMindfulSession`
  sample from the session's start for its heat minutes (capped at 240), tagged
  with `HKExternalUUID` = the session id. The native module is loaded only when
  present (Jest, web, an old dev client say "unavailable").
- `app.json`: the plugin's `healthSharePermission: false` removes the read
  string (`NSHealthShareUsageDescription`); the write string is the spec's.
  Background delivery stays off. Checked with `npx expo config --type introspect`
  and on the simulator's Health sheet.
- Writes happen after each outbox send and after each refresh, for your own
  saved sessions (ones others logged with you included), once each: ids are kept
  in `saunafam.healthWritten.v1`, so edits, refreshes and retries never write
  twice. Failures are quiet and tried again next refresh.
- Turning it on (Settings, or Turn on on Today's one-time card) stores the
  switch with the time, asks iOS, and if allowed writes the past week's sessions
  at once (`syncHealth()` on the app context). The Today card shows only where
  Health is available. The M10 "This test build can't write to Health yet" state
  is gone.
- Notification taps (`src/navigation/tapRoute.ts`, pure and tested): session,
  shared, session_cheer, session_comment open SessionDetail; nudge opens the
  Nudge sheet for whoever nudged; weekend the Week tab; joined Family members;
  the timer's two notifications open the timer room while it runs, else Today;
  a weekly reminder opens Today. Local ones don't wait for a refresh. A tap is
  handled once, whether it comes through the launch response or the listener
  (SDK 57's async `getLastNotificationResponseAsync`, the sync one is
  deprecated). If the tap arrives before the app is active, the navigation
  waits for it.
- Camera alongside the library: the log form already had both (M8); Edit
  session now has Take a photo and Choose one too, through `pickSessionPhoto`,
  so its photos get the 4:3 crop on iOS (it used `pickPhoto`, whose `aspect` iOS
  ignores, D8.7).
- `expo-localization`: the °F/°C rule (D5.3) now has a test with
  `getLocales()` mocked (the phone's `temperatureUnit` first, then the region).
- Nudge sheet line: opened from a nudge push for someone who has kept the week,
  it read "Maya's on Kept this week". It now says "Maya has kept this week. A
  nudge says you're thinking of them." (`design/copy/app-copy.md` updated).
- Dev only (`DevCapture`, compiled out of release): `dev/health-on`,
  `dev/health-write`, `dev/timer-start?ago=`, `dev/reminder-soon`,
  `dev/notif-raw`, `dev/notif-list`, `dev/photo?from=`, `dev/ids`.

**Checked end to end on the simulator**
- Health: Turn on showed iOS's sheet with only "Allow Arro to write: Mindful
  Minutes" and the new explanation (`health-permission-sheet.png`); after
  Allow, status read granted, two test writes (15 and 20 min) went through, and
  the Health app shows 35 mindful minutes (`health-mindful-minutes-written.png`).
- Timer: started 14:45 in, with the app in the background the target
  notification arrived ("15 minutes in. Time to cool off.") and tapping it opened
  the timer room (`notification-tap-timer.mov`). Both timer notifications are
  scheduled with the real copy (`dev/notif-list`).
- Weekly reminder: one with the real id prefix and copy ("2 to go this week" /
  "Ten minutes counts. Your family will see it.") arrived and its tap landed on
  Today.
- Legacy cleanup: an `arro-reminder-...` notification scheduled by hand was
  gone after a relaunch.
- Pushes: `xcrun simctl push` with the server's payloads (`data` under `body`,
  as Expo sends it) for all seven kinds; each tap landed as listed above
  (`notification-tap-*.png`, `notification-tap-push.mov`).
- Camera: the permission prompt shows the M8 string, and the camera opens. The
  simulator has no camera feed, so no photo could be taken; cancelling returns
  nothing and the app carries on. Choosing from the library came back cropped
  to 1440 x 1080.

**Decisions**
- D11.1 Health writes your own sessions, including ones someone else logged
  with you, not only ones logged on this phone: they're your heat minutes too.
  Each phone writes only its own person.
- D11.2 Turning Health on saves sessions that started up to 7 days before (so
  the session that earned Today's card goes in), and every later one.
  `saunafam.health.v1` now stores `since`; M10's `{ enabled }` still reads, and
  counts a week back from now.
- D11.3 Edits and deletes don't change what's in Health: a session is written
  once, with the minutes it had. Health keeps it if the session is deleted.
- D11.4 A weekly reminder's tap opens Today; the timer's opens the room only if
  a timer is still running.
- D11.5 The nudge push opens the Nudge sheet for the person who nudged (the
  spec's table), so you can cheer them back.
- D11.6 The existing `timer-background.mov` (M8) stays: it shows the timer
  catching up after 2 minutes away, which is what the Quality bar asks for.

**Not done or not verified**
- On this simulator (iOS 26.2, this Debug build) every transparent modal
  (Nudge, the log sheet) shows a flat gray scrim with no screen under it, from
  the first frame, however it's opened (`dev/open` too, not only a tap). M9's
  `nudge.png` (iOS 26.5, the shared dev client) shows Today under the sheet. Not
  investigated; worth a look on a device.
- No camera photo was taken (no camera on the simulator); a device check is
  needed.
- Pushes were simulated with `simctl push`, not sent through `send-push` and
  Expo's service (no hosted Supabase here). The Expo push token wasn't fetched.
- Haptics and VoiceOver weren't checked (simulator).
- The other agents' simulator windows sat on top of this one for part of the
  run, so a few early taps may have landed in the iPhone 17 simulator; `tap.sh`
  now refuses unless this simulator's window is in front.
- The app is still named "Arro" on iOS's sheets and banners (the rename is M12),
  and `app.json`'s photo string still says Arro and workouts (M12).


## M15: Plus, switched off

Built on branch `saunafam/plus` (worktree `/tmp/luna-arro/wt-plus`), on top of
the DB track's server half (migration 0006, `revenuecat-webhook`, `sync-plus`,
the `delete-account` dry run). Ships with `app_config.plus_enabled = false`:
with it off, no Plus row, lock, wood, face, icon or card exists anywhere, and
`react-native-purchases` is never loaded or configured.

**What's in it**
- `react-native-purchases` 10.15.0 and `expo-alternate-app-icons` 8.0.0
  (commit f88343d), the alternate icons Night stone, Cedar and Lake in
  `app.json`, and `ios-storekit/Saunafam.storekit` with the five products.
- `src/state/purchases.ts`: `PreviewPurchases` (succeed, fail, cancel, pending,
  nothing to restore, offline, and a delay for captures), `RevenueCatPurchases`
  over the SDK (prices from the `default` offering only; error codes mapped to
  cancelled, pending, offline and failed), and `PurchasesSwitch`, the one
  object AppState keeps: the fake until `plus_enabled` is on and the build has
  `EXPO_PUBLIC_REVENUECAT_IOS_KEY`, then RevenueCat, configured once.
- `src/state/plusFlow.ts`: the sheet's state machine (all 16 states plus "two
  payers"), `buyWith` and `restoreWith` (set the family attribute, buy, then
  sync-plus and family_plus), and every Plus string (`PLUS_COPY`).
- `src/screens/PlusSheetScreen.tsx` replaces M10's `PlusSeamScreen` (same route
  and params, plus `wood`, `face` and `icon`). A 90% birch sheet over the
  screen (`overScreen`, so the screen shows through), the close mark top
  right from the first frame, the "Preview, no real purchase" tag in its fixed
  header. The family's real wall in the wood picked, four wood swatches (the
  400 ms crossfade, a slat at a time), the feature list, flat price tiles, one
  ember button (it shows three waiting dots while the App Store or the server
  works), Not now as plain text, the small print, Restore purchases, Terms
  (Apple's standard EULA) and Privacy, the sign-off and the tip jar. A
  purchase landing re-grains the wall once over 900 ms, a slat at a time, with
  the success haptic as the last one finishes (`moments.plusLanded`,
  `haptics.plusLanded`). While finishing it asks the server every 4 s and says
  it can be closed after 20 s.
- Try-on: The wall (M10's, now passing the wood on), `TimerFaceScreen` (a small
  room with the face at 12:40 of 15) and `AppIconScreen` (a home screen close
  up). Buying from a try-on keeps what was tried.
- Timer faces: `src/components/TimerDial.tsx`. Löyly is M8's dotted arc; Coal
  is a glowing ring on soot with warm numerals; Brass is a brass-bezeled
  cream dial to 60 minutes with an ember wedge to the target, a minute hand at
  the heat time and an ember seconds hand, hung above the numerals. Picked per
  person (`saunafam.look.v1`, `src/state/look.ts`).
- App icons: `src/state/appIcon.ts` over `expo-alternate-app-icons`. Seen
  working in the Debug build: iOS's "You have changed the icon" alert showed
  the Night stone and Lake icons, and the icon went back to the default when
  Plus ended.
- Every week (`EveryWeekScreen`, `family_week_history` with 520 weeks, which the
  server clamps to 12 without Plus), the Heat log (`HeatLogScreen`,
  `src/state/heatLog.ts`, from the family's sessions), the wall poster
  (`WallPoster`, 1800 x 2400, columns of 13 weeks, saved or printed through the
  share sheet), and the Founding family's brass nail on the first slat of the
  wall and the poster.
- The quiet card on Week now also stays away after a missed week, while you're
  on a break, and next to a milestone (`afterLoss`, `celebrating` in
  `nagCardState`). `plusMayShow` and `NEVER_PLUS_PLACES` in `src/state/plus.ts`
  list where Plus may ever appear.
- Preview scenarios `plusMine` (you pay yearly), `plusFounding` (40 weeks),
  `plusLapsed`, and `archive` on every scenario (every week and session).
- Dev only: driver ops `plusStore`, `emitArg` and the Plus screens' dev events;
  `SubScreen` scrolls for captures like `Screen` does.

**Checks:** `npm run typecheck` clean. `npm run lint`: 0 problems in `src`.
`npm test`: 29 suites, 382 tests (new: `plusFlow` 29, `plusNever` 35,
`plusExtras` 11). `node scripts/check-design.mjs` clean. `node
scripts/check-contrast.mjs`: 39 of 39 pairs (6 new: Coal numerals and small
caps on soot, the Brass dial figures, the try-on home screen label, the
preview tag). `deno check` clean; `deno test` 48 passed. No SQL changed, so
pgTAP wasn't rerun. The dash check on `src`, `design/copy`, `design/app-store`,
`app.json` and `site/public` finds nothing.

**Proof**
- Screenshots: `design/screenshots/saunafam/INDEX.md`, section "Saunafam Plus":
  `plus-01-loading.png` to `plus-16-preview-label.png` for the 16 states, the
  tip jar, try-on for a wood, a face and an icon, the two timer faces in the
  room, Every week, the Heat log with and without Plus, the poster, the quiet
  card, Settings and Me.
- Recording: `design/recordings/saunafam/plus-preview-flow.mov` (40 s, 1.3 MB):
  the sheet rising over Today, trying alder, charred pine and cedar, a
  cancelled purchase, a failed one, Ask to Buy, Founding family bought (waiting
  dots, finishing, the wall re-graining, the thank-you), then a restore on a
  fresh family. Watched at 8 to 12 fps: the sheet's spring overshot and showed
  a sliver of the screen under it, so the tall sheet now carries 40 pt of
  itself below the edge.
- Tests: `src/state/__tests__/plusFlow.test.ts` (every state against
  `PreviewPurchases`, restore's three results, tips, prices only from the
  offering, RevenueCat's offering and error mapping against a fake SDK, the
  switch), `plusNever.test.ts` (the never-shown list, three ways: the rule, the
  views built from the preview scenarios, and the source of every screen that
  must never reach Plus), `plusExtras.test.ts`.

**Decisions**
- D15.1 Text on the picked price tile is steam, not the spec's birch: steam on
  ember is the pair `check-contrast` already passes at 15/600 (the button's).
- D15.2 The feature list shows titles only; the row you came from also shows
  its line. With six two-line rows the prices fell a whole screen below the
  fold.
- D15.3 Purchasing and Finishing up keep the button at full color with three
  waiting dots (`SolidButton` `busy`, `moments.waiting`), instead of the
  disabled look, which reads as "you can't".
- D15.4 The sheet's own wood swatches only preview; they never save. Buying
  from The wall, Timer face or App icon keeps what was being tried on.
- D15.5 The Heat log without Plus blurs made-up numbers (`sampleHeatLog`), not
  the family's, and says they're an example.
- D15.6 The Heat log is worked out on the phone from the sessions table (the
  spec allows device checks for the visual extras). "Your best run" is the
  family's longest streak. Longest sessions are alphabetical by name.
- D15.7 The Founding family nail sits on the bottom slat of Week's wall (the
  oldest of the 12 shown) and on the poster's first week.
- D15.8 When Plus ends, the app icon goes back to the default (iOS shows its
  own alert), like the wall goes back to birch. Faces and icons stay picked on
  the phone, so they come back with Plus.
- D15.9 A preview purchase or restore that finishes after its scenario was
  swapped out changes nothing (a generation counter in AppState). Found when a
  slow restore from one capture turned Plus on in the next.
- D15.10 With Plus off, build 9 never configures RevenueCat, so App Privacy's
  Purchase History can wait for the Plus version (`design/app-store/app-privacy.md`).
- D15.11 Debug build of my own on the iPhone 17 simulator
  (`ios/build/dd`, `xcodebuild -configuration Debug -sdk iphonesimulator`),
  Metro on 8083, the capture driver on 8093 (`EXPO_PUBLIC_DEV_DRIVER_URL`).

**Not done or not verified**
- The StoreKit configuration test (`plus-storekit.mov`) isn't possible here.
  RevenueCat's SDK needs a project API key before it will load offerings or
  buy anything, and that key only comes from the RevenueCat dashboard (off
  limits); RevenueCat's own Test Store needs the dashboard too. A StoreKit
  file also only applies when the app runs from Xcode's scheme, not from
  `simctl launch`. `plus-preview-flow.mov` records the preview flow against
  `PreviewPurchases`: yearly cancelled, failed and Ask to Buy, Founding family
  bought, and a restore. A completed yearly purchase is in the screenshots
  (`plus-07-finishing.png`, `plus-08-success.png`), not the recording. Part 2
  of the spec's sandbox test plan is for Bryce.
- Nothing ran against RevenueCat or a live Supabase: `RevenueCatPurchases` is
  tested against a fake SDK, and sync-plus and family_plus only through types
  and the DB track's tests.
- Haptics (the landing, tips) can't be felt on the simulator; timing is in
  code.
- The re-grain on landing is subtle by design (same wood, new grain, 900 ms);
  Bryce should look at it on a phone.
- The App Store listing, privacy label, review notes and the privacy page's
  RevenueCat paragraph were already written by the docs track (M14 docs,
  M13); M15 only answered the open RevenueCat-at-launch question.
- VoiceOver wasn't run end to end on the new screens; labels and roles are set
  in code.
- Dynamic Type at the largest sizes wasn't captured for the Plus screens.

## M16: self-review

Built on branch `saunafam/review` (worktree `/tmp/luna-arro/wt-review`), from
the tip of `feat/saunafam` with every app milestone merged (3286f99). One fresh
Debug build of the merged app: `npx expo prebuild --platform ios`, then
`xcodebuild -configuration Debug -sdk iphonesimulator` into `ios/build/dd`,
on the iPhone 17 Pro simulator `9F9A7E15` (iOS 26.5) only. Metro on 8086, my
own driver server on 8096 (`EXPO_PUBLIC_DEV_DRIVER_URL`), no `.env.local`, so
the app ran on the local preview family. No taps: everything went through the
dev driver.

**How it was checked**
- Recordings: `xcrun simctl io recordVideo --codec hevc`, then frames pulled
  with ffmpeg into labelled contact sheets (real timestamps), frame gaps from
  ffprobe, and for the door a per-frame trace of its top edge.
- Frame rates: `src/dev/FpsProbe.tsx` (new, dev only, mounted with the
  driver). It counts UI-thread frames (Reanimated's frame callback) and JS
  frames (requestAnimationFrame) between two driver commands, and logs the
  rate, the dropped 60 Hz frames and when each gap fell. Those are the two
  numbers the Perf Monitor graphs; the probe gives them exactly instead of
  read off an overlay. Debug build, so JS numbers are pessimistic.
- `simctl recordVideo` only writes a frame when the screen changes, and it
  sometimes drops a stretch on its own (M9 saw it after a sheet closes; so did
  this run). Where the recorder and the probe disagreed, the probe and the
  frames either side decided.
- Haptics can't be felt on the simulator. Each one was logged with a
  timestamp during the runs (a temporary log, removed) and lined up with the
  frames.

**The moments.** Clips are in `design/recordings/saunafam/m16/` (H.264, 604
wide). "UI" and "JS" are the probe's dropped 60 Hz frames over the run.

| Moment | Recording | What I saw | What I fixed | Frames (probe) |
|---|---|---|---|---|
| Cold-start splash | `splash-cold.mp4` | Plain birch, wisps at 0, stone at 400, wordmark at 700, lift and fade at 1200 ms, Welcome settling in under the lifting mark. No white frame, no ghosted mark | Nothing | UI 59.4 fps, 2 dropped, both in one 51 ms gap as the native splash hides, before the wisps move. JS 4 (Welcome mounting under the exit) |
| Today's first paint (returning) | `today-first-paint.mp4` | The 400 ms fade from birch, then greeting, slat, Start, family 70 ms apart, the 8 rolling in | Nothing | UI 58.9 fps, 4 dropped, all before or on the first frame of the fade (still invisible). JS 1 |
| Starting the timer (the door) | `timer-start.mp4`, `timer-start-before-fix.mp4` | About one UI frame in three dropped while the door grew (27 fps on the probe). Then two or three held frames mid-move. The haptic on a timer, not the landing | Bisected: the ember face's gradient repainted on the CPU every frame (expo-linear-gradient redraws on every size change). Now drawn at the button's size and stretched with a transform. The status bar's animated switch held the compositor: it now switches without a fade, from the UI thread, once the door's edge has covered its text. The haptic fires from a UI-thread reaction when every edge is within 2 pt of the screen | Before: UI 54.3 fps, 16 dropped. After: UI 59.0 fps, 3 dropped, all in one gap at the route's mount while the door still sits on the button; one held recorder frame at the status bar switch (was 2 to 3). Tap to first door frame about 200 ms in Debug |
| 5-minute tick | `timer-tick-loyly.mp4` | Numerals to 5:00, the warmer glow step, the light tick in the same render as the 5:00 | Nothing | UI 60.0 fps, 0 dropped. JS drops once a second (the room's per-second redraw), not on the UI thread |
| Throw löyly | `timer-tick-loyly.mp4` | Wisps rise, billow and fade, no jumps. Soft haptic one stagger (90 ms) after the tap, as the first wisp shows | Nothing | UI 60.0 fps, 0 dropped |
| Finishing a session | `timer-finish.mp4` | Glow cools, numerals settle, the room lightens as the sheet rises; success haptic as the glow lands | Nothing | UI 58.9 fps, 4 dropped: one gap as Done is pressed (before anything moves), one as the sheet's lower fields mount (sheet at rest) |
| Saving (the check-in) | `checkin.mp4` | The dot ignited about 700 ms after the sheet had gone. Two success haptics, 930 ms apart | Today held the new week for a page sheet's 400 ms dismissal, but the log sheet finishes its own slide before going back: it now marks when it's gone and Today skips the wait. The sheet leaves the save haptic to the dot when it closes onto Today and lights a new dot (tested) | UI 60.0 fps, 0 dropped. Dot now starts about 300 ms after the sheet has gone |
| Week kept (spark burst) | `week-kept.mp4` | Dot ignites (success at its peak), a beat, the slat fills edge to edge, sparks with the second success as it's full, then "Week kept, together" | Nothing beyond the check-in fix | UI 60.0 fps, 0 dropped |
| Milestone wall | `milestone.mp4` | Wall builds from the bottom, the 12 lands with the overshoot as the top slat touches down, heavy then success 184 ms apart, steam behind. The card stood empty for about 350 ms first | The wall waited for transitionEnd, about 550 ms after mount. It now starts 250 ms (`moments.milestoneWall.cardFade`) after the transition starts. (A shorter `animationDuration` was tried first: a full-screen modal ignores it, measured, reverted.) | UI 59.0 fps, 4 dropped: the mount, and one as the wall starts. Card-to-first-slat about 250 ms |
| Tabs | `tabs-and-stack.mp4` | Instant switch, then each tab's one settle arrival on its first visit; no blank frames | Nothing | UI 59.2 fps, 8 dropped, all on the first visit to Week, Feed and Me (their first mount); second visits 0 |
| Stack push and pop | `tabs-and-stack.mp4` | SessionDetail's slide lost about 3 frames as it started | Bisected to the Backdrop's haze (two SVG gradients bigger than the screen, drawn on the main thread on every screen's first frame). It's now a pre-rendered image (`scripts/render-backdrop-haze.mjs`), the same to within one color level | SessionDetail push: 3 dropped before, 2 after. Pop: 1 before, 0 after. Settings push: 2 |
| Log sheet | `sheets.mp4` | Rises over Today with Today under the scrim, slides away on close | Nothing | UI 4 dropped: the mount, and one as the form discards |
| Nudge | `sheets.mp4` | Over Today, Today under the scrim | Nothing | UI 0 dropped |
| PastWeek | `sheets.mp4` | Over Week, Week under the scrim | Nothing | UI 2 dropped, one gap at close |
| Plus sheet | `sheet-plus.mp4` | Over Today, Today under the scrim, the close mark from the first frame. (With Plus off the route refuses to open, as designed; recorded on `plusEnabled`) | Nothing | UI 3 dropped, one gap at mount |
| Splash, Reduce Motion | `reduce-motion-splash.mp4` | Finished mark, hold, crossfade. Mid-fade the wordmark doubled and the stone dimmed, then Welcome's mark sat 8 pt higher | Under Reduce Motion Welcome's mark doesn't lift, and the splash keeps its mark at full strength while only its birch fades, so the crossfade is between two identical marks | UI 0 dropped after the first frame |
| Timer, Reduce Motion | `reduce-motion-timer-start.mp4`, `reduce-motion-timer-finish.mp4` | A 240 ms crossfade in, no morph; finish crossfades to the sheet and back to Today; the dot crossfades on and still plays the save haptic | Nothing | Start: UI 2 dropped (mount). Finish: UI 2 |
| Milestone, Reduce Motion | `reduce-motion-milestone.mp4` | The wall popped in whole a frame after the card had faded in | The finished wall and number are there from the first frame, fading in with the card | UI 1 dropped (mount) |

**Haptics against the frames** (not felt; timed from the logs and the frames)

| Moment | Haptic | Fires | Call site |
|---|---|---|---|
| timer start | medium | the frame every door edge is within 2 pt of the screen (about 590 to 700 ms in) | `TimerScreen.tsx`, the `thudArmed` reaction |
| 5-minute tick | light | the render that shows the new mark | `TimerScreen.tsx`, the `mark` effect |
| löyly | soft | 90 ms after the tap, the first wisp | `TimerScreen.tsx`, `throwLoyly` |
| finish | success | as the glow lands cool (700 ms), the room starts lightening | `TimerScreen.tsx`, `finish` |
| save | success | the new dot's overshoot peak; at the sheet's close only when no dot lights on Today | `EmberDots.tsx` (`onIgnitePeak`), `LogSessionScreen.tsx` |
| week kept | success | the slat's fill completes, with the sparks | `WeekHero.tsx`, `onFilled` |
| milestone | heavy, then success 180 ms later | the number's overshoot peak | `MilestoneScreen.tsx` |

**Screenshots:** `design/screenshots/saunafam/review/`, one per screen, no dev
chrome (the capture script's dev menu switches), status bar 9:41, battery
discharging at 100. Listed in `design/screenshots/saunafam/INDEX.md`.

**Review set:** `docs/saunafam/review/`: six stills (Welcome, Today, the timer,
Week, the milestone, Feed) and two clips (`timer-start.mp4`, `week-kept.mp4`).

**Checks:** `npm run typecheck` clean. `npm run lint` 0 problems. `npm test`:
30 suites, 385 tests (new: `closesOntoToday.test.ts`, one more in
`useShownWhenFocused.test.tsx`). `node scripts/check-design.mjs` clean.
`node scripts/check-contrast.mjs`: 39 of 39 pairs. No SQL or edge functions
changed, so pgTAP and Deno weren't rerun.

**Not done or not verified**
- Haptics weren't felt: the simulator has no Taptic Engine. Their timing is
  checked against the frames, as above.
- The dev client shows its "Downloading" bar before the splash on every cold
  start in Debug; the splash clips are trimmed to start after it. The native
  splash handoff wasn't seen in a Release build (none allowed here; M7 has one).
- The Perf Monitor overlay itself wasn't used. Under the new architecture its
  JS graph hangs off the bridge, and turning it on needs a tap in the dev
  menu. The probe reads the same two rates.
- About a third of the way through, the Mac went into battery maintenance
  sleep and ran this session in short dark wakes (`pmset -g log`). Runs from
  then on were noisier: one milestone run showed 20 dropped frames that an
  A/B in the same conditions put down to the machine, not the code. Numbers in
  the table are from runs before that, or A/B'd after it.
- The first timer open after an install dropped frames that never repeated
  (the simulator compiling the room's shaders, probably). Not seen on device.
- The first visit to each tab and each push still costs one to three UI frames
  at mount in this Debug build; the wall-line SVG in the Backdrop is the next
  candidate if a Release build on a phone shows it too.
- The check-in still waits about 300 ms after the sheet has gone, and the
  milestone wall about 250 ms after the card is in: both are the Debug build's
  JS work. Worth checking in a Release build.
- Nothing ran on a physical phone or at 120 Hz.
