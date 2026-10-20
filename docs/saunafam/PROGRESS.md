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
