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
| M5 | done (branch `saunafam/app`) | `src/state/__tests__/*.test.ts(x)`, `docs/saunafam/DATA-LAYER.md` | Jest 197/197 in 13 suites. Typecheck clean, lint clean in `src/state` and `src/data`. See M5 below |
| M13 | done (branch `saunafam/site`) | `design/screenshots/saunafam/site/`, `design/screenshots/saunafam/invite-link-preview.png`, `design/recordings/saunafam/site-first-load.mp4`, `design/lighthouse/*.json`, `site/worker.test.mjs` | Lighthouse 100/100/100/100 on all four pages, CLS 0. See M13 below |
| M12 docs | done (branch `saunafam/docs`) | `README.md`, `AGENTS.md`, `AUDIT.md` (note), the "Written for Arro" line on `design/market-research.md`, `paid-plan.md`, `refactor-plan.md`, `visual-direction.md`, `Arro-Spec.html`, `Arro.dc.html`, `design/app-store/icon-options.md` | Docs half of section 6 only. `CLAUDE.md` is just `@AGENTS.md`, so unchanged. See "M12 and M14 docs" below |
| M14 docs | done (branch `saunafam/docs`) | `design/app-store/listing.md`, `app-privacy.md`, `review-notes.md`, `screenshots.md`, `support.md`, `testflight.md`, `hosting.md`, `README.md`; `design/copy/app-copy.md` (skeleton) | Listing, age rating, privacy labels, products. Not the screenshot script (`scripts/` is the app track). Apple screenshot sizes changed: see below |

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
| M6 | done (branch `saunafam/design`) | `design/brand/brand-sheet.png`, `design/screenshots/saunafam/design-sheet-1.png` to `-6.png` and `design-sheet-room.png`, `node scripts/check-contrast.mjs`, `src/theme/__tests__/theme.test.ts` | Löyly tokens, type, motion, haptics, components, Design sheet. See `docs/saunafam/DESIGN-SYSTEM.md` and M6/M7 notes below |
| M7 | done (branch `saunafam/design`) | `design/brand/icon-explorations.png`, `design/brand/icon-sizes.png`, `design/recordings/saunafam/splash-cold.mov`, `design/screenshots/saunafam/splash-1.png` to `-3.png`, `splash-reduce-motion.mov` | Icon, wordmark, asset pipeline, native splash, AnimatedSplash |

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
