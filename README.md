# Saunafam

Saunafam is a shared weekly sauna streak for families and friend groups.
Everyone takes a sauna whenever and wherever they like, at home, the gym or a
bathhouse. Tap a timer, or log the session afterward. The group keeps one
weekly streak together, three sessions a week each by default. If you sat
together, one person logs it for everyone.

Nobody is ranked, a missed week is never pinned on a person, and nudges are
capped. It's iPhone only, in TestFlight. Website: https://saunafam.com
(`site/`).

**It used to be Arro,** a daily movement streak for families. Build 9 (October
2026) rebuilt it around the sauna. Testers keep their sign-in and their
family, and the streak starts fresh. The iOS bundle id is still
`com.arrofamily.arro` and the Expo slug is still `arro`, so build 9 installs as
an update. The design docs in `design/` that start with "Written for Arro,
before it became Saunafam." describe the old app.

## Stack

- **Expo SDK 57**, React Native 0.86, React 19, TypeScript (strict), React
  Navigation 7, Reanimated for motion
- **Supabase**: Postgres with row level security, Storage for photos, pg_cron
  for the weekend push, and Deno edge functions (`send-push`,
  `delete-account`, `remove-member`, `revenuecat-webhook`, `sync-plus`)
- **Sign in with Apple** (`expo-apple-authentication`) is the only sign-in
- **Apple Health**, write only: sessions saved as mindful minutes if you turn
  it on. Saunafam never reads from Health
- **Push** through `expo-notifications`; the server sends with Expo's push
  service
- **Saunafam Plus**, an optional family plan through RevenueCat
  (`react-native-purchases`). Built in and switched off
  (`app_config.plus_enabled = false`) until the App Store side exists
- The website in `site/` is plain HTML on a Cloudflare Worker

The app talks to Supabase only through `src/state/backend.ts`.

## Run it

### Quick look, no server

```bash
npm install
npx expo start --web   # opens in a browser on the built-in sample family
```

