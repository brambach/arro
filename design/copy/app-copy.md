# Saunafam app copy

Every string in the app for build 9, by screen. This is the skeleton: each
string the spec gives is filled in word for word under its screen, with the
spec section it came from. The app agents fill in the rest as they write it
(lines marked _to write_), and keep this file and the code in step.

Push and local notification text is in `design/copy/notifications.md`, not
here.

Rules (spec, Quality bar, and `AGENTS.md`): no em or en dashes anywhere,
American spelling, contractions, no arrow glyphs on links, sample names only
(Sam, Maya and Jo in "Sunday sauna"). Errors say what happened, then what to
do. Run the dash check after every edit:

```
grep -rnP "[\x{2013}\x{2014}]" design/copy
```

Bold is a button or a tappable label. Quotes are the exact string.

## Words used in the app

Spec, section 3, "Words used in the app".

| Word | Meaning |
|---|---|
| session | one sauna visit |
| round | one stint in the heat inside a session |
| the week | Monday to Sunday by default |
| goal | sessions per week, default 3 |
| kept | met the goal |
| freeze | each person's one automatic save |
| break | a planned pause |

Tabs: **Today**, **Week**, **Feed**, **Me** (section 3, "Navigation").

## Splash

- Wordmark: "saunafam" (lowercase, Fraunces). Section 2, "First launch".

## Onboarding, founder path

Section 3, "Onboarding". Said once in onboarding: "Family means whoever you
sauna with."

### 1. Welcome

- Headline: "Keep a sauna streak together."
- **Start a family**
- **I have an invite**
- Plain text: "Already have an account? Sign in"

### 2. Sign in with Apple

- Unchanged from Arro, with the first-name field. _to write: the Saunafam
  wording of the existing strings_

### 3. Name your family

- Rotating placeholders: "Sunday sauna", "The Lake House", "Kiuas crew"
- _to write: title, button_

### 4. Your rhythm

- "How many sessions a week?" Tiles: 2, 3, 4, 5 (default 3)
- "What counts as a session?" 5, 10, 15 or 20 minutes (default 10)
- "Week starts on Sunday instead"
- _to write: tile labels, the line that says the week start can't change later_

### 5. How the streak works

- The rules list, below under "Streak rules".

### 6. Invite your family

- The share text, below under "Invite".
- _to write: title, body, buttons_

### 7. Reminders

- "Remind me if I'm behind."
- Defaults: Thursday and Saturday, 6:30 PM
- "No reminders"

### 8. Notifications

- The iOS permission ask, as in Arro. _to write: the pre-prompt text_

## Onboarding, invitee path

Section 3, "Onboarding". Steps: join code, you're invited, sign in, meet the
family, photo, how it works, reminders, notifications.

### Join code

- _to write_

### You're invited

- _to write_

### Sign in

- _to write_

### Meet the family

- Rhythm line: "3 sessions a week, 10 minutes or more"
- Shows members, who invited you and the current streak in weeks. _to write_

### Photo

- _to write_

### How it works

- The rules list, below.

### Reminders and Notifications

- Same as the founder path, steps 7 and 8.

## Today

Section 3, "Today".

- Header: the date, a time-of-day greeting. _to write: greetings_
- This week card: "2 of 3 this week"
- Family line (names progress only): "Maya and Jo have kept this week. Sam's on 1."
- Family streak: "**8** weeks together"
- **Start a session**
- Plain text under it: **Log one I already did**
- "Log yesterday's"
- Monday, last week not kept: "Did you sauna on Sunday? Log it"
- Family list statuses: "Kept", "2 of 3", "On a break until Friday", "Invited"
- Solo founder: "Your family streak starts when someone joins"
- After a broken streak: "Weeks together this year", and the card "Back at it, together"
- Timer running bar: "In the heat · 12:04"
- After saving, when the family's week is complete: "Week kept, together" (section 2, "Saving a session")
- Apple Health card, once, after the first saved session: "Save sessions to Apple Health?" with **Turn on** and **Not now** (section 3, "Apple Health")

## Timer

Sections 2 ("Timer: the door closes") and 3 ("Timer"). Built in M8
(`src/screens/TimerScreen.tsx`, words in `src/state/timerRoom.ts`).

On Today (M8 components that M9 places):

- **Start a session** (hint for VoiceOver: "Starts the sauna timer")
- With a timer running, the same button: **Back to the timer** ("Opens the timer that's running")
- The slim bar: "In the heat · 12:04", "Cooling off · 12:04" (VoiceOver: "In the heat, 12 minutes 4 seconds", hint "Opens the timer")

In the room:

