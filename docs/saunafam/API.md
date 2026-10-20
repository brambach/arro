# Saunafam build 9: server API for the app

Everything the database and edge functions add in build 9, for building
`src/state/backend.ts` and the types around it. Source of truth is the SQL in
`supabase/migrations/20261021000001` to `20261021000006` and the functions
under `supabase/functions/`; this file was written from them and checked
against the local database. If they disagree, the SQL wins and this file is
the bug.

Conventions:

- RPCs are called with named arguments: `client.rpc('log_session', { p_family_id, ... })`.
  Arguments with a default can be left out.
- Functions that "return a table" come back from supabase-js as an array of
  objects, even when there's always one row. Take `data[0]`.
- `date` values arrive as `'YYYY-MM-DD'` strings, `timestamptz` as ISO strings,
  `numeric` as a number (supabase-js) and `date[]` as string arrays.
- Errors come back as `{ code, message }`. The codes used here:

| Code | Meaning |
|---|---|
| `42501` | not allowed: not signed in, not in that family, not the founder, not the logger. Also any direct table write the app has no grant for |
| `22023` | bad input: a value out of range, a date outside today or yesterday, a session of more than 4 |
| `23514` | a table check failed (minutes over 240, unknown sauna type, comment over 200 characters, blank comment, cold minutes without a plunge) |
| `23505` | already exists (a second cheer from the same person, a second nudge to the same person on the same day) |
| `P0001` | `too many comments today` (20 a day) |
| `SF402` | `that wood needs Saunafam Plus` |
| `PT429` | too many invite code attempts (unchanged from Arro) |

Messages are lowercase plain English and stable; match on `code` first.

---

## App config

### `app_config()`

Callable signed out (anon) and signed in. Always one row.

| Column | Type | Notes |
|---|---|---|
| `min_ios_build` | integer | 9. If the app's own build number is lower, show "A new version of Saunafam is ready. Update in TestFlight or the App Store." |
| `plus_enabled` | boolean | false. While false, no Plus rows, cards, locks, woods or faces anywhere |

---

## Families and rules

### `families` (table, select only)

New columns, readable by members:

| Column | Type | Notes |
|---|---|---|
| `goal_per_week` | smallint | 1 to 7, default 3. The rhythm going forward (see `set_family_rules`); this week's goal comes from `member_week_streaks.goal` |
| `min_minutes` | smallint | 1 to 60, default 10. Same note |
| `week_starts_on` | smallint | 1 = Monday (default), 7 = Sunday. Fixed after creation; no RPC changes it |
| `saunafam_started_on` | date | the build 9 reset line. Nothing before it counts |
| `wall_wood` | text | `birch` (default), `cedar`, `alder`, `charred_pine`. Show `family_plus().wall_wood`, which falls back to birch without Plus |

Clients can still only update `name` directly.

### `family_rules` (table, select only)

Every rhythm the family has had. Members can read their family's rows.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | |
| `family_id` | uuid | |
| `effective_from` | date | a week start; the rule applies from that week on |
| `goal_per_week` | smallint | |
| `min_minutes` | smallint | |
| `created_by` | uuid, nullable | member id, null for the first rule |
| `created_at` | timestamptz | |

A pending change is the row with `effective_from` after this week's start.

### `create_family(p_family_name text, p_display_name text, p_timezone text, p_reminder_time time = null, p_goal integer = 3, p_min_minutes integer = 10, p_week_starts_on integer = 1) -> members`

Returns the founder's `members` row (same as Arro). The founder gets the first
palette color, lake `#5F8794`. Build 8's four-argument call still works.

| Error | When |
|---|---|
| `42501` `sign in first` | no session |
| `22023` `the goal is 1 to 7 sessions a week` | |
| `22023` `the minimum is 1 to 60 minutes` | |
| `22023` `a week starts on Monday (1) or Sunday (7)` | |

