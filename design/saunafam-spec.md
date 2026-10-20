# Saunafam build spec (rebuilding Arro, build 9)

Written 20 October 2026 for one Claude Code session working in the Arro repo (`brambach/arro`).

## How to read this

**Where the facts come from:**
- a read-only look at the repo on Bryce's Mac, at commit `b68cd61` (main, after PR #23);
- the feature inventory in `/tmp/luna-portfolio/arro-features.md`;
- Bryce's portfolio repo (`/tmp/luna-portfolio/repo`, the Lab E commits up to `e78f5b5`);
- for the paid tier, Arro's `design/paid-plan.md` and the App Store and web sources in the appendix.

Nothing was built, run or changed.

**Markers used in this spec:**
- **(unverified):** I could not confirm it. Check before relying on it.
- **Default:** a decision I made. Bryce can override any of these. They are listed in section 9.

**Before writing code**, read `AGENTS.md` and `CLAUDE.md` in the repo. Their standing rules still apply and win over anything here:
- Work on a branch and open a PR.
- Never merge, and never push to main.
- Never run `eas build` or `eas submit`.
- Never touch the production Supabase project or App Store Connect.
- Never rename the repo.
- No em or en dashes in user-facing copy.
- Expo SDK 57: read https://docs.expo.dev/versions/v57.0.0/ before writing Expo code.

---

## 1. Pitch

Saunafam is a shared sauna streak for families and friend groups.

How it works:
- Everyone takes a sauna whenever and wherever they like: at home, the gym, or a public bathhouse.
- You tap a timer, or log the session afterward.
- The group keeps one weekly streak together. By default that's three sessions a week each.
- If you sat together, one person logs it for everyone.
- Cheers, comments, photos and a gentle nudge keep it social.

Who it's for:
- families who live apart and want a reason to check in;
- couples and housemates who share a home sauna;
- friend groups who meet at a bathhouse every week.

Why it's different: sauna is having a moment, and the trackers out there (GoPolar and others) are personal logs with groups and challenges. Saunafam is built around a streak you keep together.

The tone stays Arro's:
- nobody is ranked;
- a missed week is never pinned on a person;
- nudges are capped.

---

## Definition of done

The session may not say it's finished until every box below is ticked, each with its proof:

- **Paths** are relative to the repo root.
- **Screenshots** go in `design/screenshots/saunafam/`.
- **Simulator recordings** go in `design/recordings/saunafam/`.

At the end, copy this checklist into `REPORT.md` at the repo root with every box ticked and its proof linked. Anything that can't be ticked goes in the report's "Not done" list, with the reason. It never gets ticked quietly.

Items marked 👁 are ones Bryce should eyeball himself before shipping. Taste calls can't be proved by a test.

### Brand and assets

**App icon** 👁
- [ ] An SVG master at `assets/brand/icon.svg`. Make dark and tinted variants as their own SVGs: `icon-dark.svg` and `icon-tinted.svg`, a single-tone mark on transparent.
- [ ] A script, `scripts/generate-icons.mjs`, that renders all of these:
  - 1024 x 1024 PNGs for light, dark and tinted, in `assets/brand/out/`;
  - every legacy iOS size (180, 167, 152, 120, 87, 80, 76, 60, 58, 40, 29, 20);
  - favicons;
  - the Android adaptive layers.
  - Proof: the script runs cleanly from scratch and its output is committed.
- [ ] The Expo config wired in `app.json`, with light, dark and tinted. **(unverified)** Check the SDK 57 docs for the current form. It may be `ios.icon` as `{ light, dark, tinted }`, or an Icon Composer `.icon` bundle for iOS 26. Ship whichever SDK 57 documents, and say which in the report.
- [ ] A contact sheet at `design/brand/icon-sizes.png` showing the icon at 16, 29, 40, 60, 180 and 1024 px, on light and dark wallpapers.

**Splash** 👁
- [ ] Native splash image and background color set, matching the first JS frame.
- [ ] The animated splash built as described in section 2.
- [ ] Proof: a simulator recording `splash-cold.mov`, plus 3 still frames from it.

**Wordmark** 👁
- [ ] "saunafam" in Fraunces, outlined to an SVG at `assets/brand/wordmark.svg`.
- [ ] Used by the splash, Welcome, the site header and the App Store screenshots.

**Brand sheet** 👁
- [ ] `design/brand/brand-sheet.png`, plus the dev-only Design sheet screen in the app. Both show:
  - palette with hex values;
  - member colors;
  - type scale;
  - spacing grid;
  - radii and depth;
  - motion tokens;
  - every button and row style;
  - icon and wordmark.
- [ ] Tokens live in `src/theme/` and nowhere else. Proof: grep finds no hex values outside `src/theme/`.

### App

**Every screen, in every state**
- [ ] Every screen and every state in section 3 renders, including its **empty**, **loading** and **error** states (offline, server error, removed session, expired invite).
- [ ] Proof: a screenshot for each, listed in `design/screenshots/saunafam/INDEX.md`, with one line per screen and state.

**Haptics**
- [ ] Each haptic is mapped to its moment, in a table in `src/theme/haptics.ts`:

| Moment | Haptic |
|---|---|
| timer start | medium |
| 5-minute tick | light |
| löyly | soft |
| finish | success |
| save | success |
| cheer | light |
| week kept | success |
| milestone | heavy, then success |
| errors | warning |

- [ ] Proof: each one is listed in the report with its call site.

**Push copy**
- [ ] The final text for every trigger in section 4 (session, shared, session_cheer, session_comment, nudge, joined, weekend), and every local notification (timer target, safety, weekly reminder).
- [ ] Proof: in `design/copy/notifications.md`, matched by pgTAP checks on the queued titles and bodies.

**Invite**
- [ ] The share text and the link.
- [ ] A link preview for `saunafam.com/join/<code>`: `og:title`, `og:description` and an OG image, so it unfurls nicely in iMessage.
- [ ] Proof: a screenshot of the preview card, rendered with a local OG checker or a static mock.

**Onboarding and Settings copy** 👁
- [ ] Every string, collected in `design/copy/app-copy.md`.
- [ ] Proof: the dash check passes.

### App Store

**Listing**
- [ ] `design/app-store/listing.md`, complete with:
  - name;
  - subtitle;
  - promotional text;
  - full description;
  - keywords (100 characters max, counted);
  - primary and secondary category;
  - **age rating questionnaire answers**;
  - **App Privacy labels** (`app-privacy.md`);
  - support URL (`https://saunafam.com/support`);
  - marketing URL (`https://saunafam.com`);
  - privacy policy URL.

**Designed screenshot set** 👁
- [ ] Frames and captions as planned in section 5, at the sizes App Store Connect requires today:
  - 6.9 inch (1320 x 2868);
  - 6.5 inch (1284 x 2778), if it's still required.
- **(unverified)** Check Apple's current screenshot specifications page and record what it says in the report.
- [ ] Rendered by a script, `scripts/app-store-shots.mjs`, from simulator captures plus an SVG frame and caption template, so they can be regenerated.
- [ ] Proof: `design/app-store/screenshots/6.9/` and `6.5/` exist, and every PNG matches the required pixel size exactly.

### Website

**Landing page** 👁
- [ ] Hero, how it works, the wall, sat together, kind by design, FAQ, and the download button (section 5).
- [ ] A deliberate first-load animation: still first, then one settle.
- [ ] Responsive at 360, 390, 768, 1280 and 1920 px wide.
- [ ] Proof: screenshots at each width, plus a recording of the first load.

**Favicon set**
- [ ] `favicon.ico`, `favicon.svg`, `apple-touch-icon.png` (180) and `icon-512.png`.

**Social images** 👁
- [ ] OG image 1200 x 630, and a Twitter `summary_large_image`, for the home page and the join page.
- [ ] Proof: the files and their meta tags.

**Privacy and support pages**
- [ ] Rewritten as in section 5.
- [ ] The support page has the FAQ and the contact email.

### Rename, data, checks

**Rename**
- [ ] Section 6 done in full.
- [ ] Proof: the grep output, with every remaining "Arro" listed and justified.

**Migrations**
- [ ] The 6 migration files (5, plus the Plus migration) and `supabase/drafts/build10_cleanup.sql` are written.
- [ ] They're applied **locally only**. Never applied to production.

**Checks**
- [ ] `npm run typecheck`, lint, `npm test`, `supabase test db` and `deno check` all pass.
- [ ] `npx expo export --platform ios` succeeds.
- Lint: the repo has no lint script today. Add one with `npx expo lint` (eslint-config-expo), and fix everything it reports.

**Simulator screenshots and recordings**
- [ ] A simulator screenshot of every screen.
- [ ] A recording of every motion moment in section 2, captured with `xcrun simctl io booted screenshot` and `recordVideo`.
- **(unverified)** This depends on Xcode being installed on the machine running the session. If it isn't, say so in the report, and fall back to web captures for screenshots. Motion review on the web doesn't count as done.

**Final report**
- [ ] `REPORT.md` lists:
  - what was done;
  - the proof for each box;
  - what's not done, and why;
  - every 👁 item;
  - **everything that needs Bryce:** the steps in section 6, App Store Connect fields, the age rating, secrets, DNS and routes, and the tester note.

### Paid tier

Built switched off (`app_config.plus_enabled = false`). Nothing is created in App Store Connect or RevenueCat by the session.

**Plus sheet, every state** 👁
- [ ] All 16 states in "Every state of the Plus sheet", plus the try-on for a wood, a timer face and an icon, the tip jar rows and the quiet card on Week.
- [ ] Prices come from the offering (or `PreviewPurchases`), never hard-coded.
- [ ] The close control is visible right away, and **Not now** is plain text.
- [ ] Proof: a screenshot of each, listed in `INDEX.md`.

**Never shown where it shouldn't be**
- [ ] Jest tests prove the sheet and the quiet card never appear in onboarding, the timer, the log form, after saving, on a milestone, after a missed week, for a family that already has Plus, or with `plus_enabled` false.
- [ ] The nag cap (60 days, 3 ever, off for good) is tested.

**Restore**
- [ ] Restore purchases on the sheet and in Settings, with its three results.
- [ ] Proof: Jest tests against `PreviewPurchases`, and screenshots.

**Server**
- [ ] Migration `20261021000006_saunafam_plus.sql`, with pgTAP tests for `family_plus`, `set_wall_wood`, the 12-week clamp and the access rules.
- [ ] `revenuecat-webhook` and `sync-plus`, with Deno tests on fixture events (wrong secret, duplicates, out of order, two payers).
- [ ] `delete-account` warns payers that deleting doesn't cancel Plus.

**Sandbox purchase test**
- [ ] A StoreKit configuration file test in the simulator (buy yearly, buy Founding family, cancel, fail, Ask to Buy, restore), recorded to `design/recordings/saunafam/plus-storekit.mov`.
- [ ] Or, if that isn't possible without App Store Connect, a recording of the preview flow and the reason in "Not done".
- [ ] Part 2 of the sandbox test plan is listed in `REPORT.md` for Bryce.

**App Store listing for in-app purchases**
- [ ] `design/app-store/listing.md` has:
  - the "Saunafam Plus, if you want it" description section and the subscription terms;
  - the Terms of Use and privacy links;
  - the five products with ids, prices, display names, descriptions and review screenshot notes;
  - Family Sharing off;
  - the review notes.
- [ ] `app-privacy.md` adds Purchase history.
- [ ] The privacy page has the RevenueCat paragraph.
- [ ] The App Store Connect and RevenueCat steps are in `REPORT.md` under "Needs Bryce".

**Plus copy** 👁
- [ ] Every Plus string in `design/copy/app-copy.md`, under its own heading.
- [ ] Proof: the dash check passes.

### Bryce should eyeball

- the app icon at small sizes and in dark and tinted;
- the splash and first-load recording;
- the wordmark;
- the brand sheet;
- the timer's dark room;
- the slat wall;
- the milestone card;
- the App Store screenshots;
- the landing hero and its first load;
- the OG image;
- the Plus sheet, the try-on and the three new woods;
- all of the copy, including the Plus copy.

---

## Quality bar

Bryce is extremely particular about design, motion and engineering. Each item below can be checked. Treat a failure as a bug, not a nice-to-have.

### Design

**Type scale.** One scale, defined in `src/theme/typography.ts`. Nothing outside it.

| Style | Size / line height (pt) |
|---|---|
| display | 64/64 |
| title | 34/38 |
| heading | 24/28 |
| body | 17/24 |
| body small | 15/21 |
| label | 13/18 |
| caption | 12/16 (small caps) |
| timer numerals | 96 |

**Spacing.** A 4 pt grid. The only allowed values are 4, 8, 12, 16, 20, 24, 32, 40, 56 and 72.
- Proof: a grep for padding and margin numbers outside the tokens finds nothing.

**Components**
- No unstyled default components anywhere. No default `Button`, `Switch` or `TextInput` styling, and no default navigation headers.
- Every control is designed for Saunafam.

**Buttons and links**
- No outlined pill buttons.
- No arrow glyphs on links (→, ›, ↗, »).
- Proof: grep for those glyphs in `src/` and `site/public`.

**Icons**
- Custom marks wherever one belongs: tab icons, the sauna type tiles, the stone, the slat, the snowflake, the heart.
- Draw them as SVG on a shared 24 pt grid with a matching stroke. No stock icon set for these.

**App icon**
- It has to read at **16 px** (favicon) and look rich at **1024 px**.
- Proof: the contact sheet.

**Contrast**
- Text meets WCAG AA: 4.5:1 for body text, 3:1 for large text.
- Proof: a test or script that checks every text and background pair in the tokens.

### Motion

**Specs**
- Every key moment in section 2 has a written duration, and either an easing curve or spring settings, in `src/theme/motion.ts`.
- The code reads from those tokens. No magic numbers.

**Reanimated**
- Use **Reanimated** for motion, so animations run on the UI thread.
- The technical note in section 2 says the same. Add `react-native-reanimated` at the version Expo SDK 57 pins, using `npx expo install`. **(unverified)** Check whether SDK 57 also needs `react-native-worklets`.
- Springs for physical moves (button to full screen, slats landing). Curves for fades.

**Smoothness**
- 60 fps everywhere, and 120 fps on ProMotion phones, with no dropped frames during:
  - the splash;
  - the timer door;
  - the glow;
  - the check-in;
  - the spark burst;
  - the milestone wall;
  - tab and stack transitions.
- Proof: a simulator recording of each, plus a Perf Monitor reading noted in the report. A dev-build reading is accepted if a release build isn't possible here.

**Reduce Motion**
- Respected everywhere: finished states and crossfades only.
- Proof: a recording with Reduce Motion on, for the splash and the timer.

**Haptics match the motion**
- Each haptic fires on the frame the motion lands, not when it starts. For example, the ember dot's success haptic fires at its peak.

**Ambient loops**
- Slow, named after what they do, and paused when the screen isn't visible.

### Engineering

**TypeScript**
- Strict, as now.
- No new `any`, no `@ts-ignore`, and no non-null `!` without a comment saying why.

**No flicker**
- No blank frames or flashes on navigation, sheet opening, tab switches or cold start.
- Screens render from cache first.
- Images use placeholders with fixed sizes, so nothing jumps when they load.