- Top line, small caps: "IN THE HEAT · ROUND 1", while cooling off "COOLING OFF · ROUND 1 DONE"
- Under the numerals, small caps, tappable: "TRADITIONAL · 15 MIN" (VoiceOver: "Traditional · 15 min. Change the target or sauna type")
- The numerals for VoiceOver: "12 minutes 40 seconds in the heat", while cooling off "..., paused while you cool off"
- Every 5 minutes, VoiceOver says: "5 minutes", "10 minutes", and so on
- Above Throw löyly: "Time to cool off at 7:27 PM"; past the target "That's your 15 minutes. Cool off when you're ready."; cooling off "Cooling off. Go back in when you're ready."
- **Throw löyly** (hint: "A burst of steam. Nothing is saved.")
- **Add a round** (hint: "Pauses the heat clock while you cool off"); while cooling off **Back in the heat** ("Starts the next round")
- **Done** (hint: "Opens the log form, filled in")
- **Cancel**
- Top left, an icon only: "Back to Today" (hint: "The timer keeps running")
- The target and type panel: small caps "TARGET" with **10 min**, **15 min**, **20 min**, **30 min**; "SAUNA" with the seven types; **Done**
- Cancel confirm: "Cancel this session?" / "The timer stops and nothing's saved." / **Keep going**, **Cancel session**
- Back after 3 hours: "Still going? It's been 3 hours" / "Log it with your real time, keep the timer going, or let it go." / **Log it**, **Keep going**, **Discard**
- Sign out with a timer running: a confirm. _to write (M10, Settings)_

## Log session

Section 3, "Log session form". Built in M8 (`src/screens/LogSessionScreen.tsx`,
checks in `src/state/logForm.ts`).

- Titles: "Log a session"; from the timer "Log this session"; fixing a refused draft "Fix this session"
- **Close** (the round x, for VoiceOver)
- "When": **Today**, **Yesterday**; the start time "Started 6:45 PM" with a minus and a plus (VoiceOver: "Start time, Started at 6:45 PM", adjustable)
- When yesterday has closed: "Yesterday closed at 5:00 PM."
- "Minutes", placeholder "15"; chips **10**, **15**, **20**, **30**
- From the 3-hour prompt: placeholder "How long were you in?", hint "The timer ran for hours. Put in your real time."
- Under a short session: "Sessions under 10 minutes are saved but don't count toward the week." (the family minimum fills in the number)
- "Sauna", tiles: "Traditional", "Wood-fired", "Infrared", "Steam room", "Smoke", "Banya", "Other"
- "Temperature, °F" (or "Temperature, °C"), placeholder "185" (or "85"); "Humidity, %", placeholder "20"
- "Rounds", a minus and a plus (VoiceOver: "2 rounds")
- "Cold plunge" with a switch; when on, "Minutes in the cold", placeholder "2"
- "Place", placeholder "Home, The Y"; chips of the family's recent places
- "Sat with someone?"; under the people "They get a note and can take themselves off it."; when 3 are picked "That's 4 of you, the most for one session."
- People who can't be picked or are away: "Hasn't joined yet", "On a break"
- "Photo": **Take a photo**, **Choose one**; with a photo **Replace**, **Remove**
- Photo access off: "Photos are off for Saunafam" / "The camera is off for Saunafam" / "You can turn them on in Settings." / **Not now**, **Open Settings**
- "Note", placeholder "How was it?"; near the limit "12 left"
- **Save session**; fixing a draft **Save again**, and **Throw this one away**
- Refused draft, at the top of the form: "Couldn't save this one" / the server's reason as a sentence, then "Fix it here and save again."
- Draft too old: "Sessions can only be logged for today or yesterday. Pick one."
- Closing with something filled in: "Close without saving?" / "What you've put in here won't be kept." / **Keep it**, **Close**
- Closing a timer's session: "Throw this session away?" / "The timer's done, so it won't be saved anywhere else." / **Keep it**, **Throw it away**
- After saving, when someone was skipped (shown on Today): "Jo already logged this one", "Maya and Jo already logged this one"
- Refused by the server (on Today, from the data layer): "Couldn't save this one. Tap to fix it"

Checks, inline under the field, in coal:

- "How many minutes were you in?"
- "Minutes take a whole number, 1 or more."
- "Sessions go up to 240 minutes."
- "That's later than now. Pick an earlier time."
- "Yesterday closed at 5:00 PM. This one can go on today."
- "Somewhere from 86 to 266°F." (or "30 to 130°C")
- "Somewhere from 0 to 100%."
- "Up to 30 minutes."
- "Up to 60 characters." (place), "Up to 140 characters." (note)
- "Up to 3 people with you."

## Session detail

Section 3, "Shared sessions" and "Feed".

