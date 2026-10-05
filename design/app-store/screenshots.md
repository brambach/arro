# Screenshot plan

## Size and count

- Arro is iPhone-only, so one set is enough: **6.9-inch display, 1320 x 2868
  portrait**. App Store Connect scales it down for smaller iPhones.
- Your iPhone 17 Pro Max takes screenshots at exactly that size, so no
  resizing or simulator is needed.
- Up to 10 allowed. Four is the plan; a fifth (Settings > How you move) is
  optional.

## Order and captions

The first one or two are what most people see in search, so they carry the
idea. `design/market-research.md` says to lead with "I moved today", since no
other app accepts it and it's what lets the least sporty person join.

Captions sit above the phone in New York serif, ink `#2B2722` on paper
`#F5F1E8`, with clay `#A65A3C` used once at most (an underline or one word).
No device frame needed; a plain screenshot with the caption band is fine.

| # | Screen | What must be on it | Caption |
| --- | --- | --- | --- |
| 1 | **Log today** | "I moved today" ready to tap, a workout kind chosen (Walk), duration and note optional | Any movement counts. |
| 2 | **Today** | The family streak number at the top, three or four family members, most of them "Kept", one still with today (neutral pill, never a "missed" look) | One streak, the whole family. |
| 3 | **Feed with cheers** | Several family workouts with short notes and visible cheers from other members | Cheer each other on. |
| 4 | **Milestone card** | "Your first 30 days together" card ("You did it. 30 days together.") | Every day forward, together. |
| 5 (optional) | Settings > How you move | Apple Health and "I moved today" side by side | Works with Apple Health, or without. |

## How to capture

Two ways, pick one:

**A. The prototype previews in the dev build (fastest).** Settings has a
"Prototype preview" section in development builds only (`__DEV__` in
`src/screens/SettingsScreen.tsx`): "Demo family" for Today, Log today and Feed,
and "First 30 days done" for the milestone card. On your iPhone with the dev
build running, pick a preview, open each screen and press side button + volume
up. The fake family uses first names from your own family
(`src/state/buildView.ts`); check they're happy to appear, or ask the app
thread to rename the demo members first.

**B. The real demo family from `review-notes.md`.** Join it from a TestFlight
build. More honest data, but the milestone card only shows while the streak is
exactly 30 or 31, so you'd have to time it.

Either way:

- Use a release-looking state: no dev menu open, no debug banners, full
  battery or charging icon hidden is nice but not required.
- Light mode only (the app forces light, `userInterfaceStyle: "light"`).
- Real-looking times: workouts in the morning or evening, not all at 9:41.
- Photos: if a screenshot shows a workout photo, use your own photo.
- Before uploading, check each screen still matches the build being
  submitted. Guideline 2.3.3: screenshots have to show the app in use.

## Making the caption band

Any image editor works: a 1320 x 2868 canvas in paper `#F5F1E8`, the caption at
the top in New York (or Georgia) at about 96 pt, and the screenshot scaled to
about 86% below it with a 48 px corner radius. If you'd like, I can write a
small script that composes these from the raw screenshots once you have them
(it would use sharp, which needs your OK to install).