**Optimistic updates**
- These show instantly and roll back with a quiet error if the server says no:
  - cheers;
  - comments;
  - logging a session;
  - removing yourself from a session;
  - editing your profile.
- The exception to Arro's "never retry a write" rule: logging a session is made **offline safe**. Saves go into an outbox in AsyncStorage (`saunafam.outbox.v1`) and send when the phone is back online.
- To make that safe, `log_session` takes a client-made `p_client_id uuid`, and the server has a unique index on `(logged_by, client_id)`. A retry can then never double log. Add the `client_id` column to `sessions` in migration 0002.

**Timer**
- Survives backgrounding, the app being killed and a reboot, because time is always worked out from start timestamps.
- Proof: a Jest test for the timer math, plus a simulator recording of backgrounding the app for 2 minutes and coming back.

**Accessibility**
- Every control has an accessibility label and role.
- The timer announces the time every 5 minutes for VoiceOver.
- Dynamic Type works up to the largest accessibility sizes without clipping. Text scales; fixed-size numerals are allowed to cap with `maxFontSizeMultiplier`.
- Proof: screenshots at the largest Dynamic Type size for Today, the timer and the log form.

**Landing page**
- Lighthouse mobile scores 90 or more for Performance, Accessibility, Best Practices and SEO.
- Cumulative Layout Shift is 0: fonts preloaded, sizes reserved.
- Proof: the Lighthouse JSON reports saved in `design/lighthouse/`, from `npx lighthouse` against `npx wrangler dev`.

### Self-review before saying done

- Record the simulator for every motion moment.
- Watch each recording frame by frame, at 0.25x if needed.
- Fix anything that stutters, jumps, flashes or lands out of sync with its haptic, and record again.
- In the report, list each moment, the recording file, and what was fixed.
- "Looks fine" without a recording doesn't count.

---

## 2. Design direction

Sauna culture is one of the most design-rich rituals there is: pale wood benches, black stones, the hiss of löyly, birch whisks, a cold lake after. Saunafam should feel like that room. It should be warmer and slower than anything Bryce has built so far: sauna-quiet, tactile, physically made. It should not feel like a tech product or a fitness dashboard.

### References: take the craft, not the look

Bryce's own work sets the bar for polish. None of it sets the style.

**Portfolio, Lab E** (`/tmp/luna-portfolio/repo`, `src/lab/e/`, `docs/site-personality.md`)

Take:
- The first-load discipline from commit `92f7714`:
  - nothing moves until everything is ready;
  - heavy preparation happens off the main thread;
  - the page opens on a still, quiet state and assembles out of it in waves;
  - motion starts only after the first paint.
- The rule of one statement move per screen, played once. Everything else stays small.
- Naming ambient loops after what they do (`card-drift`, not `dot-3-updown`).
- Transform and opacity only, plus a real reduced-motion version of every moment.
- Honesty in copy.

Don't take:
- the dot field;
- the time-of-day palettes;
- the halftone sun;
- scroll-driven scenes and cursor effects;
- the Sentient display face;
- the playful, web-first spectacle.

Saunafam is a phone app you open with damp hands. It has no scroll theater.

**Arro** (`/tmp/luna-arro/repo`)

Take:
- the motion tokens and their discipline (`src/theme/motion.ts`: statement, signature, utility, with Reduce Motion read live);
- the "rolling number" and "check-in pop" craft;
- the lifted card depth;
- caching the family, so the first screen paints instantly;
- the kind copy rules;
- the habit of testing every edge case.

Don't take:
- the paper-and-clay palette;
- Instrument Serif;
- the contour map and color mesh backdrop;
- the route-drawing splash;
- the frosted glass.

Those are Arro's identity. Reusing them would make Saunafam read as a reskin.