Member palette, handed out in join order to new joiners: `#5F8794` lake,
`#B58A3C` brass, `#7B6A93` heather, `#6E7F5C` moss, `#B66A78` lingonberry,
`#C9542A` ember. Existing members keep the color they have (Arro's palette),
so render `members.colour` as stored.

### `set_family_rules(p_family_id uuid, p_goal integer, p_min_minutes integer) -> date`

The founder only. Changes the goal and minimum from the start of next week in
the caller's own time zone, and returns that date ("Starting Monday, Oct 26").
Calling it again the same week replaces the pending change. Also updates
`families.goal_per_week` and `min_minutes` straight away.

| Error | When |
|---|---|
| `42501` `only the person who started the family can change its rules` | not the founder, or not in the family |
| `22023` `the goal is 1 to 7 sessions a week` | |
| `22023` `the minimum is 1 to 60 minutes` | |

### `members.weekend_checkin` (column)

boolean, default true. The "Weekend check-in" switch in Settings, Notifications.
Members update it on their own row:
`client.from('members').update({ weekend_checkin: false }).eq('id', myMemberId)`.

---

## Sessions

### `sessions` (table)

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | |
| `member_id` | uuid | whose session this row is |
| `shared_id` | uuid, nullable | null when solo. On a shared session every row, the anchor included, has the anchor's id |
| `logged_by` | uuid, nullable | the member who logged it; equals `member_id` on solo and anchor rows. Null if the logger was removed |
| `started_at` | timestamptz | |
| `local_date` | date | set by the server from `started_at` in that member's own time zone |
| `duration_minutes` | smallint | 1 to 240, heat minutes only |
| `rounds` | smallint | 1 to 10 |
| `sauna_type` | text | `traditional`, `wood_fired`, `infrared`, `steam`, `smoke`, `banya`, `other` |
| `temp_c` | numeric(4,1), nullable | 30 to 130 |
| `humidity_pct` | smallint, nullable | 0 to 100 |
| `cold_plunge` | boolean | |
| `cold_minutes` | smallint, nullable | 0 to 30, only with `cold_plunge` |
| `place` | text, nullable | 1 to 60 characters, trimmed |
| `note` | text, nullable | up to 140 characters; anchor or solo rows only |
| `photo_path` | text, nullable | Storage path in the `photos` bucket; anchor or solo rows only |
| `source` | text | `timer` or `manual` |
| `client_id` | uuid | made on the phone; participants' rows carry the logger's |
| `created_at`, `updated_at` | timestamptz | |

Access:

- **Select:** every session of every member of your families. The feed reads
  this table directly (this week and last week, newest first). A shared
  session is the rows with the same `shared_id`; show it as one card from the
  anchor (`id = shared_id`).
- **Insert:** none. Use `log_session`.
- **Update:** only `note` and `photo_path`, only on your own anchor or solo
  rows. Anything else: `update_session`.
- **Delete:** your own rows, except an anchor that still has others on it.
  That's "Remove me from this session": `client.from('sessions').delete().eq('id', myRowId)`.
  When the last other person leaves, the server turns the anchor back into a
  solo session (`shared_id` null).
- **Photos:** upload to `<family id>/<member id>/<name>.jpg` as today
  (`uploadPhoto`), then set `photo_path` with a direct update or
  `update_session`. The logger's folder holds the photo. Deleting a session
  doesn't delete the file; remove it from Storage yourself (your own folder,
  which the policies allow).

### `log_session(...) -> table(session_id uuid, member_id uuid, skipped boolean)`

| Argument | Type | Default |
|---|---|---|
| `p_family_id` | uuid | required |
| `p_started_at` | timestamptz | required |
| `p_duration_minutes` | integer | required |
| `p_sauna_type` | text | required |
| `p_rounds` | integer | 1 |
| `p_temp_c` | numeric | null |
| `p_humidity_pct` | integer | null |
| `p_cold_plunge` | boolean | false |
| `p_cold_minutes` | integer | null |
| `p_place` | text | null (blank becomes null) |
| `p_note` | text | null (empty becomes null) |
| `p_source` | text | `'manual'` |
| `p_with` | uuid[] | `{}`; member ids of up to 3 others in the same family. Duplicates count once |
| `p_client_id` | uuid | null, but required: it raises without one |

Returns one row per person, in this order: the caller's row (the anchor),
then everyone in `p_with` in the order given. `skipped` is true, with
`session_id` null, for someone who already has a session starting within 30
minutes of this one, or whose own today-or-yesterday window doesn't allow the
date. Show "Jo already logged this one" for them.

