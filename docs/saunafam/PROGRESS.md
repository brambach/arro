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
- D10. Icon direction D, a domed river stone with heat beneath and two wisps,
  chosen from four in `design/brand/icon-explorations.png` (A is the mockup's
  puck). 40 px and under use `icon-small.svg` (no texture, bolder wisps); the
  favicon drops the wisps and enlarges the stone.
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
