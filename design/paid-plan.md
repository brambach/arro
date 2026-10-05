# Arro paid plan

October 2026. How Arro charges without breaking the family loop. Read with
`design/market-research.md` (who else charges what) and `design/refactor-plan.md`
(where the work lands).

## The short version

- **Free forever: the daily loop, for everyone in the family.** Invitees never
  see a price.
- **One paid plan, Arro Family.** One person pays and the whole family gets it:
  full history, monthly and yearly recaps, custom family goals, a second circle.
- **$39.99 a year or $5.99 a month, with a 7-day free trial on the annual plan.**
  That's the median price of one person's fitness app, for the whole family.
- **Never sell streak repairs, ads or seats.** Selling relief from streak anxiety
  is how Snapchat and Duolingo do it, and it breaks Arro's promise.
- **The first ask is the first monthly recap**, not onboarding. Paid features
  need history, and a new family hasn't got any.
- **Build: RevenueCat for purchases, a webhook to Supabase, one `family_plans`
  row per family** that every member's app reads.
- **Timing: launch v1 free, add Arro Family in the first update**, ideally in
  time for a year-in-review and a New Year push.
- **Honest expectation:** it covers its own costs with about 13 paying families.
  It only becomes real money at thousands of families.

## The constraint: the person who pays isn't the one who matters most

The founder buys and the family stays (see the market scan). The founder is
motivated and will pay. The invitee, often a parent, won't pay for an app they
were talked into, and won't get past a paywall to log a walk. If a paywall ever
sits between Mum and "I moved today", the family streak dies, and the founder
churns with it.

So three rules:

1. **The daily loop is free for everyone, forever.** Joining, logging, Health
   auto-logging, cheers, nudges, both streaks, freezes, pause and reminders.
2. **One person pays and the whole family gets it.** No per-seat pricing and no
   "ask your son to upgrade". Life360 works the same way: one membership covers
   the whole Circle.
3. **The paid plan adds things. It never takes anything away.** Anything free at
   launch stays free, so adding the plan later costs nobody anything.

## What stays free

- One family, any size at launch.
- Logging (manual or Apple Health), cheers, nudges, reminders.
- The family streak, personal streaks, the automatic freeze and holiday pause.
- Today, This Week, the Feed and profiles, covering the current month.
- Milestone cards (7, 10, 20, 30 days...) as they happen.

## What Arro Family adds

The rule for picking paid features: they make the family's shared story richer.
They don't relieve stress the app created.

1. **Your family's history.** Every day, photo and note kept and browsable past
   the current month, with a calendar of every day the family kept it.