Idempotent on `p_client_id`: if the caller already logged that client id,
nothing is inserted and the same rows come back (anyone in `p_with` who isn't
in the session comes back as skipped). The outbox can retry freely. A retry
sends no pushes.

| Error | When | What the app does |
|---|---|---|
| `42501` `sign in first` | | |
| `42501` `not a member of this family` | | |
| `42501` `everyone in a session must be in your family` | someone in `p_with` isn't | refuse, keep the draft |
| `22023` `p_client_id is required` | | a bug |
| `22023` `you're already in this session; don't list yourself in p_with` | | a bug |
| `22023` `a session is at most 4 people` | more than 3 distinct ids in `p_with` | |
| `22023` `session date ... after the member's today ...` / `... older than ...; sessions can only be logged for today or yesterday` | the date window closed | keep the draft in `saunafam.draft.v1`, "Couldn't save this one. Tap to fix it" |
| `23514` | minutes, rounds, type, temperature, humidity, cold minutes, place or note out of range | keep the draft |

The date window is the same as Arro's workouts: the member's own today or
yesterday, but never before yesterday in UTC.

### `update_session(p_session_id uuid, p_changes jsonb) -> setof sessions`

The logger (or the owner of a solo session) changes a session for everyone in
it. `p_session_id` can be any row of the session. `p_changes` is a JSON
object; only the keys present change, and a JSON `null` clears an optional
field. Allowed keys:

`started_at`, `duration_minutes`, `rounds`, `sauna_type`, `temp_c`,
`humidity_pct`, `cold_plunge`, `cold_minutes`, `place`, `note`, `photo_path`

`note` and `photo_path` change on the anchor only. Setting `cold_plunge` to
false clears `cold_minutes`. Changing `started_at` re-dates every row in each
member's own zone, and the new date must be in the window.

Returns every row of the session, the anchor first.

| Error | When |
|---|---|
| `42501` `only the person who logged this session can change it` | anyone else, or no such session |
| `22023` `update_session can't change <key>` | a key not in the list |
| `22023` `p_changes must be a JSON object` | |
| `22023` date window | as `log_session` |
| `23514` | a value out of range |
| `22P02` | a value of the wrong type, such as `"duration_minutes": "ten"` |

### `delete_session(p_session_id uuid) -> integer`

The logger deletes the whole session (every row, with its cheers and
comments). Any row id of the session works. Returns how many rows went.

| Error | When |
|---|---|
| `42501` `only the person who logged this session can delete it` | anyone else (they use Remove me) |

---

## Weekly streaks

Statuses for a member's week: `kept`, `pending` (their week isn't over),
`joined` (their first week, not kept; also the week the family started on
Saunafam), `paused` (4 or more break days that week), `frozen` (their freeze
covered it), `missed`.

Family week states: `counted`, `broken`, `pending`, `skip` (nobody was
expected, for example everyone on a break).

### `family_week_streak(p_family_id uuid)`

One row.

| Column | Type | Notes |
|---|---|---|
| `family_streak` | integer | 0 for a solo founder |
| `longest_streak` | integer | |
| `weeks_together_this_year` | integer | never goes down |
| `started_on` | date, nullable | first week start of the family streak; null until a second person joins |
| `latest_week_state` | text, nullable | null until a second person joins |

Error: `42501` `not a member of this family`.

### `member_week_streaks(p_family_id uuid)`

One row per member, in join order.

