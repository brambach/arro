---
name: verify-saunafam
description: Drive the Saunafam iPhone app in the iOS Simulator the way a person does, and capture screenshots as proof. Builds and caches the dev client, launches it on the local preview family, sets a 9:41 status bar, taps by on-screen text without taking the mouse, switches Dynamic Type sizes. Use to prove a change to any screen, to reproduce a layout bug at a text size, or before retaking stills or App Store screenshots.
---

# Verify Saunafam in the simulator

Everything goes through one helper. Run it from the repo root:

```bash
V=.claude/skills/verify-saunafam/scripts/verify.mjs
node $V help
```

It keeps the run's state (PIDs, the simulator, the text size it found) in
`/tmp/saunafam-verify`, and caches dev client builds by native fingerprint in
`~/Library/Caches/saunafam-verify`. Evidence goes wherever you point `shot`,
never inside the state folder, so `down` can't delete it.

Read [features/README.md](features/README.md) before driving, then the file for
the flow you're proving.

## Launch

1. **Build** (once per native change):
   `node $V build --sim "iPhone 17 Pro" --os 26.2`. It runs `expo prebuild
   --clean` and an `xcodebuild` Debug build for the simulator, then copies the
   `.app` into the cache. The first build takes 10 to 20 minutes. Run it in the
   background and poll the log it names. When the fingerprint matches a cached
   build it says `reusing` and exits at once. Only JavaScript changed? Then the
   fingerprint is the same and Metro serves the new code to the old build.
   `node $V fingerprint` shows the hash and whether it's built.
2. **Up**: `node $V up --sim "iPhone 17 Pro" --os 26.2 --fresh`. It boots the
   simulator, opens Simulator without focusing it, starts the driver server
   (port 8098) and Metro (port 8085) with `EXPO_PUBLIC_DEV_DRIVER=1`, installs
   the build, sets the 9:41 status bar with a plain full battery, and launches.
   It returns once the app polls the driver, which means the bundle loaded and
   React is running. `--fresh` reinstalls, so onboarding starts from Welcome.
   `--clear` restarts Metro with a clean cache. `--root DIR` serves another
   checkout, such as a worktree at an older commit.
3. Pass `--os 26.2`. Each iPhone 17 name exists on iOS 26.2 and 26.5, and the
   helper refuses to guess.

There must be no `.env`, `.env.local` or similar in the root. The helper
refuses to start if there is, because the run uses the local preview family
(Sam, Maya and Jo in "Sunday sauna"), not Supabase. Move the file aside
without printing it.

## Doctor

`node $V doctor` is read only apart from caching the tap calibration. Run it
first whenever something looks off. Every line should say `ok`:

- no env files, simulator booted, the cached build for this fingerprint installed;
- Metro on 8085 started by this run and serving this checkout;
- driver server up, app polled in the last 3 seconds;
- `info` lines: the text size now and before the run, and whether taps are
  available (the window's fitted scale and its worst miss in points).

## Drive

Two ways in, and proof uses both:

- **Real taps** for what the person does: `node $V tap-text "Start a family"`,
  `node $V tap X Y` (device points), `node $V drag X1 Y1 X2 Y2`. They go
  through `/tmp/m10tools/click` and `/tmp/m10tools/drag`, which put the cursor
  back. Before each tap the helper waits for a quiet second from whoever's at
  the Mac, and refuses if the Simulator window is missing or another window
  covers the point. A click does bring Simulator to the front. Never use the
  `*.orig` tools, `/tmp/m10tools/type`, osascript or cliclick.
- **Driver ops** for setup and typing: `node $V send '<json>' ...`. The ops are
  in `src/dev/DevDriver.tsx` (`reset`, `scenario`, `nav`, `tab`, `scroll`,
  `draft`, `emit`, `timer`, `dev`, `plusStore` and the rest). `send` waits
  until the app has taken them all and rejects unknown op names. Text fields
  are filled with `draft` (onboarding) or `dev` `form-fill` (the log form), so
  nothing types on the Mac's keyboard.

Find things by text, not position: `node $V find` lists every line of text on
screen with its center in points, and `node $V find "Log"` filters it. It's
OCR (Vision), so curly and straight apostrophes match, and `tap-text` prefers a
match in the same case ("Saunafam Plus" beats the "SAUNAFAM PLUS" label above
it). Use `--nth N` when the same text shows twice. Icons have no text. Their
points are in the feature files.

Text size: `node $V text-size ax5` (also `default`, `xxxl`, `ax1`, `ax3`, or
any `simctl` content size). The app reflows straight away and scroll offsets
change with it, so find things again after a switch.

Tap calibration: the window may show bezels and a toolbar, so the helper reads
the same words in a capture of the Simulator window and in the device
screenshot and fits a scale and offset. It needs two or more words on screen.
It's redone when the window moves or resizes.

## Evidence

- `node $V shot <file.png> [--wait S]` takes a simulator screenshot (status
  bar included, 1206 x 2622 on the iPhone 17 Pro).
- Put a run's proof under one folder, one subfolder per flow, files numbered
  in order: the screen before the action, after it, and a second view of any
  side effect (the Feed card after a log, the Settings row after a purchase).
- Pair each claim with what `find` read. Look at the screenshot too: OCR reads
  text, not clipping or overlap.
- Real user path first. A driver op stands in only for what a person can't do
  in the simulator (Sign in with Apple, a server answer, the keyboard) and the
  feature file says which.
- For a before and after, serve the old commit from a throwaway worktree:
  `git worktree add --detach /tmp/<name> <commit>`, `cp -cR node_modules`
  into it, `node $V up --root /tmp/<name> --fresh`, shoot, then
  `node $V up --root <repo>` and `git worktree remove --force /tmp/<name>`.
  Same native fingerprint, same build.

## Cleanup

`node $V down` stops the Metro and driver server this run started (by the PIDs
it recorded, never by name), terminates the app, clears the status bar, puts
the text size back to what it was, shuts the simulator down and quits
Simulator if the run booted them, and removes `/tmp/saunafam-verify`. It
leaves the cache and every screenshot alone. Run it after a failed attempt
too.

## Helpers

- `scripts/verify.mjs`: the CLI above. `node $V help` lists every command.
- `scripts/windows.swift`: lists on-screen windows read only (CoreGraphics).
- `scripts/ocr.swift`: reads text and boxes from a PNG (Vision).

Both Swift files are compiled into the cache on first use. Nothing here ships:
the driver only exists in dev builds with `EXPO_PUBLIC_DEV_DRIVER=1`.

## Known limits

- Sign in with Apple can't finish in the simulator. The preview sign-in stands in.
- The preview family never fails a join, so the expired invite is shown with
  `emit inviteExpired`, the same error an expired code gets from the server.
  The real server path isn't covered here.
- Purchases go through the preview store ("PREVIEW, NO REAL PURCHASE"). Real
  StoreKit and RevenueCat aren't covered.
- One run at a time: ports 8085 and 8098 and the state folder are shared. Set
  `SFV_METRO_PORT`, `SFV_DRIVER_PORT` and `SFV_STATE` for a second run on
  another simulator. The helper won't drive a Metro it didn't start.
