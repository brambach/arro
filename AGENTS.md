# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.
(`package.json` pins `expo ~57.0.x`; if the SDK moves, update this link.)

# Arro: shared context for agents

## What Arro is

A daily movement streak for families who live apart. Everyone moves a little,
everyone sees it, and the family keeps one streak together. Any workout counts.
No rankings, a missed day is never public, nudges are capped. Workouts come from
Apple Health or a manual "I moved today" check-in. iPhone only for v1, in
TestFlight. Owner: Bryce Rambach. Landing page: arrofamily.com (`site/`).

## Stack

- Expo SDK 57, React Native 0.86, React 19, TypeScript (strict), React Navigation 7.
- iOS bundle `com.arrofamily.arro`; EAS project owner `brycerambach` (`app.json`).
  `ios.buildNumber` in `app.json` is the build number (`eas.json` has `appVersionSource: "local"`).
- Supabase: Postgres with row level security, Storage for photos, pg_cron pushes,
  Deno edge functions. The app talks to it only through `src/state/backend.ts`.
- Sign in with Apple (`expo-apple-authentication`) is the only sign-in.
- Apple Health via `@appeeky/expo-healthkit` (`src/state/health.ts`, `healthSync.ts`).
- Push via `expo-notifications`; the server sends through the `send-push` edge function.
- Config: `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` from
  `.env.local` (git ignored). Without them a dev build runs on a local preview
  family; a release build refuses to start ("This build can't reach Arro").

## Layout

```
App.tsx, index.ts     entry, providers, navigation, splash
src/state/            AppState, backend (all Supabase calls), buildView, health, notifications
src/screens/          one file per screen; onboarding/ for first run
src/components/       shared UI
src/navigation/       RootNavigator, MainTabs, types
src/theme/            tokens, typography, motion
src/data/             types, preview family, workout labels
supabase/migrations/  SQL migrations, applied in version order
supabase/tests/database/  pgTAP tests (*.test.sql)
supabase/functions/   edge functions, one folder each with index.ts; _shared/ for helpers
site/                 arrofamily.com (Cloudflare Worker, `npx wrangler deploy`, from Bryce's Mac)
design/               product docs; design/app-store/ has listing, privacy, testflight.md
```

## Checks (same as `.github/workflows/ci.yml`)

Run from the repo root. CI runs all but `expo export` on every PR and push to main.

```bash
npm ci
npm run typecheck                    # tsc --noEmit
npm test                             # TZ=America/Los_Angeles jest (jest-expo preset)
supabase db start                    # local Postgres with all migrations applied (needs Docker)
supabase test db                     # pgTAP, supabase/tests/database
DENO_NO_PACKAGE_JSON=1 deno check supabase/functions/*/index.ts
npx expo export --platform ios       # bundle sanity check, not in CI
```

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
  Shared code in `_shared/`. Current: `send-push`, `delete-account`, `remove-member`.
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

Current: build 7, PR #20 (`release/build-7`, merged to main). Its rollout: migrations
`20261017000001_join_security`, `20261017000003_pause`,
`20261017000004_workout_pushes`, `20261018000001_build7_review`; functions
`delete-account` and `remove-member`; secrets `APPLE_TEAM_ID`, `APPLE_CLIENT_ID`,
`APPLE_KEY_ID`, `APPLE_PRIVATE_KEY`; email and phone sign-up turned off in
production Auth; `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`
as EAS env vars (EAS never sees `.env.local`). Builds 4 to 6 were archived in
Xcode; build 7 is the first EAS build. Details: `design/app-store/testflight.md`.

## Standing rules

Merging: the overseer asks Bryce about each PR, and only after he says "ye" does
the overseer merge it, with a merge commit. Agents never merge.

Each of these needs Bryce's explicit go first:

- Never close the original PRs, push to main, or rename the repo or app.
- Never run `eas build` or `eas submit`.
- Never touch the production Supabase project or App Store Connect.

Always work on a branch and open a PR against main. Use American spelling and
no em or en dashes in user-facing copy (app, site, App Store, pushes) or here.
