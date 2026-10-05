# App Store listing

Copy for the App Store Connect "App Information" and version pages. Positioning
from `design/market-research.md`: a daily family ritual, not a fitness app.
Nobody competes, any movement counts, and the family keeps one streak together.

Character limits are Apple's. Counts below were checked with a script.

## Name (30 max)

**Arro: Family Move Streak** (24)

Decided, not reserved. App Store Connect reserves it when you create the app
record (see `testflight.md`, step 1). If it's refused, fallbacks in order:

1. Arro - Family Move Streak (25)
2. Arro: Move Together (19)
3. Arro Family Streak (18)

## Subtitle (30 max)

**Move a little. Stay close.** (26)

Alternatives: "One streak, the whole family" (28), "Every day forward, together" (27).

The name already carries "family", "move" and "streak" for search, so the
subtitle can be the feeling rather than more keywords.

## Promotional text (170 max)

Can be changed any time without a new build.

> Everyone moves a little, everyone sees it, and you keep one streak together. A walk counts the same as a marathon. Made for families who live apart. (148)

## Description (4000 max)

> Arro is a daily ritual for families who live apart.
>
> Everyone in the family moves a little each day: a walk, a swim, yoga, a gym session, a bike ride. When they do, the family sees it, and together you keep one streak going. It's not a fitness app. Nobody's competing, and a walk round the block counts the same as a marathon.
>
> ONE STREAK, THE WHOLE FAMILY
> The family streak grows each day everyone moves. Each person also has a free freeze that covers a missed day automatically, so a sick day or a busy day doesn't cost anyone, and it comes back a week later. Missing a day is never called out. Arro says "Mum still has today", never who broke it.
>
> ANY MOVEMENT COUNTS
> Tap "I moved today" and pick what you did. Duration is optional and never ranked. If you already track workouts, connect Apple Health and they count by themselves, including workouts from apps that save to Health.
>
> A REASON TO SAY HELLO
> See who's moved today, cheer each other on, and send a gentle nudge to someone who still has today. It's something small to share every day, without having to think of what to say.
>
> ONE MOMENT A DAY
> Today and This Week fit on one screen. There's no endless feed, no leaderboard and no red badges. Check in, see your family, get on with your day.
>
> PRIVATE BY DESIGN
> Families join by invite code only. There are no public profiles, no strangers and no location. Your workouts are shown to your family and nobody else, and Health data is never used for advertising.
>
> Arro reads workouts from Apple Health only if you choose to connect it. It reads workouts and nothing else, only today's and yesterday's, and never writes to Health.

(about 1,640 characters)

Only describe what the build does. If phase 4 (notifications) ships in the
same build, add to "A reason to say hello": "Arro reminds you once a day, at the
time you choose, if you haven't moved yet." Don't add it before then: App Review
checks described features (Guideline 2.3.1).

## Keywords (100 bytes max, comma separated, no spaces)

```
workout,habit,parents,grandparents,walk,exercise,fitness,together,daily,check-in,accountability,kin
```

(99 bytes). Words already in the name or subtitle (arro, family, move, streak,
stay, close, little) are left out because Apple indexes those anyway.

## Category

- **Primary: Health & Fitness.** It's where people look for a move or workout
  habit, and HealthKit apps sit there naturally.
- **Secondary: Lifestyle.** Not Social Networking: that category makes
  reviewers look harder for the reporting and blocking tools of Guideline 1.2,
  and Arro is invite-only family, not a social network.

## Other App Information fields

| Field | Value |
| --- | --- |
| Bundle ID | com.arrofamily.arro |
| SKU | arro-ios-1 (any unique string, never shown) |
| Primary language | English (U.S.), or English (Australia) if you'd rather. Pick before the first submission; it's awkward to change |
| Price | Free, no in-app purchases in v1 (`design/paid-plan.md`) |
| Availability | All countries, or start with the countries your family is in |
| Copyright | 2026 Bryce Rambach |
| Seller | Bryce Rambach (individual account) |
| Support URL | See `hosting.md`, `/support` |
| Privacy Policy URL | See `hosting.md`, `/privacy` |
| Marketing URL | Optional, leave blank |
| Devices | iPhone only (`supportsTablet: false` in app.json) |

## Age rating answers

All "None" or "No", which should give 4+, except:

- **User-generated content: Yes.** Workout notes and the family name are typed
  by people and shown to their family. It's private and invite-only.
- **Messaging and chat: No** while the comment bar on Workout detail is a
  placeholder (see `review-notes.md`, before submitting). Answer Yes once real
  comments exist.
- **Health or wellness topics: Yes** if the questionnaire asks, since workouts
  come from Apple Health. It doesn't raise the rating.