2. **Recaps.** A monthly recap and a year in review ("2027: 291 days together,
   Mum's longest streak, the week everyone moved"). Shareable as an image. This is
   the strongest single reason to pay, and it gets more valuable the longer a
   family uses Arro.
3. **Family goals.** Shared goals with their own milestone card: "100 days
   together", "walk the distance between us" (Brisbane to home), a charity walk.
   Every new family gets one starter goal free, "Your first 30 days together",
   because shared goals fade without a finish line (see the market scan).
4. **More than one circle.** A second family (in-laws, a sibling group) under the
   same account.
5. **Small extras.** Alternate app icons and card themes in the existing palette.

Paid features need history to be worth anything, so there's nothing to sell on
day one. That shapes the timing below.

## What Arro never sells

- **Streak repairs or extra freezes.** Snapchat charges about $0.99 per streak
  restore after the first free one, and Duolingo sells a streak repair for gems.
  It works for them. For Arro, selling relief from streak anxiety breaks
  healthy-contact rules 2 and 7 and makes it look exactly like the apps it's
  positioned against. Duolingo's own data says a second freeze barely moved
  engagement anyway.
- **Ads or data.** Apple bars using HealthKit data for advertising or selling it
  anyway (App Review Guideline 5.1.3), and the private-by-design promise rules it
  out regardless.
- **Seats.** Invitees never see a price.

## Price

What others charge (USD, seen 5 Oct 2026):

| Product | Price | Who it covers |
| --- | --- | --- |
| Health & Fitness apps, median (RevenueCat 2026) | $9.99/mo, $39.94/yr | One person |
| GymRats Pro | $3.99/mo, $32.99/yr | One person (group cover unconfirmed) |
| FamilyAlbum Premium | $5.99/mo, $59/yr | The whole album, one payer |
| Tinybeans+ | $7.99/mo, $74.99/yr (unconfirmed) | Payer plus one |
| Marco Polo Plus Family | $19.99/mo, $159.99/yr | Up to 6 |
| Strava Family | $139.99/yr | Up to 4 |
| Duolingo Super Family | $119.99/yr (unconfirmed) | Up to 6 |
| Life360 | Average $142.56/yr per paying Circle (Q2 2026) | The whole Circle |

**Recommendation: $39.99 a year or $5.99 a month per family, with a 7-day free
trial on the annual plan.**

- $39.99 is what one person typically pays for a fitness app. Covering the whole
  family for that is the pitch: "the price of one fitness app, for the whole
  family".
- It sits under the big family plans ($120-160) because Arro is new, has no
  reviews yet, and sells recaps and history, not video calls or location. It's
  close to FamilyAlbum's $59, the most similar product.
- Annual is the default. 68% of Health & Fitness subscribers pick annual, and
  $5.99 a month makes the annual look like the better deal (44% less).
- 7-day trial: the median Health & Fitness trial converts at 37.7%. Shorter
  trials of 5-9 days reportedly convert best (search snippet, unconfirmed).
- Apple sets local prices from the US price. Check the AUD price it suggests
  before launch.
- Raise to $49.99 later if trial-to-paid stays strong.
- For your TestFlight family and early friends, give a free year with offer
  codes rather than a separate lifetime price.

**On hard paywalls:** RevenueCat's 2026 data across all categories has hard
paywalls converting 10.7% of downloads by day 35, against 2.1% for freemium.
That's a big gap. For Arro, a paywall on joining is out, because the free loop is
how a family grows. A trial required to create a family (founders only) is the
one variant worth testing once there's enough traffic to measure it.

## When to ask

Ask the founder at moments of pride or at a natural limit. Never ask an invitee,
and never ask on a missed day.

| Moment | What it says | Who sees it |
| --- | --- | --- |
| First 7-day family streak | Milestone card with a recap teaser: "See your first week together" | Anyone, but the offer goes to whoever taps it |
| End of each month | "Your October recap is ready", first two cards free, the rest in Arro Family | Everyone sees the teaser |
| Opening a day before this month | "Your history is kept. Arro Family opens it." | Whoever taps |
| Creating a second circle or a family goal | Plan sheet | Whoever taps |

Never: invitee onboarding, the missed-day state, nudges, push notifications, or
any screen that appears because someone didn't move.

**Later, as a test:** a soft offer at the end of founder onboarding, after the
invites go out. RevenueCat found 82% of Health & Fitness trials start on the
first day, so it's tempting. But a trial that starts before the family has any
history ends before there's much to show. Measure it against the monthly-recap
offer before keeping it.

**Gift framing.** The founder is buying for the family, so say that: "Give your
family a year of Arro." Families get together in December and make resolutions in
January, which is also the busiest month for fitness apps. A New Year launch push
fits the product better than any other time.

## How it works

### App Store Connect

- Sign the Paid Applications Agreement and fill in tax and banking.
- Enrol in the App Store Small Business Program: 15% commission instead of 30%
  while proceeds stay under $1M a year.
- One subscription group, "Arro Family", with an annual and a monthly product and
  a free trial on the annual one as the introductory offer.
- Offer codes for founding families and for gifting free months to people you
  know.

### In the app

- **RevenueCat** (`react-native-purchases`) for purchases, receipt checks,
  restore, and a webhook. It's free up to $2,500 a month in revenue, then 1%.
  Expo's in-app purchases guide lists it alongside `expo-iap`. In Expo Go it
  swaps in mock purchases, so real ones need a development build, like Health and
  Sign in with Apple. SDK 57 support is likely but not confirmed; check the
  package against the SDK 57 docs before installing.
- RevenueCat's app user id is the Supabase user id, so a purchase belongs to a
  person, and the server decides which family it covers.
- One entitlement, `family`. The paywall is our own screen in the flat theme,
  reading prices from RevenueCat so they can change without an app update.

### On the server (Supabase)

- A `family_plans` table: family, payer member, product, status, `expires_at`,
  last event. Members of the family can read it; only the service role writes it.
- A RevenueCat webhook goes to an edge function that verifies the shared secret
  and updates `family_plans`. Every paid check in the app reads this row, not the
  local purchase state, so the whole family sees the same plan.
- Row-level security unchanged: a member still only reads their own family.

### Edge cases to handle

- **The payer leaves the family.** The plan runs to the end of its period, then
  lapses. Tell the others in-app a week before, without a paywall.
- **Two members both subscribe.** Hide the buy button once the family has a plan.
  If it happens anyway, the second person cancels in Settings > Subscriptions;
  Apple handles refunds, not Arro.
- **The plan lapses.** Nothing is deleted. History stays stored and reopens if
  anyone subscribes again.
- **The payer has two circles.** Their plan covers both.

### App Review checklist

- The paywall shows the plan name, its length and what it includes, with the full
  renewal price as the most prominent price. For the trial: how long it lasts and
  what it costs afterwards.
- Terms of Use and Privacy Policy links in the app and in the App Store listing.
  Apple's standard licence agreement is fine as the Terms of Use.
- A Restore Purchases button (Guideline 3.1.1).
- The subscription gives ongoing value and lasts at least 7 days (3.1.2(a)), and
  the screen says clearly what you get before asking (3.1.2(c)).
- The first subscription has to be submitted for review with an app version.
- **One payer covering the family:** Apple's guidelines don't address it either
  way. FamilyAlbum, Marco Polo and Life360 all do it. Say it plainly in the review
  notes and on the paywall ("covers everyone in your family").
- **Leave Apple's Family Sharing switched off at first.** It can't be turned off
  once on, it only reaches people in the payer's Apple family (up to 5), and the
  server-side family plan already covers everyone in the Arro family.

### Web checkout

Since 2025, US App Store apps may link out to pay on the web, and Apple has
charged no commission on those sales while the Epic case continues. The courts
are still working out whether Apple can charge a fee. Not worth it for v1: Apple's
in-app purchase handles refunds and family billing, and at Arro's size the saving
is small. Revisit if revenue gets meaningful.

## Timing

**Recommendation: launch v1 free, add Arro Family in the first update.**

- v1.0 ships with everything in "What stays free" and none of the paid features
  built yet, so adding the plan later takes nothing away.
- Paid features are history and recaps, and a new family has neither. Four to
  eight weeks after launch, the first families have a month behind them and a
  first monthly recap is the natural first paywall.
- Version 1.0 skips in-app purchase review, which is one less thing for a
  first-time submission to get stuck on.
- Build the server side (`family_plans`, webhook) with the backend in phase 2 so
  it's ready.
- If the first update lands in December, the year-in-review recap and the
  "give your family a year of Arro" pitch line up with New Year.

The alternative is to launch with the plan and a founding-family deal (the first
100 families get a free year through offer codes). That gets a price signal
earlier, but you'd be selling recaps nobody can see yet.

## What to measure before and after

- Families with 3 or more active members at day 30. This is the number that says
  the product works, and it comes before any revenue number.
- Share of invited members who log at least once in their first day.
- After the plan is on: trial starts per new founder, trial-to-paid, and
  monthly-recap opens to plan views.

## Honest expectations

- The median Health & Fitness app turns 2.9% of downloads into paying subscribers
  by day 35. For Arro, only founders count, since invitees don't pay.
- At 3% of founders paying $39.99, less Apple's 15%: 1,000 families brings in
  about $1,020 a year, and 10,000 about $10,200.
- Year-one fixed costs (about $110 for Apple and a domain) are covered by 4
  paying families. Adding Supabase Pro ($300 a year) takes it to 13.
- Across all categories, about 72% of annual subscribers cancel within the first
  year. The year-in-review recap is the renewal pitch, so time the annual renewal
  to land after it where you can.
- Life360 earns about $143 a year per paying Circle, which shows families pay for
  staying close when the habit sticks. Retention comes first, revenue after.

## Sources

- [RevenueCat: State of Subscription Apps 2026](https://www.revenuecat.com/state-of-subscription-apps)
- [RevenueCat: subscription app trends and benchmarks 2026](https://www.revenuecat.com/blog/growth/subscription-app-trends-benchmarks-2026)
- [RevenueCat pricing](https://www.revenuecat.com/pricing/)
- [RevenueCat: Expo installation](https://www.revenuecat.com/docs/getting-started/installation/expo)
- [Expo: in-app purchases guide](https://docs.expo.dev/guides/in-app-purchases/)
- [Apple: auto-renewable subscriptions](https://developer.apple.com/app-store/subscriptions/)
- [Apple: App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Apple: Small Business Program](https://developer.apple.com/app-store/small-business-program/)
- [Life360 Q2 2026 results](https://www.globenewswire.com/news-release/2026/08/10/3342229/0/en/life360-reports-record-q2-2026-results.html)
- [Life360 on the App Store](https://apps.apple.com/us/app/life360-find-family-friends/id384830320)
- [FamilyAlbum premium plans](https://help.family-album.com/hc/en-us/articles/360038264494)
- [FamilyAlbum blog: FamilyAlbum vs Tinybeans](https://blog.family-album.com/blog/familyalbum-vs-tinybeans-which-is-better-after-the-price-hike/)
- [Marco Polo Plus Family FAQ](https://support.marcopolo.me/article/233-marco-polo-plus-family-faq)
- [CheckThat: Strava pricing](https://checkthat.ai/brands/strava/pricing)
- [DealNews: Duolingo cost](https://www.dealnews.com/features/duolingo/cost/)
- [GymRats Pro](https://help.gymrats.app/en/articles/10542061-about-gymrats-pro)
- [Social Media Today: Snapchat streak restores](https://www.socialmediatoday.com/news/snapchat-will-now-enable-users-to-restore-snap-streaks/644032/)
- [Lingoly: Duolingo streak repair](https://lingoly.io/repair-duolingo-streak/)
- [Duolingo: how the streak builds habit](https://blog.duolingo.com/how-duolingo-streak-builds-habit/)
- [Cravath: Ninth Circuit ruling in Epic v. Apple (Dec 2025)](https://www.cravath.com/news-insights/epic-games-ninth-circuit-win-affirming-civil-contempt-finding.html)
- [9to5Mac: Supreme Court denies Apple's stay (May 2026)](https://9to5mac.com/2026/05/06/supreme-court-rejects-apples-stay-request-epic-games-case-to-head-back-to-district-court/)
