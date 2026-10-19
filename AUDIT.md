# Security and privacy audit

Done on 19 October 2026, before parking the repo. The repo was already public
on GitHub when this ran.

## Result

**Nothing needs rotating.** No API key, token, private key, password, service
role key, `.env` file or App Store Connect key has ever been committed, on any
branch or pull request. Nothing in git history needs rewriting for secrets.

## What was scanned

- Every commit reachable from any ref, including GitHub's pull request refs
  (`refs/pull/*`, fetched for this): 132 commits, 1 July to 19 October 2026.
- **gitleaks 8.30.1** over that history (`gitleaks git --log-opts=--all`) and
  over the working tree (`gitleaks dir`). No findings either time.
- A manual search of `git log -p --all` for JWTs (`eyJ...`), PEM headers,
  `service_role` keys, `sb_secret_`/`sb_publishable_` keys, hosted
  `*.supabase.co` URLs, `EXPO_TOKEN`, GitHub, AWS, Slack and Stripe token
  formats, `password`/`secret` assignments, and every file ever added with a
  name like `.env`, `.p8`, `.pem`, `.p12`, `.key`, `credentials` or `token`.
  The only hits were `service_role` as a Postgres role name in migrations,
  `Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')` in the edge functions (read at
  runtime, never a value), and commented `env(...)` placeholders in
  `supabase/config.toml`.

## Values that are public by design

- **Supabase project URL and anon key:** not in the repo or its history at
  all. They live in `.env.local` (git ignored) and in EAS environment
  variables. The anon key is designed to be public once it ships in an app
  binary anyway.
- **Vault secrets** `project_url` and `anon_key`, which pg_cron uses to call
  `send-push`, are read from Supabase Vault
  (`20261005000008_evening_nudge.sql`, `20261017000004_workout_pushes.sql`).
  No values are committed.
- **`app.json`:** `owner: "brycerambach"` and `extra.eas.projectId`
  `6540...20`. These identify the Expo account and project. They aren't
  secrets, and only members of that Expo account can build or submit with
  them. They stay because `src/state/notifications.ts` needs a project id for
  push registration. The README tells anyone forking it how to replace them.
- **`eas.json`** has an empty `submit.production`, with no App Store Connect
  app id, Apple id or team id.
- **Bundle id** `com.arrofamily.arro` and the domain `arrofamily.com`.

## Personal information

- **Bryce's personal Gmail** is the author or committer email on 64 of the 132
  commits. It's in git metadata only, never in a file. Removing it would mean
  rewriting history and force-pushing, so it was left. Recommended: leave it,
  since it's been public since the first push, and use the GitHub noreply
  address for any future commits (`git config user.email`).
- **First names in the preview family** (`src/data/family.ts`): "Bryce",
  "Darcey" and "Whit", in Brisbane. The same names are in the design sketches,
  `design/Arro.dc.html`, the market research notes and some test fixtures. If
  Darcey and Whit are real people who'd rather not be named, rename them in
  `src/data/family.ts`, `src/data/types.ts`, `src/state/buildView.ts`,
  `src/data/workouts.ts`, the Jest and pgTAP tests, and `design/`. The old
  names stay in history either way.
- **The preview route** in `src/data/family.ts` is a short loop of
  coordinates in inner Brisbane, around New Farm. It looks like a
  sample public route, not a home address, but if it's a real run that starts
  at someone's door, change it.
- **Named on purpose:** the privacy policy (`design/app-store/privacy-policy.md`
  and `site/public/privacy/`) names Bryce Rambach as the developer with
  `support@arrofamily.com`. `demo-mum@arrofamily.com` appears once as an
  example address in `design/app-store/review-notes.md`.
- **Not found:** phone numbers, street addresses, photos of people, device
  ids or push tokens. The only images are app icons, site art and design
  sketches that use initial avatars.

## Could a stranger with the anon key read or write family data?

**No.** Checked against the migrations and, empirically, on a local database
with every migration applied (`supabase db start`, then queries as `anon`):

- `anon` has no grants on any table in `public` or `private`. A
  `select` from `public.families` as `anon` fails with "permission denied".
- Row level security is on for every table in `public`.
- The `photos` Storage bucket is private (`public = false`), and all four
  `storage.objects` policies are for `authenticated` only and limited to the
  caller's own families.
- The only function `anon` can call through the API is `preview_invite`.
  Signed out, it returns a family's name and member count for a valid,
  unexpired join code, and nothing else. It's rate limited.
- Eight trigger and helper functions in `private` still have EXECUTE for
  `anon` (the default), but `anon` has no USAGE on the `private` schema and
  the API doesn't expose it, so they can't be reached.

A stranger can also become `authenticated` by signing in with any Apple ID.
Signed in, they can only see families they've joined, and joining needs a
code. Codes are 8 characters from a 31-character alphabet (about 40 bits),
expire after 14 days, and each caller gets 10 tries per 15 minutes. Every
security definer function that takes a family or member id
(`family_streak`, `member_streaks`, `pause_me`, `end_my_pause`,
`remove_member`) checks the caller first. `delete-account` and
`remove-member` look up the caller from their JWT before using the service
role, and `remove-member` lets the database decide who may remove whom. The
192 pgTAP tests in `supabase/tests/database/` pass.

### Smaller things, not urgent

- `register_push_token` reassigns a token that already exists to whoever
  registers it. Someone who knew another phone's Expo push token could move
  that phone's pushes to their own account. Tokens are only readable by their
  owner, so this needs a token leaked some other way.
- `preview_invite` has a shared limit of 200 signed-out attempts per hour
  across all IP addresses. One script could use it up and block signed-out
  invite previews for everyone for an hour. It's a nuisance, not a data leak.
- `send-push` accepts any valid JWT, including the anon key. It only sends
  pushes that are already queued, so calling it early does no harm.

## What this audit didn't check

- **The production Supabase project.** Nothing was run against it. Whether
  its schema matches these migrations, its Auth settings (anonymous sign-ins,
  email and phone sign-up), any policies added in the dashboard, and its
  Vault contents are all unverified from here.
- EAS environment variables, App Store Connect, GitHub repository settings
  and Actions secrets.
- Copies made before today: forks, clones, and anything GitHub or search
  engines cached. If a secret ever turns out to have been public, rotating it
  is the fix, not deleting it.
- Text in GitHub issues, pull request descriptions and comments. Only git
  contents were scanned.