With no Supabase settings a dev build runs on a sample family kept on the
device ("Sunday sauna", with Sam, Maya and Jo), so you can click through every
screen. A release build without them refuses to start ("This build can't
reach Saunafam").

### On an iPhone, with your own Supabase project

You'll need a Mac with Xcode, an Apple Developer account (Sign in with Apple
and HealthKit both need one), the [Supabase CLI](https://supabase.com/docs/guides/cli),
and Docker if you want the local database.

1. **Make it yours in `app.json`.** Change `ios.bundleIdentifier` from
   `com.arrofamily.arro` to your own. Delete `owner` and
   `extra.eas.projectId`, which point at the original author's Expo account,
   then run `npx eas-cli init` to make your own. Keep a project id there: push
   registration in `src/state/notifications.ts` needs one.
2. **Create a Supabase project** and apply the schema:
   ```bash
   npx supabase link --project-ref <your-project-ref>
   npx supabase db push          # applies supabase/migrations in order
   ```
3. **Auth.** In the dashboard, turn on the Apple provider with your bundle id
   as the client id, and turn off email and phone sign-up. Saunafam only uses
   Sign in with Apple.
4. **Edge functions.**
   ```bash
   npx supabase functions deploy send-push
   npx supabase functions deploy delete-account
   npx supabase functions deploy remove-member
   npx supabase functions deploy sync-plus
   npx supabase functions deploy revenuecat-webhook --no-verify-jwt
   ```
   `.env.example` lists the optional secrets: `EXPO_ACCESS_TOKEN`, and the
   four `APPLE_*` values for revoking an Apple token on account deletion. Plus
   needs `REVENUECAT_WEBHOOK_SECRET` and `REVENUECAT_SECRET_API_KEY`
   (`docs/saunafam/API.md`). Set them with `npx supabase secrets set NAME=value`.
5. **Vault secrets for pushes.** pg_cron calls `send-push` with two Vault
   secrets. In the SQL editor:
   ```sql
   select vault.create_secret('https://<your-project-ref>.supabase.co', 'project_url');
   select vault.create_secret('<your anon key>', 'anon_key');
   ```
   Without them, pushes stay queued and nothing else breaks.
6. **App settings.** Copy `.env.example` to `.env.local` and fill in
   `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`. For EAS
   builds, set the same two as EAS environment variables, because EAS doesn't
   read `.env.local`. Plus also needs `EXPO_PUBLIC_REVENUECAT_IOS_KEY`.
7. **Run it.** HealthKit and RevenueCat don't work in Expo Go, so use a dev
   build:
   ```bash
   npx expo run:ios
   ```

The anon key is meant to be public. Row level security in
`supabase/migrations/` keeps each family's data to its members, and the pgTAP
tests check it.

## Tests

```bash
npm run typecheck                    # tsc --noEmit
npm run lint                         # expo lint (eslint-config-expo)
npm test                             # Jest: week math, the outbox, the timer, Plus states
npx supabase db start                # local Postgres with every migration (needs Docker)
npx supabase test db                 # pgTAP: row level security, weekly streaks, sessions, pushes, Plus
DENO_NO_PACKAGE_JSON=1 deno check supabase/functions/*/index.ts
npx expo export --platform ios       # bundle check
```

If Docker only mounts your home folder (Colima does) and the checkout lives
elsewhere, `supabase test db` finds no tests. `scripts/test-db.sh` runs the
same pgTAP image with the files copied in.

GitHub Actions (`.github/workflows/ci.yml`) runs all of these except the
export on every pull request.

## Layout

```
App.tsx, index.ts     entry, providers, navigation, splash
src/state/            AppState, backend (every Supabase call), buildView, purchases, health, notifications
src/screens/          one file per screen; onboarding/ for first run
src/components/       shared UI (the slat wall, ember dots, heat glow, buttons, rows)
src/navigation/       RootNavigator, MainTabs, types
src/theme/            tokens, typography, motion, haptics (every color and size lives here)
src/data/             types, the sample family, sauna types, streak rules
assets/brand/         icon and wordmark SVG masters; scripts/generate-icons.mjs renders the rest
supabase/migrations/  SQL migrations, applied in version order
supabase/tests/       pgTAP tests
supabase/functions/   edge functions, one folder each; _shared/ for helpers
supabase/drafts/      build10_cleanup.sql, not applied
site/                 the saunafam.com website (Cloudflare Worker)
design/               the build 9 spec, App Store material, copy, screenshots
docs/saunafam/        the agent brief, progress log and API reference for build 9
```

### Screens

Four tabs, **Today**, **Week**, **Feed** and **Me**, plus:

| Screen | How to get there |
|---|---|
| Onboarding | first launch: **Start a family** or **I have an invite** |
| Timer | **Start a session** on Today |
| Log session | **Done** on the timer, or **Log one I already did** |
| Session detail | tap a session in Feed, or a recent one on Me |
| Nudge | tap someone on Today who hasn't kept their week |
| Milestone | the family or personal streak reaching 4, 8, 12, 26 or 52 weeks |
| Invite | Settings, or tap someone invited on Today |
| Settings | the gear on Me |

Screenshots of every screen and state are listed in
`design/screenshots/saunafam/INDEX.md`.

## Things that still point at the original project

- `app.json`: the bundle id `com.arrofamily.arro`, `slug` "arro", `owner`
  and the EAS project id.
- `supabase/config.toml`: `project_id = "arro"`.
- Settings links to the privacy and support pages on saunafam.com, and invite
  links use it too (`src/state/invite.ts`). Change both if you ship your own
  copy.
- `design/app-store/` is the App Store and TestFlight material for this app.
  The account details in it are the original author's.
- `AGENTS.md` holds the working notes for the coding agents.

## Read next

- `design/saunafam-spec.md`: the build 9 spec
- `docs/saunafam/PROGRESS.md`: what's done and the decisions made
- `docs/saunafam/API.md`: every RPC, table, push and edge function
- `AUDIT.md`: the security and privacy check done on Arro in October 2026

## License

MIT, see `LICENSE`.