**Dervo** (Bryce's parked startup)

I didn't find its repo on the Mac in a quick read-only look, so it wasn't reviewed. The only fact used here: Arro's `src/theme/typography.ts` says Arro's display face is shared with trydervo.com.

That's one more reason Saunafam gets its **own** display face and does not reuse Instrument Serif. Take Dervo's level of finish as the bar, and nothing visual.

**What Saunafam adds of its own:**
- Slower, heavier timing:
  - statement arrivals are about 1100 ms, not 900;
  - the overshoot is softer.
- Materials you could touch: wood grain, stone, steam.
- Heat as a color that changes over time.
- Haptics treated as part of the design, not an afterthought.

### Rules for every direction

**Buttons and links**
- No outlined pill buttons.
  - Primary actions are solid filled shapes with a 14 to 16 pt corner radius: soft rectangles, not capsules.
  - Secondary actions are plain text in ink, weight 600.
- No arrow glyphs (→, ›, ↗) on links or text actions.
  - List rows are tappable across their whole width.
  - A row shows a value on the right when it has one ("3 a week"), and nothing otherwise.

**Type**
- One display face, plus the system sans (SF Pro) for body text.
- Body text starts at 15 pt, as Arro's does, so grandparents can read it.
- Numbers that change (the timer, counts) use tabular figures so they don't jitter. Check the chosen font supports `fontVariant: ['tabular-nums']` **(unverified)**. If it doesn't, lay out each digit in a fixed-width box.

**Motion tokens** (they replace Arro's values in `src/theme/motion.ts`):

| Token | Duration | Curve | Used for |
|---|---|---|---|
| `settle` | 1100 ms | `bezier(0.22, 1, 0.36, 1)` | one arrival per screen, played once |
| `ember` | 520 ms | soft overshoot, `bezier(0.34, 1.25, 0.64, 1)` | check-ins only |
| `utility` | 240 ms | ease-out | small state changes |

- Ambient loops are slow (6 s or more) and named by what they do: `glow-breathe`, `steam-drift`.
- Transform and opacity only.
- Reduce Motion shows everything already finished, with crossfades only.

**Color**
- Member colors stay a 6-color palette handed out in join order. The server mirrors the palette in `private.member_palette()`, so change both together, in a new migration.
- No red badges and no alarm colors. "Not yet this week" is always neutral.

### Direction A: Löyly (birch, stone and ember). RECOMMENDED

**Mood:** a Finnish lakeside sauna on a bright winter afternoon. Pale aspen benches, a charcoal stove, one glowing coal. Scandinavian restraint, warm and quiet.

**Palette**

| Token | Hex | Use |
|---|---|---|
| birch | `#EFE6D8` | screen background |
| steam | `#F8F4EE` | cards and sheets |
| aspen | `#E2D3BD` | trays, wells, empty slats |
| grain | `#D3C1A6` | hairlines, dividers |
| stone | `#8A837A` | meta text, icons |
| smoke | `#55504A` | secondary text |
| char | `#221F1C` | primary text, and the dark timer room |
| ember | `#C9542A` | the one accent: main button, active tab, kept weeks |
| coal | `#9E3B1B` | ember when pressed; ember-colored text on light backgrounds |
| glow | `#F2A35E` | heat glow, in gradients only, never text |
| lake | `#5F8794` | cold plunge, freezes |
| moss | `#6E7F5C` | "kept", where ember would be too loud |

**Member palette**, handed out in this order: `#5F8794` lake, `#B58A3C` brass, `#7B6A93` heather, `#6E7F5C` moss, `#B66A78` lingonberry, `#C9542A` ember.

Ember goes last on purpose. Arro's own audit flagged that the founder's color matching the main button makes their face read as a button.

**Type**
- **Display: Fraunces** (Google Fonts, SIL OFL), the soft cut (SOFT 100, WONK 0).
  - Ship static TTFs at 400 and 600 through the `expo-font` plugin, the way Arro ships Instrument Serif today.
  - It's a warm, slightly rounded serif that reads like a carved wooden sign.
- **Body:** SF Pro.
- **Small-caps labels:** SF Pro 12 pt, weight 600, letter spacing 0.8, uppercase, in stone. Use them sparingly ("THIS WEEK", "IN THE HEAT").

**Texture**
- Very faint vertical slats behind every screen, like the wall of a sauna:
  - 1 px lines in grain, at about 5% opacity, every 28 pt;
  - slight random spacing;
  - drawn once as SVG.
- A soft warm haze drifts slowly over the slats (`steam-drift`, 20 s loop).
- Cards are steam-colored. Keep Arro's lifted ring-and-shadow technique, retinted to char.
- Delete Arro's contour map and color mesh (`src/theme/contours.ts`, the `Backdrop` mesh).

**Timer: "the door closes"**
- **Idle.** Today shows a large ember **Start a session** button, a soft rectangle about 64 pt tall.
- **On tap,** the button grows to fill the screen and the room goes dark:
  - the background eases from birch to char over 800 ms;
  - a heat glow (a radial gradient from glow to transparent) rises from the bottom edge.
- **Elapsed time** shows as big Fraunces numerals in steam color (`14:32`), centered, about 96 pt.
- **Under the numerals,** a small-caps line gives the type and target: "TRADITIONAL · 15 MIN".
- **The glow** breathes (`glow-breathe`: a 6 s cycle, opacity 0.55 to 0.75) and warms one step every 5 minutes, ending close to ember.
- **Progress.** A thin arc of tiny ember dots fills toward the target.
  - Past the target, the arc stays full and the numerals keep counting.
  - The timer never cuts you off.
- **Throw löyly** is an optional, playful button:
  - a quick burst of steam wisps rising from the bottom, plus a soft haptic;
  - no data is stored. It's just delight.
- **Haptics:**
  - medium impact on start;
  - a light tick at each 5-minute mark;
  - success on finish.
- **Actions,** shown as plain text in steam color:
  - **Add a round:** pauses the heat clock, shows "Cooling off" with a lake tint, and resumes on tap;
  - **Done;**
  - **Cancel,** always behind a confirm.

**Streak: "the wall"**

Each week is a horizontal wooden slat, and the streak is a wall of slats stacking up from the bottom.

| Week state | How the slat looks |
|---|---|
| kept | filled ember, with a faint grain highlight |
| frozen | lake, with a frost-stipple texture |
| paused | plain aspen |
| current week | aspen, with small ember dots inside for progress (for example 2 of 3, one dot per counted day) |

- Every fourth slat sits slightly lower, like bench tiers, so a 12-week streak reads as three benches.
- The number sits beside the wall in Fraunces: "**8** weeks together".

**App icon**
- A single rounded sauna stone (a soft char oval) with a warm ember glow coming from beneath it, on birch, with two faint steam wisps above.
- No letters. It reads at 29 pt and looks like no fitness icon.
- Alternate: three stacked ember bench slats on char.

**Why it's recommended**
1. **Readable.** The main screens are light, so they read well in daylight and for older family members. The dark heat room appears only during the timer, where the drama belongs.
2. **Native to sauna culture.** Birch, stone, ember and lake are the actual materials of a Finnish sauna, so the visuals tell the story without a word.
3. **A new identity that keeps what testers liked.** It's warm and light, and it shares no fonts, colors or backdrops with Arro, the portfolio or Dervo. What carries over is the craft: motion tokens, depth and caching.
4. **It stands out.** Dark neon "biohacking" screens are the cliché in recovery apps. Bright, warm and quiet sets Saunafam apart.

### Direction B: Savusauna (smoke sauna, dark)

**Mood:** a smoke sauna at night. Soot-black walls, embers, lantern light. Intimate and cinematic.

**Palette**

| Token | Hex | Use |
|---|---|---|
| soot | `#121010` | background |
| char | `#1D1916` | cards |
| smoke | `#2B2420` | trays |
| ash | `#CFC5BA` | primary text |
| cinder | `#8D827A` | meta text |
| ember | `#FF7A3D` | accent |
| coal | `#C2401F` | pressed |
| lantern | `#F3C58F` | highlights, numerals |
| lake | `#6E9BA8` | cold, freezes |

**Type**
- **Display: Newsreader** italic (Google Fonts, OFL), for headings.
- **Body:** SF Pro.

**Texture**
- A fine film grain at 4% over everything.
- A radial ember glow behind the main number on each screen.

**Timer:** a glowing coal ring that breathes.
- Tiny sparks drift up from it every few seconds.
- The ring fills toward the target.
- Numerals are in lantern.

**Streak: "the kiuas"** (the sauna stove).
- Each kept week adds a stone to a stacked pile.
- Recent stones glow; older ones cool to grey.

**App icon:** one glowing stone on soot.

**Trade-offs**
- Dark everywhere is harder in daylight and for older eyes.
- It fights iOS's light share sheet and photo picker.
- It's moodier than a family app usually wants.

### Direction C: Bathhouse (tile, pine and brass)

**Mood:** a 1950s public bathhouse, part Helsinki, part Tokyo sento. Glazed tiles, pine-green trim, a brass wall clock, towels.

**Palette**

| Token | Hex | Use |
|---|---|---|
| tile | `#F3EEE4` | background |
| towel | `#FFFDF9` | cards |
| grout | `#DCD3C3` | lines |
| pine | `#24463A` | primary text, main button |
| terracotta | `#C0643F` | accent |
| brass | `#B48A4A` | numbers, highlights |
| lake | `#5E8C96` | cold |

**Type**
- **Display: Bricolage Grotesque** (OFL), condensed and bold, for numbers and titles. It feels like painted bathhouse signage.
- **Body:** SF Pro.

**Texture**
- A faint square tile grid with grout lines.
- A slightly glossy highlight on cards.

**Timer:** a brass analog wall clock.
- A sweeping hand fills a terracotta wedge toward the target.
- A digital readout sits below.

**Streak: "the mosaic"**
- Each week is a tile: terracotta when kept, lake when frozen.
- At 4, 8, 12 and 26 weeks, the tiles complete a pattern row.

**App icon:** a pine tile with a cream steam curl.

**Trade-offs**
- It's the most graphic and playful of the three.
- A grid can feel busy.
- The sento reference may not land in the US.

### Key motion moments

These are written for Direction A, but the same moments apply to all three.

#### 1. First launch (Bryce's priority)

The bar comes from Lab E: open on a still, quiet frame, and only move once everything is ready.

**No white flash, and no first-frame jump**
- The native splash background must match the first JS frame exactly (birch `#EFE6D8`).
- Keep the native splash up until all of these are true:
  - fonts have loaded;
  - the cached family has been read from AsyncStorage (`src/state/session.ts` already caches it);
  - the splash's SVG paths are mounted.
- Then hide the native splash, and start motion on the frame **after** the first paint.
- Do no network work before the first paint. The cache paints first and the refresh lands quietly.
- **(unverified)** `expo-splash-screen` isn't in `package.json`. Check how `App.tsx` and `AnimatedSplash.tsx` hide the native splash today, and what SDK 57 needs.

**The splash** replaces Arro's route-drawing splash. It runs once, for about 1.5 s:

| Time | What happens |
|---|---|
| 0 to 600 ms | three steam wisps draw slowly upward from the bottom third (SVG stroke dash offset, glow at 40%) |
| 400 to 1000 ms | the stone mark fades in and settles from scale 0.96 to 1 |
| 700 to 1200 ms | the lowercase wordmark "saunafam" (Fraunces) fades in while its letter spacing settles from 2 to 0 |
| 1200 to 1500 ms | the splash content lifts 8 pt and fades out |

The wisps don't stop at the end. They become the drifting haze behind Welcome, so the splash flows into the app instead of cutting away.

**Other cases**
- **Returning users:** no full splash. A 400 ms fade from the matching native splash straight into Today, then Today's own arrival.
- **Reduce Motion:** show the finished mark, then a 250 ms crossfade.

#### 2. Today's first paint

One `settle` arrival, staggered 70 ms between items, in this order:
1. greeting;
2. this week's slat;
3. the Start button;
4. the family list.

Numbers roll in using the same technique as Arro's `RollingText`.

#### 3. Starting the timer

The "door closes" sequence above:
- the button's frame morphs into the full screen (a measured absolute overlay);
- the background eases over 800 ms;
- the glow rises over 1.4 s;
- medium haptic;
- the status bar switches to light.

#### 4. Finishing a session

- Tap **Done**. The glow cools over 700 ms, shifting toward lake, and the numerals settle.
- The room lightens back to birch as the log sheet slides up, already filled in.

#### 5. Saving a session

- The sheet closes.
- On Today, your avatar ring fills and the slat's next ember dot "ignites" with the `ember` overshoot and a success haptic.
- If that session completed the whole family's week:
  - the slat fills with ember from edge to edge;
  - a short spark burst plays (8 to 12 particles, transform and opacity only);
  - then the line "Week kept, together" appears.

#### 6. Streak milestone (4, 8, 12, 26, 52 weeks)

- A full-screen card.
- The wall of slats builds up from the bottom, one slat every 50 ms, to the milestone count.
- The number lands in large Fraunces with the overshoot, and steam rises behind it.
- **Share** renders a 1080 x 1350 image for the share sheet.
- This replaces the photo-and-gradient template in `MilestoneScreen.tsx`.

#### Technical note

The repo animates with React Native's `Animated`, plus `react-native-svg` and `expo-linear-gradient`. Reanimated and Skia aren't in `package.json` today.

**Decision (from the Quality bar):**
- Add `react-native-reanimated` and build every key moment with it, so motion runs on the UI thread.
- Use springs for physical moves and curves for fades.
- SVG radial gradients for the glow.
- No Skia in this build unless the glow can't hit 60 fps without it. If Skia is needed, note why in the report.

---

## 3. How it works

### Words used in the app

| Word | Meaning |
|---|---|
| session | one sauna visit |
| round | one stint in the heat inside a session |
| the week | Monday to Sunday by default |
| goal | sessions per week, default 3 |
| kept | met the goal |
| freeze | each person's one automatic save |
| break | a planned pause |

- "Family" means whoever you sauna with.
- Onboarding says this once: "Family means whoever you sauna with."

### Navigation

There are 4 tabs, with no badges (as in Arro): **Today**, **Week**, **Feed** and **Me**.

Modal and stacked screens:
- Timer (full screen)
- Log session
- Session detail
- Nudge
- Milestone
- Invite
- Edit profile
- Settings and its sub-screens

Removed or replaced:
- Removed: `MapScreen`, `MoveMethodScreen`, `HowYouMoveScreen`.
- Replaced: `WorkoutDetailScreen` becomes `SessionDetailScreen`.

### Onboarding

The steps live in `src/screens/onboarding/steps.ts`.

**Founder path (8 steps)**
1. **Welcome.** "Keep a sauna streak together."
   - Actions: **Start a family** and **I have an invite**.
   - Plain text below: "Already have an account? Sign in".
2. **Sign in with Apple.** Unchanged. Keep the first-name field.
3. **Name your family.** This creates the family on the server, as it does today. Rotating placeholders: "Sunday sauna", "The Lake House", "Kiuas crew".
4. **Your rhythm (new).**
   - "How many sessions a week?" Large tiles for 2, 3, 4 and 5. Default 3.
   - "What counts as a session?" 5, 10, 15 or 20 minutes. Default 10.
   - The week starts Monday. "Week starts on Sunday instead" is offered here only, and the choice is fixed after creation. **Default.**
5. **How the streak works.** The rules list (see below).
6. **Invite your family.** Share sheet with the code, as today.
7. **Reminders.** "Remind me if I'm behind."
   - Pick days (default Thursday and Saturday) and a time (default 6:30 PM).
   - Or choose "No reminders".
8. **Notifications.** The iOS permission ask, as today.

**Invitee path (9 steps)**
1. Join code.
2. You're invited.
3. Sign in.
4. Meet the family: members, who invited you, the current streak in weeks, and the family's rhythm ("3 sessions a week, 10 minutes or more").
5. Photo.
6. How it works.
7. Reminders.
8. Notifications.

The "How do you move" step is gone. Apple Health is offered after your first saved session instead.

### Today

**Header.** The date, a time-of-day greeting, and your avatar.

**This week card (the hero)**
- Your slat for the current week, with ember dots and "2 of 3 this week".
- A family line that only ever names progress: "Maya and Jo have kept this week. Sam's on 1."
- The family streak: "**8** weeks together".

**Start a session.** A big ember button that opens the timer. Under it, plain text: **Log one I already did**, which opens the form with no timer.

**Forgot one?**
- While yesterday is still open, show "Log yesterday's". This reuses `useYesterdayOpen`.
- On Monday morning, if last week isn't kept and yesterday is open, show "Did you sauna on Sunday? Log it".

**Family list.** Avatar, this week's dots (●●○), and a status:
- "Kept"
- "2 of 3"
- "On a break until Friday"
- "Invited"

Tapping a person:
- **not kept yet:** opens the nudge sheet;
- **kept:** opens their latest session;
- **invited:** reopens the invite (as today).

**Special states**
- **Solo founder:** "Your family streak starts when someone joins", plus an invite.
- **After a broken streak:** lead with "Weeks together this year" and a "Back at it, together" card that never says who missed.
- **Timer running:** a slim dark bar at the top, "In the heat · 12:04". Tapping it reopens the timer.

### Timer

**State**
- Kept in AsyncStorage under `saunafam.timer.v1`:
  - `startedAt` (ISO time);
  - `rounds` (each with a start and an end);
  - `targetMinutes`;
  - `saunaType`.
- Elapsed time is always worked out from timestamps, never from a ticking counter. This means the timer survives backgrounding, the app being killed, and a reboot.

**Defaults**
- Target: the family minimum, rounded up to at least 15 minutes. One tap changes it to 10, 15, 20 or 30. **Default.**
- Sauna type: whatever you used last time.

**Local notifications**
- When the timer starts, schedule "15 minutes in. Time to cool off." for the target time. Cancel it if you finish first.
- At 45 minutes of continuous heat: "Still in there? Time for water and fresh air."

**Rounds**
- **Add a round** pauses the heat clock ("Cooling off"). Tapping resumes it.
- Session minutes are heat minutes only: the sum of the rounds.
- If you finish while cooling off, that open cooling stretch is dropped.

**Finishing.** **Done** opens the log form, prefilled.

**Edge cases**
- **3+ hours old.** Coming back more than 3 hours after `startedAt` shows "Still going? It's been 3 hours", with three choices:
  - **Log it** (enter your real time);
  - **Keep going**;
  - **Discard**.
- **Upper limit.** The server caps sessions at 240 minutes.
- **One timer at a time.** Starting again while one is running just reopens it.
- **Sign out** discards a running timer, after a confirm.
- **Date.** A session dated by its start, so one that starts at 11:50 PM belongs to that day.
- **Live Activity** (Lock Screen and Dynamic Island) is out of scope. It needs a widget extension.

### Log session form

**Opens from:**
- the timer (prefilled);
- "Log one I already did";
- "Log yesterday's".

| Field | Required | Details |
|---|---|---|
| When | yes | Today or Yesterday (the server refuses anything older, as in Arro), plus a start time that defaults to now minus the duration |
| Minutes | yes | 1 to 240; chips for 10, 15, 20, 30 |
| Sauna type | yes | Traditional, Wood-fired, Infrared, Steam room, Smoke, Banya, Other. Large filled tiles in a 2-column grid, not pills |
| Temperature | no | °F or °C by region, stored as °C, 30 to 130 °C (86 to 266 °F) |
| Humidity | no | 0 to 100% |
| Rounds | no | 1 to 10, prefilled from the timer |
| Cold plunge | no | toggle; when on, optional minutes 0 to 30 |
| Place | no | free text up to 60 characters ("Home", "The Y"), plus chips of the family's 5 most recent places. No location permission, ever |
| With | no | "Sat with someone?" Pick up to 3 others (4 people total) |
| Photo | no | library or camera, cropped 4:3, 1440 px long edge, JPEG (Arro's photo rules) |
| Note | no | 140 characters |

**Short sessions.** Below the family minimum, a quiet line under the field: "Sessions under 10 minutes are saved but don't count toward the week."
- Only you see it.
- The feed never marks a session as not counting.

**Saving**
- On success:
  - a success haptic;
  - the sheet closes;
  - the check-in moment plays on Today;
  - the session is written to Apple Health, if you've turned that on.
- Offline or on failure:
  - the session goes into the outbox (`saunafam.outbox.v1`), shows on Today and in the feed right away as yours, and sends when the phone is back online (see the Quality bar);
  - a retry can't double log, because `log_session` takes a `p_client_id` made on the phone;
  - if the server refuses it outright (say the date window closed), keep the draft in `saunafam.draft.v1` and show "Couldn't save this one. Tap to fix it".

**Units.** Use `expo-localization` (`getLocales()[0].temperatureUnit`) **(unverified)**. It isn't in `package.json`, so add it and check that field exists in SDK 57. Fallback: Arro's locale rule from `src/data/workouts.ts`, where US, Liberia and Myanmar get °F.

### Shared sessions (2 to 4 people)

**How a shared session is stored**
- The logger picks up to 3 others from their own family.
- One `log_session` call creates one row per person.
- All the rows share a `shared_id`, which is the logger's row id (the "anchor").
- Everyone gets credit toward their own week, with the date in their own time zone.

**In the feed**
- It's one card: "Maya, Jo and Sam had a sauna together".
- Cheers, comments and the photo live on the anchor, so everyone in it sees the same ones.

**Who can change it**
- **The logger:** edits shared details for the whole group, or deletes the whole session.
- **Anyone else in it:** can choose **Remove me from this session**. That deletes only their own row.

**Duplicates.** Someone who already has a session starting within 30 minutes of this one is skipped, and the logger sees "Jo already logged this one". **Default.**

**Who can be added**
- People on a break can be included. A session on a paused day still counts, as in Arro.
- Invited people who haven't joined yet can't be picked.

**Consent.** Nobody is asked. Added people get a push, "Maya logged a sauna with you", and can remove themselves. **Default.**

### Feed

**What's shown.** Sessions from this week and last week, newest first. Arro showed only today and yesterday, but a weekly rhythm needs the longer window. **Default.**

**Each card shows:**
- the title ("Maya had a sauna", or "Maya and Jo had a sauna together");
- details: "20 min · Traditional · 85°C";
- a lake snowflake if there was a cold plunge;
- the place, photo and note;
- cheers and who gave them.

**Cheers.** "Cheer Maya on" gives one heart pulse and a light haptic. One cheer per person per session.

**Comments.** Up to 200 characters, 20 a day per member.

**Quick replies**
- On someone else's session:
  - "Nice heat"
  - "Jealous"
  - "Save me a spot"
  - "Cold plunge hero" (only when there was a plunge)
- On your own:
  - "Felt great"
  - "Needed that"

### Week (the streak view)

**Top.** The wall of slats, with three numbers: the family streak in weeks, the longest streak, and weeks together this year.

**This week**
- One row per member, with their dots and status.
- A Mon to Sun strip under your own row, showing which days you went.

**Past weeks**
- 12 weeks of history, one line each:
  - "Week of Oct 5: kept"
  - "Week of Sep 28: kept, a freeze was used"
- Only your own view names you as the one who used your freeze. **Default.**
- Tap a week to see who went, and on which days.
- Under the 12 weeks: **See every week** and **Print the wall**, which are Plus items. Both appear only when `plus_enabled` is true. See "Paid tier".

**Rules.** A plain-text **Streak rules** link at the bottom.

### Me

**Profile.** Name, family name, and **Edit profile**.

**2 x 2 stat grid**
- weeks in a row (personal);
- longest streak;
- sessions this month;
- hours in the heat this year.

**Also on this screen**
- Favorite type and place.
- Your last three sessions.
- Badges at 4, 8, 12, 26 and 52 weeks.
- When `plus_enabled` is true: **Heat log**, **Timer face** and **App icon** rows, which are Plus items. See "Paid tier".
- A gear icon that opens Settings.

### Settings

| Row | Behavior |
|---|---|
| Family rules (new) | Goal per week and minimum minutes. The founder edits; changes start next week ("Starting Monday, Oct 26"). Everyone else sees them read-only. Week start is shown but locked |
| Take a break | Rest of this week, One week, Two weeks. The server limits stay: 1 to 14 days counting today, and at most 14 paused days in any 30. "I'm back, end it now" stays |
| Family members | unchanged |
| Streak rules | the rules list |
| Notifications | reminder days and time; a switch for "Weekend check-in" |
| Apple Health (new) | "Save sessions to Apple Health", plus its status |
| Saunafam Plus (new) | Shown only when `app_config.plus_enabled` is true. Opens the Plus sheet, or reads "Plus, from Maya" when the family has it. Restore purchases and the tip jar sit under it. See "Paid tier" |
| The wall (new) | Pick the wall wood for the family. Birch is free; the others need Plus and can be tried on first |
| Privacy, Help & FAQ | `https://saunafam.com/privacy` and `/support` |
| About, Sign out, Delete account | unchanged |

**How you move** is removed.

The dev-only Prototype preview stays. Its sample family becomes "Sunday sauna", with Sam, Maya and Jo.

### Invites

**The code system is unchanged:**
- 8 characters, with no look-alike letters;
- expires after 14 days;
- rate limited;
- at most 12 people per family.

**New message** (`src/state/invite.ts`):

> "Sam invited you to Sunday sauna on Saunafam. We keep a weekly sauna streak together. Get Saunafam, tap 'I have an invite' and enter the code ABCD2345."

**Link.** Once saunafam.com is live, add `https://saunafam.com/join/<code>`. The Worker already serves `/join/<code>`.

### Apple Health (write only)

**Delete everything that reads from Health**
- `healthSync.ts` and its tests;
- background delivery;
- routes;
- the list of dismissed Health workouts;
- the "Your run is in Arro" note.

Health has no sauna activity type, and the Watch isn't rated for sauna heat, so Saunafam never reads from Health.

**When it's offered.** After your first saved session, a one-time card: "Save sessions to Apple Health?" with **Turn on** and **Not now**. It's also in Settings.

**What gets written (Default).** A Mindful Minutes sample (`HKCategoryTypeIdentifierMindfulSession`) for the heat minutes, starting at the session's start. No calories and no heart rate. The alternative is a "Preparation and Recovery" workout (see open questions).

**Check the library first (unverified).**
- Confirm `@appeeky/expo-healthkit` 0.4.x can request write-only permission and save a category sample.
- If it can't, switch libraries, or leave Health out of build 9 and say so in the PR.

**Permission text.** Remove the read string from `app.json` if the plugin allows it. The write string:

> "Saunafam saves your sauna sessions to Apple Health as mindful minutes, if you turn it on. It never reads your Health data."

**Fire and forget.** A failed write never blocks a save. Remember which session ids were written, so that editing a session doesn't write it twice.

### Weekly streak rules (the source of truth for SQL and tests)

**1. The week**
- A family has one `week_starts_on`, an ISO weekday: 1 = Monday (default), or 7 = Sunday.
- Weeks are measured on each member's **own local calendar dates**. So the dates are the same for everyone, and only the moment a week ends differs.

**2. Counted day**
- A day counts if the member has at least one session that day at or above the family minimum.
- Two sessions on the same day count once. **Default.** This stops a "three saunas on Sunday night" rescue.
- Shared-session rows belong to each person, so they count like any other session.

**3. Member week status**, checked in this order:

| Order | Status | When |
|---|---|---|
| 1 | `kept` | counted days ≥ the goal for that week. Can happen mid-week |
| 2 | `pending` | the member's local today is on or before the week's last day |
| 3 | `joined` | the week they joined, if not kept. Not expected, and not a miss |
| 4 | `paused` | on a break for 4 or more days of that week. Not expected; the personal streak holds without growing; no freeze is used |
| 5 | `frozen` | a freeze was available, so it's used automatically |
| 6 | `missed` | none of the above |

**4. Freeze**
- One per member.
- If it's used in week W, it's available again from week W+4.
- Set in `private.freeze_refill_weeks()`, which returns 4.

**5. Personal streak**

| Status | Effect on the personal streak |
|---|---|
| `kept`, `frozen` | +1 |
| `paused`, `joined`, `pending` | holds |
| `missed` | resets to 0 |

**6. Family week**
- **Range.** From the week the second member joined, to the latest current week across all members.
- **Expected members.** A member is expected if they joined before the week began. In the week someone joins, they count only if they keep it.
- **States:**

| State | When |
|---|---|
| `broken` | any expected member is `missed` |
| `pending` | otherwise, if any expected member is `pending` |
| `skip` | otherwise, if nobody is expected (for example, everyone is paused). Neither counts nor breaks |
| `counted` | otherwise |

**7. Family streak**
- Grows on `counted` and resets on `broken`. `skip` and `pending` hold it.
- Also reported:
  - longest streak;
  - weeks together this year (this number never goes down);
  - `started_on`.

**8. Rule changes**
- A goal or minimum changed during week W applies from week W+1.
- Past weeks always use the rule that was in effect then (`family_rules.effective_from`).

**9. Removing a member** removes their sessions. Streaks are computed on read (Arro's design), so past weeks can change, for example a broken week can become counted. That's accepted, but it must be tested.

**10. Milestones**
- Fire at family streaks of 4, 8, 12, 26 and 52 weeks, and the same for personal streaks.
- The phone remembers which ones it has shown (`saunafam.milestones.v1`), so each appears once.

**11. Build 9 reset**
- Every family starts at zero from the week the migration is applied.
- Implemented by ignoring everything before `families.saunafam_started_on` (see section 7).

**Rules list** (`src/data/streakRules.ts`), shown in onboarding and Settings:
1. "One streak for the whole family. It starts when the second person joins."
2. "Each of you does 3 sessions a week, 10 minutes or more. Two in one day counts once."
3. "The week runs Monday to Sunday, in your own time zone."
4. "Everyone has one freeze. Miss a week and it's used for you. It comes back after 4 weeks."
5. "Going away? Take a break. A break of 4 days or more in a week means that week doesn't count against you."
6. "Sat together? One of you logs it for everyone."
7. "Nobody is ranked, and a missed week is never pinned on anyone."

### Edge cases (each needs a SQL or Jest test)

**Joining and solo families**
- **Joins on a Thursday.** That week is `joined` unless they keep it. The family week only expects the others.
- **Solo founder.** Personal weeks run normally. The family streak shows 0 and "starts when someone joins".

**Week boundaries and time zones**
- **Monday morning, yesterday still open.** The member's week is over, so it reads `missed`, or `frozen` if they had a freeze. Logging Sunday's session flips it to `kept`, and the freeze comes back (everything is recomputed on read). Test that the freeze is returned.
- **Time zones.** A Tokyo member has finished the week while a Los Angeles member is still on Sunday. The family week stays `pending` until LA's Sunday ends.

**Breaks**
- **Break length.** A 3-day break doesn't pause a week; 4 days does. A 7-day break starting Wednesday pauses that week (5 days) but not the next one (2 days).
- **Everyone on a break:** the week is `skip`.

**Freezes and rules**
- **Freeze timing.** A freeze used in week W, then a miss in W+2, gives `missed`. A miss in W+4 gives `frozen`.
- **Goal change.** The goal goes from 3 to 2 on a Wednesday. That week still needs 3; the next week needs 2.
- **Short session.** It's saved and shown in the feed, but doesn't count.

**Shared sessions**
- **Who can be in it.** 4 people are allowed. A 5th person is rejected. Someone from another family is rejected. Listing the caller twice is rejected. An overlapping duplicate is skipped.
- **Participant removes themselves.** Only their week changes.
- **Logger deletes it.** All rows, cheers and comments go.

**Removing members**
- **Member removed.** Their rows go, and so do anchors they logged. `shared_id` is `on delete set null`, so the others' rows become solo sessions, and cheers on the deleted anchor go with it. **Default.**

**Dates and the timer**
- **Out-of-range dates.** A date in the future, or older than yesterday, is refused by the server.
- **Timer.** Killed and relaunched; crosses midnight; runs over 3 hours; multiple rounds; cancelled.

**Legacy reminders**
- Arro scheduled 14 days of `arro-reminder-*` notifications ahead.
- On the first launch of build 9, cancel every pending notification whose identifier starts with `arro-`. Otherwise "You still have today" keeps firing.

---

## 4. Data model, migrations, RPCs, security and notifications

### Approach: build 9 only adds, build 10 cleans up

Testers have build 8 installed. If build 9's migrations dropped `workouts`, or changed what `family_streak` returns, anyone still on build 8 would break the moment the migration ships.

**So build 9's migrations only add:**
- new tables: `sessions`, `session_cheers`, `session_comments`, `family_rules`, `app_config`;
- new functions: `family_week_streak` and `member_week_streaks`.

**They also switch off Arro's old pushes:**
- drop the push triggers on `workouts`, `cheers` and `comments`;
- unschedule the `arro-evening-nudge` cron.

**Build 10 cleans up** (not this session):
- it drops `workouts`, `cheers`, `comments`, and the old streak, push and phrase functions;
- a service-role script deletes the old workout photos.

Draft that cleanup as `supabase/drafts/build10_cleanup.sql`. It goes **outside** `migrations/` so it isn't applied.

**Migration files**, using the `YYYYMMDDNNNNNN_name.sql` format (check open PRs for clashes):
1. `20261021000001_saunafam_families.sql`
2. `20261021000002_sessions.sql`
3. `20261021000003_weekly_streaks.sql`
4. `20261021000004_session_social.sql`
5. `20261021000005_saunafam_pushes.sql`
6. `20261021000006_saunafam_plus.sql` (see "Paid tier")

### 1. Families, family rules and app config

**New columns on `families`**

| Column | Type | Default | Notes |
|---|---|---|---|
| `goal_per_week` | smallint | 3 | 1 to 7 |
| `min_minutes` | smallint | 10 | 1 to 60 |
| `week_starts_on` | smallint | 1 | must be 1 or 7 |
| `saunafam_started_on` | date | `current_date` | the reset line; the week containing it is week one |

These hold the current values, for display. The history lives in `family_rules`.

**`public.family_rules`**

```
id uuid pk
family_id uuid -> families on delete cascade
effective_from date not null          -- a week start date
goal_per_week smallint not null check 1..7
min_minutes smallint not null check 1..60
created_by uuid -> members on delete set null
created_at timestamptz default now()
unique (family_id, effective_from)
```

- **Seeding.** Every existing family gets one row, with `effective_from = '2000-01-03'` (a Monday) and the default values. `create_family` inserts this first row too.
- **Access.** Family members can select. Nobody writes directly.

**`public.set_family_rules(p_family_id, p_goal, p_min_minutes)`**
- Security definer. The founder only (checked with `private.family_founder`).
- Upserts a row at the next week start in the caller's time zone, and updates the columns on `families`.
- Returns the date the change takes effect.

**`public.app_config`**
- One row: `min_ios_build integer not null default 9`.
- Read through the function `public.app_config()`, which anon can call, the same way it calls `preview_invite`.
- The app calls it on launch. If the app's own build is below the minimum, it shows: "A new version of Saunafam is ready. Update in TestFlight or the App Store."

**Updating `create_family`**
- It takes optional `p_goal`, `p_min_minutes` and `p_week_starts_on`, all with defaults, so build 8's call still works.
- **(unverified)** Check its current signature across `20261005000004_family_functions.sql` and the later migrations first.

### 2. Sessions

**`public.sessions`**

```
id uuid primary key default gen_random_uuid()
member_id uuid not null -> members(id) on delete cascade
shared_id uuid -> sessions(id) on delete set null    -- the anchor; null when solo
logged_by uuid -> members(id) on delete set null
started_at timestamptz not null
local_date date not null              -- set by trigger from started_at in the member's time zone
duration_minutes smallint not null check (duration_minutes between 1 and 240)
rounds smallint not null default 1 check (rounds between 1 and 10)
sauna_type text not null check (sauna_type in ('traditional','wood_fired','infrared','steam','smoke','banya','other'))
temp_c numeric(4,1) check (temp_c between 30 and 130)
humidity_pct smallint check (humidity_pct between 0 and 100)
cold_plunge boolean not null default false
cold_minutes smallint check (cold_minutes between 0 and 30)
place text check (char_length(btrim(place)) between 1 and 60)
note text check (char_length(note) <= 140)
photo_path text                       -- only on an anchor or a solo session
source text not null check (source in ('timer','manual'))
client_id uuid not null                -- made on the phone; unique per logger so retries can't double log
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
check (cold_plunge or cold_minutes is null)
```

**Indexes:** `(member_id, local_date)`, `(shared_id)`, `(logged_by)`, and a unique index on `(logged_by, client_id)` for anchor rows. Other participants' rows reuse the logger's `client_id`, so make that index partial: only where `shared_id is null or shared_id = id`.

**Triggers**
- Set `local_date` from `started_at`, in the member's time zone.
- Refuse a date outside the allowed window by reusing `private.workout_date_window` (`20261005000006_timezone_floor.sql`). **(unverified)** Check its signature first.
- Bump `updated_at` on every update.

**Row-level security**

| Action | Rule |
|---|---|
| select | allowed when the session's member is in one of my families (the same pattern as `workouts`) |
| insert | no direct grant; inserts only happen through `log_session` |
| update | column grants on `(note, photo_path)` only, on my own anchor or solo rows. Everything else goes through `update_session` |
| delete | my own rows, which is how "Remove me" works |

**Photos.** Use the existing `photos` bucket and the existing `<family>/<member>/<name>.jpg` path. The current policies already cover it.

**`public.log_session(...)`**
- Security definer. Returns a table of `(session_id uuid, member_id uuid, skipped boolean)`.
- Arguments:
  - `p_family_id uuid`
  - `p_started_at timestamptz`
  - `p_duration_minutes int`
  - `p_sauna_type text`
  - `p_rounds int default 1`
  - `p_temp_c numeric default null`
  - `p_humidity_pct int default null`
  - `p_cold_plunge boolean default false`
  - `p_cold_minutes int default null`
  - `p_place text default null`
  - `p_note text default null`
  - `p_source text default 'manual'`
  - `p_with uuid[] default '{}'`
  - `p_client_id uuid` (if this id is already logged, return the existing rows instead of inserting again)
- Checks:
  - the caller is a member of `p_family_id`;
  - `p_with` has at most 3 distinct ids;
  - everyone in `p_with` is in the same family;
  - the caller is not in `p_with`.
- Steps:
  1. Insert the caller's row (the anchor).
  2. For each person in `p_with`: if they already have a session starting within 30 minutes of `p_started_at`, skip them. Otherwise insert their row with `shared_id` set to the anchor and `logged_by` set to the caller.
  3. Copy the shared details onto every row, except the note and photo, which stay on the anchor only.
  4. If anyone else was inserted, set the anchor's own `shared_id` to its own id.
- Permissions: revoke from public and anon; grant to authenticated.

**`public.update_session(p_session_id, ...optional fields)`**
- The caller must be the anchor's logger, or the owner of a solo session.
- Updates the whole group. The note and photo change on the anchor only.

**`public.delete_session(p_session_id)`**
- The logger deletes the whole group.
- Anyone else gets an error and should use "Remove me" instead.

### 3. Weekly streaks

Mirror `20261005000003_streaks.sql`:
- Private functions take a `p_as_of` argument, so tests can pin "now".
- Public wrappers check membership through `private.my_family_ids()`.

**Private functions**

| Function | What it does |
|---|---|
| `private.freeze_refill_weeks()` | returns 4 |
| `private.week_start(d date, starts_on smallint)` | returns `d - ((extract(isodow from d)::int - starts_on + 7) % 7)` |
| `private.rule_for_week(p_family_id, p_week_start)` | the `family_rules` row with the latest `effective_from` that is on or before `p_week_start` |
| `private.member_weeks(p_member_id, p_as_of)` | rows of `(week_start, counted_days, goal, status)`, from the later of the member's join week and the `saunafam_started_on` week, up to the current week |
| `private.family_weeks(p_family_id, p_as_of)` | rows of `(week_start, state)` |
| `private.family_week_summary(p_family_id, p_as_of)` | `family_streak`, `longest_streak`, `weeks_together_this_year`, `started_on`, `latest_week_state` |
| `private.member_week_summary(p_member_id, p_as_of)` | `member_id`, `local_today`, `week_start`, `counted_days`, `goal`, `personal_streak`, `kept_this_week`, `freeze_available`, `freeze_back_on` (a week start), `paused_until` |

**Public wrappers**
- `public.family_week_streak(p_family_id)`
- `public.member_week_streaks(p_family_id)`, ordered by `joined_at`.

**Performance check.** Add a pgTAP test with 12 members and 52 weeks of sessions. It should finish in under 200 ms locally.

### 4. Cheers and comments

**`public.session_cheers`**
- Columns: `id`; `session_id` (cascade); `member_id` (cascade); `created_at`.
- Unique on `(session_id, member_id)`.
- A trigger refuses a cheer on a shared row that isn't the anchor.
- Row-level security mirrors `cheers` in `20261005000002_row_level_security.sql`.

**`public.session_comments`**
- Columns: `id`; `session_id`; `member_id`; `body` (1 to 200 characters); `created_at`.
- Same anchor-only rule as cheers.
- Rate limit: 20 a day. Reuse `private.check_comment_rate` if it isn't tied to the old `comments` table; otherwise write a new one. **(unverified)**
- Delete: your own comments, or any comment on a session you logged. This mirrors `20261018000001_build7_review.sql`.

### 5. Pushes

**Remove the old pushes**
- Drop `workouts_queue_moved_push`, `cheers_queue_push` and `comments_queue_push`.
- Run `select cron.unschedule('arro-evening-nudge')`.

**Allow the new push kinds**
- Extend `push_outbox_kind_check` with `'session'`, `'shared'`, `'weekend'`, `'session_cheer'` and `'session_comment'`. Keep the old kinds until build 10.
- Update the `local_date` check to match.

**What each push does**

| Kind | Who gets it | Title / body | Limits |
|---|---|---|---|
| session | family members who weren't in the session | "Maya had a sauna" / "Send a cheer." For a shared session: "Maya, Jo and Sam had a sauna together" | first session per mover per local day; 07:00 to 21:00 for the recipient; not sent for yesterday logs or short sessions |
| shared | everyone in the session except the logger | "Maya logged a sauna with you" / "It counts toward your week." | 07:00 to 21:00 |
| session_cheer | everyone in the session | "Jo cheered you on" / "For your sauna." | once per session per cheerer; 07:00 to 21:00 |
| session_comment | everyone in the session except the commenter | "Jo on your sauna" / the comment | 07:00 to 21:00 |
| nudge | the person nudged | "Sam is cheering you on" / "There's still time this week." | one a day (the existing unique rule) and at most 2 a week (new); not while they're on a break; 07:00 to 21:00 |
| joined | everyone already in the family | "Jo joined Sunday sauna" | unchanged |
| weekend | members who have already kept the week | "Maya still has this week" / "A cheer from you might help." Names up to two people, then "and 2 others" | Saturday 17:00 to 18:00 for the recipient; once a week. Doesn't name anyone on a break or anyone who can't still make it (days left are fewer than sessions needed). Skipped entirely if everyone has kept the week |

**How the weekend push runs**
- `private.queue_weekend_nudges()`, modeled on `queue_evening_nudges` (`20261005000008_evening_nudge.sql`).
- Scheduled with `cron.schedule('saunafam-weekend', '*/15 * * * *', ...)`. Every 15 minutes means time zones with :30 and :45 offsets still land in the window.
- Deduplicated on `(user_id, kind, local_date = week start)`.

**Local notifications (scheduled on the phone)**
- **Timer:** one at the target time and one at the 45-minute safety point, scheduled when the timer starts and cancelled on finish.
- **Weekly reminders:**
  - Sent on the chosen days, only while the week isn't kept. Text: "2 to go this week" / "Ten minutes counts. Your family will see it." (built from the family's minimum).
  - Scheduled 4 weeks ahead, rebuilt on every refresh.
  - Identifier prefix: `saunafam-reminder-`.
- **Legacy cleanup:** cancel anything prefixed `arro-` on first launch.

**Edge functions**
- **`send-push`:** no logic change expected.
- **`NotificationTaps.tsx` routing:**

| Push kind | Opens |
|---|---|
| `session`, `shared`, `session_cheer`, `session_comment` | SessionDetail |
| `nudge` | Nudge |
| `weekend` | the Week tab |

- **`remove-member`:** confirm it deletes everything under the member's photo folder, which would cover session photos too **(unverified)**. Update its comments.
- **`delete-account`:** sessions cascade away through members. Only the comments and copy change.
- `deno check` must pass.

### pgTAP tests

**New test files:**
- `supabase/tests/database/sessions.test.sql`
- `weekly_streak.test.sql`
- `saunafam_push.test.sql`

**Follow the existing style:**
- everything rolled back;
- fixed test users at `@saunafam.test`;
- `Etc/GMT-10` where a time zone needs pinning.

**Cover:**
- every edge case in section 3;
- these row-level security cases:
  - family B can't read family A's sessions;
  - family B can't `log_session` into family A;
  - no one can update someone else's row;
  - no one can cheer a shared row that isn't the anchor.

All 192 existing tests must keep passing. The old tables still exist in build 9, so they should.

---

## 5. Landing page, privacy page, App Store

### saunafam.com (`site/`, Cloudflare Worker)

**Structure stays the same:**
- plain HTML in `site/public`;
- `worker.js` handles the www redirect and `/join/<code>`;
- `site/scenes/` holds generated art.

**Restyle in Direction A:** Fraunces and the slat wall, replacing `contours.svg` and the mesh in `backdrop.js`.

**Page sections**
1. **Hero:** "Keep a sauna streak together."
   - Sub: "A weekly sauna streak for your family or your sauna crew. Everyone goes when they can. You keep it together."
   - An iPhone frame showing the dark heat room, with the glow breathing (CSS, with a reduced-motion version).
   - A solid ember button: **Join the TestFlight** (later, the App Store badge).
   - First load follows the app's rule: still first, then one settle.
2. **How it works:** three panels with small illustrations (stone, slat, heart).
   - "Start the timer, or log it after."
   - "Three a week each."
   - "One streak for all of you."
3. **The wall:** 12 slats settle in once when the section comes into view, one of them a freeze.
   - Caption: "Miss a week? Everyone has one freeze. Away? Take a break."
4. **Sat together?** "One of you logs it, and it counts for everyone in the room." Shows a shared session card.
5. **Kind by design:**
   - no rankings;
   - a missed week is never pinned on anyone;
   - nudges are capped;
   - no ads, no tracking.
6. **Your sauna, your way:** traditional, wood-fired, infrared, steam, smoke, banya, plus the cold plunge.
7. **FAQ:**
   - Apple Watch? No: a built-in timer, because the Watch isn't made for sauna heat.
   - Do I need a home sauna? No.
   - Can friends join? Yes, up to 12 people.
   - What does it cost? Free for now. **Default.**
   - Does it read my Health data? No.
8. **Footer:** support email, privacy, "Made by Bryce Rambach".

**Join page.** `/join/<code>` says "You're invited to a family on Saunafam", shows the code large, and has a **Get the app** button.

**Rules for the site**
- No em or en dashes.
- No arrow glyphs on links.
- No outlined pill buttons.

### Privacy page

Files: `site/public/privacy/index.html` and `design/app-store/privacy-policy.md`.

**Who we are.** Bryce Rambach, an individual developer. Contact: support@saunafam.com.

**What we collect**
- Apple sign-in: your name, your relay or real email, and your Apple user id.
- Your family name, member name, photo, color, time zone and reminder settings.
- Sessions: time, minutes, rounds, type, temperature, humidity, cold plunge, place text, note, photo.
- Cheers, comments, nudges and breaks.
- A push token.

**What we don't collect**
- No location.
- No reading from Apple Health.
- No contacts.
- No ads, no analytics SDKs, no tracking. (There's no analytics package in `package.json` at `b68cd61`.)

**Apple Health.** Sessions are written as mindful minutes, and only if you turn it on. Saunafam never reads from Health, and Health data is never used for ads.

**Who sees your data.** Only your family. Photos are private and shared through links that expire.

**Where it's stored.** Supabase (region **(unverified)**), the Expo push service, and Apple.

**Deleting your account.** Settings, Delete account. It removes your data, your photos and the Apple link.

**Children.** Not directed at children under 13. **Default.** Families may include kids, so Bryce should confirm this before the App Store age rating.

**App Privacy label.** Update `design/app-store/app-privacy.md` to match. Drop Location and Health reads if they're declared now **(unverified)**. Keep Name, Email, Photos, User Content and Identifiers. Nothing is linked to tracking.

### App Store listing (`design/app-store/listing.md`)

| Field | Content |
|---|---|
| Name | Saunafam |
| Subtitle (24 of 30 chars) | "Your shared sauna streak" |
| Promotional text | "Keep a weekly sauna streak with your family or sauna crew. Start the timer, log it after, or log one session for everyone who sat together." |
| Keywords (exactly 100 chars) | `family,friends,cold plunge,timer,infrared,steam,habit,wellness,heat,tracker,group,banya,spa,recovery` |
| Category | Health & Fitness, with Lifestyle as secondary |

The keywords don't repeat any word from the name or subtitle.

**Description sections:**
- "One streak, together"
- "A timer made for the heat"
- "Sat together? Log it once"
- "Freezes and breaks"
- "Kind by design"
- "Apple Health, if you want it"

**Screenshots:** 6.9 inch iPhone at 1320 x 2868 **(unverified; check App Store Connect's current sizes)**. Each has a Fraunces caption band at the top.

| # | Caption | Screen |
|---|---|---|
| 1 | "Close the door. We'll keep time." | timer in the dark room at 14:32 |
| 2 | "One streak for the whole family." | Today, 8 weeks together |
| 3 | "Three a week, together." | wall of slats with one freeze |
| 4 | "Sat together? Log it once." | log form with 3 people picked |
| 5 | "Cheer each other on." | Feed with a photo card and comments |
| 6 | "12 weeks in the heat." | Milestone card |

Use the sample names only: Sam, Maya and Jo. No real places.

---

## 6. Rename checklist

### How many mentions there are

Whole-word "Arro" at `b68cd61`, excluding `node_modules`:

| Place | Mentions | Files |
|---|---|---|
| `src/` | 55 | 28 |
| `app.json` | 6 | 1 |
| `App.tsx` | 1 | 1 |
| `site/` | 90 | 10 |
| `supabase/` | 3 | 2 |
| `scripts/` | 2 | 1 |
| `README.md` | 6 | 1 |
| `AGENTS.md` | 3 | 1 |
| `AUDIT.md` | 1 | 1 |
| `design/` | 178 | 16 |

The "62 in 41 files" figure you were given doesn't match these counts. Re-run the search and treat that output as the list:

```
grep -rnw --exclude-dir=node_modules --exclude-dir=.git 'Arro' .
```

### Change

**`app.json`**
- `expo.name` becomes "Saunafam".
- Update the HealthKit permission strings (write-only).
- Update the photo picker string:
  > "Saunafam uses a photo only when you pick one for your profile or a session. Your family sees it in Saunafam."
- Add a camera permission string. **Default:** add the camera.
- Set `ios.buildNumber` to "9", in its own commit.
- Change the Android icon background color.

**User-facing strings in `src/`**
- `SignInScreen`
- `NotificationsScreen`
- `App.tsx` ("This build can't reach Saunafam")
- `InvitePanel`
- `TakeBreakScreen`
- `WelcomeScreen`

**Hard-coded arrofamily.com URLs**
- `src/state/invite.ts`
- `src/screens/SettingsScreen.tsx` (privacy and help)

**Code comments that mention arrofamily.com:** Backdrop, motion, tokens, typography, Glass, CheckInPop, RollingText, ThisWeekScreen, WelcomeScreen. Update or remove them.

**Notification identifiers.** `arro-reminder-` and `arro-saved-` (`src/state/notifications.ts`) become `saunafam-reminder-`, and old ones are cleaned up as described in section 4.

**Package name.** `package.json` `name` becomes "saunafam". Then run `npm install` to update the lock file.

**Supabase**
- Never edit migrations that are already applied.
- The new cron job is named `saunafam-weekend`.
- New test files use `@saunafam.test`. Leave the old test files as they are. **Default.**

**Assets**
- `assets/icon.png`
- `splash-icon.png`
- `favicon.png`
- `android-icon-*`
- Rebuild them with `scripts/generate-icons.mjs`.
- Set the splash background color. **(unverified)** It isn't in `app.json`, so find where it's set.

**Site**
- Every page.
- `site/wrangler.jsonc`:
  - `name` becomes `saunafam`;
  - add routes for `saunafam.com` and `www.saunafam.com`;
  - keep the `arrofamily.com` and `www.arrofamily.com` custom domains.
- `site/worker.js`: 301 redirect any arrofamily.com host to `https://saunafam.com`, keeping the path. That covers `/join/<code>`, `/privacy` and `/support`, so build 8 links and the current App Store privacy URL keep working. Keep the redirect for at least 12 months. **Default.**
- `site/README.md`.

**Docs**
- `README.md`, `AGENTS.md`, `CLAUDE.md`, and the note in `AUDIT.md`.
- Everything in `design/app-store/*.md`.
- Leave the historical design docs as they are, with one line added at the top of each: "Written for Arro, before it became Saunafam."
- Save this spec as `design/saunafam-spec.md`.

### Keep

**App identity (so testers get build 9 as an update and Sign in with Apple keeps working)**
- Bundle id `com.arrofamily.arro`.
- `expo.slug` "arro". EAS links the slug to project `6540bde3-...`. **(unverified)** Changing it may break `eas build`.
- `owner` "brycerambach" and the EAS project id.

**Backend**
- `supabase/config.toml` `project_id = "arro"`.
- The hosted Supabase project.

**Stored data on the phone**
- Keep AsyncStorage `arro.session.v1` and the Supabase auth key, so testers stay signed in.
- Change `arro.family.v1` to `arro.family.v2`, since its shape changes. Delete v1 on launch.
- Delete `arro.moveMethod.v1`.
- New keys use the `saunafam.` prefix.

### Bryce's steps (each only on his go)

1. **Hook up the domain.** saunafam.com is already registered in Bryce's Cloudflare account, the same one that runs the arrofamily.com Worker. Nothing needs buying. What's left for Bryce is the DNS and route hookup: add `saunafam.com` and `www.saunafam.com` as custom domains on the Worker (the `routes` in `site/wrangler.jsonc` do this on deploy), and keep the arrofamily.com routes for the redirect.
2. **Set up email.** Forward support@saunafam.com with Cloudflare Email Routing.
3. **Deploy and check the site.** Run `npx wrangler deploy` from `site/`, then check it:
   ```
   for p in / /privacy/ /support/ /join/ABC234; do curl -s -o /dev/null -w "%{http_code} $p\n" https://saunafam.com$p; done
   ```
   Also check that arrofamily.com redirects with a 301.
4. **App Store Connect.**
   - Rename the app to Saunafam. **(unverified)** The name has to be free across the whole App Store. No app with that name showed up in a search on 20 Oct.
   - Update the subtitle, the privacy and support URLs, and the TestFlight notes.
5. **Supabase.** Run `supabase db push --dry-run`, then `supabase db push` for the 6 migrations. The Plus migration is safe to ship, because Plus stays off until `plus_enabled` is set. Deploy any changed edge functions. Do this right before build 9 goes to TestFlight.
6. **Build and submit.** Run `eas build` and `eas submit` for build 9.
7. **Optional, later.** Rename the GitHub repo. **Default:** not in this build.
8. **Later, for Plus.** The App Store Connect, RevenueCat and sandbox steps are in "Paid tier". Do them after build 9 ships, then turn Plus on with a later build.

---

## 7. Existing testers (build 8 to build 9)

**Stays the same**
- Sign-in.
- Their family.
- Members and colors.
- Profile photos.
- Invites.

**Resets**
- The streak starts at week 1. `families.saunafam_started_on` is set to the date of the migration.
- Old workouts, cheers, comments and workout photos are hidden in build 9 and deleted in build 10.
- Arro's daily streaks, freezes and milestones don't carry over.
- Active breaks stay, and follow the weekly rules (the `pauses` table is unchanged).

**Cleared on the phone**
- The cached family (`arro.family.v1`).
- The old local reminders.

**First launch of build 9**
1. The new splash.
2. A one-time sheet, "Arro is now Saunafam":
   > "Your family is still here. We've moved from daily movement to a weekly sauna streak: 3 sessions a week each, 10 minutes or more. Everyone starts fresh at week one."
   - Button: **Got it**.
   - The founder also gets **Change the rhythm**.
   - It's shown once, keyed by `saunafam.welcomed.v1`.
3. Today.

Testers never go through onboarding again.

**Apple Health**
- iOS keeps the old read permission, and the app can't remove it.
- The FAQ explains how to turn it off: Settings, Health, Data Access & Devices.

**Testers still on build 8** keep working, because nothing they use is dropped. They just stop getting "moved" pushes.

**Message for testers** (TestFlight "What to Test"; a draft for Bryce, not sent):
> "Arro is now Saunafam, a weekly sauna streak. Your family carries over and the streak starts fresh. Try the timer, log a session for two people, and cheer someone on."

---

## Paid tier

### The short version

- **The core stays free, for everyone, for good.** Logging, the timer, the weekly streak, freezes, breaks, shared sessions, cheers, comments, photos, nudges, Apple Health and up to 12 people. A price never stands between grandma and logging her Sunday sauna, and nothing anyone buys or stops buying can change a streak.
- **One paid plan, Saunafam Plus.** One person pays and the whole Saunafam family gets it, even people who aren't in their Apple family. It adds things. It never takes anything away.
- **$24.99 a year per family, or $59.99 once ("Founding family").** No monthly plan and no free trial at first. Locked items can be tried on before buying instead.
- **Plus is extras only:** wall woods, timer faces, app icons, every past week (not just the last 12), family stats and a printable poster of the wall. A year in review follows in build 10.
- **Optional secondary: a tip jar** ($1.99, $4.99, $9.99), only in Settings and at the bottom of the Plus sheet. It's never prompted.
- **Never sold:** streak repairs, extra freezes, seats, a bigger family, ads or data.
- **The paywall is never shown on its own** except for one quiet card, at most once every 60 days per person and 3 times ever, with "Don't show this again".
- **Build: RevenueCat, a webhook to Supabase, and the `family_plans` table that already exists.** It ships in build 9 switched off (`app_config.plus_enabled = false`). Bryce turns it on in a later build, after the App Store Connect steps and a sandbox test.
- **Adds about 10 engineering hours** (new milestone M15). The total goes from about 53 to about 63.

This builds on `design/paid-plan.md` in the repo, Arro's paid plan (October 2026). The rules carry over: one payer covers the family, invitees never see a price, nothing is sold that relieves streak stress, and `family_plans` is the source of truth. What changes is what's sold and the price, because Saunafam is a weekly habit with the streak free and the extras mostly visual.

### What the research says

The full table, with links, is in the appendix at the end. In short:

- **Sauna and plunge trackers are cheap or subscription.** HotLog is $1.99 up front, Sauna Tracker is $5.99 up front, Shiver is free with no purchases, and GoPolar and Brisk are free to download with subscriptions around $39.99 a year for one person.
- **One-time prices earn goodwill.** Streaks costs $5.99 once, has a 4.8 rating from about 27,000 ratings, and one of the reviews on its page thanks it for not being a subscription.
- **Generous free tiers earn goodwill too.** Finch says its self-care tools are free and not locked behind a subscription, and its reviews say so back. Gentler Streak's reviews praise its free essentials.
- **Family plans cost about 1.5 to 1.8 times a single plan.** Strava Family is $139.99 a year for up to 4, against $79.99 for one. Duolingo Family is $119.99 a year for up to 6, against $95.99 for one.
- **Cosmetics sell when the app is designed around them.** (Not Boring) Habits sells skins from $4.99 to $9.99 alongside its subscriptions.
- **The complaints are about price for what you get,** not about the existence of a paid tier. Examples are GoPolar ("Expensive app...") and an older Strava review ("Not Worth a Subscription").
- **Duolingo says joining or leaving its family plan doesn't touch your streak.** That's the promise Saunafam makes too.

The App Store only shows a handful of reviews per page, so the complaint notes are a sample, not a survey.

### Models considered

Each is scored from 1 to 5, where 5 is best:
- **Fairness:** does it ever make anyone feel squeezed?
- **Revenue:** how much it could plausibly bring in.
- **Build cost:** 5 is cheapest.
- **Löyly fit:** does it suit a warm, quiet, tactile app?

| # | Model | Fairness | Revenue | Build cost | Löyly fit | Notes |
|---|---|---|---|---|---|---|
| 1 | **Saunafam Plus, per family** (yearly plus a one-time "Founding family"), extras only | 4 | 4 | 3 | 5 | One payer, whole family. Uses `family_plans` as designed. **Recommended** |
| 2 | Founding family one-time unlock only | 5 | 2 | 4 | 5 | The fairest and simplest. Revenue stops once early families have bought. **Alternative 1** |
| 3 | Cosmetic packs, bought one by one (woods, timer faces, icons) | 4 | 2 | 3 | 4 | The (Not Boring) way. Each pack is a separate product to review and price, and only the buyer's look changes unless packs are family-wide. **Alternative 2** |
| 4 | Stats and history only (year in review, every week, poster) | 3 | 3 | 3 | 4 | Strong reason to pay, but on its own it feels like renting back your own past |
| 5 | Subscription shared through Apple Family Sharing only | 3 | 3 | 4 | 3 | Only reaches the payer's Apple family (up to 5 others). Sauna crews and friends wouldn't be covered |
| 6 | Per-person subscription (the GoPolar and Brisk way) | 2 | 3 | 3 | 2 | Splits the family into payers and non-payers. Breaks the "together" idea |
| 7 | Guided rituals (round plans, contrast routines, audio cues) | 4 | 2 | 1 | 4 | Content heavy, and health claims need care. Maybe later, maybe free |
| 8 | Venue and partner listings (bathhouses pay to be listed) | 2 | 2 | 2 | 2 | Needs sales work, location features (out of scope) and feels like ads |
| 9 | Tip jar | 5 | 1 | 5 | 5 | Kind and cheap to build. Small money. **Optional secondary** |
| 10 | Pay for more than 12 people | 3 | 1 | 4 | 3 | Few groups are that big, and it's a seat charge in disguise |
| 11 | Streak repairs or extra freezes | 1 | 4 | 4 | 1 | **Never.** Selling relief from streak worry is exactly what Saunafam says it won't do |
| 12 | Ads | 1 | 1 | 3 | 1 | **Never.** Ruins the quiet, and clashes with the privacy page |

### The recommendation

**Primary: Saunafam Plus, one plan per Saunafam family.** It earns more than a one-time unlock, it rewards the founder (the person who cares most and is most likely to pay), and it gives everyone in the family the benefit. It reuses the server design Arro already built.

**Optional secondary: the tip jar.** For people who want to say thanks without wanting anything. It's never prompted and has no perks, so it can't turn into pressure.

#### Free for everyone, forever

- The timer, logging after the fact, shared sessions of 2 to 4, and editing and deleting sessions.
- The family streak and personal streaks, freezes, breaks, milestones and badges at 4, 8, 12, 26 and 52 weeks, and the milestone share image.
- Today, the Feed, cheers, comments, photos and nudges.
- The Week screen with the slat wall in birch and the last 12 weeks of history.
- The Me screen as in section 3, including the 2 x 2 stat grid.
- Family rules, notifications, Apple Health, invites and up to 12 people.
- Everything a person logged stays stored, whether or not anyone pays. Leaving a plan, or a plan ending, deletes nothing.

#### Saunafam Plus (covers the whole family)

| Feature | What it is | Who sees it |
|---|---|---|
| Wall woods | The slat wall in **cedar**, **alder** and **charred pine**, as well as the free birch. Chosen once for the family | Everyone in the family |
| Timer faces | **Coal** (direction B's ring on soot) and **Brass** (direction C's clock), as well as the free Löyly face | Each person picks their own |
| App icons | Night stone, Cedar and Lake, as well as the default | Each person picks their own |
| Every week | The Week screen's history goes back to the family's first Saunafam week, not just 12 | Everyone in the family |
| Family stats | A "Heat log" screen under Me: hours in the heat by month, sessions by type and place, the family's best run, longest session by person (no ranking, alphabetical) | Everyone in the family |
| The wall poster | A print-ready image of the family's wall (every week, with the family name and dates) to save or print | Everyone in the family |
| Year in review | "Your year in the heat", every December, shareable. **Build 10, not this session** | Everyone in the family |
| Founding family nail | Lifetime buyers get one small brass nail on the first slat of their wall | Everyone in the family |

The rule for picking Plus features: they make the family's shared wall richer. They never relieve stress the app created, and they never gate the loop.

**Default:** any family member can change the wall wood. The change shows for everyone, with no feed post and no push.

#### Prices and why

| Product | Price | Type |
|---|---|---|
| Saunafam Plus, yearly | **$24.99 a year** per family | auto-renewable subscription |
| Saunafam Plus, Founding family | **$59.99 once** per family | non-consumable |
| Tip: a ladle | $1.99 | consumable |
| Tip: a bucket | $4.99 | consumable |
| Tip: an armful of birch | $9.99 | consumable |

Why these:
- **$24.99 a year for the whole family is less than one person pays elsewhere.** GoPolar, Brisk and Gentler Streak each list $39.99 a year for one person, and Arro's plan was $39.99 per family. Saunafam Plus is lighter than Arro's (the streak and history most people use are free), so it should cost less. For a family of four, that's about $6 each.
- **It stays well under the big family plans,** Strava ($139.99) and Duolingo ($119.99), which sell far more.
- **$59.99 once is about 2.4 years of the yearly plan.** It's close to (Not Boring) Habits' $59.99 lifetime, and inside Gentler Streak's lifetime range. It's for people who, like the Streaks reviewers, would rather not subscribe.
- **No monthly plan at first.** Sauna is seasonal for many people, and a monthly plan invites paying in winter and cancelling in spring. Strava Family is annual only too. **Default:** revisit if people ask for one.
- **No free trial at first.** A trial that renews into a charge is the classic surprise bill. Plus is mostly visual, so the try-on preview (below) shows what you'd get, with nothing to cancel.
- **What Bryce keeps:** with the Small Business Program, Apple takes 15%, so $24.99 leaves about $21.24 before tax, and $59.99 leaves about $50.99. RevenueCat is free under $2,500 a month in tracked revenue.
- **Apple sets the other countries' prices** from the US price. Bryce should check the suggested AUD and EUR prices before launch.
- **For the TestFlight families,** give a free year with offer codes rather than a cheaper price. **(unverified)** Check that offer codes work for this subscription group when it's created.

#### When the paywall appears

**Only when someone asks for it** (taps something), in these places:

| Place | What they tap | What happens |
|---|---|---|
| Settings | the **Saunafam Plus** row | the Plus sheet |
| Settings, The wall (new) | a locked wood | try-on: the wall on screen turns that wood for as long as you're on the screen, with a small "Keep this wood with Plus" button. Nothing is saved |
| Me | **Timer face** or **App icon** | the same try-on, for that item |
| Week | **See every week** at the bottom of the 12 weeks | the Plus sheet, opened at "Every week" |
| Me | **Heat log** | a blurred preview of the stats, with the Plus sheet below |
| Week | **Print the wall** | the Plus sheet, opened at "The wall poster" |

**One quiet card, the only unprompted ask:**
- It sits at the bottom of the Week screen, under the history, never as a pop-up.
- It first appears the Tuesday after the family's 8th kept week.
- After that, at most once every 60 days per person, and 3 times ever.
- "Not now" hides it. "Don't show this again" turns it off for good.
- Copy: "Eight weeks of heat, together. Saunafam is free and always will be. If you'd like to make the wall your own, there's Plus." with a solid **See Plus** button and a plain-text **Not now**.
- The cap is stored per member on the device. A reinstall could show one extra card at most. That's acceptable.

**Never shown:**
- on first launch, in onboarding (founder or invitee), or while joining from an invite;
- to anyone who joined less than 4 weeks ago, unless they tap something themselves;
- anywhere in the timer (idle, running, cooling off) or the log form;
- in the moment after saving, on a week-kept celebration, or on a milestone card;
- on a screen about a missed week, a freeze, a break or a nudge;
- in push notifications, local notifications or email;
- to anyone if the family already has Plus;
- at all while `app_config.plus_enabled` is false.

**Nag frequency cap:** 1 unprompted card per person per 60 days, 3 ever, 0 after "Don't show this again", and 0 pushes about Plus, ever.

#### Copy tone

Plain, warm and short, in Bryce's voice. It says what you get and what it costs, and then gets out of the way. No guilt, no urgency.

Draft for the Plus sheet:
- **Title:** "Saunafam Plus"
- **Lead:** "The streak is free, for everyone, for good. Plus is for families who'd like a little more from the wall."
- **Covers:** "One purchase covers everyone in Sunday sauna. Nobody else pays."
- **List:** "Cedar, alder and charred pine walls", "Coal and Brass timer faces", "New app icons", "Every week you've kept", "Your family's heat log", "A poster of your wall".
- **Price choices:** "Yearly: $24.99 a year" and "Founding family: $59.99 once".
- **Button:** "Get Plus for $24.99 a year" (it follows the choice).
- **Small print:** "Renews every year until you cancel. Cancel anytime in Settings, Apple ID, Subscriptions." Plus the **Restore purchases**, **Terms** and **Privacy** links.
- **Sign-off:** "Saunafam is made by one person. Plus helps keep the heat on. Thank you. Bryce"
- **Success:** "Thank you. The wall is yours." on the Plus sheet. Then the Settings row reads "Plus, from Maya" for everyone.

Never write lines like these:
- "No thanks, I don't care about my family" (confirmshaming);
- "Only today", "Last chance", "X families joined this week";
- "Unlock your streak" or anything that ties Plus to the streak.

#### Fitting the Löyly design

**The Plus sheet**
- A bottom sheet in birch `#EFE6D8`, at 90% height.
- At the top, a live slat wall in the wood currently picked, with the family's real weeks.
- Below it the feature list, in Fraunces for the title and the body face for the list.
- The two price choices are flat solid tiles. The picked one fills ember `#C9542A` with birch text, and the other stays birch with a char hairline. No outlined pill buttons.
- One solid ember button. **Not now** is plain char text, not an arrow link.
- The close control sits top right, visible immediately and at full size. It's never faded in late or shrunk.

**Motion**
- Picking a wood crossfades the slats over 400 ms with the standard settle, one slat at a time from the left.
- A purchase landing re-grains the wall once, slowly, with the `success` haptic.
- With Reduce Motion on, it's a plain crossfade.

**No dark patterns**
- No countdown timers or fake deadlines.
- No pre-ticked upsells.
- The yearly price is always shown as the yearly amount, never only "per month" or "per week".
- No "most popular" badge unless it's true and measured.
- No hidden close button.
- No paywall after a loss.
- Prices come from the store, never hard-coded.

**Lapsed and problem states stay quiet**
- **A plan ends:** the wall goes back to birch, and Settings shows: "Plus ended on Oct 3. The wall is back to birch. Everything you logged is still here." No pop-up.
- **Apple can't renew:** during Apple's grace period Plus keeps working. Only the payer sees a Settings line: "Apple couldn't renew Plus. You can update your payment in Settings." Nobody else is told.

### How it's built

#### RevenueCat, not StoreKit 2 directly

**Choice: RevenueCat** (`react-native-purchases`), with our own paywall screen (not `react-native-purchases-ui`), so it matches Löyly exactly.

Why:
- **Expo supports it.** Expo's in-app purchases guide lists it, and RevenueCat has its own Expo install guide. It needs a development build, which the repo already uses (`expo-dev-client` ~57.0.19 is in `package.json`). In Expo Go it runs in a preview mode with fake purchases.
- **It does the hard parts:** receipt and transaction checks with Apple, renewals, grace periods, refunds and restore, plus a webhook that tells the server.
- **It costs nothing at this size:** free up to $2,500 a month in tracked revenue, then 1% (RevenueCat pricing page, checked 20 Oct).
- **Arro's plan already chose it,** and `family_plans` was designed around its webhook (the comment in the RLS migration says so).

**SDK 57 support (unverified).** Check the current `react-native-purchases` version against the Expo SDK 57 docs before installing, and install with `npx expo install` so the version matches.

**The alternative: StoreKit 2 directly, through `expo-iap`.** It's also in Expo's guide and has no third party involved. But the session would also have to build:
- server checks of Apple's signed transactions with the App Store Server API;
- an edge function for App Store Server Notifications V2;
- key handling for both.

That's about 6 more hours and more ways to get money wrong. It's worth revisiting only if RevenueCat's 1% ever matters.

#### Where things live

**App**
- `src/state/purchases.ts` is one interface with two versions:
  - `RevenueCatPurchases`, the real one.
  - `PreviewPurchases`, a fake one for the Prototype preview, the web build, Jest and Expo Go. It can be told to succeed, fail, cancel, go pending, or find nothing on restore.
- The RevenueCat app user id is the Supabase auth user id. Call `Purchases.logIn` after sign-in and `Purchases.logOut` on sign out.
- One entitlement, `plus`, attached to both the yearly and Founding family products. Tips have no entitlement.
- One offering, `default`, with packages `annual`, `lifetime`, `tip_small`, `tip_medium` and `tip_large`. The app reads prices from the offering and never hard-codes them.
- **The app never decides Plus from local purchase state.** It asks the server, so everyone in the family sees the same thing. Local state is only used to show "Finishing up..." for the few seconds until the server agrees.

**Server: migration `20261021000006_saunafam_plus.sql`**
- `families.wall_wood text not null default 'birch'`, checked to be one of `birch`, `cedar`, `alder`, `charred_pine`.
- `app_config.plus_enabled boolean not null default false`, returned by `public.app_config()`.
- `public.plus_events` (service role only, no client access): `event_id text primary key`, `type`, `app_user_id`, `family_id`, `payload jsonb`, `received_at`. Used to skip duplicate webhooks, and for debugging.
- `public.family_plus(p_family_id)`, security definer, members only. It returns:
  - `active boolean`;
  - `product`;
  - `status`;
  - `expires_at`;
  - `payer_name` (the payer's display name, or null if they left);
  - `payer_is_me`.

  `active` is true when one of these holds:
  - the product is the Founding family product and the status isn't `expired`;
  - the status is `trial`, `active` or `grace_period`;
  - the status is `cancelled` and `expires_at` is still in the future.
- `public.set_wall_wood(p_family_id, p_wood)`, security definer, any member. Anything but `birch` needs `family_plus(...).active`. Returns the new wood.
- **The history limit is enforced on the server.** Whichever RPC returns past weeks for the Week screen takes a weeks count and clamps it to 12 unless the family has Plus. The other Plus items are visual, so checking on the device is enough for them.
- **`family_plans` itself is unchanged.** It already has one row per family (`family_id` is the primary key), a nullable `expires_at` and the six statuses. The row-level security also stays as it is: members can read their own family's row, and only the service role writes it.

**Server: edge functions**

`revenuecat-webhook`
- Checks that the `Authorization` header matches the secret `REVENUECAT_WEBHOOK_SECRET`. If it doesn't, it returns 401.
- Inserts into `plus_events`. A duplicate `event_id` returns 200 and does nothing.
- Finds the family:
  - first from the subscriber attribute `family_id` (the app sets it with `Purchases.setAttributes` just before buying);
  - otherwise from the payer's only family.
- Upserts `family_plans`. Events older than `last_event_at` are ignored.
- Maps events to statuses:
  - `INITIAL_PURCHASE`, `RENEWAL`, `UNCANCELLATION` and `NON_RENEWING_PURCHASE` become `active`;
  - `CANCELLATION` becomes `cancelled`, keeping `expires_at`;
  - `BILLING_ISSUE` becomes `grace_period` if a grace period is running, and `billing_issue` otherwise;
  - `EXPIRATION` becomes `expired`;
  - `PRODUCT_CHANGE` updates `product`;
  - `TRANSFER` is logged only (see edge cases).
- Founding family is stored with `expires_at` null.
- A refund arrives as a `CANCELLATION` with a refund reason **(unverified; check RevenueCat's event docs)**. It ends Plus at once.
- **(unverified)** Check every event name and field against RevenueCat's current webhook docs.

`sync-plus`
- Called by the app right after a purchase or restore, so the family doesn't wait for the webhook.
- Uses the caller's JWT to find who they are.
- Reads that user's subscriber record from RevenueCat's REST API with `REVENUECAT_SECRET_API_KEY`, which never leaves the server.
- Writes `family_plans` the same way the webhook does.

`delete-account`
- Before deleting, it tells the app whether the person pays for Plus.
- The app then says: "You pay for Saunafam Plus. Deleting your account doesn't cancel it. Cancel in Settings, Apple ID, Subscriptions first."
- The family keeps Plus until the period ends.

#### Family Sharing

- **Leave Apple's Family Sharing off** for both Plus products. **Default.**
- The Saunafam family is the sharing unit, and it covers everyone in the group, including friends who aren't in the payer's Apple family. Apple's version only reaches the payer's Apple family (up to 5 others).
- Once Family Sharing is turned on for a product, it can't be turned off.
- Leaving it off also avoids a shared Apple purchase granting Plus to a second Saunafam family.
- The paywall says plainly: "One purchase covers everyone in your Saunafam family."
- Tips are consumables, so Family Sharing doesn't apply to them.

#### Restore purchases

- A **Restore purchases** text link on the Plus sheet, plus a row in Settings under Saunafam Plus. Apple requires one (App Review Guideline 3.1.1).
- It calls `Purchases.restorePurchases()`, then `sync-plus`, then refreshes `family_plus`.
- **Results:**
  - "Plus restored for Sunday sauna."
  - "No purchases found for this Apple ID."
  - "Couldn't reach the App Store. Try again."
- **RevenueCat's restore behavior:** use the default that transfers purchases to the user who restores **(unverified; confirm the setting name)**. The `TRANSFER` rule is below.

#### Edge cases (each needs a test)

| Case | What happens |
|---|---|
| The payer leaves the family | Yearly runs to `expires_at`, then lapses. The family keeps a Founding family purchase. A week before a yearly plan lapses, the others see a quiet line in Settings, never a paywall |
| The payer joins a different family | Their next renewal covers the new family. The old family keeps Plus to `expires_at` |
| Two people in one family buy | Once the family has Plus, the buy buttons are hidden. If two purchases race anyway, Founding family wins over yearly, and otherwise the later `expires_at` wins. The second payer sees: "Your family already had Plus. You can cancel yours in Settings, Apple ID, Subscriptions, and ask Apple for a refund at reportaproblem.apple.com." |
| Yearly, then Founding family | Founding family replaces yearly. The app reminds the payer to cancel the yearly plan |
| `TRANSFER` to a user in the same family | Update `payer_member_id` |
| `TRANSFER` to anyone else | Log it and leave the row. Show it in `REPORT.md` as a known gap for Bryce to handle by hand |
| Ask to Buy (a child account) | The sheet shows "Waiting for approval". Plus turns on when the webhook arrives |
| A refund | Plus ends at once. The wall goes back to birch. Nothing else changes |
| Offline | The sheet shows "Can't reach the App Store right now" and **Try again**. The rest of the app works as normal |
| `plus_enabled` false | No Plus rows, no cards, no locks. Woods and faces don't appear at all |
| Family deleted | `family_plans` is deleted along with it (an existing foreign key cascade) |

#### Every state of the Plus sheet (each needs a screenshot)

1. Loading prices (skeleton tiles, not a spinner on a blank sheet)
2. Prices failed or offline
3. Ready, yearly picked
4. Ready, Founding family picked
5. Purchasing (the button shows progress; the sheet can still be closed)
6. Pending (Ask to Buy)
7. Finishing up (bought, waiting for the server)
8. Success
9. Cancelled by the user (back to ready, no message)
10. Failed (a plain error and **Try again**)
11. The family has Plus, and you're the payer (shows **Manage**, which opens Apple's subscription screen)
12. The family has Plus from someone else ("Plus, from Maya. Thank you.")
13. Restoring
14. Restore found nothing
15. Lapsed
16. Preview mode on the web and in Expo Go (a small "Preview, no real purchase" label)

Also needed: the try-on state for a wood, a timer face and an icon; the tip jar rows; and the quiet card on Week.

#### Sandbox test plan

**Part 1: in this session, without App Store Connect**
- **Jest:** the purchase state machine against `PreviewPurchases`, covering every state above, the nag cap (60 days, 3 ever, off for good), and "never shown" checks for onboarding, the timer, the log form and after a missed week.
- **pgTAP:**
  - `family_plus` for each status, including Founding family and cancelled but not yet expired;
  - `set_wall_wood` with and without Plus, and from another family;
  - the 12-week clamp;
  - no client access to `plus_events` or writes to `family_plans`.
- **Deno tests for `revenuecat-webhook`:**
  - fixture JSON for each event type;
  - a wrong secret gets 401;
  - a duplicate event does nothing;
  - out-of-order events are ignored;
  - a race between two payers.
- **Simulator, if Xcode is available:**
  - a local StoreKit configuration file (`ios-storekit/Saunafam.storekit`, kept outside the generated `ios/` folder) with the five products;
  - a dev build run against it;
  - buy yearly, buy Founding family, cancel, a failed purchase, Ask to Buy and restore, recorded to `design/recordings/saunafam/plus-storekit.mov`.

  **(unverified)** Whether RevenueCat accepts StoreKit configuration file purchases in this setup without App Store Connect products. RevenueCat also offers its own test store. Check the docs. If neither works, record the preview flow instead and say so in the report.

**Part 2: Bryce, after the App Store Connect steps (not this session)**
1. Create a sandbox Apple account in App Store Connect, under Users and Access, Sandbox. Sign in to it on the iPhone in Settings, App Store, Sandbox Account.
2. Install a dev build or a TestFlight build with `plus_enabled` true on a test Supabase project. TestFlight purchases are free and use sandbox.
3. **Buy yearly.** A second family member's phone shows Plus within a minute. Check the `family_plans` row.
4. **Wait for a renewal.** Sandbox speeds renewals up, and a year renews in about an hour **(unverified; the rate can be changed in the sandbox account settings)**. Check `RENEWAL` arrives.
5. **Cancel** in the sandbox subscription settings. Plus stays until `expires_at`, then lapses quietly.
6. **Buy Founding family** on a fresh family.
7. **Delete and reinstall the app, then restore.**
8. **Restore on a second device** with the same sandbox account.
9. **Billing problem:** use the sandbox account's billing-failure option **(unverified)**, then check grace period behavior.
10. **Refund** with the sandbox refund test **(unverified)**.
11. **Payer leaves the family**, and **payer deletes their account**.
12. **Buy each tip.**
13. Check every Plus sheet state on a real phone, in light and with Larger Text.

#### App Store Connect steps for Bryce (each only on his go, and only after build 9 ships)

1. **Business, Agreements:** accept the Paid Applications Agreement.
2. **Business, banking and tax:** add a bank account and fill in the tax forms (a W-9 for a US individual or company, or the right form for where Bryce files) **(unverified; depends on how Bryce's developer account is registered)**.
3. **Small Business Program:** enroll, for 15% commission instead of 30%.
4. **Subscriptions:** create a subscription group "Saunafam Plus" with one product:
   - id `saunafam.plus.annual`;
   - 1 year at $24.99;
   - display name "Saunafam Plus";
   - description "Extras for your whole Saunafam family";
   - a review screenshot of the Plus sheet;
   - Family Sharing off.
5. **In-App Purchases:** create these products.
   - **Non-consumable `saunafam.plus.lifetime`,** $59.99, display name "Founding family", Family Sharing off, with a review screenshot.
   - **Consumables `saunafam.tip.small`, `saunafam.tip.medium` and `saunafam.tip.large`,** at $1.99, $4.99 and $9.99. Display names: "A ladle", "A bucket" and "An armful of birch".

   Product ids are permanent, so check them before saving. Check the suggested prices in other countries.
6. **RevenueCat:**
   - create a project and add the iOS app with bundle id `com.arrofamily.arro`;
   - upload an App Store Connect in-app purchase key;
   - create the `plus` entitlement and the `default` offering;
   - point Apple's App Store Server Notifications at RevenueCat's URL;
   - set the webhook to `https://<project>.supabase.co/functions/v1/revenuecat-webhook` with the `Authorization` secret.
7. **Secrets:**
   - Supabase: `REVENUECAT_WEBHOOK_SECRET` and `REVENUECAT_SECRET_API_KEY`;
   - EAS environment: `EXPO_PUBLIC_REVENUECAT_IOS_KEY`, the public SDK key.
8. **Run the sandbox test plan** (part 2).
9. **Submit the products with a new app version.** The first in-app purchases have to be reviewed together with an app version. Paste the review notes below.
10. **Turn Plus on:** set `app_config.plus_enabled = true` only after that version is approved and live.

**Draft review notes**

> Saunafam is free. Logging, the timer, the weekly family streak and everything social are free for everyone and never locked. Saunafam Plus is optional and adds extras: wall woods, timer faces, app icons, full weekly history, family stats and a printable wall poster. One purchase, by any member, covers everyone in that Saunafam family (a group of up to 12 people that members join by invite), whether or not they share an Apple family. This is handled on our server, and Apple Family Sharing is off for these products. To see the purchase screen: Settings, Saunafam Plus. Restore purchases is on that screen and in Settings. The tips (A ladle, A bucket, An armful of birch) are optional thank-yous with no features attached. Demo account: [Bryce adds one, with a family that has a few weeks of sessions].

#### App Store listing and privacy updates

**In `design/app-store/listing.md`**
- Add a description section, "Saunafam Plus, if you want it": "Saunafam is free. Plus is an optional yearly plan or a one-time purchase that covers your whole family, with new wall woods, timer faces and app icons, every week of your history, family stats and a printable poster of your wall."
- Add the subscription terms Apple expects in the description: length, price, auto-renewal and how to cancel.
- Add links to the Terms of Use (Apple's standard license agreement is fine) and the privacy policy. They go in the description and on the Plus sheet (App Review Guideline 3.1.2).
- Add the display names, descriptions and review screenshot notes for each product.
- Paste in the review notes above.
- **Default:** leave the screenshot set as is. A seventh screenshot of a cedar wall with the caption "Make the wall your own." is optional, once Plus is live.

**In `app-privacy.md`**
- Add **Purchases, Purchase history**: linked to the user, used for app functionality, not for tracking.
- **(unverified)** Check RevenueCat's App Store privacy guide for anything else its SDK collects, and add it.

**On the privacy page**
- Add a paragraph: "If you buy Saunafam Plus, Apple handles the payment. RevenueCat, our purchase processor, tells us which Apple purchases you've made so your family gets Plus. We never see your card details."
- Add RevenueCat to the list of processors.

---

## 8. Build order

Work on branch `saunafam/build-9`, with one or more commits per milestone.

**After every milestone**, run these and paste the results into the PR:

```
npm run typecheck
npx expo lint
npm test
supabase db reset && supabase test db
DENO_NO_PACKAGE_JSON=1 deno check supabase/functions/*/index.ts
```

- Supabase needs Docker. If Docker isn't available, say so in the PR and carry on with the app work.

**Screenshots**
- Take them from the iOS Simulator if it's available, and from `npx expo start --web` (the sample family, no Supabase settings) otherwise.
- Web screenshots: 390 x 844 at 2x, through Playwright.
- All screenshots go in `design/screenshots/saunafam/`.

**Never run:** `eas build`, `eas submit`, `supabase db push`, `wrangler deploy`.

| # | Milestone | Acceptance check | Hours |
|---|---|---|---|
| M0 | Baseline and lint | Read `AGENTS.md`, `CLAUDE.md` and the Expo v57 docs. Create the branch. Add `npx expo lint` and fix what it reports on the old code, or record the findings to fix later. Run every check on untouched main and record the pass counts (expect 192 pgTAP and about 54 Jest). Save the rename search output to `design/saunafam-rename-list.txt`. Check whether Xcode and a Simulator are available | 1 |
| M1 | Families, rules, app config, sessions SQL | Migrations 0001 and 0002 (including `client_id`), plus `sessions.test.sql`. The tests cover: solo and shared sessions of 2 to 4; rejecting a 5th person; rejecting another family; skipping duplicates; idempotent retry with the same `client_id`; the date window; row-level security; `update_session` and `delete_session`; Remove me. All pgTAP passes | 3 |
| M2 | Weekly streak SQL | Migration 0003, plus `weekly_streak.test.sql` covering every rule and edge case in section 3 with `p_as_of` pinned, and the 12-member timing test | 3.5 |
| M3 | Social and push SQL | Migrations 0004 and 0005, plus `saunafam_push.test.sql`, which checks every push's recipients, quiet hours, caps and exact copy | 2.5 |
| M4 | Edge functions | `remove-member` and `delete-account` updated. `deno check` passes. Draft `build10_cleanup.sql` | 0.5 |
| M5 | App data layer | New types, `backend.ts`, `buildView.ts` rebuilt around weeks, cache v2, the offline outbox, optimistic updates, legacy notification cleanup. The Health import, routes and maps code removed. Jest tests for week math, the outbox and timer math | 4 |
| M6 | Design system and motion | Direction A tokens (type scale, 4 pt grid, colors, depth), Fraunces, `src/theme/motion.ts` and `haptics.ts`, Reanimated installed. Components: `SolidButton`, rows, fields, `Slat`, `SlatWall`, `EmberDots`, `HeatGlow`, `SteamWisps`, `Backdrop`, and a custom SVG icon set. The Design sheet screen. The contrast check script passes | 5 |
| M7 | Icon and asset pipeline | `assets/brand/` SVG masters (icon, dark, tinted, wordmark). `scripts/generate-icons.mjs` renders 1024 px and every iOS size, favicons and Android layers. Light, dark and tinted wired into `app.json`. The new `AnimatedSplash` with first-load gating, and the native splash config. Outputs: `design/brand/icon-sizes.png` and `design/brand/brand-sheet.png`. A simulator recording of the cold start | 3 |
| M8 | Timer and log form | `TimerScreen` and `LogSessionScreen` as in section 3, offline-safe saving, the 3-hour prompt. Jest tests. Screenshots: idle, running, cooling off, the form, and the form shared with 3 | 4.5 |
| M9 | Main screens, all states | Today, Week, Feed, SessionDetail, Me, Milestone (the wall build and the share image), Nudge. The empty, loading and error states for each. Everything reachable from Prototype preview. Screenshots plus `INDEX.md` | 6 |
| M10 | Onboarding, Settings, copy | Both onboarding paths, Family rules, Take a break, Notifications, Health, the "Arro is now Saunafam" sheet, the update screen. Every string in `design/copy/app-copy.md`, push copy in `design/copy/notifications.md`, the invite text. Accessibility labels. Dynamic Type screenshots | 3.5 |
| M11 | Native features | Write-only Health (or a documented skip), local notifications, camera, `expo-localization`, notification tap routes. `npx expo export --platform ios` succeeds. The timer backgrounding recording | 2.5 |
| M12 | Rename | Section 6 done. The grep check, each remaining "Arro" justified. The dash check: `grep -rnP "[\x{2013}\x{2014}]" src site/public app.json design/copy design/app-store` finds nothing | 1.5 |
| M13 | Landing page and web assets | Site restyled, with every section in section 5. First-load animation, responsive at 5 widths, favicon set, OG and Twitter images for the home and join pages, the join page link preview, the privacy and support pages, the arrofamily.com redirect in `worker.js`. Checked with `npx wrangler dev`, curl and Lighthouse mobile (90 or more on all four, CLS 0). Screenshots and a first-load recording | 4.5 |
| M14 | App Store listing and screenshot set | `design/app-store/listing.md` complete, including the age rating answers and the privacy labels. `scripts/app-store-shots.mjs` renders the framed, captioned set at 6.9 inch and 6.5 inch (if still required) from simulator captures. Pixel sizes checked by the script | 3.5 |
| M15 | Paid tier (switched off) | Migration 0006 with pgTAP. `revenuecat-webhook` and `sync-plus` with Deno tests, and the `delete-account` warning. `react-native-purchases` installed with `npx expo install` (SDK 57 checked), `src/state/purchases.ts` with the RevenueCat and Preview versions. The Plus sheet in all 16 states, try-on, restore, the tip jar, the quiet card and its cap, with Jest tests. Three wall woods, the Coal and Brass timer faces, alternate icons (drop them and note it if no SDK 57 library works, **unverified**), every week, the Heat log and the wall poster. The StoreKit configuration test recording. The listing, privacy label and review notes for in-app purchases. Screenshots | 10 |
| M16 | Self-review | A simulator recording of every motion moment, and with Reduce Motion on. Stutters fixed and recorded again. Perf Monitor readings. Simulator screenshots of every screen | 3 |
| M17 | REPORT and release PR | `REPORT.md` with the Definition of done fully ticked and its proof, the 👁 list, "Not done", and everything that needs Bryce. Release PR `release/build-9` against main with migrations in order, function changes, Bryce's steps and the tester note. `ios.buildNumber` 9 in its own commit. Don't merge | 1.5 |

**Total:** about 63 engineering hours. That's up from 37, for the asset pipeline, every screen's states, the landing assets, the screenshot set, the offline outbox, the recorded self-review and, most recently, the paid tier (10 hours).

One long Opus session with these checkpoints might take 18 to 26 hours of wall time. That's a guess, not a measurement. Plan for it to span more than one run, and make every milestone a clean commit so a new session can pick up where the last one stopped.

**If the session has to stop early**, these are good places to stop with a PR that still makes sense:
- after M5 (the backend is done);
- after M9 (the app is usable);
- after M12 (renamed and testable);
- after M17 (ready to ship, with Plus built and switched off).

If time runs short, M15 is the one milestone that can be skipped whole: go from M14 to M16 and M17 and ship build 9 without Plus. Put M15 in the report's "Not done" list.

---

## 9. Out of scope, and open questions

### Out of scope for build 9

- Live Activities and the Dynamic Island timer. A good build 10 item.
- An Apple Watch app.
- An Android release.
- Turning Plus on, or creating any product in App Store Connect or RevenueCat. Plus is built switched off. Those are Bryce's steps.
- The year in review (build 10, ready for December), a monthly plan, a free trial and web checkout.
- Streak repairs, extra freezes, paying for more people, ads. Never, not just not now.
- Challenges, leaderboards, public profiles, venue discovery, maps and location.
- Reading from Apple Health, or importing from WHOOP, Oura or others.
- Server-side milestones and milestone pushes.
- More than one family per person in the UI. **(unverified)** Check whether the schema allows it.
- Renaming the GitHub repo or the Supabase project.
- Deleting old Arro data. That's build 10.

### Open questions (each has a default the build uses)

1. **Counting:** do two sessions on the same day count once? Default: yes.
2. **Who edits family rules:** Default: the founder only, and changes start next week.
3. **Health:** Mindful Minutes or a "Preparation and Recovery" workout? Default: Mindful Minutes, off until you turn it on.
4. **Camera for photos:** Default: yes, alongside the photo library.
5. **Visual direction:** Default: A, Löyly. The dark heat room appears only during the timer.
6. **Shared sessions without asking the people added:** Default: yes, with a push to them and a Remove me option.
7. **Saturday weekend check-in push:** Default: on, with an off switch in Settings.
8. **Kids:** Default: not directed at children under 13. Bryce should confirm, since families include kids.
9. **Plus price:** Default: $24.99 a year per family, or $59.99 once. No monthly plan and no trial at first.
10. **Apple Family Sharing for Plus:** Default: off, because the Saunafam family already covers everyone. It can't be turned off later, so leave it off unless there's a reason.
11. **When Plus goes live:** Default: built into build 9 switched off, turned on in a later build after the App Store Connect steps and a sandbox test.
12. **Who picks the wall wood:** Default: any member, shown to everyone.
13. **The tip jar:** Default: yes, in Settings and at the bottom of the Plus sheet only, with no perks.

---

## Appendix: paid tier research (checked 20 October 2026)

**How this was gathered**
- App Store prices and in-app purchase lists come from the US App Store pages and the iTunes lookup API on 20 October.
- Apps often list several prices for one plan (old prices, intro offers and regional tiers), so when a page lists more than one, all of them are given.
- Review notes come from the few reviews each App Store page shows. They're a sample, not a survey.

| App | Free and paid | Prices (USD) | Family Sharing | Paywall complaints seen | Sources |
|---|---|---|---|---|---|
| GoPolar (cold plunge and sauna) | Free to download, with a subscription. **(unverified)** Exactly what's free vs paid isn't spelled out on the page | Monthly $6.99, annual $39.99 | Not listed | One review: "Expensive app..." Another says it's worth the subscription. A claim of about 8% paid conversion (gtmsauce.com) is **unverified** | https://apps.apple.com/us/app/gopolar-cold-plunge-sauna/id6463441179 |
| HotLog (sauna and cold plunge) | Paid up front, no in-app purchases listed | $1.99 | Yes | None seen (4.6 from about 530 ratings) | https://apps.apple.com/us/app/hotlog-sauna-cold-plunge/id1413952733 |
| Sauna Tracker: Sleep & Plunge | Paid up front, no in-app purchases listed | $5.99 | Yes | None seen (4.4 from 24 ratings) | https://apps.apple.com/us/app/sauna-tracker-sleep-plunge/id6739606616 |
| Brisk (cold plunge) | Free to start, Brisk Premium subscription | $4.99 a month, $39.99 a year | Not listed | None seen | https://apps.apple.com/us/app/brisk-cold-plunge-tracker/id6474380961 |
| Shiver (cold plunge log) | Free, no in-app purchases listed | Free | Not listed | None seen | https://apps.apple.com/us/app/shiver-cold-plunge-log/id6477969409 |
| Streaks | Paid once, no in-app purchases | $5.99 | Yes | The opposite: "Glad this app is an one time purchase vs constant subscription fees" (4.8 from about 27,300 ratings) | https://apps.apple.com/us/app/streaks/id963034692 |
| Finch | Core self-care free, Finch Plus optional | Finch Plus $9.99 a month or $69.99 a year (help center). The App Store lists other price points too. A guardian program gives some users Plus free | Not listed | Reviews praise how much is free. Finch says its self-care tools "are free and not locked behind a subscription" | https://help.finchcare.com/hc/en-us/articles/38755205001869-Finch-Plus-Pricing , https://finchcare.com/about-finch , https://apps.apple.com/us/app/finch-self-care-pet/id1528595748 |
| (Not Boring) Habits | Free app, a Plus plan, the Super (Not Boring) bundle and paid skins | !Habits Plus $14.99 a year or $59.99 lifetime. Super !Boring $7.99 a month or $29.99 a year. Skins $4.99 (Chroma, Monsters) and $9.99 (Opal, Cedar, Karat) | Not listed | None seen | https://apps.apple.com/us/app/not-boring-habits/id1593891243 |
| Gentler Streak | Free essentials, Premium monthly, yearly or lifetime, with family plans | Premium $8.99 a month, $39.99 a year. Family yearly listed at $29.99, $35.99 and $59.99, and family monthly at $8.99. Lifetime listed from $59.99 to $179.99. **(unverified)** Which of these is the current US price | Yes (Premium family plans) | None. A student review praises the free essentials | https://apps.apple.com/us/app/gentler-streak-workout-tracker/id1576857102 |
| Strava | Free basics, subscription for the rest, a family plan | $11.99 a month, $79.99 a year. Family $139.99 a year, annual only, up to 4 people, same price at any count | Its own family plan, not Apple's | An older (2020) review: "Not Worth a Subscription" | https://www.strava.com/pricing , https://support.strava.com/en-us/articles/15401631-what-is-strava-s-family-plan , https://apps.apple.com/us/app/strava-run-bike-walk/id426826309 |
| Duolingo | Free lessons, Super and Max subscriptions, a family plan | Super $12.99 a month, $95.99 a year (PCMag). Family $119.99 a year for up to 6. **(unverified)** Prices vary by region and offer | Its own family plan | None on the page. Duolingo's help center says joining or leaving the family plan doesn't affect your streak | https://www.duolingo.com/help/family-plan , https://www.pcmag.com/reviews/duolingo , https://apps.apple.com/us/app/duolingo-learn-languages/id570060128 |

**Apple and platform facts**

- **Family Sharing:**
  - It covers auto-renewable subscriptions and non-consumables, for the purchaser plus up to 5 family members.
  - Once it's turned on for a product, it can't be turned off.
  - Apps get notified when shared access is revoked, and each transaction shows whether it was purchased or family shared.
  - Sources: https://developer.apple.com/help/app-store-connect/configure-in-app-purchase-settings/turn-on-family-sharing-for-in-app-purchases , https://developer.apple.com/documentation/storekit/supporting-family-sharing-in-your-app
- **Auto-renewable subscriptions** (rules, offers, and what the purchase screen must show): https://developer.apple.com/app-store/subscriptions/
- **Small Business Program:** 15% commission for developers under $1 million a year in proceeds. https://developer.apple.com/app-store/small-business-program/
- **App Review Guidelines** 3.1.1 (in-app purchase, restore) and 3.1.2 (subscriptions): https://developer.apple.com/app-store/review/guidelines/ . I didn't re-read these on 20 October. The points used here come from Arro's `design/paid-plan.md`, so check the current text.
- **Expo in-app purchases guide** (lists RevenueCat and `expo-iap`): https://docs.expo.dev/guides/in-app-purchases/
- **RevenueCat Expo install:** https://www.revenuecat.com/docs/getting-started/installation/expo
- **RevenueCat pricing** (free up to $2,500 a month in tracked revenue, then 1%): https://www.revenuecat.com/pricing
- **RevenueCat account and project setup:** https://www.revenuecat.com/docs/welcome/set-up-revenuecat/account-management
- **Arro's own plan,** for the reasoning that carries over: `design/paid-plan.md` in the repo (read only).
