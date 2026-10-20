# Screenshot plan

Six framed, captioned screenshots for the App Store, rendered by
`scripts/app-store-shots.mjs` from simulator captures (spec, Definition of
done, "Designed screenshot set", and milestone M14). The script belongs to the
app track. This file is the plan and Apple's rules it has to follow.

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

## How to capture

- From the dev build's Prototype preview (the "Sunday sauna" sample family),
  in the simulator: `xcrun simctl io <udid> screenshot <file>`.
- Clean status bar first: `xcrun simctl status_bar <udid> override --time 9:41
  --batteryState charged --batteryLevel 100 --cellularBars 4`.
- Real-looking session times (mornings and evenings).
- Photos: sample or generated images only, no real people.
- Before uploading, check each screen matches the build being submitted
  (Guideline 2.3.3: screenshots show the app in use).