| Column | Type | Notes |
|---|---|---|
| `member_id` | uuid | |
| `local_today` | date | in that member's zone |
| `week_start` | date | their current week |
| `counted_days` | integer | days this week with a session at or above this week's minimum |
| `counted_dates` | date[] | those days, for the Mon to Sun strip |
| `goal` | integer | this week's goal (the rule in force this week) |
| `min_minutes` | integer | this week's minimum |
| `personal_streak` | integer | weeks in a row |
| `longest_personal_streak` | integer | |
| `kept_this_week` | boolean | |
| `last_week_status` | text, nullable | for "Did you sauna on Sunday? Log it" on Monday morning (show it when this isn't `kept` and yesterday is still open). Null in their first week |
| `freeze_available` | boolean | |
| `freeze_back_on` | date, nullable | the week start the freeze comes back |
| `paused_until` | date, nullable | last day of the break they're on today ("On a break until Friday") |

Error: `42501` `not a member of this family`.

### `family_week_history(p_family_id uuid, p_weeks integer = 12)`

Past weeks for the Week screen: weeks before the caller's current week, newest
first, back to the family's first week. One row per member per week.

| Column | Type | Notes |
|---|---|---|
| `week_start` | date | |
| `family_state` | text, nullable | `counted`, `broken`, `pending`, `skip`; null before the family streak started |
| `freeze_used` | boolean | someone's freeze covered the week ("kept, a freeze was used") |
| `member_id` | uuid | |
| `status` | text | the caller's own row as it is; everyone else's `frozen` and `missed` both read `not_kept` |
| `counted_days` | integer | |
| `goal` | integer | the goal that week |
| `days` | date[] | which days they went |

`p_weeks` is clamped to 12 unless the family has Plus (then up to 520). Fewer
than 1 counts as 1.

Error: `42501` `not a member of this family`.

### `my_session_stats(p_family_id uuid)`

The caller's numbers for the Me grid, in their own zone. One row.

| Column | Type | Notes |
|---|---|---|
| `sessions_this_month` | integer | every session, short ones included |
| `minutes_this_year` | integer | heat minutes |
| `favorite_sauna_type` | text, nullable | most logged; ties go to the latest |
| `favorite_place` | text, nullable | same |

Error: `42501` `not a member of this family`.

### `preview_invite(p_code text)` (changed)

Three columns added at the end. Signed out they're null like the other family
details.

| Column | Type | Notes |
|---|---|---|
| `week_streak` | integer | the weekly family streak, for "Meet the family" |
| `goal_per_week` | integer | "3 sessions a week" |
| `min_minutes` | integer | "10 minutes or more" |

`family_streak` is still Arro's daily number (for build 8); don't show it.

---

## Cheers and comments

Both only go on an anchor or solo row: pass the anchor's id (`shared_id ??
id`). Any other row raises `22023` `cheers and comments go on the shared
session's anchor row`.

### `session_cheers` (table)

Columns: `id` uuid, `session_id` uuid, `member_id` uuid (who cheered),
`created_at` timestamptz. One per person per session.

- Select: cheers by anyone in your families.
- Insert `(session_id, member_id)` with your own member id, on a session in
  your family. Else `42501`; a second cheer `23505`.
- Delete your own.

### `session_comments` (table)

Columns: `id` uuid, `session_id` uuid, `member_id` uuid (who wrote it), `body`
text, `created_at` timestamptz.

- Select: comments by anyone in your families.
- Insert `(session_id, member_id, body)`: your own member id, a session in your
  family, `body` 1 to 200 characters as sent and not blank (`23514`). 20 a day
  per member (`P0001` `too many comments today`).
- Delete your own comments, and any comment on a session you logged.

---

## Nudges

`nudges` is unchanged (insert `(from_member_id, to_member_id)`, one per person
per day, `23505` for a second). What changed is the push: at most 2 nudge
pushes a week per person, none while they're on a break, none at night. A
nudge past those limits is still saved, it just doesn't push.

---

## Pushes

Exact copy is in `design/copy/notifications.md`. Every push's `data` has a
`kind`. Route taps like this:

| `data.kind` | `data` fields | Opens |
|---|---|---|
| `session` | `sessionId` (anchor id), `memberId` (logger) | SessionDetail(`sessionId`) |
| `shared` | `sessionId` (anchor id), `memberId` (logger) | SessionDetail(`sessionId`) |
| `session_cheer` | `sessionId` (anchor id), `cheererId` | SessionDetail(`sessionId`) |
| `session_comment` | `sessionId` (anchor id), `commentId` | SessionDetail(`sessionId`) |
| `nudge` | `memberId` (who nudged) | Nudge |
| `weekend` | `memberId` (first person named), `weekStart` (`'YYYY-MM-DD'`) | the Week tab |
| `joined` | `memberId` (who joined) | Family members, unchanged |

Build 8's kinds (`cheer`, `comment`, `moved`, `evening`) are no longer sent.
After logging, cheering, commenting or nudging, call `send-push` as today so
queued pushes go straight out; the 15-minute `saunafam-weekend` schedule also
sends anything left.

---

## Saunafam Plus

### `family_plus(p_family_id uuid)`

Always one row.

| Column | Type | Notes |
|---|---|---|
| `active` | boolean | the family has Plus right now |
| `product` | text, nullable | `saunafam.plus.annual` or `saunafam.plus.lifetime` (Founding family) |
| `status` | text, nullable | `trial`, `active`, `grace_period`, `billing_issue`, `cancelled`, `expired` |
| `expires_at` | timestamptz, nullable | null for Founding family |
| `payer_name` | text, nullable | null if the payer left ("Plus, from Maya") |
| `payer_is_me` | boolean | show Manage instead of "from Maya" |
| `wall_wood` | text | the wood to draw: the family's pick while active, else `birch` |

`active` is true for Founding family unless it's expired (refunded); for
`trial`, `active` and `grace_period` until `expires_at`; for `cancelled` until
`expires_at`.

Error: `42501` `not a member of this family`.

The app never decides Plus from local purchase state: refresh `family_plus`
after `sync-plus`.

### `set_wall_wood(p_family_id uuid, p_wood text) -> text`

Any member. Returns the new wood.

| Error | When |
|---|---|
| `42501` `not a member of this family` | |
| `22023` `the wall can be birch, cedar, alder or charred_pine` | |
| `SF402` `that wood needs Saunafam Plus` | anything but birch without Plus |

`family_plans` stays readable by members (select only). `plus_events` isn't
readable or writable by clients at all.

---

## Edge functions

All are `POST` to `https://<project>.supabase.co/functions/v1/<name>`. Call them
with `client.functions.invoke('<name>', { body })`, which sends the user's JWT.

### `sync-plus`

Call right after a purchase or a restore. It reads the caller's purchases from
RevenueCat and writes the family's plan, so nobody waits for the webhook.

Request body: `{ "familyId"?: string }`. Send the family the app is showing.

| Status | Body | Meaning |
|---|---|---|
| 200 | `{ synced: true, familyId, applied: boolean, reason: string, plus: { active, product, status, expiresAt } }` | `applied` false means the family's existing plan won (for example it already had Founding family from someone else: "Your family already had Plus...") |
| 200 | `{ synced: false, reason: "no_purchase" }` | "No purchases found for this Apple ID." |
| 200 | `{ synced: false, reason: "pick_a_family" }` | in several families and no `familyId`; send one |
| 401 | `{ error: "sign in first" }` | |
| 403 | `{ error: "not a member of that family" }` | |
| 502 | `{ error }` | RevenueCat couldn't be reached: "Couldn't reach the App Store. Try again." |

Then call `family_plus` for what to show.

### `delete-account` (changed)

New dry run, to call before deleting:

Request `{ "dryRun": true }` -> 200
`{ deleted: false, paysForPlus: boolean, plans: [{ familyId, familyName, product, status, expiresAt }] }`

`paysForPlus` is true when the caller pays for a yearly plan that will renew
(`trial`, `active`, `grace_period` or `billing_issue`). Then show "You pay for
Saunafam Plus. Deleting your account doesn't cancel it. Cancel in Settings,
Apple ID, Subscriptions first." Founding family never renews, so it doesn't
count.

The real delete is unchanged (`{ appleAuthorizationCode? }`) and now answers
`{ deleted: true, appleRevoked, paysForPlus }`.

### `revenuecat-webhook`

Server to server, not called by the app. RevenueCat posts `{ api_version, event }`
with the `Authorization` header set in its dashboard, which must equal the
`REVENUECAT_WEBHOOK_SECRET` secret. Answers 200 for anything handled
(duplicates included), 401 for a wrong secret, 400 without an event, 500 when
the secret isn't set or the database fails. Deployed with JWT checks off
(`supabase/config.toml`, `--no-verify-jwt`).

### `remove-member`, `send-push`

Unchanged requests and responses. `remove-member` also deletes session photos,
since they live in the member's folder.