- Shared title: "Maya and Jo had a sauna together"
- Details line: "20 min · Traditional · 85°C"
- **Remove me from this session**
- Cheer: "Cheer Maya on"
- Quick replies on someone else's session: "Nice heat", "Jealous", "Save me a spot", "Cold plunge hero" (only with a plunge)
- Quick replies on your own: "Felt great", "Needed that"
- _to write: edit, delete and their confirms, the comment field, removed-session state_

## Feed

Section 3, "Feed".

- Card title: "Maya had a sauna", or "Maya and Jo had a sauna together"
- Details: "20 min · Traditional · 85°C"
- Shared card: "Maya, Jo and Sam had a sauna together"
- **Cheer Maya on**
- _to write: empty state_

## Week

Section 3, "Week".

- Three numbers: the family streak in weeks, the longest streak, weeks together this year. _to write: labels_
- Past weeks: "Week of Oct 5: kept", "Week of Sep 28: kept, a freeze was used"
- **See every week** and **Print the wall** (Plus, only when `plus_enabled`)
- **Streak rules** (plain text link)
- The Plus quiet card is below under "Saunafam Plus".

## Me

Section 3, "Me".

- **Edit profile**
- Stat grid: weeks in a row, longest streak, sessions this month, hours in the heat this year. _to write: labels_
- Favorite type and place. _to write_
- Badges at 4, 8, 12, 26 and 52 weeks. _to write_
- Plus rows (only when `plus_enabled`): **Heat log**, **Timer face**, **App icon**

## Edit profile

- _to write_

## Settings

Section 3, "Settings".

| Row | Copy from the spec |
|---|---|
| Family rules | "Starting Monday, Oct 26" (when a change takes effect). Read only for everyone but the founder. _to write: row and screen_ |
| Take a break | "Rest of this week", "One week", "Two weeks", "I'm back, end it now" |
| Family members | unchanged from Arro |
| Streak rules | the rules list |
| Notifications | "Weekend check-in" |
| Apple Health | "Save sessions to Apple Health", plus its status |
| Saunafam Plus | "Plus, from Maya" when the family has it. Restore purchases and the tip jar sit under it |
| The wall | Birch, cedar, alder, charred pine |
| Privacy, Help & FAQ | open `https://saunafam.com/privacy` and `/support` |
| About, Sign out, Delete account | unchanged from Arro |

### Family rules

- "Starting Monday, Oct 26"
- _to write_

### Take a break

- "Rest of this week", "One week", "Two weeks"
- "I'm back, end it now"
- _to write: title, the limit messages (1 to 14 days, 14 in any 30)_

### Family members

- Unchanged from Arro. _to write: the Saunafam wording_

### Streak rules

Section 3, "Rules list" (`src/data/streakRules.ts`), shown in onboarding and
Settings:

1. "One streak for the whole family. It starts when the second person joins."
2. "Each of you does 3 sessions a week, 10 minutes or more. Two in one day counts once."
3. "The week runs Monday to Sunday, in your own time zone."
4. "Everyone has one freeze. Miss a week and it's used for you. It comes back after 4 weeks."
5. "Going away? Take a break. A break of 4 days or more in a week means that week doesn't count against you."
6. "Sat together? One of you logs it for everyone."
7. "Nobody is ranked, and a missed week is never pinned on anyone."

### Notifications

- "Weekend check-in"
- _to write: reminder days and time_

### Apple Health

- "Save sessions to Apple Health"
- _to write: status lines_

### The wall

- Woods: birch (free), cedar, alder, charred pine
- Try-on button: "Keep this wood with Plus"

### About, Sign out, Delete account

- Delete account, Plus payer: "You pay for Saunafam Plus. Deleting your account doesn't cancel it. Cancel in Settings, Apple ID, Subscriptions first." ("Paid tier", `delete-account`)
- _to write_

## Nudge

- _to write. The push it sends is in `notifications.md`_

## Milestone

Section 2, "Streak milestone". Milestones at 4, 8, 12, 26 and 52 weeks.

- Screenshot caption example: "12 weeks in the heat."
- **Share**
- _to write: the card text_

## Invite

Section 3, "Invites" (`src/state/invite.ts`). Share text, word for word:

> "Sam invited you to Sunday sauna on Saunafam. We keep a weekly sauna streak together. Get Saunafam, tap 'I have an invite' and enter the code ABCD2345."

- Link, once saunafam.com is live: `https://saunafam.com/join/<code>`
- Join page on the site (not the app): "You're invited to a family on Saunafam"
- _to write: the invite panel and its buttons_

## "Arro is now Saunafam" sheet

Section 7. Shown once, keyed by `saunafam.welcomed.v1`.

- Title: "Arro is now Saunafam"
- Body: "Your family is still here. We've moved from daily movement to a weekly sauna streak: 3 sessions a week each, 10 minutes or more. Everyone starts fresh at week one."
- **Got it**
- Founder only: **Change the rhythm**

