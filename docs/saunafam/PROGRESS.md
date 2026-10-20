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
