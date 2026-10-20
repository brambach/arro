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

Section 3, "Onboarding". Said once in onboarding, on Welcome, so both paths
see it: "Family means whoever you sauna with." The steps show as small ember
dots at the top ("Step 3 of 7" for VoiceOver). No step shows Plus.

### 1. Welcome

- Wordmark: "saunafam"
- Headline: "Keep a sauna streak together."
- Under it: "Family means whoever you sauna with."
- **Start a family**
- **I have an invite** (plain text)
- Plain text: "Already have an account? **Sign in**"

### 2. Sign in with Apple

- Title: "Sign in"
- Sub: "Your family sees your first name, nothing else."
- Field: "Your first name", placeholder "First name"
- Apple's own **Sign in with Apple** button, then **Continue**
- Note: "Saunafam only uses your Apple ID to sign you in. Your email isn't shared with your family."
- Signed in: "Signed in with Apple."
- Without a server (preview builds): "Preview sign-in. Nothing is made on a server, and Sign in with Apple needs the iPhone app."
- No account for this Apple ID (from Welcome's Sign in): "No Saunafam account yet. This Apple ID isn't in a family. Go back to start one, or use an invite."
- Offline: "Saunafam couldn't reach the server. Check your connection and try again."

From Welcome's "Sign in" (an existing account):

- Title: "Welcome back"
- Sub: "Sign in with the Apple ID you use for Saunafam and you'll go straight to your family."
- Note: "Your email isn't shared with your family." Preview: "Sign in with Apple needs the iPhone app."

### 3. Name your family

- Title: "Name your family"
- Sub: "Only the people you invite will see it. Your group chat's name works fine."
- Field: "Family name". Rotating placeholders: "Sunday sauna", "The Lake House", "Kiuas crew"
- Hint: "You can change it later in Settings."
- **Continue**
- Error: "Couldn't save the name. Check your connection and try again."

### 4. Your rhythm

- Title: "Your rhythm"
- Sub: "What everyone in the family aims for each week. You can change it later."
- "How many sessions a week?" Tiles: 2, 3, 4, 5, each "a week" (default 3). VoiceOver: "3 sessions a week"
- "What counts as a session?" Tiles: 5, 10, 15, 20, each "minutes" (default 10). VoiceOver: "10 minutes or more"
- Switch: "Week starts on Sunday instead"
- Under it: "Weeks run Monday to Sunday. Once your family is made, the week start stays." (Sunday: "Weeks run Sunday to Saturday. Once your family is made, the week start stays.")
- Coming back after the family is made: "The week start is set now. The goal and minimum can still change."
- **Continue** (makes the family)
- Error: "Couldn't make your family yet. Check your connection and try again."

### 5. How the streak works

- Title: "How the streak works"
- Sub: "Seven rules, all short. Settings keeps them if you want to read them again."
- The rules list, below under "Streak rules", in the family's own rhythm.
- **Got it**

### 6. Invite your family

- Title: "Invite your family"
- Sub: "The family streak starts when the second person joins, so this is the step that counts."
- The invite panel and share text, below under "Invite".
- **Send invite** (or **Done** where there's no share sheet)
- Plain text: **I'll do it later**

### 7. Reminders

- Title: "Remind me if I'm behind."
- Sub: "Only on the days you pick, and only while your week isn't kept."
- Small caps: "Days" (Mon to Sun tiles; default Thu and Sat), "Time" (6:30 PM, 15 minutes a tap; VoiceOver "Reminder time", "Earlier", "Later")
- Under it: "Thu and Sat at 6:30 PM, if your week isn't kept yet." No days: "Pick at least one day."
- **Continue**
- Plain text: **No reminders**

### 8. Notifications

- Title: "Hear from your family?"
- Sub: "Saunafam tells you when someone has a sauna, cheers you on or joins, and on Saturday who could use a cheer."
- Card: "No red badges and no countdowns. Turn any of it off in Settings." With reminders on, it adds: "Your reminders need this too."
- **Turn on notifications** (then iOS's own sheet)
- Plain text: **Not now**
- Error (an invitee whose join failed): "Couldn't join yet. Check your connection and try again." or the invite error, plus "Ask your family for a new code."

## Onboarding, invitee path

Section 3, "Onboarding". Steps: join code, you're invited, sign in, meet the
family, photo, how it works, reminders, notifications.

### Join code

- Title: "Enter your code"
- Sub: "It's in the message from whoever invited you."
- Field: "Join code", placeholder "K7P4QX9M"
- Hint: "Eight letters and numbers. Codes last 14 days." Preview: "In this preview, any code opens Sunday sauna."
- **Find my family**
- Errors (from the server, `InviteError`): "That code has expired or doesn't exist.", "Too many tries. Wait a few minutes and try again.", "That family already has 12 people, which is as many as Saunafam allows."
- Offline: "Couldn't check the code. Check your connection and try again."

### You're invited

- Title: "You're invited"
- Sub: "Sign in next to see who's in and join them."
- Card: the family name, "3 people are in" ("1 person is in"), "Code SAUNA234"
- **Continue**

### Sign in

- Same as the founder's step 2.

### Meet the family

- Title: "Meet Sunday sauna"
- Sub: "Welcome, Sam. Here's who you'll sauna with."
- Faces and names, then "Maya invited you."
- "**8** weeks together" ("week together" for 1). No streak yet: "The family streak starts with you."
- Rhythm line: "3 sessions a week, 10 minutes or more"
- **Join the family**
- Errors: the invite error plus "Ask them for a new code.", or "Couldn't join yet. Check your connection and try again."

### Photo

- Title: "Add a photo"
- Sub: "So your family sees your face, not only a letter. You can skip this."
- **Choose a photo** / **Choose a different photo** (plain text)
- "Your color is picked for you, so nobody in the family shares one."
- **Skip for now** (no photo) or **Continue**

### How it works

- Same as the founder's step 5, with the family's goal and minimum from the invite.

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

Sections 2 ("Timer: the door closes") and 3 ("Timer").

- Under the numerals: "TRADITIONAL · 15 MIN"
- **Throw löyly**
- **Add a round**
- While paused: "Cooling off"
- **Done**
- **Cancel** (always behind a confirm). _to write: the confirm_
- Target chips: 10, 15, 20, 30 minutes
- Back after 3 hours: "Still going? It's been 3 hours", with **Log it**, **Keep going**, **Discard**
- Sign out with a timer running: the Sign out sheet adds "The timer that's running now will be thrown away." (under Settings, "Sign out, Delete account")

## Log session

Section 3, "Log session form".

- Fields: When (Today, Yesterday, start time), Minutes (chips 10, 15, 20, 30), Sauna type, Temperature, Humidity, Rounds, Cold plunge, Place, With, Photo, Note
- Sauna types: "Traditional", "Wood-fired", "Infrared", "Steam room", "Smoke", "Banya", "Other"
- Place examples: "Home", "The Y"
- With: "Sat with someone?"
- Under a short session: "Sessions under 10 minutes are saved but don't count toward the week."
- Duplicate in a shared session: "Jo already logged this one"
- Refused by the server: "Couldn't save this one. Tap to fix it"
- _to write: field labels, placeholders, save button, unit labels_

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

- Title: "Edit profile" (a sheet, closes with the close mark)
- **Choose a photo** / **Choose a different photo**, **Remove photo** (plain text)
- Field: "Name". Hint: "Your first name is plenty. It's what your family sees."
- "Your color is picked for you, so everyone in the family has a different one."
- **Save**
- If the server says no, it rolls back with the quiet notice "Couldn't save your profile. Try again."

## Settings

Section 3, "Settings". Rows are tappable across their whole width and show a
value on the right only when there is one. No chevrons.

| Group | Row | Value |
|---|---|---|
| Family | **Family rules** | "3 a week" |
| Family | **Family members** | "3" |
| Family | **Streak rules** | |
| Family | **The wall** (only with `plus_enabled`) | "Birch", "Cedar", "Alder", "Charred pine" |
| You | **Take a break** | "Until Friday" while on one |
| You | **Notifications** | "Thu and Sat, 6:30 PM", or "Off" |
| You | **Apple Health** | "Off", "On", "Not allowed", "Not on this device" |
| Saunafam Plus (only with `plus_enabled`) | **Saunafam Plus** | "Plus, from Maya", or "Plus" for the payer |
| Saunafam Plus | **Restore purchases** | |
| Saunafam Plus | **Leave a tip** | |
| Help | **Privacy**, **Help & FAQ** (open saunafam.com/privacy and /support) | |
| Help | **About** | |

- Plain text under the groups: **Sign out**, and **Delete account** in coal.
- A page that won't open: "Couldn't open the page. It's at saunafam.com/privacy."
- Small caps group labels: "Family", "You", "Saunafam Plus", "Help".

### Family rules

- Title: "Family rules"
- Lead (founder): "What everyone aims for each week. A change starts at the beginning of next week, so nobody's week moves under them."
- Lead (everyone else): "Maya started the family, so Maya sets the rhythm. Here's what it is."
- "This week": **Sessions a week** "3 sessions", **Counts from** "10 minutes", **Week starts on** "Monday"
- Under it: "Set when the family started. It can't change."
- "Next week", when a change is waiting: "Starting Monday, Oct 26" with "4 sessions a week, 10 minutes or more"
- Founder: "How many sessions a week?" and "What counts as a session?" tiles, then **Save for next week**
- Saved: "Saved. Starting Monday, Oct 26."
- Error: "Couldn't save the rules. Check your connection and try again."

### Take a break

- Title: "Take a break"; on one: "On a break until Wednesday"
- Lead: "Away, unwell, or just need some time? While you're on a break the family streak carries on without you, and yours waits."
- Choices: "Rest of this week" ("Until Sunday", or "Just today, back tomorrow" on the last day), "One week" ("Until Wednesday"), "Two weeks" ("Until Wednesday, Nov 4")
- A length over the limit: "Over the limit right now"
- Limits: "A break can be up to two weeks, and up to 14 days in any 30."
- All used: "You've had 14 days of breaks in the last 30, which is the most there can be. You can take another from Thursday."
- On a break at the longest: "This break is as long as a break can be. It ends on its own, or end it now below."
- "Your family sees that you're on a break and when you're back, never why. A session while you're away still counts."
- **Start my break** / **Change my break**
- Plain text: **I'm back, end it now**, confirmed in a sheet: "End your break?" "You're back in this week from today. Sessions from today count toward it." **End my break**, **Cancel**
- Server refusals (`BreakError`): "A break can be up to two weeks long, counted from the day it started.", "You can be on a break for up to 14 days in any 30."
- Error: "Couldn't save your break. Check your connection and try again."

### Family members

- Title: "Family members"
- Lead: "3 people in Sunday sauna. Up to 12 can join." ("Just you in Sunday sauna. Up to 12 can join.")
- Rows: "Sam (you)" with "Started the family", "Maya" with "Remove" (founder only), "Invited" for people invited by name
- Founder note: "You started the family, so you can remove someone. Tap their name."
- Confirm sheet: "Remove Maya?" "Maya leaves the family, and their sessions go with them. Your family's code changes, so they'd need a new one to join again." **Remove**, **Cancel**
- Error: "Couldn't remove Maya. Check your connection and try again."
- **Invite someone**

### Streak rules

- Title: "Streak rules"
- Lead: "How the family streak, freezes and breaks work. The same rules everyone saw when they joined."

Section 3, "Rules list" (`src/data/streakRules.ts`), shown in onboarding and
Settings, each with a short name above it:

1. One streak: "One streak for the whole family. It starts when the second person joins."
2. Your part: "Each of you does 3 sessions a week, 10 minutes or more. Two in one day counts once."
3. The week: "The week runs Monday to Sunday, in your own time zone."
4. One freeze: "Everyone has one freeze. Miss a week and it's used for you. It comes back after 4 weeks."
5. Breaks: "Going away? Take a break. A break of 4 days or more in a week means that week doesn't count against you."
6. Together: "Sat together? One of you logs it for everyone."
7. No rankings: "Nobody is ranked, and a missed week is never pinned on anyone."

### Notifications

- Title: "Notifications"
- Lead: "Sessions, cheers, comments and nudges from your family come as notifications. These are the ones you choose."
- Turned off in iOS: "Notifications are off for Saunafam." "Nothing from your family reaches you, reminders included. Turn them on in the Settings app." **Open Settings**
- Never asked: "Saunafam hasn't asked yet." "Turn them on to hear when someone has a sauna, cheers you on or joins." **Turn on notifications**
- "Reminders": switch "Remind me if I'm behind", then "Days" and "Time" as in onboarding, and "Thu and Sat at 6:30 PM, if your week isn't kept yet."
- Reminders off: "No reminders. Turn this on to pick days and a time."
- "From your family": switch "Weekend check-in", "Saturday evening, who could use a cheer"
- Under it: "Sent once, on Saturday between 5 and 6 PM, if you've kept your week and someone else can still make theirs. It never says who missed."
- Error: "Couldn't change that. Check your connection and try again."

### Apple Health

- Title: "Apple Health"
- Lead: "Saunafam can save each session to Apple Health as mindful minutes. It never reads anything from Health."
- Switch: "Save sessions to Apple Health"
- Small caps "Status", then one of:
  - "Off. Nothing goes to Apple Health."
  - "On. Each session you save goes into Health as mindful minutes, starting when it started."
  - "Health isn't letting Saunafam save. Open the Health app, tap your picture, then Apps, Saunafam, and turn on Mindful Minutes." **Open the Health app**
  - "Apple Health isn't on this device."
  - Until M11 wires the write: "On. This test build can't write to Health yet, so nothing has gone there."
- "Only the minutes in the heat, from the time you started. No calories, no heart rate."
- "Used Arro before? iOS may still list its old permission to read your workouts. Saunafam never reads them, and you can remove it in Settings, Health, Data Access & Devices."

### The wall

- Title: "The wall"
- Lead: "The wood your family's weeks are built from. Everyone in Sunday sauna sees the same wall."
- Small caps "Wall wood": "Birch" ("Free, always"), "Cedar", "Alder", "Charred pine" ("Tap to try it on", or "Included with Plus" when the family has it)
- Trying one on: "Trying it on. Nothing is saved." **Keep this wood with Plus**, plain text **Back to birch**
- Saved: "Saved. Sunday sauna has a cedar wall now."
- Error: "Couldn't change the wall. Check your connection and try again."

### About

- Title: "About"
- The stone and the wordmark, "A weekly sauna streak for the people you sauna with."
- Rows: **Version** "1.0.0 (9)", **saunafam.com**, **Privacy**, **Email support** "support@saunafam.com"
- "Made by one person, Bryce. Sessions, photos and cheers stay inside your family. No ads, ever."

### Sign out, Delete account

- Sign out sheet: "Sign out?" "Your family and your streak stay. Sign in with Apple to come back." With a timer running it adds "The timer that's running now will be thrown away." With sessions not sent: "One session hasn't sent yet and will be lost." / "2 sessions haven't sent yet and will be lost." **Sign out**, **Cancel**
- Delete sheet: "Delete your account?" "This deletes your account, every session you've logged and your photos. Your family keeps going without you. You can't undo it." **Delete account**, **Cancel**
- Plus payer, said first in a tray: "You pay for Saunafam Plus. Deleting your account doesn't cancel it. Cancel in Settings, Apple ID, Subscriptions first." ("Paid tier", `delete-account`)
- Error: "Couldn't delete your account. It's still here. Check your connection and try again."
- Removed from the family by someone else: "You're no longer in Sunday sauna" "To join again, ask someone in the family for a new code." (M5)

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

- The share sheet sends the message with the link `https://saunafam.com/join/<code>` beside it, so iMessage shows the preview card.
- Join page on the site (not the app): "You're invited to a family on Saunafam"
- Screen title: "Invite someone" (a sheet). Lead: "Send them the message, or read them the code. Joining Sunday sauna takes about a minute."
- Panel: small caps "Your family's code", the code, "saunafam.com/join/SAUNA234", then "It goes in the message with a link. They tap "I have an invite" in Saunafam and type the code in. Codes last 14 days."
- Field: "Who's it for? (optional)", placeholder "Maya", hint "They'll show as invited until they join."
- No share sheet (web preview): "There's no share sheet here. Send this yourself:" and the message with the link.
- **Send invite**, or **Done**

## "Arro is now Saunafam" sheet

Section 7. Shown once, keyed by `saunafam.welcomed.v1`, after the splash and
after Today has settled in.

- Title: "Arro is now Saunafam"
- Body: "Your family is still here. We've moved from daily movement to a weekly sauna streak: 3 sessions a week each, 10 minutes or more. Everyone starts fresh at week one." (The goal and minimum follow the family's rules; every family starts at 3 and 10.)
- **Got it**
- Founder only, plain text: **Change the rhythm** (opens Family rules)

## Update required

Section 4, "app_config". When the app's build is below `min_ios_build`, the
only screen:

- Title: "Time to update"
- Body: "A new version of Saunafam is ready. Update in TestFlight or the App Store."
- **Open TestFlight**, plain text **Open the App Store**

## Errors and empty states

- Release build without Supabase settings: title "This build can't reach Saunafam", body "It was made without the server settings, so nothing you log would reach your family. Delete it and install the latest build from TestFlight." **Open TestFlight** (section 6, `App.tsx`)
- Log refused by the server: "Couldn't save this one. Tap to fix it"
- Shared session duplicate: "Jo already logged this one"
- Solo family: "Your family streak starts when someone joins"
- Expired or wrong invite code: "That code has expired or doesn't exist." (Join code); after sign-in, with "Ask them for a new code." (Meet the family)
- _to write: offline, server error, removed session, and every empty state (spec, Definition of done, "Every screen, in every state")_

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
- A week before a yearly plan lapses after the payer left (others): "Plus ends on Oct 27. The wall goes back to birch then, and everything you logged stays."
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
- Settings, dev builds only: "Prototype preview" (each scenario, "On" for the one showing, and "My family"), "Preview App Store" (what the fake store does next, "Next"), "Design" with **Design sheet**.
- Update screen in the preview only: **Leave the preview**.
