# App Store listing

Copy for App Store Connect, App Information and the version page, for
Saunafam build 9 and the version after it that turns Plus on. Source: section 5
"App Store listing" and "Paid tier" in `design/saunafam-spec.md`. The privacy
policy text is `privacy-policy.md`, the labels are `app-privacy.md`, the review
notes are `review-notes.md`.

Every count below comes from `python3` (`len()` for characters, UTF-8 bytes
for keywords), run on 20 October 2026. Limits are from Apple's "Required,
localizable, and editable properties" page, checked the same day: name 2 to 30
characters, subtitle 30, promotional text 170, description 4000, keywords 100
bytes with each keyword longer than two characters.

Nothing here has been entered in App Store Connect. Every field is Bryce's to
paste, on his go.

## Name

**Saunafam** (8 characters)

The app record is still named Arro. Renaming it is step 4 of "Bryce's steps" in
the spec, section 6. The name has to be free across the whole App Store. The spec's
search on 20 October found no app called Saunafam. I didn't search again, and
App Store Connect is the only real check anyway.

## Subtitle

**Your shared sauna streak** (24 of 30 characters)

## Promotional text

Can be changed any time without a new build.

> Keep a weekly sauna streak with your family or sauna crew. Start the timer, log it after, or log one session for everyone who sat together.

(139 of 170 characters)

## Description

Paste everything between the two rules. The "Saunafam Plus, if you want it"
section and the terms under it go in only with the version that turns Plus on.
Build 9 ships with Plus switched off, and App Review checks that the
description matches what the build does (Guideline 2.3.1). For build 9, end the
description after "Apple Health, if you want it" and keep the privacy line.

---

Saunafam is a weekly sauna streak for your family or your sauna crew. Everyone goes when they can, at home, at the gym or at a bathhouse. You keep one streak together.

ONE STREAK, TOGETHER
Each of you does three sessions a week, ten minutes or more. When everyone's week is kept, the family streak grows by a week and the wall of slats gets one higher. The person who starts the family can pick a different rhythm, from two to five sessions a week. Family means whoever you sauna with, up to 12 people.

A TIMER MADE FOR THE HEAT
Tap Start and the screen goes dark and warm, with big numbers you can read through the steam. Step out to cool off and add a round, and the heat clock waits for you. It keeps time even if you close the app. Forgot to start it? Log the session afterward, for today or yesterday.

SAT TOGETHER? LOG IT ONCE
One of you logs it and picks who was there, up to four people, and it counts toward everyone's week. Anyone added can take themselves off.

FREEZES AND BREAKS
Everyone has one freeze. Miss a week and it's used for you, so the family streak keeps going. It comes back after four weeks. Going away? Take a break, and the time you're away doesn't count against you.

KIND BY DESIGN
Nobody is ranked, and a missed week is never pinned on anyone. Cheer each other on, leave a short comment, add a photo. Nudges are capped, so nobody gets nagged. Families join by invite code only, with no public profiles. There are no ads and no tracking.

APPLE HEALTH, IF YOU WANT IT
Saunafam can save each session to Apple Health as mindful minutes. It's off until you turn it on, and Saunafam never reads your Health data.

SAUNAFAM PLUS, IF YOU WANT IT
Saunafam is free. Plus is an optional yearly plan or a one-time purchase that covers your whole family, with new wall woods, timer faces and app icons, every week of your history, family stats and a printable poster of your wall. The streak, the timer and everything social stay free for everyone, whether or not anyone buys Plus.

- Saunafam Plus, yearly: $24.99 a year for your whole family. An auto-renewing subscription that lasts one year. Payment is charged to your Apple Account when you confirm the purchase. It renews every year at the same price unless you cancel at least 24 hours before the year ends, and the renewal is charged in the 24 hours before then. Cancel anytime in the Settings app: tap your name, then Subscriptions. Plus stays on until the end of the year you've paid for.
- Saunafam Plus, Founding family: $59.99 once. It never renews.
- Tips of $1.99, $4.99 and $9.99 are optional thank-yous. They don't unlock anything.

Prices are in US dollars. The App Store shows the price for your country before you buy.

Terms of Use: https://www.apple.com/legal/internet-services/itunes/dev/stdeula/
Privacy policy: https://saunafam.com/privacy

