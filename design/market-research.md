# Arro market scan

October 2026. Who has already tried a family fitness or family check-in app, what
the evidence says, and where Arro fits. Read with `design/refactor-plan.md`.

## The short version

- **It's been tried in pieces, never as a whole.** Family fitness apps are
  leaderboards and step challenges. Family presence apps are about location,
  safety or photos. Social streaks (Snapchat, Duolingo) are between two people.
  No app found makes the whole family the unit of the streak, and none accepts a
  plain "I moved today".
- **The way in is the one you named: staying in touch in a healthy way.** Arro is
  the daily hello nobody has to think up, for families who live apart. The seven
  healthy-contact rules below are what make it different, so they're product
  rules, not marketing.
- **The evidence is encouraging and has two warnings.** A family step game in a
  trial (BE FIT, 2017) raised daily steps by about 1,660, against 636 for people
  who didn't play. But shared goals fade
  faster than competition, and people pull back after a broken streak. Arro has to
  be designed around the day the streak breaks.
- **Families already pay per family to stay close.** Life360, Marco Polo and
  FamilyAlbum all let one person pay for everyone. See `design/paid-plan.md`.
- **Closest app: MoveShare** (friends, Apple Health only). **Biggest threat:**
  Apple adding family groups to Fitness sharing.
- **Year one costs about $110**: the $99 Apple Developer Program plus a domain.
  Supabase and RevenueCat are free at Arro's size.

## Who's already here

Prices are USD as seen on 5 Oct 2026. "Unconfirmed" means the figure came from a
review or search summary, not the vendor.

**Fitness with friends or groups**

| Product | What it does | Price | What Arro takes from it |
| --- | --- | --- | --- |
| Apple Fitness sharing | Activity rings shared with up to 40 friends, 7-day 1-on-1 competitions | Free, Apple Watch-centred | Health as the automatic source. Arro is the family layer Apple doesn't have |
| MoveShare | Private friends feed from Apple Health, kudos, streaks, group goals, no leaderboards | Unknown | The closest app in spirit. It's friends and Health-only. Arro is family-first and takes a manual check-in |
| GymRats | Group challenges, members post workouts, leaderboard | Pro $3.99/mo or $32.99/yr | Proof people pay a few dollars a month for a group workout app |
| Stridekick | Step challenges (leaderboard, streak, target modes), up to 10 people | Private challenges need Pro (price unconfirmed) | Users pushed back when private groups went behind the paywall. Don't paywall the core loop |
| Pacer, StepUp | Step leaderboards and groups | Pacer Premium $9.99/mo or $49.99/yr (unconfirmed) | Steps only, ranked. The opposite of Arro |
| Fitbit | Removed Challenges and Open Groups in March 2023 | - | Fitbit users who did family step challenges lost them |
| Strava Family Plan | Premium for up to 4 people, $139.99/yr | Billing bundle only | Families will pay for a group plan. Strava's isn't a shared feed |
| Goals, Maxr, Did You Gym? | Small buddy or group gym-streak apps | Small IAPs | Streaks between friends are common. A whole-family streak isn't |

**Close-family presence**

