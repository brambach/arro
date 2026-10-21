# Screenshot plan

Six framed, captioned screenshots for the App Store, rendered by
`scripts/app-store-shots.mjs` from simulator captures (spec, Definition of
done, "Designed screenshot set", and milestone M14). This file is the plan,
Apple's rules it has to follow, and how to rebuild the set.

## What Apple requires (checked 20 October 2026)

Source: Apple's "Screenshot specifications" page,
https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications
, read from the raw page on 20 October 2026. It has no last-updated date. It
no longer uses inch sizes. Device groups are named by display instead.

What it says, word for word where quoted:

- **General:** "You must include at least one screenshot and can upload up to
  10 screenshots per device size in .jpeg, .jpg, or .png formats." "Images
  can't include alpha channels or transparencies."
- **Required:** "iPhone: At least one screenshot for iPhone with Dynamic
  Island (medium display)."
- **Scaling:** "If your app's user interface is consistent across multiple
  device sizes and localizations, you only need to provide screenshots for the
  highest required resolution. App Store Connect automatically scales them
  down for smaller device sizes."

| Apple's group | Devices it lists | Portrait sizes | Requirement line on the page |
|---|---|---|---|
| iPhone with Dynamic Island (large display), the old "6.9 inch" | iPhone Air, 18 Pro Max, 17 Pro Max, 16 Pro Max, 16 Plus, 15 Pro Max, 15 Plus, 14 Pro Max | 1260 x 2736, 1290 x 2796, **1320 x 2868** | none. Note: "If screenshots with the accepted sizes aren't provided, scaled screenshots for iPhone with Face ID (large display) are used." |
| iPhone with Face ID (large display), the old "6.5 inch" | iPhone 14 Plus, 13 Pro Max, 12 Pro Max, 11 Pro Max, 11, XS Max, XR | **1284 x 2778**, 1242 x 2688 | "Required if app runs on iPhone and screenshots for iPhone with Dynamic Island (large display) aren't provided" |
| iPhone with Dynamic Island (medium display), the old "6.3 inch" | iPhone 18 Pro, 17 Pro, 17, 16 Pro, 16, 15 Pro, 15, 14 Pro | 1179 x 2556, **1206 x 2622** | the required set (from the "Required device sizes" list above) |
| iPhone Duo | | 1398 x 2034 outer, 2007 x 2853 inner | "Starting in April 2027, screenshots will be required for any app using the iOS 27.1 SDK or later." |

### What that means for Saunafam

- **6.9 inch (1320 x 2868) isn't required any more.** It's accepted, and it's
  still the largest iPhone size.
- **6.5 inch (1284 x 2778) isn't needed** as long as a 6.9 inch set is
  uploaded.
- **The one required set is the medium Dynamic Island display**, 1206 x 2622
  (iPhone 17 Pro). The page's fallback notes don't say the medium set is
  scaled from the 6.9 inch set (its own note falls back to the 6.5 inch set),
  so read literally, a 6.9 inch set alone may not satisfy it.

**Plan: render two sets, 6.9 inch at 1320 x 2868 and 6.3 inch at 1206 x 2622.
Skip 6.5 inch.** The spec's folders become `design/app-store/screenshots/6.9/`
and `design/app-store/screenshots/6.3/` (the spec's `6.5/` folder isn't
needed). The script should check every PNG's exact pixel size and that it has
no alpha channel.

Captures: iPhone 17 Pro Max simulator for 6.9 inch (it captures at 1320 x
2868) and iPhone 17 Pro for 6.3 inch (1206 x 2622). Xcode 26.6 has both
(`docs/saunafam/AGENT-BRIEF.md`).

Not checked: what App Store Connect's upload form itself asks for. Only Bryce
can see that. If it still asks for a 6.5 inch set, the script can add
1284 x 2778 by scaling the 6.9 inch frames.

## Order and captions

From the spec, section 5. Fraunces caption band at the top of each, Löyly
colors (birch background, char text, ember once at most). Sample names only:
Sam, Maya and Jo in "Sunday sauna". No real places.

| # | Caption | Screen | What must be on it |
|---|---|---|---|
| 1 | "Close the door. We'll keep time." | Timer | The dark heat room at 14:32, "TRADITIONAL · 15 MIN", the ember dot arc partway |
| 2 | "One streak for the whole family." | Today | "8 weeks together", your slat with ember dots ("2 of 3 this week"), the family list with Sam, Maya and Jo |
| 3 | "Three a week, together." | Week | The wall of slats with one frost-blue freeze slat |
| 4 | "Sat together? Log it once." | Log session | The form with "Sat with someone?" and three people picked |
| 5 | "Cheer each other on." | Feed | A photo card, cheers and a couple of comments |
| 6 | "12 weeks in the heat." | Milestone | The 12-week milestone card with the wall built |

Optional seventh, once Plus is live: a cedar wall, "Make the wall your own."
Spec Default: leave the set at six.

## The set (built in M14)

