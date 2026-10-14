# Onboarding and design research (October 2026)

What the research said, what's now in the app and site, and what's still open.
The invitee, usually a parent or grandparent, decides whether the family streak
survives, so most of this is about their path.

## Done

- **US wording.** Mom, Dad and Grandma on the site, in the app's sample family and
  in the App Store notes. "Around the block", "color", meters with feet.
- **Sample family with parents in it** (`src/data/family.ts`): you, Mom, Dad and
  Grandma, so screenshots tell the story the site tells.
- **The invite message carries the link** (`arrofamily.com/join/<code>`) with the
  code under it. Before, it said "Open Arro" to someone who didn't have it.
- **Quick picks for "Who's it for?"**: Mom, Dad, Grandma, Grandpa, Sister, Brother.
  The button then says "Send to Mom". Duolingo found sending the first invite
  was the biggest drop-off for Friend Streaks.
- **Shorter paths.** Founder 7 → 6 steps, invitee 9 → 7. The "You're invited"
  screen folded into sign-in ("Join <family>, 4 people are in"), and reminder
  time folded into the notifications step.
- **How the streak works shows 3 rules, not 6.** The rest stay in Settings >
  Streak rules. NN/g and Apple both say teach in context, not with a deck.
- **Notification pre-prompt has one "Continue"** and says the iPhone asks next.
  Apple's HIG: a screen before a system alert gets one button, no cancel.
- **Readability for 55–75.** Body 15 → 16pt, meta 13 → 14pt, rule text 14.5 →
  15.5pt. `faint` text was 3.98:1 on paper and now passes 4.5:1 (app and site).
  "‹ Back" with a word and a 44pt target; "Not now"-style buttons are 44pt tall.
- **Invite links open the join step with the code filled in** (`WelcomeScreen`,
  `joinCodeFromUrl()`), once universal links reach the app (see open items).
  Works on web today.
- **Site.** The hero says who it's for ("for families who live apart"); join steps
  are in the app's real order; the join page has a Copy code button; a short FAQ
  answers what parents ask first (iPhone only? Apple Watch? missed days?
  location? cost?).

- **Cheering a workout.** A Cheer button on everyone else's posts in the feed and
  on the workout page, with "You, Mom and Dad cheered" in place of the made-up
  quotes the sample feed used to show. It's one-way, like the cheer motion spec:
  the database lets a cheer be taken back, but each new cheer sends a push, so
  cheer-uncheer-cheer would notify twice.

## Open, needs a decision or an asset

1. **Universal links** (phase 5). Needs the Apple Team ID for
   `/.well-known/apple-app-site-association` (served from `site/worker.js`) and
   `ios.associatedDomains: ["applinks:arrofamily.com"]` in `app.json`. The app
   side already handles the link.
2. **Smart App Banner on `/join`** once there's an App Store ID:
   `<meta name="apple-itunes-app" content="app-id=…, app-argument=https://arrofamily.com/join/CODE">`.
3. **Native paste button** on Enter your code (`expo-clipboard`'s
   `ClipboardPasteButton`, iOS 16+, no "Allow Paste" alert). New native module,
   so it needs a new dev build.
4. **Waitlist or App Store pre-order.** Email capture needs somewhere to store
   addresses; pre-orders can open 2–180 days before release once the app is approved.
5. **Honest founder line on the site** ("built for my family between Brisbane
   and home"), and a real quote from the TestFlight family when there is one.
6. **Android.** The FAQ now says iPhone only and asks Android families to get in
   touch. A family with one Android parent can't keep a streak today.
7. **Streak repair.** Research (Silverman & Barasch, JCR 2023) found people drop
   off after a broken streak, less so when it can be repaired. Something like
   "if everyone moves today and tomorrow, yesterday comes back" for after a
   freeze is already spent.
8. **Comments.** None yet, on purpose: a thread pulls against "one moment a day".
   A short optional note with a cheer, or a few preset replies ("So proud of
   you!"), would fit better if families ask for more than a cheer.
9. **Founder can see "Mom hasn't opened Arro yet"** and resend: in 3-generation
   families the middle generation ends up doing tech support.

## Sources

- Apple HIG: onboarding, privacy (pre-alert screens), accessibility (contrast, 44pt targets)
- NN/g: mobile app onboarding; usability for older adults
- Duolingo blog: improving the streak; how the streak builds habit; Friend Streak lessons
- Silverman & Barasch, "On or Off Track", Journal of Consumer Research, 2023
- BE FIT family trial, JAMA Internal Medicine, 2017
- Li et al., family fitness sharing across three generations, PervasiveHealth 2020
- Code read: bluesky-social/social-app (onboarding, invite intents), Expensify/App
  (step counter, deep-link intent), iSoron/uhabits (habit score)
