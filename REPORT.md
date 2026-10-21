# Saunafam build 9: report

Arro is now Saunafam, built from `design/saunafam-spec.md` on branch
`feat/saunafam` (draft PR #24). Every milestone from M0 to M17 is done. Nothing
has gone to production: no migrations on the hosted project, no function
deploys, no site deploy, no EAS build, nothing in App Store Connect or
RevenueCat. Those steps are yours, and they're listed in order at the end.

The running log, with every decision and proof path, is
`docs/saunafam/PROGRESS.md`. This report is the summary.

## Look at these first

1. **The review set** in `docs/saunafam/review/`: six stills (Welcome, Today,
   the timer, Week, the milestone, Feed) and two clips, `timer-start.mp4` (the
   door) and `week-kept.mp4` (the spark burst).
2. **The App Store screenshots** in `design/app-store/screenshots/6.9/` and
   `6.3/`. Retaken on 21 October with a plain full battery (it was green and
   charging), Bathhouse in place of "The Y", and family rows that don't cut
   off. `docs/saunafam/PROGRESS.md` has the details, under "After M17".
3. **The icon at small sizes**, `design/brand/icon-sizes.png` (16 to 1024 px,
   light and dark wallpapers).
4. **The Plus sheet**, `plus-01-loading.png` to `plus-16-preview-label.png` in
   `design/screenshots/saunafam/`, and `design/recordings/saunafam/plus-preview-flow.mov`.
   The wall's re-grain when a purchase goes through is subtle on purpose. It
   needs a look on a real phone.
5. **The milestone and the timer on a phone.** Every motion check here ran on
   the simulator in a Debug build. Haptics can't be felt there.

## Milestones

| # | Milestone | Status | Main proof |
|---|---|---|---|
| M0 | Baseline, lint script, rename list | done | `design/saunafam-lint-baseline.txt`, `design/saunafam-rename-list.txt` |
| M1 | Families, rules, app config, sessions SQL | done | `supabase/migrations/20261021000001_saunafam_families.sql`, `20261021000002_sessions.sql`, `supabase/tests/database/sessions.test.sql` |
| M2 | Weekly streak SQL | done | `20261021000003_weekly_streaks.sql`, `weekly_streak.test.sql` (12 members x 52 weeks in about 7 ms) |
| M3 | Cheers, comments and pushes SQL | done | `20261021000004_session_social.sql`, `20261021000005_saunafam_pushes.sql`, `saunafam_push.test.sql`, `design/copy/notifications.md` |
| M4 | Edge functions, build 10 cleanup draft | done | `supabase/functions/remove-member/`, `delete-account/`, `supabase/drafts/build10_cleanup.sql` |
| M5 | App data layer | done | `src/state/`, `docs/saunafam/DATA-LAYER.md` |
| M6 | Design system and motion | done | `design/brand/brand-sheet.png`, `src/theme/`, `docs/saunafam/DESIGN-SYSTEM.md` |
| M7 | Icon, splash, asset pipeline | done | `assets/brand/`, `scripts/generate-icons.mjs`, `design/brand/icon-sizes.png`, `design/recordings/saunafam/splash-cold.mov` |
| M8 | Timer and log form | done | `src/screens/TimerScreen.tsx`, `LogSessionScreen.tsx`, `timer-*.mov` |
| M9 | Main screens, every state | done | `design/screenshots/saunafam/INDEX.md` |
| M10 | Onboarding, Settings, copy | done | `onboarding-*.png`, `settings-*.png`, `design/copy/app-copy.md` |
| M11 | Native features | done | `src/state/health.ts`, `src/navigation/tapRoute.ts`, `notification-tap-*.mov` |
| M12 | Rename | done | `design/saunafam-rename-check.txt` |
| M13 | Landing page and web assets | done | `site/`, `design/screenshots/saunafam/site/`, `design/lighthouse/` |
| M14 | App Store listing and screenshots | done | `design/app-store/listing.md`, `scripts/app-store-shots.mjs`, `design/app-store/screenshots/` |
| M15 | Plus, switched off | done, except the StoreKit recording | `src/screens/PlusSheetScreen.tsx`, `src/state/plusFlow.ts`, `20261021000006_saunafam_plus.sql`, `revenuecat-webhook`, `sync-plus` |
| M16 | Self-review recordings | done | `design/recordings/saunafam/m16/`, the M16 table in `PROGRESS.md` |
| M17 | Report and release | done | this file, `ios.buildNumber` 9 in its own commit ("Build 9") |

## Checks on the final push

All run locally on `feat/saunafam`:

```
npm run typecheck                         clean
npm run lint                              0 problems
npm test                                  385 passed, 30 suites
scripts/test-db.sh (pgTAP)                403 passed, 11 files
deno check supabase/functions/*/index.ts  clean
deno test                                 48 passed
node scripts/check-design.mjs             clean (no hex outside src/theme, no off-grid spacing, no arrow glyphs)
node scripts/check-contrast.mjs           39 of 39 pairs meet WCAG AA
npx expo export --platform ios            exported
spec dash check                           0 hits
```

pgTAP runs through `scripts/test-db.sh` because Docker here is Colima, which
can't see a checkout under `/tmp`, so `supabase test db` finds no files. CI
still uses `supabase test db`. The local Supabase CLI is 2.117.0, and CI pins
2.121.0.

## Definition of done

Ticked items have their proof next to them. Anything I couldn't tick is in
"Not done" below, never ticked quietly. 👁 marks your eyeball items.

### Brand and assets

- [x] 👁 Icon SVG masters: `assets/brand/icon.svg`, `icon-dark.svg`, `icon-tinted.svg`.
- [x] `scripts/generate-icons.mjs` renders 1024 px light, dark and tinted into `assets/brand/out/`, every legacy iOS size, the favicons and the Android adaptive layers. Its output is committed.
- [x] Icon wired in `app.json` as `ios.icon: { light, dark, tinted }`. SDK 57 documents that form and an Icon Composer `.icon` bundle. I shipped the PNG object, because there's no Icon Composer here to make the bundle (PROGRESS, D9).
- [x] 👁 Contact sheet `design/brand/icon-sizes.png`, at 16, 29, 40, 60, 180 and 1024 px on light and dark wallpapers. The stone was reworked so it doesn't read as a hockey puck (`design/brand/icon-explorations.png`).
- [x] 👁 Native splash (birch `#EFE6D8`, matching the first JS frame) and the animated splash. Proof: `design/recordings/saunafam/splash-cold.mov`, `splash-1.png` to `splash-3.png`, and M16's `m16/splash-cold.mp4`.
- [x] 👁 Wordmark `assets/brand/wordmark.svg`, outlined Fraunces, used by the splash, Welcome, the site header and the App Store screenshots.
- [x] 👁 Brand sheet `design/brand/brand-sheet.png`, plus the dev-only Design sheet (`design-sheet-1.png` to `-6.png`).
- [x] Tokens only in `src/theme/`. `check-design` finds no hex values anywhere else.

### App

- [x] Every screen and state, including empty, loading, offline, server error and removed session, listed in `design/screenshots/saunafam/INDEX.md` (204 lines). M16 added one clean screenshot per screen in `design/screenshots/saunafam/review/` (42). The expired invite was added on 21 October (`onboarding-join-code-expired.png`, `onboarding-meet-family-expired.png`).
- [x] Haptics mapped in the table in `src/theme/haptics.ts`. The call sites are below, under "Haptics".
- [x] Push copy for every trigger and local notification in `design/copy/notifications.md`, matched by pgTAP checks on the queued titles and bodies in `saunafam_push.test.sql`.
- [x] Invite share text and link, and the `saunafam.com/join/<code>` preview with `og:title`, `og:description` and an OG image. Proof: `design/screenshots/saunafam/invite-link-preview.png`.
- [x] 👁 Onboarding and Settings copy, every string in `design/copy/app-copy.md`. The dash check passes.

### App Store

- [x] Listing: `design/app-store/listing.md` has the name, subtitle, promotional text, description, keywords (100 characters, counted), categories, age rating answers, support, marketing and privacy URLs. Privacy labels are in `app-privacy.md`.
- [x] 👁 Designed screenshot set from `scripts/app-store-shots.mjs`, built from simulator captures plus an SVG frame and caption template. The script checks every PNG's exact size and that it has no alpha channel. Apple's page (checked 20 October 2026) now requires the medium Dynamic Island size, 1206 x 2622, and 6.5 inch isn't needed when a 6.9 inch set exists. So the sets are `6.9/` (1320 x 2868) and `6.3/` (1206 x 2622), with no `6.5/`. Details: `design/app-store/screenshots.md`.

### Website

- [x] 👁 Landing page with every section from the spec, a still-then-settle first load, responsive at 360, 390, 768, 1280 and 1920. Proof: `design/screenshots/saunafam/site/home-*.png`, `design/recordings/saunafam/site-first-load.mp4`.
- [x] Favicon set: `site/public/favicon.ico`, `favicon.svg`, `apple-touch-icon.png`, `icon-512.png`.
- [x] 👁 OG and Twitter `summary_large_image` images for the home and join pages, with their meta tags.
- [x] Privacy and support pages rewritten. Support has the FAQ and support@saunafam.com.
- [x] Lighthouse mobile, from `npx lighthouse` against `npx wrangler dev`: 100 for performance, accessibility, best practices and SEO on all four pages, CLS 0. LCP is 1.5 s on the home page and 1.4 s on join, privacy and support. JSON in `design/lighthouse/`.

### Rename, data, checks

- [x] Section 6 done. `design/saunafam-rename-check.txt` has the grep, a reason for each group and every line. What's left is the move said on purpose ("Arro is now Saunafam", the Health note for old testers, the privacy and support pages), the identifiers the spec keeps, migrations already in production, and history.
- [x] Six migrations plus `supabase/drafts/build10_cleanup.sql`, applied to the local database only.
- [x] Typecheck, lint, Jest, pgTAP and `deno check` pass, and `npx expo export --platform ios` succeeds (numbers above). The lint script is new: `npm run lint` runs `expo lint`.
- [x] Simulator screenshots of every screen, and a recording of every motion moment from section 2, re-recorded on the merged build in M16 (`design/recordings/saunafam/m16/`).
- [x] This report.

### Paid tier (built, switched off)

- [x] 👁 The Plus sheet in all 16 states, plus try-on for a wood, a timer face and an icon, the tip jar and the quiet card on Week. Proof: `plus-*.png` in `INDEX.md`, under "Saunafam Plus" (46 screenshots).
- [x] Prices only from the offering or `PreviewPurchases`. The close control shows from the first frame, and Not now is plain text.
- [x] Never shown where it shouldn't be: `src/state/__tests__/plusNever.test.ts` (35 tests) covers onboarding, the timer, the log form, after saving, a milestone, a missed week, a family that has Plus, and `plus_enabled` false. The 60 days, 3 ever, off for good cap is in `plusFlow.test.ts`.
- [x] Restore on the sheet and in Settings, with its three results, tested against `PreviewPurchases` and screenshotted.
- [x] Server: migration `20261021000006_saunafam_plus.sql` with pgTAP (`plus.test.sql`, 32 tests), `revenuecat-webhook` and `sync-plus` with Deno tests on fixture events (wrong secret, duplicates, out of order, two payers), and the `delete-account` warning for payers.
- [ ] StoreKit recording. See "Not done". The preview flow is recorded instead.
- [x] Listing, privacy label and review notes for in-app purchases in `design/app-store/`. The privacy page has the RevenueCat paragraph. Part 2 of the sandbox plan and the App Store Connect and RevenueCat steps are in "Needs Bryce" below.
- [x] 👁 Every Plus string in `design/copy/app-copy.md` under "Saunafam Plus". The dash check passes.

## Not done

- **The StoreKit purchase recording (`plus-storekit.mov`).** RevenueCat's SDK won't load offerings or take a purchase without a project API key, and that key only comes from its dashboard, which was off limits. Its Test Store needs the dashboard too. A StoreKit file also only applies when the app runs from Xcode's scheme. `design/recordings/saunafam/plus-preview-flow.mov` records the same flow against `PreviewPurchases`: a cancelled, a failed and an Ask to Buy purchase, Founding family bought, then a restore.
- ~~An expired invite screenshot.~~ Done on 21 October.
- ~~Dynamic Type at the largest size for the Plus screens.~~ Done on 21 October (`plus-dynamic-type-*.png`). The sheet broke at that size, so it stacks now from 1.35 times the text size.
- **A separate `release/build-9` PR.** The spec asks for one. `AGENTS.md` makes PR #24 the build 9 PR, so `ios.buildNumber` went to 9 in its own commit there and I didn't open a second PR against main.

## Decisions

The full lists are in `PROGRESS.md` (D1 to D28 for the database and site,
D5.1 to D15.11 for the app). These are the ones you might disagree with.

- **Screenshot sizes:** 6.9 and 6.3 inch, no 6.5, after Apple's page changed (above).
- **App icon form:** the `{ light, dark, tinted }` PNG object, not an Icon Composer bundle (D9).
- **Health:** Mindful Minutes, write only, off until turned on. It writes your own sessions, including ones someone else logged with you. Turning it on also saves the past 7 days. Edits and deletes don't change what's already in Health (D11.1 to D11.3).
- **Notification taps:** a weekly reminder opens Today. A timer notification opens the room only while the timer is running (D11.4).
- **Plus with the switch off** sends nothing to RevenueCat. `app-privacy.md` notes that Purchase History can wait for the version that turns Plus on.
- **Plus sheet details:** the picked price tile's text is steam, not birch, because steam on ember passes contrast. The feature list shows titles only so prices stay near the top. The buy button keeps full color with three dots while it waits on the App Store.
- **Done on the timer** finishes it at once, and the log sheet opens over the room. Closing that sheet asks "Throw this session away?" (D8.1).
- **Saving is optimistic.** The sheet closes at once, and the success haptic fires at the new dot's peak on Today (D8.5, M16).
- **The preview family runs on its own clock** (Thursday 4:10 PM of the real week), so screenshots match whatever day they're taken (D5.4). That's why Today says "Good afternoon" under a 9:41 status bar in the stills.
- **Branch:** `feat/saunafam`, as the brief named it, not the spec's `saunafam/build-9`.

## Haptics

Each fires on the frame its motion arrives, checked against the frames in M16
(the simulator can't play them).

| Moment | Haptic | Call site |
|---|---|---|
| timer start | medium | `src/screens/TimerScreen.tsx`, when the door's edges reach the screen |
| 5-minute tick | light | `TimerScreen.tsx`, the render that shows the new mark |
| löyly | soft | `TimerScreen.tsx`, `throwLoyly`, 90 ms after the tap as the first wisp shows |
| finish | success | `TimerScreen.tsx`, `finish`, as the glow cools |
| save | success | `src/components/EmberDots.tsx` (`onIgnitePeak`), or `LogSessionScreen.tsx` when no dot lights |
| cheer | light | `src/components/CheerControl.tsx` |
| week kept | success | `src/components/WeekHero.tsx`, `onFilled` |
| milestone | heavy, then success 180 ms later | `src/screens/MilestoneScreen.tsx`, at the number's peak |
| errors | warning | `NoticeToast`, `LogSessionScreen`, `EditSessionScreen`, `NudgeModalScreen`, `PlusSheetScreen`, `PosterScreen`, `MilestoneScreen` |

## Motion self-review

All on the iPhone 17 Pro simulator, iOS 26.5, Debug build. Frame rates come
from a dev-only probe (`src/dev/FpsProbe.tsx`) that counts UI-thread and JS
frames, the same two numbers the Perf Monitor graphs. Turning the overlay on
needs a tap in the dev menu, so I used the probe. Clips are in
`design/recordings/saunafam/m16/`.

| Moment | Clip | UI thread | Fixed in M16 |
|---|---|---|---|
| Cold-start splash | `splash-cold.mp4` | 59.4 fps | nothing |
| Today's first paint | `today-first-paint.mp4` | 58.9 fps | nothing |
| The door | `timer-start.mp4` | 59.0 fps, was 54.3 | the ember gradient was repainted on the CPU every frame; now drawn once and scaled. The status bar switch and the haptic timing too |
| 5-minute tick, löyly | `timer-tick-loyly.mp4` | 60.0 fps | nothing |
| Finish | `timer-finish.mp4` | 58.9 fps | nothing |
| Check-in | `checkin.mp4` | 60.0 fps | the dot waited about 700 ms after the sheet, now about 300. Saving played the success haptic twice, now once |
| Week kept, sparks | `week-kept.mp4` | 60.0 fps | nothing |
| Milestone wall | `milestone.mp4` | 59.0 to 59.5 fps | the empty card before the wall builds went from about 350 ms to 250 |
| Tabs and pushes | `tabs-and-stack.mp4` | 59.2 fps | the background haze is a pre-rendered image now, not an SVG on every screen |
| Sheets (log, Nudge, PastWeek, Plus) | `sheets.mp4`, `sheet-plus.mp4` | 0 to 4 dropped, at mount or close | see the sheet fix below |
| Reduce Motion: splash, timer, milestone | `reduce-motion-*.mp4` | 0 to 2 dropped | the splash crossfade doubled the wordmark and jumped 8 pt; the milestone wall popped in late. Both fixed |

Earlier milestones fixed their own moments too, from their recordings: the
door's 700 ms start and the room's steam (M8), and the splash and icon (M7).
Their notes are in `PROGRESS.md`.

**The sheet fix.** M10 gave every route a birch background so pushes never
flash white, and that made the transparent routes opaque. The log sheet,
Nudge, PastWeek and the timer drew their scrims over flat birch. They share
one set of route options with a transparent background now
(`src/navigation/RootNavigator.tsx`), and `nudge-over-today.png` shows Today
under the Nudge sheet.

## Key screenshots and recordings

- Icon contact sheet: `design/brand/icon-sizes.png`
- Brand sheet: `design/brand/brand-sheet.png`
- Today, Week, Feed: `design/screenshots/saunafam/review/` and `docs/saunafam/review/2-today.png`, `4-week.png`, `6-feed.png`
- The timer room: `docs/saunafam/review/3-timer.png`
- Timer start and finish: `design/recordings/saunafam/m16/timer-start.mp4`, `timer-finish.mp4` (M8's `timer-start.mov` and `timer-finish.mov` too)
- Timer in the background for 2 minutes: `design/recordings/saunafam/timer-background.mov`
- Reduce Motion: `design/recordings/saunafam/m16/reduce-motion-*.mp4`
- App Store set: `design/app-store/screenshots/6.9/` and `6.3/`
- Plus: `plus-01-loading.png` to `plus-16-preview-label.png`, `plus-preview-flow.mov`
- Landing: `design/screenshots/saunafam/site/`, `site-first-load.mp4`
- Review set: `docs/saunafam/review/`

## Bryce should eyeball

The app icon at small sizes and in dark and tinted. The splash and first-load
recording. The wordmark and the brand sheet. The timer's dark room. The slat
wall. The milestone card. The App Store screenshots. The landing hero and its
first load. The OG image. The Plus sheet, the try-on and the three new woods.
All of the copy, including the Plus copy.

A few smaller things came up along the way:
- ~~"The Y" on App Store screenshot 4.~~ It's Bathhouse now (21 October).
- ~~Today's family rows cut off at "Yesterday · 25 min with Maya a...".~~ They wrap onto a second line now (21 October).
- Screenshot 4 shows Maya and Jo picked: three people in the session, but not three others. The preview family has no fourth person.

## Needs Bryce, in order

Each step only on your go. `design/app-store/testflight.md` has the detail.

1. **Site.** saunafam.com and www as custom domains on the Worker (the routes in `site/wrangler.jsonc` add them on deploy), keeping the arrofamily.com routes for the redirect. Forward support@saunafam.com with Cloudflare Email Routing. Then `npx wrangler deploy` from `site/` and check it:
   ```
   for p in / /privacy/ /support/ /join/ABC234; do curl -s -o /dev/null -w "%{http_code} $p\n" https://saunafam.com$p; done
   ```
   arrofamily.com should answer with a 301. `site/README.md` has the steps.
2. **Migrations,** right before build 9 goes to TestFlight, because `families.saunafam_started_on` is the day they run: `supabase migration list --linked`, `supabase db push --dry-run`, then `supabase db push`. The six are `20261021000001_saunafam_families`, `000002_sessions`, `000003_weekly_streaks`, `000004_session_social`, `000005_saunafam_pushes` and `000006_saunafam_plus`. They only add, so build 8 keeps working.
3. **Edge functions:** `npx supabase functions deploy remove-member`, `delete-account`, `sync-plus`, and `revenuecat-webhook --no-verify-jwt`.
4. **Secrets:** nothing new for build 9. `REVENUECAT_WEBHOOK_SECRET` and `REVENUECAT_SECRET_API_KEY` (Supabase) and `EXPO_PUBLIC_REVENUECAT_IOS_KEY` (EAS) wait for Plus.
5. **App Store Connect:** rename the app to Saunafam (I didn't check the name is free; the spec's 20 October search found nothing), set the subtitle from `listing.md`, the privacy URL `https://saunafam.com/privacy` and support URL `https://saunafam.com/support`, the App Privacy answers from `app-privacy.md` (Health and Precise Location come off), the age rating answers, and the TestFlight test information.
6. **Build and submit:** check the EAS env vars are set, then `eas build --platform ios --profile production` and `eas submit --platform ios --latest`.
7. **Testers:** add the build to the external group with this note (a draft, not sent):
   > Arro is now Saunafam, a weekly sauna streak. Your family carries over and the streak starts fresh. Try the timer, log a session for two people, and cheer someone on.
8. **Later, for Plus,** after build 9 ships:
   - accept the Paid Applications Agreement, add banking and tax, and enroll in the Small Business Program;
   - create the subscription group "Saunafam Plus" with `saunafam.plus.annual` ($24.99 a year), the non-consumable `saunafam.plus.lifetime` ($59.99, "Founding family"), and the tips `saunafam.tip.small`, `.medium` and `.large` ($1.99, $4.99, $9.99), all with Family Sharing off. Product ids are permanent;
   - in RevenueCat: a project for `com.arrofamily.arro`, an in-app purchase key, the `plus` entitlement and `default` offering, App Store Server Notifications, and the webhook at `https://<project>.supabase.co/functions/v1/revenuecat-webhook` with its Authorization secret;
   - set the three secrets above;
   - run part 2 of the sandbox plan (spec, "Sandbox test plan"): buy yearly and see it on a second member's phone, a renewal, cancel, Founding family, reinstall and restore, restore on a second device, a billing problem, a refund, the payer leaving and deleting their account, each tip, and every sheet state on a phone with Larger Text;
   - submit the products with an app version, using the review notes in `listing.md`;
   - set `app_config.plus_enabled = true` once that version is live.
9. **Optional:** rename the GitHub repo. Not in this build.

Two open questions keep their spec defaults until you say otherwise: Saunafam
isn't aimed at children under 13, and a session can name up to 3 others
without asking them (they get a push and a Remove me option).

## What I didn't check

- The hosted Supabase project, App Store Connect, RevenueCat, EAS env vars and Cloudflare. Nothing touched them.
- Anything on a physical phone: haptics, VoiceOver end to end, the camera taking a real photo, 120 Hz, and pushes through `send-push` and Expo's service (simulated with `xcrun simctl push`).
- A Release build. Every frame number is from Debug. The check-in's 300 ms and the milestone's 250 ms waits are JS work that should shrink in Release.
- Sign in with Apple completing. It can't in the simulator, so its screen is captured with a dev switch.
- The edge functions end to end against a local Auth, PostgREST and Storage stack. Colima ran the database only, so the Deno tests use an in-memory store.
- App Store Connect's own upload form and age rating wording. Only you can see them.
