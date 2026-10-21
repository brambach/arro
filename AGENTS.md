# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.
(`package.json` pins `expo ~57.0.x`; if the SDK moves, update this link.)

# Saunafam: shared context for agents

## What Saunafam is

A shared weekly sauna streak for families and friend groups. Everyone takes a
sauna when and where they like, taps a timer or logs it afterward, and the
group keeps one weekly streak together (3 sessions a week each, 10 minutes or
more, by default). One person can log a session for up to 3 others who sat
with them. No rankings, a missed week is never pinned on anyone, nudges are
capped. iPhone only, in TestFlight. Owner: Bryce Rambach. Website:
saunafam.com (`site/`); arrofamily.com redirects there.

It was Arro, a daily movement streak, until build 9 (October 2026). The spec
for the rebuild is `design/saunafam-spec.md`; progress and decisions are in
`docs/saunafam/PROGRESS.md`, the brief for agents in
`docs/saunafam/AGENT-BRIEF.md`, the server API in `docs/saunafam/API.md`.
Design docs that start with "Written for Arro, before it became Saunafam." are
history.

## Stack

- Expo SDK 57, React Native 0.86, React 19, TypeScript (strict), React Navigation 7.
- iOS bundle `com.arrofamily.arro`, `expo.slug` "arro", EAS project owner `brycerambach`
  and the EAS project id (`app.json`). All kept from Arro so testers get Saunafam as an
  update and Sign in with Apple keeps working. Don't change them.
  `ios.buildNumber` in `app.json` is the build number (`eas.json` has `appVersionSource: "local"`).
- Supabase `project_id = "arro"` in `supabase/config.toml` stays too.
- Motion with `react-native-reanimated`, durations and curves from `src/theme/motion.ts`;
  haptics from `src/theme/haptics.ts`.
- Supabase: Postgres with row level security, Storage for photos, pg_cron pushes,
  Deno edge functions. The app talks to it only through `src/state/backend.ts`.
- Sign in with Apple (`expo-apple-authentication`) is the only sign-in.
- Apple Health via `@appeeky/expo-healthkit` (`src/state/health.ts`), write only: sessions
  as mindful minutes if the person turns it on. Nothing reads from Health.
- Saunafam Plus through RevenueCat (`react-native-purchases`, `src/state/purchases.ts`), one
  plan per family, decided on the server (`family_plus`). Built in and off by default:
  `app_config.plus_enabled` is false until Bryce turns it on in a later build.
- Push via `expo-notifications`; the server sends through the `send-push` edge function.
- Config: `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` from
  `.env.local` (git ignored). Without them a dev build runs on a local preview
  family; a release build refuses to start ("This build can't reach Saunafam").
  Plus also reads `EXPO_PUBLIC_REVENUECAT_IOS_KEY`.

## Layout

```
App.tsx, index.ts     entry, providers, navigation, splash
src/state/            AppState, backend (all Supabase calls), buildView, health, notifications
src/screens/          one file per screen; onboarding/ for first run
src/components/       shared UI
src/navigation/       RootNavigator, MainTabs, types
src/theme/            tokens, typography, motion, haptics (hex colors live only here)
src/data/             types, preview family ("Sunday sauna": Sam, Maya, Jo), sauna types, streak rules
assets/brand/         icon and wordmark SVG masters
scripts/              generate-icons.mjs, test-db.sh
supabase/migrations/  SQL migrations, applied in version order
supabase/tests/database/  pgTAP tests (*.test.sql)
supabase/functions/   edge functions, one folder each with index.ts; _shared/ for helpers
supabase/drafts/      build10_cleanup.sql (not a migration, not applied)
site/                 saunafam.com (Cloudflare Worker, `npx wrangler deploy`, from Bryce's Mac)
design/               saunafam-spec.md; app-store/ (listing, privacy, testflight.md); copy/ (app and push copy)
docs/saunafam/        AGENT-BRIEF.md, PROGRESS.md, API.md
```

## Checks (same as `.github/workflows/ci.yml`)

Run from the repo root. CI runs all but `expo export` on every PR and push to main.

```bash
npm ci
npm run typecheck                    # tsc --noEmit
npm run lint                         # expo lint (eslint-config-expo)
npm test                             # TZ=America/Los_Angeles jest (jest-expo preset)
supabase db start                    # local Postgres with all migrations applied (needs Docker)
supabase test db                     # pgTAP, supabase/tests/database
scripts/test-db.sh                   # pgTAP when Docker can't see the checkout (Colima, /tmp)
DENO_NO_PACKAGE_JSON=1 deno check supabase/functions/*/index.ts
DENO_NO_PACKAGE_JSON=1 deno test --allow-read=supabase/functions supabase/functions/
npx expo export --platform ios       # bundle sanity check, not in CI
```

