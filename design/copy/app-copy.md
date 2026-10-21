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

Section 3, "Today". Most of these lines are built in `src/state/buildView.ts` (`COPY`, `view.today`), so they're tested there.

- Header: the date in small caps ("THURSDAY, OCTOBER 22") and "Good morning, Sam" (before noon), "Good afternoon, Sam" (to 6 PM), "Good evening, Sam". No period.
- This week card: "2 of 3 this week", or "Kept this week" once you've kept it
- Small caps on your slat: "Week 9" (the week the family streak is building)
- Family line (names progress only): "Maya and Jo have kept this week. Sam's on 1."
- Family streak: "**8** weeks together", "**1** week together"
- A family in its first week, in place of a big 0: "Your first week together"
- **Start a session**
- Plain text under it: **Log one I already did**
- Forgot one: "Log yesterday's", with "Forgot one? It still counts" under it
- Monday, last week not kept: "Did you sauna on Sunday? Log it", with "It still counts toward last week" under it
- A refused draft: "Couldn't save this one", with "Tap to fix it" under it
- Family list statuses: "Kept", "2 of 3", "On a break until Friday", "Invited"
- Family list second line, their latest session this week: "Tonight · 20 min · 85°C", "Yesterday · 18 min with Jo", "Tuesday · 15 min · The Y"; someone invited: "Hasn't joined yet"
- Solo founder: "Your family streak starts when someone joins", with **Invite someone**
- After a broken streak: "**7** weeks together this year", and the card "Back at it, together" / "A new streak starts this week. Every session counts toward it."
- Timer running bar: "In the heat · 12:04"
- After saving, when the family's week is complete: "Week kept, together" (section 2, "Saving a session")
- Apple Health card, once, after the first saved session: "Save sessions to Apple Health?" / "Your heat minutes go into Health as Mindful Minutes. Saunafam never reads anything from Health." with **Turn on** and **Not now** (section 3, "Apple Health")
- Offline: "You're offline. Anything you log is saved here and sends when you're back." With sessions waiting: "You're offline. One session is saved here and will send when you're back." / "2 sessions are saved here and will send when you're back."
- Back online with sessions still going out: "One session is waiting to send." / "2 sessions are waiting to send."
- Loading (nothing cached yet): placeholders only, no words. VoiceOver: "Loading your family"
- Couldn't load (nothing cached): "Couldn't load your family" / "Check your connection and try again. Anything you log now is saved on this phone and sends later." with **Try again**
- VoiceOver on your avatar: "You, 2 of 3 this week", hint "Opens Me". On a row: "Cheer Maya on", "Opens Maya's latest session", "Opens your latest session", "Opens the invite"

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
- Sign out with a timer running: the Sign out sheet adds "The timer that's running now will be thrown away." (under Settings, "Sign out, Delete account")

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

- Shared title: "Maya, Jo and you had a sauna together" (you go last when someone else logged it); your own: "You had a sauna"
- Under the title: "Today · 6:21 PM · Lake cabin"
- Details line: "20 min · Traditional · 85°C · 3 rounds"; a plunge: "Cold plunge · 2 min"
- Cheer: **Cheer Maya on**, then "Cheered"; who cheered: "You and Jo cheered"; on your own with none yet: "No cheers yet"
- Comments, small caps: "Comments". None yet: "No comments yet. Say something nice."
- Quick replies on someone else's session: "Nice heat", "Jealous", "Save me a spot", "Cold plunge hero" (only with a plunge)
- Quick replies on your own: "Felt great", "Needed that"
- Comment field: "Add a comment", **Send**, a count of what's left from 40 characters out (200 in all)
- Delete a comment (long press): "Delete this comment?" with the comment quoted, **Delete**, **Cancel**
- Waiting to send: "Waiting to send. It goes as soon as you're back online."
- Logger: **Edit** (top right), **Delete session**; confirm "Delete this session?" / "It goes for everyone in it, with its cheers and comments." **Delete**, **Cancel**
- Someone else in it: **Remove me from this session**; confirm "Take yourself off this session?" / "It comes off your week. Everyone else keeps it." **Remove me**, **Cancel**
- Removed or deleted: "This session isn't here anymore" / "Whoever logged it may have deleted it, or you were taken off it. Your week is up to date." **Back**