| Size | Folder | Pixels | From |
|---|---|---|---|
| 6.9 inch | `design/app-store/screenshots/6.9/` | 1320 x 2868 | iPhone 17 Pro Max simulator |
| 6.3 inch | `design/app-store/screenshots/6.3/` | 1206 x 2622 | iPhone 17 Pro simulator |

Files `1-timer.png` to `6-milestone.png`, in upload order. Upload the 6.9 set
to "iPhone with Dynamic Island (large display)" and the 6.3 set to "iPhone
with Dynamic Island (medium display)". The raw captures they're built from are
in `design/app-store/screenshots/raw/6.9/` and `raw/6.3/`.

Each one: birch background with the app's faint slats and warm corner, the
caption in Fraunces Soft SemiBold (char, two lines set by hand), the capture
in a dark device frame, and the wordmark above the first caption only. No
ember in the captions: the app screens bring their own.

## Retaken on 21 October 2026

The status bar showed a green charging battery, the log form had "The Y" as a
place chip, and Today's family rows cut off at "Yesterday · 25 min with Maya
a...". The battery is plain now, the preview's sample places are Home,
Bathhouse, Lake cabin and Gym sauna, and a shared session's row reads
"Yesterday · 25 min" over "with Maya and Jo". The taller rows moved Today's
scroll to 150 pt on 6.3 and 100 on 6.9, so the streak card and the whole family
list still show. The set before this is in `/tmp/luna-arro/shots-before/` on
the build machine only.

## How to regenerate

Only the frames and captions changed (new caption, spacing, frame):

```bash
node scripts/app-store-shots.mjs
```

It reads the raw captures, renders each shot as SVG with resvg, flattens it to
RGB and writes it. Then it reads every file back and fails (exit 1) if a
capture or an output isn't the exact size or has an alpha channel.

New captures (the app changed):

1. No `.env.local` in the checkout, so the dev build runs on the preview
   family. Start Metro with the dev driver on its own port:

   ```bash
   EXPO_PUBLIC_DEV_DRIVER=1 EXPO_PUBLIC_DEV_DRIVER_URL=http://localhost:8098 \
     CI=1 npx expo start --port 8085 --clear
   ```

2. Boot the two simulators with the dev client installed (`xcrun simctl
   install <udid> <path to the Debug-iphonesimulator Arro.app>`). Run one
   simulator at a time: both apps poll the same driver, so terminate the app
   on the other one first.
3. Capture, then render:

   ```bash
   node scripts/app-store/capture.mjs 6.9 <iPhone 17 Pro Max udid>
   node scripts/app-store/capture.mjs 6.3 <iPhone 17 Pro udid>
   node scripts/app-store/capture.mjs 6.3 <udid> 5-feed   # one shot again
   node scripts/app-store-shots.mjs
   ```

`capture.mjs` needs no taps. It turns off the dev client's first-run menu and
floating Tools button (its `EXDevMenu*` defaults), sets the status bar to 9:41
with full bars and a plain full battery, launches the app on Metro and drives it through
`src/dev/DevDriver.tsx`:

| Shot | State |
|---|---|
| 1-timer | A traditional 15 minute timer set to 14:32 just before the shot. The app is relaunched in a made-up time zone whose clock reads 9:41 PM at that moment, so "Time to cool off at 9:41 PM" agrees with the 9:41 status bar. It retries if the clock misses |
| 2-today | The `family` scenario (8 weeks together, 2 of 3), scrolled so the streak card and the whole family list show (scroll 150 pt on 6.3, 100 on 6.9) |
| 3-week | Week tab: the wall with Maya's frost-blue freeze |
| 4-log | Log form: 25 min, Lake cabin, 185°F, cold plunge, Maya and Jo picked, scrolled to "Sat with someone?" |
| 5-feed | Feed scrolled to the shared Lake cabin session, with a photo, Sam's cheer and two comments |
| 6-milestone | The family milestone card at 12 weeks, after the wall has built |

The photo on the feed card is drawn by `scripts/app-store/sample-photo.mjs`
(a lake at dusk from a dock, no people, no real place) and served to the app
by the capture script. The dev-only `photo` command puts it on the preview's
shared session (`setDevSharedPhoto` in `src/data/preview.ts`, a no-op in a
release build).

Metro's file watcher in a `/tmp` worktree can miss edits. If a capture doesn't
show a code change, restart Metro with `--clear`.

## Known compromises

- **"Three people picked":** the preview family is Sam, Maya and Jo, so the
  form shows two others picked (three people in the session). Picking three
  others needs a fourth member; the 3-person cap is unit tested (D8.10).
- **Status bar:** 9:41, full bars, and a plain full battery (discharging at
  100%, so it isn't drawn green with a bolt). The preview's own clock is
  Thursday 4:10 PM ("Good afternoon, Sam"); a status bar without AM or PM
  doesn't contradict it.
- Before uploading, check each screen still matches the build being submitted
  (Guideline 2.3.3: screenshots show the app in use).