## Update required

Section 4, "app_config". When the app's build is below `min_ios_build`:

- "A new version of Saunafam is ready. Update in TestFlight or the App Store."
- _to write: button_

## Errors and empty states

- Release build without Supabase settings: "This build can't reach Saunafam" (section 6, `App.tsx`)
- Log refused by the server: "Couldn't save this one. Tap to fix it"
- Shared session duplicate: "Jo already logged this one"
- Solo family: "Your family streak starts when someone joins"
- _to write: offline, server error, removed session, expired invite, and every empty state (spec, Definition of done, "Every screen, in every state")_

## Permissions

Section 6 (`app.json`) and section 3 ("Apple Health").

- Photos: "Saunafam uses a photo only when you pick one for your profile or a session. Your family sees it in Saunafam."
- Health write: "Saunafam saves your sauna sessions to Apple Health as mindful minutes, if you turn it on. It never reads your Health data."
- Camera: _to write_

## Saunafam Plus

Spec, "Paid tier". None of this shows while `app_config.plus_enabled` is
false. Never write "Only today", "Last chance", "X families joined this week",
"Unlock your streak", or anything that ties Plus to the streak, and no
confirmshaming.

### Plus sheet

- Title: "Saunafam Plus"
- Lead: "The streak is free, for everyone, for good. Plus is for families who'd like a little more from the wall."
- Covers: "One purchase covers everyone in Sunday sauna. Nobody else pays."
- Family Sharing line (from "Family Sharing"): "One purchase covers everyone in your Saunafam family."
- List: "Cedar, alder and charred pine walls", "Coal and Brass timer faces", "New app icons", "Every week you've kept", "Your family's heat log", "A poster of your wall"
- Price choices: "Yearly: $24.99 a year", "Founding family: $59.99 once" (prices come from the store, never hard-coded)
- Button: "Get Plus for $24.99 a year" (follows the choice)
- Small print: "Renews every year until you cancel. Cancel anytime in Settings, Apple ID, Subscriptions."
- Links: **Restore purchases**, **Terms**, **Privacy**
- **Not now** (plain text)
- Sign-off: "Saunafam is made by one person. Plus helps keep the heat on. Thank you. Bryce"

### Plus sheet states

From "Every state of the Plus sheet" and "Edge cases".

| State | Copy |
|---|---|
| Loading prices | skeleton tiles, no text |
| Prices failed or offline | "Can't reach the App Store right now", **Try again** |
| Purchasing | _to write_ |
| Pending (Ask to Buy) | "Waiting for approval" |
| Finishing up | "Finishing up..." |
| Success | "Thank you. The wall is yours." |
| Cancelled by the user | back to ready, no message |
| Failed | _to write: a plain error_, **Try again** |
| Family has Plus, you're the payer | **Manage** |
| Family has Plus from someone else | "Plus, from Maya. Thank you." |
| Restoring | _to write_ |
| Restore found nothing | "No purchases found for this Apple ID." |
| Lapsed | _to write_ |
| Preview mode | "Preview, no real purchase" |

### Restore purchases

- "Plus restored for Sunday sauna."
- "No purchases found for this Apple ID."
- "Couldn't reach the App Store. Try again."

### Try-on

- "Keep this wood with Plus"
- Timer face and app icon try-on: _to write_

### Quiet card on Week

- "Eight weeks of heat, together. Saunafam is free and always will be. If you'd like to make the wall your own, there's Plus."
- **See Plus**
- **Not now** (plain text)
- "Don't show this again"

### Settings lines

- Family has Plus: "Plus, from Maya"
- A plan ends: "Plus ended on Oct 3. The wall is back to birch. Everything you logged is still here."
- Apple can't renew (payer only): "Apple couldn't renew Plus. You can update your payment in Settings."
- A week before a yearly plan lapses after the payer left (others): _to write_
- Second payer: "Your family already had Plus. You can cancel yours in Settings, Apple ID, Subscriptions, and ask Apple for a refund at reportaproblem.apple.com."
- Yearly, then Founding family: a reminder to cancel the yearly plan. _to write_

### Tip jar

- "A ladle" ($1.99), "A bucket" ($4.99), "An armful of birch" ($9.99). Prices from the store.
- _to write: the heading and thank-you line_

### Heat log, every week, wall poster

- Heat log (Me): a blurred preview with the Plus sheet below. _to write_
- See every week (Week): opens the Plus sheet at "Every week"
- Print the wall (Week): opens the Plus sheet at "The wall poster"

## Prototype preview (dev only)

- Sample family "Sunday sauna" with Sam, Maya and Jo (section 3, "Settings").