### Edit session

- Title "Edit session", **Cancel**
- Under it: "Mon, Oct 19 · 7:00 AM. Changes show for everyone in it."
- Small caps: "Minutes", "Type", "Photo"; fields "Place" (example "Home"), "Note"; toggle "Cold plunge"
- VoiceOver on the stepper: "Fewer minutes", "More minutes"
- **Take a photo**, **Choose one** (**Choose another** once there is one), **Remove photo**
- **Save changes** (while saving: "Saving")
- Refused: "Couldn't save that: " and the server's reason, or "Couldn't save that. Try again."
- Gone while editing: "This session isn't here anymore" with **Close**

## Feed

Section 3, "Feed".

- Title "Feed"; small caps "This week", "Last week"
- Card title: "Maya had a sauna", or "Maya and Jo had a sauna together"
- Details: "20 min · Traditional · 85°C"
- Shared card: "Maya, Jo and you had a sauna together"
- **Cheer Maya on** / "Cheered", **Reply**
- More comments than shown: "1 more comment", "3 more comments"
- Empty: "Quiet so far" / "Sessions from this week and last show here, yours and everyone's. Log one and it's the first." with **Log a session**
- Offline: "You're offline. Cheers and comments wait until you're back."
- Couldn't load: "Couldn't load the feed" / "Check your connection and try again." with **Try again**
- Rolled back (from AppState): "Couldn't send that cheer. Try again." and the like, shown for a few seconds at the top

## Week

Section 3, "Week".

- Title: the family's name ("Sunday sauna")
- Beside the wall: "**8** weeks together", then "Longest" and "This year" under their numbers
- A family in its first week: "Your first week together"
- Small caps over the rows: "This week · 2 of 3 for you", "This week · kept"
- Past weeks, small caps "Past weeks"; each row "Week of Oct 5" with "Kept", "Kept, a freeze was used", "Kept, your freeze was used", "Not kept", "Everyone was on a break"
- No past weeks yet: "Your first week is on the wall. Once it closes, it shows here with everyone's days."
- A past week (sheet): the outcome in small caps, "Week of Sep 14", each person "Kept", "Not kept", "Your freeze covered it", "On a break", "First week", with their days ("Tue, Fri and Sun") or "No sessions that week"; gone from the 12: "This week isn't in the last 12 anymore."
- **See every week** and **Print the wall** (Plus, only when `plus_enabled`), each marked "Plus"
- **Streak rules** (plain text link)
- Offline: "You're offline. This is the wall as it was last time."
- Couldn't load: "Couldn't load the wall" / "Check your connection and try again." with **Try again**
- The Plus quiet card is below under "Saunafam Plus".

## Me

Section 3, "Me".

- Your name, your family's name, **Edit profile**, the gear (VoiceOver "Settings")
- Stat grid: "Weeks in a row", "Longest streak" ("8 weeks"), "Sessions this month", "Hours in the heat this year"
- Favorites: the type ("Traditional") over "Favorite type", the place ("Home") over "Favorite place"
- Small caps "Your last sessions"; none yet: "Your sessions show here once you've logged one."; loading: "Loading your sessions"; a row still going out: "Waiting to send"
- Small caps "Badges": 4, 8, 12, 26 and 52, each over "weeks". VoiceOver: "8 weeks, earned", "12 weeks, not yet"
- Plus rows (only when `plus_enabled`): **Heat log**, **Timer face**, **App icon**, each marked "Plus"

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
- iOS's Health sheet (`NSHealthUpdateUsageDescription` in `app.json`, write only; there's no read string): "Saunafam saves your sauna sessions to Apple Health as mindful minutes, if you turn it on. It never reads your Health data."
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

The push it sends is in `notifications.md`.

