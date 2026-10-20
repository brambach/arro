# Brief for every agent working on Saunafam build 9

Read this whole file before doing anything.

## Sources of truth

- `design/saunafam-spec.md` is the spec (a copy of `/tmp/luna-arro/spec/SPEC.md`).
  Read the sections your milestone names, plus "Definition of done" and
  "Quality bar", in full. Use the spec's **Default** for every open question.
- Approved look: `/tmp/luna-arro/spec/mockups/board-A-loyly.jpg`,
  `/tmp/luna-arro/spec/mockups/A-loyly/*.png`, and their HTML sources in
  `/tmp/luna-arro/spec/mockups/src/A/` plus `src/common.css` and `src/common.js`
  (wood grain, wall slats, ember dots, the timer arc). Match their craft.
  `board-B` and `board-C` are rejected; they're only a reference for the Plus
  "Coal" and "Brass" timer faces.
- `AGENTS.md` in the repo: its standing rules apply.
- `docs/saunafam/PROGRESS.md`: what's done, the decisions so far, how to run the
  checks. Add your milestone's row, proof paths and decisions to it when you
  finish.
- Expo SDK 57 docs: https://docs.expo.dev/versions/v57.0.0/ . Read the page for
  any Expo library before writing code against it. Install native packages with
  `npx expo install`.

## Hard rules

- Never run `eas build` / `eas submit`, never touch App Store Connect or
  RevenueCat dashboards, never `supabase db push` or link to the hosted project,
  never `wrangler deploy`, never change DNS.
- Never print secrets or env values (EXPO_TOKEN, ASC_API_KEY_P8,
  SUPABASE_ACCESS_TOKEN, the anon key, any API key). Check with `[ -n "$VAR" ]`.
- Keep bundle id `com.arrofamily.arro`, `expo.slug` "arro", the EAS project id,
  `supabase/config.toml` project_id "arro".
- Don't touch `~/dd` or anything outside the repo, except reading
  `/tmp/luna-arro/spec`, the iOS Simulator, and local Supabase/Docker state.
- Don't change git or gh auth. Don't push, don't open PRs, don't merge. The
  coordinator pushes. Commit on the branch you were given, with clear messages.
- Don't commit the SF Pro font files from the mockups. The app uses the system
  font. Fraunces (OFL) is fine to ship.
- No em dashes or en dashes anywhere: copy, comments, commit messages, docs.
  Use a spaced hyphen, a full stop, or rewrite. American spelling. Contractions
  are fine and preferred in copy.
- Sample names only: Sam, Maya and Jo (family "Sunday sauna"). No real names or
  places in seed, demo or preview data.
- TypeScript strict. No new `any`, no `@ts-ignore`, no non-null `!` without a
  comment saying why.

## Checks

```bash
npm run typecheck
npm run lint
npm test
supabase db reset          # only the DB track; re-applies all migrations
scripts/test-db.sh         # pgTAP (supabase test db can't see /tmp here)
DENO_NO_PACKAGE_JSON=1 deno check supabase/functions/*/index.ts
```

Only one agent at a time uses the local Supabase database. If your task
doesn't own the database, don't reset it.

## Simulator

- Xcode 26.6. Use an iPhone 17 Pro simulator for captures (6.3 inch). For App
  Store 6.9 inch captures use iPhone 17 Pro Max.
- Screenshots: `xcrun simctl io <udid> screenshot <file>`. Recordings:
  `xcrun simctl io <udid> recordVideo --codec h264 <file>` (stop with SIGINT).
- Screenshots go in `design/screenshots/saunafam/`, recordings in
  `design/recordings/saunafam/`. Keep recordings short and compressed (ffmpeg
  is installed) so the repo stays small: aim for under 3 MB per clip.
- If several agents use the simulator, use the device UDID you were given.

## Quality bar (summary; the spec's section wins)

- One type scale (`src/theme/typography.ts`), a 4 pt spacing grid
  (4, 8, 12, 16, 20, 24, 32, 40, 56, 72), hex colors only in `src/theme/`.
- No default Button/Switch/TextInput look, no default nav headers, no outlined
  pill buttons, no arrow glyphs on links.
- Reanimated for motion, reading durations and curves from
  `src/theme/motion.ts`. Transform and opacity only. Reduce Motion respected.
- Haptics from the table in `src/theme/haptics.ts`, fired when motion lands.
- No flicker: cache first, fixed-size placeholders.