---

Counted with the Plus section: 2,836 of 4,000 characters. Build 9's version
(cut after the Apple Health section, then the privacy line): 1,687. Recount
after any edit.

Notes on the copy:

- "Apple Account" is Apple's current name for an Apple ID. The Plus sheet's
  small print in the spec says "Settings, Apple ID, Subscriptions". Both get
  you there, but the app agents may want to match.
- The 24-hour renewal wording follows Apple's standard subscription terms
  (Schedule 2 of the Apple Developer Program License Agreement, which
  Guideline 3.1.2(c) points to). I didn't re-read Schedule 2 itself on 20
  October. Guideline 3.1.2 was read on that day (page last updated October
  16, 2026).
- Plus is extras only, so App Review may ask about Guideline 3.1.2(a), which
  says an auto-renewing subscription has to give "ongoing value". What grows
  every year is the family's own history: every week, the heat log and the
  poster. If review pushes back, the fallback is Founding family only (the
  spec's alternative 1).

## Terms of Use and privacy links

| Where | Link |
|---|---|
| Description (above) and the Plus sheet | Terms of Use: `https://www.apple.com/legal/internet-services/itunes/dev/stdeula/` (Apple's standard licensed application end user license agreement; returned 200 on 20 October) |
| Description (above), the Plus sheet, App Privacy and the Privacy Policy URL field | `https://saunafam.com/privacy` |

Leave App Store Connect's custom license agreement empty, so Apple's standard
one applies. Guideline 3.1.2 asks for both links in the metadata and in the app.

## Keywords

```
family,friends,cold plunge,timer,infrared,steam,habit,wellness,heat,tracker,group,banya,spa,recovery
```

**100 of 100 bytes** (100 characters, all ASCII), 14 keywords, shortest "spa"
(3). Checked with this script, which also confirms no keyword repeats a word
from the name or subtitle (saunafam, your, shared, sauna, streak) and none is
duplicated:

```python
kw = "family,friends,cold plunge,timer,infrared,steam,habit,wellness,heat,tracker,group,banya,spa,recovery"
print(len(kw), len(kw.encode("utf-8")))                      # 100 100
taken = {"saunafam", "your", "shared", "sauna", "streak"}
print({w for k in kw.split(",") for w in k.split()} & taken)  # set()
```

## Category

- **Primary: Health & Fitness.** Where people look for sauna and cold plunge
  trackers (GoPolar, HotLog, Brisk all sit there).
- **Secondary: Lifestyle.** Not Social Networking. Families are private and
  invite-only, and that category invites a closer look under Guideline 1.2
  for public user content tools Saunafam doesn't need.

## URLs

| Field | Value |
|---|---|
| Support URL | `https://saunafam.com/support` |
| Marketing URL | `https://saunafam.com` |
| Privacy Policy URL | `https://saunafam.com/privacy` |

The site isn't deployed yet (`site/README.md`, Bryce's steps). The arrofamily.com
URLs the current record uses redirect to saunafam.com once it is, so nothing
breaks between the deploy and the App Store Connect edit.

## Other App Information fields

| Field | Value |
|---|---|
| Bundle ID | `com.arrofamily.arro` (kept, so testers get build 9 as an update) |
| SKU | unchanged from the Arro record. It's never shown and can't be edited |
| Primary language | English (U.S.) |
| Price | Free |
| In-app purchases | five, below. None are created yet |
| Copyright | 2026 Bryce Rambach |
| Devices | iPhone only |
| Content rights | No third-party content |

## Age rating

### What I checked

On 20 October 2026 I read Apple's "Set an app age rating" and "Age ratings
values and definitions" pages in App Store Connect Help:

- https://developer.apple.com/help/app-store-connect/manage-app-information/set-an-app-age-rating
- https://developer.apple.com/help/app-store-connect/reference/app-information/age-ratings-values-and-definitions

The questionnaire now starts with in-app controls and capabilities, then asks
how often each kind of content appears (None, Infrequent, Frequent), then
"Age Categories and Override". Ratings for iOS 26 and later are 4+, 9+, 13+,
16+ and 18+. Devices on older iOS get a rating App Store Connect works out
from the same answers. I haven't seen the questionnaire screens themselves.
These answers follow the category list on the definitions page, so the exact
wording in App Store Connect may differ.

### Answers

**In-app controls**

| Question | Answer | Why |
|---|---|---|
| Parental Controls | No | Saunafam has no tools for a parent to restrict a child's access |
| Age Assurance | No | It doesn't check anyone's age |

**Capabilities**

| Question | Answer | Why |
|---|---|---|
| Unrestricted Web Access | No | The only links open Saunafam's own privacy and support pages |
| User-Generated Content | **Yes** | Photos, session notes, place names, comments and family names are typed or picked by people and shown to their family. Apple's definition says "broad distribution", which a private family of up to 12 isn't, so this is the cautious answer. It still allows 4+ |
| Social Media | **No** | Apple's definition is content that "visibly spreads content to many users" through a feed or discovery. Saunafam's feed only shows sessions from your own invite-only family, with no shares, no public profiles and no way to find strangers. Answering Yes would make the app 13+ (16+ in Australia) |
| Messaging and Chat | **Yes** | Comments (up to 200 characters) and nudges let family members talk to each other. Only inside the family, never with strangers. It still allows 4+ |
| Advertising | No | No ads |

**Mature themes:** Profanity or Crude Humor: None. Horror/Fear Themes: None.
Alcohol, Tobacco, or Drug Use or References: None.

**Medical or wellness**

| Question | Answer | Why |
|---|---|---|
| Medical or Treatment Information | None | No medical advice or treatment guidance |
| Health or Wellness Topics | **Yes** | Apple's definition is "self-care or lifestyle recommendations". Saunafam sets a weekly sauna goal, and the timer tells you when to cool off and, at 45 minutes, to get water and fresh air. That's the cautious reading. It makes the app 9+ |

**Sexuality or nudity:** Mature or Suggestive Themes: None. Sexual Content or
Nudity: None. Graphic Sexual Content and Nudity: None. (People may share sauna
photos with their family. That's covered by User-Generated Content.)

**Violence:** Cartoon or Fantasy: None. Realistic: None. Prolonged Graphic or
Sadistic: None. Guns or Other Weapons: None.

**Chance-based activities:** Gambling: No. Simulated Gambling: None. Contests:
None (nobody is ranked and nobody competes; the streak is shared). Loot Boxes:
No.

**Age Categories and Override:** Not Applicable. Not Made for Kids, no
override. Age Suitability URL: leave empty.

### Expected result

- **9+** on iOS 26 and later, from Health or Wellness Topics. Everything else
  answered above sits at 4+. If Bryce answers No to Health or Wellness Topics,
  it's 4+.
- Region-specific values, read off the same page: **A12** for self-rated
  Brazil (Messaging and chat is listed under A12 there, so comments decide it
  whatever the Health answer), **All** in Korea, and in Vietnam **12+** (00+
  if Health or Wellness Topics is No). Australia only differs for social
  media and loot boxes, so it shows the global rating.
- Older iOS: App Store Connect shows its own value under "Operating Systems
  Earlier than Version 26". Read it there before saving.

### Bryce should confirm

- **Under 13.** The privacy policy says Saunafam isn't directed at children
  under 13 (the spec's Default, open question 8). An age rating says what
  content is in the app, not who it's for, so 9+ and "not directed at under
  13" don't contradict each other. But families include kids. If kids are
  meant to use it, the privacy policy and the Children section need a rewrite
  first. If they aren't, consider Override to Higher Age Rating, 13+.
- **Social Media: No.** The one answer that moves the rating to 13+. It rests
  on families being private and capped at 12.
- **Health or Wellness Topics: Yes.** Answering No gives 4+.

## Screenshots

Apple's current requirements are in `screenshots.md`, checked 20 October 2026.
In short: the only iPhone set Apple's page now names as required is "iPhone
with Dynamic Island (medium display)" (iPhone 17 Pro, 1206 x 2622). The 6.9
inch size (1320 x 2868) is accepted and optional. 6.5 inch (1284 x 2778) is
only required when there's no 6.9 inch set. Plan: render 6.9 inch and the 6.3
inch medium set, and skip 6.5 inch.

Each has a Fraunces caption band at the top. Sample names only: Sam, Maya and
Jo in "Sunday sauna". No real places.

| # | Caption | Screen |
|---|---|---|
| 1 | "Close the door. We'll keep time." | timer in the dark room at 14:32 |
| 2 | "One streak for the whole family." | Today, 8 weeks together |
| 3 | "Three a week, together." | wall of slats with one freeze |
| 4 | "Sat together? Log it once." | log form with 3 people picked |
| 5 | "Cheer each other on." | Feed with a photo card and comments |
| 6 | "12 weeks in the heat." | Milestone card |

A seventh, a cedar wall with "Make the wall your own.", is optional once Plus
is live (spec Default: leave the set as is).

## In-app purchases

None of these exist yet. They're created in App Store Connect after build 9
ships (spec, "App Store Connect steps for Bryce"). Product ids are permanent,
so check them before saving. The ids match `private.plus_*_product()` in
`supabase/migrations/20261021000006_saunafam_plus.sql` and
`supabase/functions/_shared/plus.ts` (decision D21).

| Product id | Type | US price | Display name (30 max) | Description (45 max) | Family Sharing | RevenueCat package |
|---|---|---|---|---|---|---|
| `saunafam.plus.annual` | Auto-renewable subscription, 1 year, group "Saunafam Plus" | $24.99 | Saunafam Plus | Extras for your whole Saunafam family | **Off** | `annual` |
| `saunafam.plus.lifetime` | Non-consumable | $59.99 | Founding family | Saunafam Plus for your family, paid once | **Off** | `lifetime` |
| `saunafam.tip.small` | Consumable | $1.99 | A ladle | A small thank-you. It doesn't unlock anything | n/a | `tip_small` |
| `saunafam.tip.medium` | Consumable | $4.99 | A bucket | A thank-you. It doesn't unlock anything | n/a | `tip_medium` |
| `saunafam.tip.large` | Consumable | $9.99 | An armful of birch | A big thank-you. It doesn't unlock anything | n/a | `tip_large` |

- Limits from Apple's "In-App Purchase information" page, checked 20
  October: display name 2 to 30 characters, description 45 at most, product
  id up to 100. Counted: the longest display name is "An armful of birch"
  (18), the longest description "A small thank-you. It doesn't unlock
  anything" (45, right at the limit).
- The spec gives the description for the yearly plan only. The other four
  are mine, written to the same rules.
- Entitlement `plus` on `annual` and `lifetime`. Tips have none.
- Offering `default` with all five packages.

### Family Sharing: off

Off for both Plus products (spec Default, open question 10). The Saunafam
family is what shares Plus, and it covers friends who aren't in the payer's
Apple family. Once Family Sharing is on for a product it can't be turned off.
Tips are consumables, so it doesn't apply to them.

### Review screenshot notes

App Store Connect asks for one review screenshot per product. Take them from
a build with `plus_enabled` true, on the Plus sheet, at any iPhone size.

| Product | Screenshot |
|---|---|
| `saunafam.plus.annual` | The Plus sheet, "Ready, yearly picked" (state 3): the wall, the feature list, the yearly tile filled, the button "Get Plus for $24.99 a year", the small print with Restore purchases, Terms and Privacy visible |
| `saunafam.plus.lifetime` | The Plus sheet, "Ready, Founding family picked" (state 4) |
| `saunafam.tip.small`, `.medium`, `.large` | The tip jar rows at the bottom of the Plus sheet, or under Saunafam Plus in Settings. One screenshot can serve all three |

The app's preview mode shows "Preview, no real purchase". Don't use those
captures; App Review wants the real sheet with store prices.

## Review notes

Paste from `review-notes.md`. The Plus paragraph is the spec's draft, word for
word:

> Saunafam is free. Logging, the timer, the weekly family streak and everything social are free for everyone and never locked. Saunafam Plus is optional and adds extras: wall woods, timer faces, app icons, full weekly history, family stats and a printable wall poster. One purchase, by any member, covers everyone in that Saunafam family (a group of up to 12 people that members join by invite), whether or not they share an Apple family. This is handled on our server, and Apple Family Sharing is off for these products. To see the purchase screen: Settings, Saunafam Plus. Restore purchases is on that screen and in Settings. The tips (A ladle, A bucket, An armful of birch) are optional thank-yous with no features attached. Demo account: [Bryce adds one, with a family that has a few weeks of sessions].