- Title: "Cheer Jo on"
- Line: "Jo's on 1 of 3 this week. A nudge says you're thinking of them."; for someone who has kept (opened from a nudge push, to cheer them back): "Maya has kept this week. A nudge says you're thinking of them."; otherwise "A nudge says you're thinking of Jo."
- **Send a nudge** (while sending: "Sending"; after: "Sent"), **Not now** (after: **Done**)
- Sent: "Sent. Jo will see it soon."
- Already nudged today: "Jo has already had a nudge today. Try again tomorrow."
- Failed: "Couldn't send it just now. Try again in a moment."
- Gone: "They're not in the family anymore."

## Milestone

Section 2, "Streak milestone". Milestones at 4, 8, 12, 26 and 52 weeks.

- Screenshot caption example: "12 weeks in the heat."
- Small caps: "Together" (family) or "Your streak" (personal)
- Family: "**8**", "weeks together", "Sunday sauna has kept 8 weeks in a row."
- Personal: "**26**", "weeks in a row", "Your own streak, week after week."
- **Share** (while the image renders: "Getting it ready"), **Done**
- The share image (1080 x 1350): the number, "weeks together", the family's name, "saunafam"
- Nothing due: "Nothing to celebrate just now" with **Close**

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
- Main screens (M9): each screen's offline, couldn't-load and empty lines are under Today, Week, Feed, Session detail and Me above. Loading never shows words, only placeholders the size of what's coming.

## Permissions

Section 6 (`app.json`) and section 3 ("Apple Health").

- Photos: "Saunafam uses a photo only when you pick one for your profile or a session. Your family sees it in Saunafam."
- Health write: "Saunafam saves your sauna sessions to Apple Health as mindful minutes, if you turn it on. It never reads your Health data."
- Camera: _to write_

## Saunafam Plus

Spec, "Paid tier". None of this shows while `app_config.plus_enabled` is
false. Never write "Only today", "Last chance", "X families joined this week",
"Unlock your streak", or anything that ties Plus to the streak, and no
confirmshaming. Prices always come from the store (the RevenueCat offering,
or `PreviewPurchases` in the preview); the prices below are the US ones, shown
only as examples. Source of truth: `PLUS_COPY` in `src/state/plusFlow.ts`,
`PLUS_CARD_COPY` in `src/state/plus.ts`, and the `*_COPY` objects at the top
of each Plus screen.

### Plus sheet

- Small caps tag, preview only: "Preview, no real purchase"
- The wall at the top, in the wood picked, with its name in small caps ("Cedar"); four wood swatches, each read out by name
- Title: "Saunafam Plus"
- Lead: "The streak is free, for everyone, for good. Plus is for families who'd like a little more from the wall."
- Covers: "One purchase covers everyone in Sunday sauna. Nobody else pays."
- List: "Cedar, alder and charred pine walls", "Coal and Brass timer faces", "New app icons", "Every week you've kept", "Your family's heat log", "A poster of your wall"
- Opened from one of them, that row says a little more:
  - woods: "Pick the wood once and everyone's wall changes."
  - timer faces: "Each person picks their own."
  - app icons: "Night stone, Cedar and Lake."
  - every week: "History back to your first week, not just the last 12."
  - heat log: "Hours by month, where and how you sauna, your best run."
  - poster: "Every week with your family's name, ready to print."
- Price tiles: "Yearly" / "$24.99 a year", "Founding family" / "$59.99 once"
- Button: "Get Plus for $24.99 a year", or "Get Plus for $59.99 once" (follows the tile)
- **Not now** (plain text, closes the sheet)
- Small print, yearly: "Renews every year until you cancel. Cancel anytime in Settings, Apple ID, Subscriptions."
- Small print, Founding family: "One payment. No renewal."
- Links: **Restore purchases**, **Terms**, **Privacy**
- Sign-off: "Saunafam is made by one person. Plus helps keep the heat on. Thank you. Bryce"
- Close mark: "Close" (VoiceOver)

### Plus sheet states

Every state in "Every state of the Plus sheet", in the order the spec lists
them. Screenshots: `design/screenshots/saunafam/plus-01-*.png` to `plus-16-*.png`.