To drive the app in the simulator and take screenshots as proof, use the
`verify-saunafam` skill (`.claude/skills/verify-saunafam/SKILL.md`).

- CI pins Supabase CLI 2.121.0, Node 22, Deno 2.x.
- After changing migrations locally: `supabase db reset` re-applies them all
  from scratch, then `supabase test db`. `supabase start` brings up the full
  local stack (Auth, Storage, functions) when you need more than the database.
  Edge functions locally: `supabase functions serve`.

## Migrations

- File name `YYYYMMDDNNNNNN_short_name.sql` (date plus a 6 digit counter). Every
  version must be unique across all branches; a duplicate breaks
  `supabase start` on the `schema_migrations` key. Check open PRs before picking one.
- Never edit a migration once it has been applied to production. Add a new one.
  Unreleased migrations may be edited until they ship.
- Add or update pgTAP tests in `supabase/tests/database/` with every schema
  change, and test them only against local Supabase.

## Edge functions

- `supabase/functions/<name>/index.ts`, Deno, `Deno.serve`, npm imports as `npm:pkg@ver`.
  Shared code in `_shared/`. Current: `send-push`, `delete-account`, `remove-member`,
  `revenuecat-webhook` (deployed with `--no-verify-jwt`; RevenueCat sends its own
  Authorization value) and `sync-plus`.
- Checked by `deno check` in CI. Deployed by hand with `npx supabase functions deploy <name>`
  and `npx supabase secrets set`, only on Bryce's go. The runtime provides `SUPABASE_*` keys.

## Release process

Each TestFlight build is one release PR (`release/build-N`) that merges the open
feature PRs with `--no-ff` and bumps `ios.buildNumber` in its own commit. The PR
body lists every migration, function and secret that production needs.

Production rollout, every step only on Bryce's explicit go, in this order:

1. Apply the release's new migrations to the hosted project
   (`supabase migration list --linked`, `supabase db push --dry-run`, then `supabase db push`).
2. Deploy new or changed edge functions.
3. Set any new secrets.
4. Make the Auth or dashboard changes the PR lists.
5. Make sure the EAS env vars are set, then `eas build` and `eas submit`.

Current: build 9, the first Saunafam build, on branch `feat/saunafam`, draft PR #24
("Saunafam: build 9"). The milestone branches (`saunafam/db`, `saunafam/site`,
`saunafam/docs` and the app tracks) merge into it. Its rollout:

- migrations `20261021000001_saunafam_families`, `20261021000002_sessions`,
  `20261021000003_weekly_streaks`, `20261021000004_session_social`,
  `20261021000005_saunafam_pushes`, `20261021000006_saunafam_plus`. They only add, so
  build 8 keeps working; apply them right before build 9 goes to TestFlight, because
  `families.saunafam_started_on` is the day they run;
- functions: new `revenuecat-webhook` (with `--no-verify-jwt`) and `sync-plus`, changed
  `delete-account` and `remove-member`;
- secrets `REVENUECAT_WEBHOOK_SECRET` and `REVENUECAT_SECRET_API_KEY` (Supabase) and
  `EXPO_PUBLIC_REVENUECAT_IOS_KEY` (EAS), needed only once Plus is set up in App Store
  Connect and RevenueCat. Build 9 ships with `app_config.plus_enabled = false`;
- saunafam.com deployed, with DNS and email routing (`site/README.md`), and the App Store
  Connect rename, URLs and App Privacy answers (`design/app-store/`).

`ios.buildNumber` goes to 9 in its own commit. Build 7 (PR #20) was the first EAS build;
build 8 followed. Details: `design/app-store/testflight.md`.

## Standing rules

Merging: the overseer asks Bryce about each PR, and only after he says "ye" does
the overseer merge it, with a merge commit. Agents never merge.

Each of these needs Bryce's explicit go first:

- Never close the original PRs, push to main, or rename the repo or app.
- Never run `eas build` or `eas submit`.
- Never touch the production Supabase project or App Store Connect.

Always work on a branch and open a PR against main. Use American spelling and
no em or en dashes in user-facing copy (app, site, App Store, pushes) or here.