| Product | What it does | Price | What Arro takes from it |
| --- | --- | --- | --- |
| Life360 | Family location for a Circle | Gold $16.99/mo or $149.99/yr, one membership covers the whole Circle | The payment model: one person pays, the family gets it |
| Marco Polo | Async video messages | Plus $79.99/yr, Plus Family $159.99/yr for 6 | Families pay per family for staying in touch |
| FamilyAlbum, Tinybeans | Private family photo sharing | Around $59-75/yr premium (unconfirmed) | People pay to keep family memories, which is what Arro's paid plan sells |
| Locket Widget | Close friends' photos on your home screen | Free, Locket Gold IAPs | A home-screen widget can be the whole product |
| I'm OK, Demumu ("Are You Dead?") | Daily one-tap "I'm OK" for family far away, viral in early 2026 | Unconfirmed | Real demand for a daily family check-in, framed around worry |
| Luffu (Fitbit's co-founders) | AI family care for kids, ageing parents and pets, announced Feb 2026 | Not launched | A funded team heading for "family health". Watch it |

**Streaks in social apps.** Snapchat streaks and Duolingo Friend Streaks are
between two people. Snapchat gives one free restore, then charges $0.99 each, and
Snapchat+ includes 5 a month (unconfirmed).

**What nobody does yet:**

- **The family as the unit of the streak.** Social streaks are between two
  people. Group fitness apps are leaderboards or time-boxed challenges.
- **A manual "I moved today".** Everything found counts steps, rings or tracked
  workouts. That leaves out the least sporty family members, who are exactly the
  ones Arro needs.
- **A per-family price in fitness.** Presence apps charge per family (Life360,
  Marco Polo). Fitness apps charge per person, apart from Strava's 4-seat bundle.
- **A positive daily check-in.** The 2026 check-in apps are about safety ("is Mum
  OK?"). Nobody uses daily movement as the warm version of that signal.

## What the evidence says

**For:**

- **A family step game worked.** In the BE FIT trial (Patel et al., JAMA Internal
  Medicine, 2017), 200 adults from 94 families played a family step-count game.
  Daily steps rose by 1,661 against 636 for controls, and people met their goal
  on 53% of days against 32%. That's the closest study to Arro.
- **People move when the people close to them move.** In a study of 3,520 couples
  (Jackson et al., JAMA Internal Medicine, 2015), inactive men became active 67%
  of the time when their partner did too, against 26% when the partner didn't.
  Women were 66% against 24%. Couples live together, so this is a nudge in the
  right direction, not proof for families who live apart.
- **Loneliness is common, including in middle age.** The 2023 US Surgeon General
  advisory says about half of US adults report loneliness. AARP's 2025 survey
  puts it at 40% of adults 45 and over, up from 35% in 2010 (unconfirmed: search
  summary, page not fetched).
- **Streaks build habits, and a freeze is enough.** Duolingo learners who reach a
  7-day streak are 3.6 times more likely to finish their course (correlational).
  Doubling the number of streak freezes from one to two raised daily active
  learners by only 0.38%. One freeze a week is plenty.

**Against, and what Arro should do about it:**

- **Many families already talk daily.** Pew (2015) found 46% of US parents with
  adult children living away are in daily contact. Arro can't replace the phone
  call or the group chat. It has to be lighter than both, and give them something
  to talk about.
- **Collaboration was the weakest motivator.** In the STEP UP trial (Patel et al.,
  2019, 602 adults), competition added the most steps (920 a day), then support
  (689), then collaboration (637). After the game ended, collaboration faded to
  nothing measurable. Arro's shared streak is the collaboration arm. Arro is
  betting that dropping competition keeps the least sporty members in. The
  evidence says that bet costs some motivation, so Arro needs other ways to stay
  interesting after the first month.
- **A broken streak makes people step back.** Across seven studies (Silverman and
  Barasch, Journal of Consumer Research, 2023), people did less of a behaviour
  after their streak broke. One family streak means one person can break it for
  everyone, which is the biggest design risk in the product.
- **Most fitness apps lose almost everyone in a month.** Day-30 retention for
  health and fitness apps is quoted at roughly 5-10% (vendor blogs, unconfirmed).
  A family still logging at day 30 is already beating the category.

## Where Arro fits

Two questions sort every product in this space: **what gets shared** (performance:
pace, rings, steps, calories, or presence: "I showed up today", "I'm OK") and
**who sees it** (strangers, friends, or close family).

|                         | Performance stats                     | Presence                                   |
| ----------------------- | ------------------------------------- | ------------------------------------------ |
| **Strangers / public**  | Strava, Nike Run Club, Garmin         | BeReal (friends-of-friends drift)          |
| **Friends / groups**    | Apple Fitness sharing, GymRats, Stridekick, Pacer, StepUp | MoveShare (closest), Snapchat and Duolingo streaks, Locket |
| **Close family**        | Strava family plan (billing only)     | Life360, I'm OK, Marco Polo, FamilyAlbum, the family group chat |

The family-presence corner is full of products, but each one has a catch:

- **Safety and location apps** (Life360, daily "I'm OK" apps) are about worry.
  They're one-way: someone watches, someone gets watched.
- **Content apps** (Marco Polo, Locket, family photo albums, the group chat) need
  you to have something to say. Most days nobody does, so they go quiet.
- **Fitness apps with friends** give you a daily reason to show up, but the
  currency is stats and the format is competition. Mum walking 20 minutes
  "loses" to Whit's 10k.

**Arro's gap:** a daily reason to say hi that nobody has to think up. Moving is
the excuse. The family streak makes everyone's day matter equally. Seeing
"Mum walked today" is good news, not a stat and not surveillance.

## Positioning

**For families who live apart, Arro is a daily ritual that keeps you close:
everyone moves a little, everyone sees it, and you keep one streak together.**
Unlike fitness apps, nobody's competing and any movement counts. Unlike the group
chat, there's something to share every day without having to come up with it.

- **Tagline:** keep "Every day forward, together". Alternatives worth testing on
  the App Store page: "Move a little. Stay close." and "One streak, the whole
  family".
- **Who it's for:** adult kids (roughly 25-45) who live away from parents or
  siblings, and the parents (55-75) who'd like to hear from them more. Families
  spread across time zones are the sharpest version of this: Brisbane and back
  home is the founder's own case.
- **Who it isn't for:** people chasing PBs, training plans or public kudos.
  Strava and Apple Fitness already serve them well. Arro shouldn't try.
- **The founder buys, the family stays.** One motivated person (usually an
  adult kid) starts the family. The product has to win over the least-techy,
  least-sporty member, or the family streak dies.

## Healthy contact: the rules Arro keeps

"Staying in touch in a healthy way" only means something if the product has
rules that other apps don't. These are the promises, and they're also design
constraints for the refactor:

1. **One moment a day, not a feed.** Today and This Week are bounded. There's
   nothing to scroll once you've seen your family.
2. **Missing a day is never public shame.** Copy says "Darcey still has today",
   never "Darcey broke the streak". The automatic freeze covers a sick day
   without anyone having to explain.
3. **No leaderboards, no stats comparisons.** Duration and type are optional and
   never ranked. A walk and a marathon count the same.
4. **Nudges are capped.** At most one nudge per person per day, never during
   their quiet hours, and always phrased as a cheer.
5. **No red badges, no streak countdown alarms.** Reminders go out once, at the
   time each person chose.
6. **Private by design.** No public profiles, no location, no strangers. Row-level
   security keeps each family's data to that family.
7. **Easy to pause.** A holiday or illness pause that doesn't break the family
   streak, so stepping away never costs anyone.

## What this changes in the plan

These are in `design/refactor-plan.md` now.

1. **A number that can't break.** Under the family streak, show "days together
   this year". When the streak breaks, Today leads with that number and the
   longest streak, never with a zero. That answers the broken-streak research.
2. **A gentle restart.** Day 1 after a break gets its own card ("Back at it,
   together"), and no copy ever says who missed.
3. **A finish line for new families.** Every new family gets a free starter goal,
   "Your first 30 days together", with a milestone card at the end. Shared goals
   fade without one (STEP UP).
4. **Lead with "I moved today".** Nobody else accepts it, and it's what lets Mum
   join. It's the first onboarding choice and the first App Store screenshot.
5. **Later: a home-screen widget** with the family's faces lit up as each person
   moves. Locket shows the widget can carry a whole product. Check SDK 57 widget
   support before planning it.
6. **The App Store name needs more than "Arro".** "Arro" is already used by a
   travel-buddy app ("Arro: Explore Together"), a taxi app, a credit card app and
   a care app. App Store names have to be unique, so plan on something like
   "Arro: Family Move Streak", and settle it before buying a domain.

## Threats

- **Apple.** Fitness sharing already covers up to 40 friends, and Family Sharing
  already knows who your family is. If Apple joins the two, Arro's edge is what
  Apple won't do: manual check-ins, no Watch needed, no rankings, and the warmth.
- **Android relatives can't join v1.** iPhone only is the right call for the
  build, but a family with one Android parent is stuck. A cheap stopgap to
  consider after launch: a web check-in page for invitees without an iPhone
  (`react-native-web` is already a dependency). Health Connect on Android later.
- **One person breaks it for everyone.** The family streak is the main number,
  and the research says broken streaks drive people away. The freeze, the pause
  and "days together this year" are the defence.
- **The novelty fades.** The STEP UP collaboration arm had no lasting effect once
  the game ended. Monthly recaps, milestones and goals have to keep giving people
  something new.
- **Someone close moves into family.** MoveShare could add a family mode, and
  Luffu (from Fitbit's founders) is funded and aimed at family health.
- **Arro becomes another obligation.** Nearly half of parents with adult kids
  away are already in daily contact. If Arro feels like homework, it gets muted.
  The healthy-contact rules are the guard against that.

## Launch costs

| Item | Cost | When it's needed |
| --- | --- | --- |
| Apple Developer Program | $99 a year | Before TestFlight |
| Domain | About $10.46 a year for a .com at Cloudflare (at cost; price from a third-party tracker). A .app is $8.20 the first year, then $14.20 | Before invite links. Optional for v1, see the Domain section of the refactor plan |
| Supabase | Free plan: 500 MB database, 1 GB file storage, 50,000 monthly active users, 500,000 edge function calls, 2 active projects. Projects pause after a week with no activity. Pro is $25 a month | Free is enough for launch |
| RevenueCat | Free up to $2,500 a month in revenue, then 1% | When the paid plan ships |
| Apple's commission | 15% under the Small Business Program (under $1M a year) | On each sale |
| EAS Build | Not checked. Expo has a free tier with a monthly build allowance, and local Xcode builds cost nothing | Development builds from phase 2 |

The minimum for year one is about $110. The first real cost after that is
Supabase Pro, and only if Arro outgrows the free plan.

## Sources

Competitors and prices:
- [Apple: Share your activity](https://support.apple.com/guide/watch/share-your-activity-apd68a69f5c7/watchos)
- [9to5Google: Fitbit removes Challenges and Open Groups](https://9to5google.com/2023/03/27/fitbit-challenges-groups-removed/)
- [Stridekick on the App Store](https://apps.apple.com/us/app/stridekick-activity-challenges/id1484402218)
- [GymRats Pro](https://help.gymrats.app/en/articles/10542061-about-gymrats-pro)
- [StepUp on the App Store](https://apps.apple.com/us/app/stepup-pedometer-step-counter/id979101825)
- [Steps Club: walking apps for groups (Pacer price)](https://www.stepsclubapp.com/blog/best-walking-apps-for-groups)
- [Engadget: Strava family plan](https://www.engadget.com/strava-launches-a-family-plan-170002189.html)
- [MoveShare](https://moveshare.app/)
- [Goals: Fitness Accountability](https://apps.apple.com/us/app/goals-fitness-accountability/id6744724683)
- [Maxr: Social Fitness Streaks](https://apps.apple.com/us/app/maxr-social-fitness-streaks/id6747325633)
- [Life360 plans](https://www.life360.com/plans-pricing)
- [Marco Polo Plus price FAQ](https://support.marcopolo.me/article/335-marco-polo-plus-price-increase-faq)
- [FamilyAlbum premium plans](https://help.family-album.com/hc/en-us/articles/360038264494)
- [Memory Murals: FamilyAlbum vs Tinybeans](https://memorymurals.com/journal/familyalbum-vs-tinybeans)
- [Locket Widget on the App Store](https://apps.apple.com/us/app/locket-widget/id1600525061)
- [NPR: the "Are You Dead?" app](https://www.npr.org/2026/02/03/nx-s1-5694669/loneliness-isolation-app-are-you-dead-snug-alone)
- [MobileSyrup: I'm OK app](https://mobilesyrup.com/2026/02/27/winnipeg-based-im-ok-app-check-on-loved-ones/)
- [Wareable: Luffu](https://www.wareable.com/health-and-wellbeing/luffu-caregiving-ai-health-platform-announcement-eric-friedman-james-park-fitbit)
- [Flowfame: Snapchat streaks](https://flowfame.com/blog/snapchat-streaks)
- [Duolingo: Friend Streak](https://blog.duolingo.com/product-lessons-friend-streak/)
- App Store listings named Arro: [Explore Together](https://apps.apple.com/us/app/arro-explore-together/id6779081474), [Taxi](https://apps.apple.com/us/app/arro-taxi-app/id979943889), [Build & Grow Credit](https://apps.apple.com/us/app/arro-build-grow-credit/id6449683788), [Human Care Solutions](https://apps.apple.com/us/app/arro-human-care-solutions/id1451464358)

Evidence:
- [ScienceDaily: BE FIT family step game (JAMA Intern Med, 2017)](https://www.sciencedaily.com/releases/2017/10/171002112749.htm)
- [JAMA Internal Medicine: STEP UP trial (2019)](https://jamanetwork.com/journals/jamainternalmedicine/fullarticle/2749761)
- [JAMA Internal Medicine: partners and physical activity (2015)](https://jamanetwork.com/journals/jamainternalmedicine/fullarticle/2091401)
- [Pew: keeping in touch across generations (2015)](https://www.pewresearch.org/social-trends/2015/05/21/6-keeping-in-touch-across-generations/)
- [NPR: Surgeon General loneliness advisory (2023)](https://www.npr.org/2023/05/02/1173418268/loneliness-connection-mental-health-dementia-surgeon-general)
- [AARP: loneliness survey (2025)](https://www.aarp.org/family-relationships/loneliness-epidemic-survey/)
- [Duolingo: how the streak builds habit](https://blog.duolingo.com/how-duolingo-streak-builds-habit/)
- [CU Boulder: how broken streaks affect decisions (J Consumer Research, 2023)](https://www.colorado.edu/business/faculty-research/2023/04/19/or-track-how-broken-streaks-affect-consumer-decisions)
- [UXCam: app retention benchmarks](https://uxcam.com/blog/mobile-app-retention-benchmarks/)

Launch costs:
- [Apple Developer Program enrollment](https://developer.apple.com/support/enrollment/)
- [App Store Small Business Program](https://developer.apple.com/app-store/small-business-program/)
- [Supabase pricing](https://supabase.com/pricing)
- [RevenueCat pricing](https://www.revenuecat.com/pricing/)
- [Cloudflare Registrar](https://www.cloudflare.com/products/registrar/)
- [DomainNameServices: Cloudflare domain prices](https://domainnameservices.net/registrars/cloudflare)