| # | State | Copy |
|---|---|---|
| 1 | Loading prices | skeleton tiles and a skeleton button, no text (VoiceOver: "Loading prices") |
| 2 | Prices failed or offline | "Can't reach the App Store right now" / "Everything else in Saunafam works as normal." / **Try again** |
| 3 | Ready, yearly picked | the sheet above, "Get Plus for $24.99 a year" |
| 4 | Ready, Founding family picked | "Get Plus for $59.99 once", "One payment. No renewal." |
| 5 | Purchasing | button: "Waiting for the App Store" with three dots lighting in turn; the sheet can still be closed |
| 6 | Pending (Ask to Buy) | "Waiting for approval" / "Someone in your Apple family needs to approve this. Plus turns on for everyone once they do." / **Done** |
| 7 | Finishing up | button: "Finishing up..." with the dots. After 20 seconds: "Still finishing up. Plus turns on for everyone as soon as Apple confirms it, so you can close this." |
| 8 | Success | "Thank you. The wall is yours." / "Everyone in Sunday sauna has Plus now." / **Done**. After Founding family over yearly: "Founding family replaces your yearly plan. Cancel the yearly one in Settings, Apple ID, Subscriptions, so it doesn't renew." |
| 9 | Cancelled by the user | back to ready, no message |
| 10 | Failed | "The purchase didn't go through. You haven't been charged." / **Try again**. Offline: "Couldn't reach the App Store. You haven't been charged. Try again." Purchases off in Screen Time: "Purchases are turned off on this iPhone. You can allow them in Screen Time." |
| 11 | Family has Plus, you're the payer | yearly: "Plus is on for Sunday sauna. You pay for it. Thank you." / "Renews on May 24." (or "Ends on May 24. It won't renew.") / **Manage** / **Make it Founding family, $59.99 once**. Founding family: "Sunday sauna is a Founding family. Plus is yours for good. Thank you." |
| 12 | Family has Plus from someone else | "Plus, from Maya. Thank you." (payer left: "Sunday sauna has Plus. Thank you.") |
| 13 | Restoring | the link reads "Restoring..." |
| 14 | Restore found nothing | "No purchases found for this Apple ID." |
| 15 | Lapsed | "Plus ended on Oct 3. The wall is back to birch. Everything you logged is still here." (no date: "Plus has ended. The wall is back to birch. Everything you logged is still here.") |
| 16 | Preview mode | "Preview, no real purchase" |
| | Two payers | "Your family already had Plus. You can cancel yours in Settings, Apple ID, Subscriptions, and ask Apple for a refund at reportaproblem.apple.com." / **Done** |

### Restore purchases

On the sheet and in Settings, under Saunafam Plus.

- While it runs: "Restoring..."
- "Plus restored for Sunday sauna."
- "No purchases found for this Apple ID."
- "Couldn't reach the App Store. Try again."
- Settings, when the family already had Plus from someone else: "Your family already had Plus, so nothing changed."

### Try-on

Nothing is saved while trying on. Buying from a try-on keeps what was tried.

- The wall: "Tap to try it on", "Trying it on. Nothing is saved.", **Keep this wood with Plus**, plain text **Back to birch**
- Timer face (Me): title "Timer face", lead "How the timer looks for you. Everyone picks their own.", small caps "Faces"
  - "Löyly": "Ember dots on char. Free, always"
  - "Coal": "A glowing ring on soot"
  - "Brass": "A brass clock in the dark room"
  - each Plus face adds ". Tap to try it on" (or ". Included with Plus")
  - "Trying it on. Nothing is saved.", **Keep this face with Plus**, **Back to Löyly**
  - Saved: "Saved. Your timer is Coal now."
  - The small room: "In the heat · Round 1", "12:40", "Traditional · 15 min"
- App icon (Me): title "App icon", lead "The icon on your home screen. Everyone picks their own.", small caps "Icons"
  - "Löyly": "The warm stone. Free, always"
  - "Night stone": "The stone after dark"
  - "Cedar": "The stone on cedar boards"
  - "Lake": "The stone by cold water"
  - "Trying it on. Nothing is saved.", **Keep this icon with Plus**, **Back to Löyly**
  - Saved: "Your icon is Lake now. iOS will say so too."
  - A build without the native module: "This build can't change the icon. It will once it's updated."
  - The try-on home screen shows the icon with "Saunafam" under it

### Quiet card on Week

- "Eight weeks of heat, together. Saunafam is free and always will be. If you'd like to make the wall your own, there's Plus."
- **See Plus**
- **Not now** (plain text)
- "Don't show this again"
- At most once every 60 days per person, 3 times ever, never again after "Don't show this again". Never after a missed week, on a break, next to a milestone, for a family that has Plus, or in anyone's first 4 weeks.

### Week and Me rows

- Week, under Past weeks: **See every week** and **Print the wall**, marked "Plus" until the family has it
- Me: **Heat log** (marked "Plus" until the family has it), **Timer face** and **App icon** (marked "Plus", or the name of your pick with Plus: "Löyly", "Coal", "Lake")

### Settings lines

- Group: "Saunafam Plus"; rows **Saunafam Plus** (value "Plus, from Maya", or "Plus" for the payer), **Restore purchases**, **Leave a tip**
- The wall row: "Birch", "Cedar", "Alder", "Charred pine"
- A plan ends: "Plus ended on Oct 3. The wall is back to birch. Everything you logged is still here."
- Apple can't renew (payer only): "Apple couldn't renew Plus. You can update your payment in Settings."
- A week before a yearly plan lapses after the payer left (others): "Plus ends on Oct 27. The wall goes back to birch then, and everything you logged stays."
- Delete account, the payer: "You pay for Saunafam Plus. Deleting your account doesn't cancel it. Cancel in Settings, Apple ID, Subscriptions first."

### Tip jar

At the bottom of the Plus sheet; **Leave a tip** in Settings opens the sheet there.

- Small caps: "Leave a tip"
- "A thank you, nothing more. Tips don't unlock anything."
- "A ladle" ($1.99), "A bucket" ($4.99), "An armful of birch" ($9.99). VoiceOver: "Tip a ladle, $1.99"
- After a tip: "Thank you. That means a lot."
- Ask to Buy: "Waiting for approval"
- Failed: "That tip didn't go through. You haven't been charged."

### Every week

- Title "Every week", lead "Sunday sauna's whole wall: 40 weeks since the first."
- Each month: "October 2026", "2 of 2 kept"; small caps "Weeks" over the list ("Week of Oct 5", "Kept")
- "Loading every week"; "Couldn't load every week. Check your connection and try again." **Try again**
- Empty: "Your first week is on the wall. Once it closes, it shows here."

### Heat log

- Title "Heat log", lead "Sunday sauna in the heat, together."
- "Hours in the heat", "132.9 hours this year", "The last 12 months" (bars, a letter per month)
- "Your best run", "40", "weeks in a row"
- "Sessions by type" ("Traditional 158")
- "Where" ("Gym sauna", "96 sessions"); none yet: "Add a place when you log, and it shows here."
- "Longest session", "Everyone's longest, in alphabetical order." ("Maya", "40 min", "Sep 12"; you read as "You")
- Empty: "Your heat log fills in as your family logs sessions."
- Failed: "Couldn't load the heat log. Check your connection and try again." **Try again**
- Without Plus, under the blurred example: "Your family's heat log comes with Plus" / "Hours by month, where and how you sauna, and your best run. These numbers are an example." / **See Plus** / "One purchase covers everyone in Sunday sauna. Nobody else pays."

### The wall poster

- Title "The wall poster", lead "Every week your family has kept, ready to print at 6 by 8 inches or bigger."
- **Save or print** (the share sheet has Save Image and Print); while it renders: "Getting it ready..."
- On the poster: the family name, "Jan 12, 2026 to Oct 18, 2026", "40 weeks kept, together", "saunafam"
- Errors: "Couldn't make the poster. Try again.", "Couldn't load your weeks. Check your connection and try again."
- Empty: "The poster fills in as weeks close. Your first one is still on the wall."

## Prototype preview (dev only)

- Sample family "Sunday sauna" with Sam, Maya and Jo (section 3, "Settings").
- Settings, dev builds only: "Prototype preview" (each scenario, "On" for the one showing, and "My family"), "Preview App Store" (what the fake store does next, "Next"), "Design" with **Design sheet**.
- Update screen in the preview only: **Leave the preview**.
