# Saunafam screenshots

One line per screen and state. iPhone 17 Pro or iPhone 17 Simulator (both 6.3 inch, 1206 x 2622), the
preview family "Sunday sauna" on its own clock (Thursday 4:10 PM, Monday 8:10 AM
for the Monday state), status bar pinned to 4:10. Each milestone adds its own
section.

## Main screens (M9)

Captured with the dev-only capture driver (`src/dev/DevDriver.tsx`, Metro with
`EXPO_PUBLIC_DEV_DRIVER=1`). Scenario names are from `src/data/preview.ts`.

### Today

- `today-family.png`: Today, the family: greeting, the This week hero (8 weeks together, Week 9 slat with 2 of 3 dots), Start a session, Log one I already did, Log yesterday's
- `today-family-list.png`: Today, the family list: latest sessions, mini dots, Kept in moss, the Apple Health offer under it. Retaken after the screenshot fixes: a shared session reads "Yesterday · 25 min" over "with Maya and Jo" (9:41 status bar)
- `today-text-xxxl-family-list.png`: the family list at the largest standard text size (XXXL, below the accessibility sizes): every row on two lines, nothing cut off
- `today-health-offer.png`: Today, the one-time "Save sessions to Apple Health?" card with Turn on and Not now
- `today-solo.png`: Today, solo founder: "Your family streak starts when someone joins" with Invite someone
- `today-new-family.png`: Today, a family in its first week: "Your first week together", nothing logged
- `today-broken-streak.png`: Today, after a broken streak: "7 weeks together this year" and the Back at it, together card
- `today-on-break.png`: Today, Jo on a break: "On a break until Saturday", no nudge
- `today-monday.png`: Today, Monday morning, last week not kept: "Did you sauna on Sunday? Log it"
- `today-timer-running.png`: Today with a timer running: the dark "In the heat · 12:05" bar (placeholder until M8)
- `today-offline.png`: Today offline with one session waiting in the outbox, counted on your slat
- `today-draft.png`: Today with a refused draft: "Couldn't save this one / Tap to fix it"
- `today-loading.png`: Today loading with nothing cached: fixed-size placeholders, no spinner
- `today-error.png`: Today, couldn't load with nothing cached: Try again
- `today-last-one.png`: Today before the save that keeps the family's week (Maya and Jo kept, you on 2 of 3)
- `today-week-kept.png`: Today after that save: the slat filled with ember, "Week kept, together"
- `today-dynamic-type.png`, `today-dynamic-type-2.png`, `today-dynamic-type-3.png`: Today at the largest accessibility text size (AX5), top, middle and family list (`-3` retaken after the row change; `-2` retaken on 21 October with the row's icon above "Log yesterday's", which no longer breaks inside the word)

### Week

- `week-family.png`: Week: the wall (a freeze in lake), 8 weeks together, Longest and This year, This week rows with your Mon to Sun strip
- `week-family-past.png`: Week, Past weeks: "Week of Sep 14 / Kept, a freeze was used", Streak rules
- `week-past-week.png`: a past week opened: who went and on which days, "Not kept" for someone else's miss
- `week-new-family.png`: Week, first week: "Your first week together", no past weeks yet
- `week-broken-streak.png`: Week after a broken streak: open slats in the wall, 0 weeks together, Longest 7
- `week-on-break.png`: Week with Jo on a break
- `week-sunday-start.png`: Week for a Sunday-start family: the strip starts on S
- `week-plus-enabled.png`: Week with plus_enabled: See every week, Print the wall, and the one quiet Plus card
- `week-plus-cedar.png`: Week with Plus from Maya: the cedar wall
- `week-offline.png`: Week offline: "This is the wall as it was last time"
- `week-loading.png`: Week loading: wall and rows placeholders
- `week-error.png`: Week, couldn't load

### Feed

- `feed-family.png`: Feed, this week: Maya's card with a lake snowflake and note, the shared session as one card with comments
- `feed-family-more.png`: Feed, more cards: a short session, your own with "No cheers yet"
- `feed-last-week.png`: Feed, Last week
- `feed-cheered.png`: Feed after cheering Maya: filled heart, "Cheered", "You and Jo cheered"
- `feed-empty.png`: Feed empty: "Quiet so far" with Log a session
- `feed-offline-pending.png`: Feed offline with your session waiting to send
- `feed-loading.png`: Feed loading: two card placeholders
- `feed-error.png`: Feed, couldn't load

### Session detail

- `session-shared.png`: a shared session you're in: comments, quick replies "Felt great" and "Needed that", Remove me from this session
- `session-other.png`: someone else's session: Cheer Maya on, quick replies with Cold plunge hero
- `session-mine.png`: your own session: Edit, Delete session
- `session-edit.png`: Edit session: minutes, type tiles, cold plunge, place, note, photo
- `session-reply.png`: Reply: the comment field docked above the keyboard
- `session-pending.png`: a session still waiting to send: no cheers or comments yet
- `session-removed.png`: a removed or deleted session: "This session isn't here anymore"

### Me

- `me-family.png`: Me: name, family, Edit profile, the gear, the 2 x 2 grid, favorite type and place
- `me-badges.png`: Me, your last three sessions and badges (4 and 8 earned)
- `me-plus-rows.png`: Me with plus_enabled: Heat log, Timer face, App icon
- `me-new-family.png`: Me with nothing logged yet
- `me-loading.png`: Me loading: number placeholders

### Milestone

- `milestone-family.png`: the 8-week family milestone, wall built, number in, steam behind it
- `milestone-personal-26.png`: a 26-week personal milestone (from a badge): two columns of 13
- `milestone-family-52.png`: a 52-week milestone: four columns of 13
- `milestone-share-sheet.png`: Share: the iOS share sheet with the image
- `milestone-share-image.png`: the shared image itself, 1080 x 1350 (8 weeks)
- `milestone-share-image-52.png`: the shared image, 1080 x 1350 (52 weeks)

### Nudge

- `nudge.png`: the nudge sheet: "Cheer Jo on", Jo's dots, Send a nudge, Not now
- `nudge-sent.png`: after sending: "Sent. Jo will see it soon." and Done, same sheet height

## Onboarding and Settings

- `onboarding-founder-1-welcome.png`: Welcome, after the splash, the mark where the splash leaves it
- `onboarding-founder-2-sign-in.png`: Sign in, founder, preview sign-in (no server)
- `onboarding-founder-2-sign-in-apple.png`: Sign in with Apple's button (it can't finish in the simulator)
- `onboarding-sign-in-returning.png`: Welcome back, from "Already have an account? Sign in"
- `onboarding-founder-3-name-family.png`: Name your family, empty, a rotating placeholder
- `onboarding-founder-3-name-family-filled.png`: Name your family, filled
- `onboarding-founder-4-rhythm.png`: Your rhythm, defaults 3 a week and 10 minutes, Monday week
- `onboarding-founder-5-how-it-works.png`: How the streak works, the rules list
- `onboarding-founder-6-invite.png`: Invite your family, code and link
- `onboarding-founder-7-reminders.png`: Reminders, Thu and Sat at 6:30 PM
- `onboarding-founder-8-notifications.png`: Notifications ask
- `onboarding-invitee-1-join-code-empty.png`: Join code, empty
- `onboarding-invitee-1-join-code.png`: Join code, filled
- `onboarding-invitee-2-invited.png`: You're invited
- `onboarding-invitee-3-sign-in.png`: Sign in, invitee
- `onboarding-invitee-4-meet-family.png`: Meet the family: faces, who invited you, 8 weeks together, the rhythm
- `onboarding-join-code-expired.png`: Join code, an expired code: "That code has expired or doesn't exist."
- `onboarding-meet-family-expired.png`: Meet the family when the code expired before joining: "That code has expired or doesn't exist. Ask them for a new code." The preview family never fails, so the dev driver's `inviteExpired` event sets the same error a refused join does
- `onboarding-invitee-5-photo.png`: Photo
- `onboarding-invitee-6-how-it-works.png`: How it works, invitee
- `onboarding-invitee-7-reminders.png`: Reminders, invitee
- `onboarding-invitee-8-notifications.png`: Notifications ask, invitee
- `onboarding-dynamic-type-welcome.png`: Welcome at the largest Dynamic Type size
- `onboarding-dynamic-type-rhythm.png`: Your rhythm at the largest size, tiles in a 2 by 2 grid
- `onboarding-dynamic-type-reminders.png`: Reminders at the largest size, the day tiles wrapped
- `settings.png`: Settings, plus_enabled off (no Plus rows, no wall row)
- `settings-bottom.png`: Settings, Sign out and Delete account, then the dev-only Prototype preview
- `settings-plus-enabled.png`: Settings with plus_enabled, no Plus yet
- `settings-plus-active.png`: Settings with Plus from Maya, cedar wall
- `settings-dynamic-type.png`: Settings at the largest Dynamic Type size, values under titles
- `settings-family-rules-founder.png`: Family rules, founder, top
- `settings-family-rules-founder-tiles.png`: Family rules, founder, the tiles and Save for next week
- `settings-family-rules-saved.png`: Family rules after saving: "Starting Monday, Oct 26"
- `settings-family-rules-member.png`: Family rules, read only for everyone but the founder
- `settings-take-break.png`: Take a break, Rest of this week picked
- `settings-take-break-two-weeks.png`: Take a break, Two weeks picked
- `settings-on-break-row.png`: Settings while on a break, "Until Wednesday"
- `settings-take-break-on-break.png`: On a break, "I'm back, end it now"
- `settings-take-break-end-confirm.png`: End your break? confirm
- `settings-dynamic-type-take-break.png`: Take a break at the largest Dynamic Type size
- `settings-notifications.png`: Notifications, not asked yet, reminders on
- `settings-notifications-weekend.png`: Notifications, scrolled: Weekend check-in
- `settings-notifications-off.png`: Notifications, reminders off
- `settings-apple-health.png`: Apple Health, off
- `settings-apple-health-on.png`: Apple Health, on (before M11 wires the write)
- `settings-family-members.png`: Family members, founder
- `settings-family-members-remove.png`: Remove Maya? confirm
- `family-members-dynamic-type.png`: Family members at AX5, each avatar above the name
- `settings-streak-rules.png`: Streak rules, a Sunday-start family
- `settings-wall-plus-enabled.png`: The wall, plus_enabled, birch, locked woods
- `settings-wall-try-on.png`: The wall, trying on cedar, "Keep this wood with Plus"
- `settings-wall-plus-active.png`: The wall with Plus, cedar
- `settings-about.png`: About
- `settings-edit-profile.png`: Edit profile
- `settings-sign-out-timer-running.png`: Sign out? with a timer running
- `settings-delete-account.png`: Delete your account?
- `settings-delete-account-plus-payer.png`: Delete your account? with the Plus payer warning
- `invite.png`: Invite someone, code, link and name field
- `sheet-renamed-founder.png`: "Arro is now Saunafam", founder (Got it, Change the rhythm)
- `sheet-renamed-member.png`: "Arro is now Saunafam", everyone else (Got it)
- `update.png`: Update required (dev-only "Leave the preview" shows under it in the preview)
- `cant-reach.png`: This build can't reach Saunafam

## Native features (M11, iPhone 17 Pro simulator, iOS 26.2, Debug build)

- `health-permission-sheet.png`: iOS's Health sheet after Turn on: write only, Mindful Minutes, the new explanation, no read section
- `health-settings-on.png`: Settings, Apple Health, on and allowed
- `health-mindful-minutes-written.png`: the Health app, Mental Wellbeing: 35 mindful minutes written by two test sessions (15 and 20 min)
- `notification-timer-target.png`: the timer's target notification, "15 minutes in. Time to cool off.", over Settings
- `notification-tap-timer.png`: tapping it opens the timer room
- `notification-reminder.png`: a weekly reminder, "2 to go this week" / "Ten minutes counts. Your family will see it."
- `notification-tap-session.png`, `notification-tap-shared.png`, `notification-tap-cheer.png`, `notification-tap-comment.png`, `notification-tap-nudge.png`, `notification-tap-weekend.png`, `notification-tap-joined.png`: where each push lands when tapped (simctl push with the server's payloads)
- `camera-permission.png`: the camera permission prompt, from Take a photo
- `camera-open.png`: the camera open (the simulator has no camera feed, so nothing can be taken)


## Saunafam Plus (M15, iPhone 17 simulator, Debug build, Plus switched on in the preview)

Captured with the capture driver (`EXPO_PUBLIC_DEV_DRIVER_URL` pointed at a
driver of its own) and `PreviewPurchases`, so every sheet shows "Preview, no
real purchase". Scenarios: `plusEnabled` (Plus on, the family doesn't have it,
the quiet card due), `plusMine` (you pay yearly), `plusFounding` (Founding
family, 40 weeks), `plusActive` (Plus, from Maya), `plusLapsed` (ended Oct 5).
The sheet shots are scrolled to the part that changes; `plus-16-preview-label.png`
and `plus-08-success-wall.png` show the top.

### The Plus sheet, all 16 states

- `plus-01-loading.png`: 1. Loading prices: skeleton tiles and button, the tip rows as skeletons too
- `plus-02-unavailable.png`: 2. Prices failed or offline: "Can't reach the App Store right now", Try again
- `plus-03-ready-yearly.png`: 3. Ready, yearly picked: the yearly tile in ember, "Get Plus for $24.99 a year", Not now, the small print, Restore purchases, Terms, Privacy
- `plus-04-ready-founding.png`: 4. Ready, Founding family picked: "Get Plus for $59.99 once", "One payment. No renewal."
- `plus-05-purchasing.png`: 5. Purchasing: "Waiting for the App Store" with the waiting dots; the close mark still works
- `plus-06-pending.png`: 6. Pending, Ask to Buy: "Waiting for approval", Done
- `plus-07-finishing.png`: 7. Finishing up: bought, waiting for the server
- `plus-08-success.png`: 8. Success: "Thank you. The wall is yours." (`plus-08-success-wall.png`: the wall at the top after it re-grained)
- `plus-09-cancelled.png`: 9. Cancelled by the user: back to ready, no message
- `plus-10-failed.png`: 10. Failed: "The purchase didn't go through. You haven't been charged." and Try again
- `plus-11-owned-by-me.png`: 11. The family has Plus and you pay yearly: "Renews on May 24.", Manage, Make it Founding family
- `plus-11-owned-by-me-founding.png`: 11. The same for a Founding family: "Plus is yours for good"
- `plus-12-owned-by-other.png`: 12. Plus from someone else: "Plus, from Maya. Thank you."
- `plus-13-restoring.png`: 13. Restoring: the link reads "Restoring..."
- `plus-14-restore-nothing.png`: 14. Restore found nothing: "No purchases found for this Apple ID."
- `plus-15-lapsed.png`: 15. Lapsed: "Plus ended on Oct 5. The wall is back to birch..." over the price tiles
- `plus-16-preview-label.png`: 16. Preview mode: "Preview, no real purchase" at the top, the wall in cedar with the four woods
- `plus-focus-heat-log.png`: opened from the Heat log: that feature row highlighted with its line
- `plus-tips.png`, `plus-tips-thanks.png`: the tip jar rows (A ladle, A bucket, An armful of birch), and after a tip

### Largest text size

At AX5, the largest accessibility size (iPhone 17 Pro, 9:41 status bar). From 1.35 times the text size the wall and its woods stack, the two prices stack full width, each tip's price goes under its name, and the Preview tag stops growing so it fits its header row.

- `plus-dynamic-type-top.png`: the top: the wall over its wood name and swatches, Saunafam Plus, the lead
- `plus-dynamic-type-prices.png`: Yearly and Founding family stacked, Get Plus for $24.99 a year
- `plus-dynamic-type-failed.png`: a failed purchase: "The purchase didn't go through..." under the prices
- `plus-dynamic-type-owned.png`: your family has Plus and you pay: "Plus is on for Sunday sauna. You pay for it. Thank you.", Renews on May 24, Manage
- `plus-dynamic-type-lapsed.png`: lapsed: "Plus ended on Oct 5..." over the prices
- `plus-dynamic-type-tips.png`: the tip jar, each price under its name

### Try-on

- `plus-wall.png`: Settings, The wall, with the three Plus woods to try
- `plus-tryon-wood-cedar.png`, `plus-tryon-wood-charred-pine.png`: a wood tried on, "Keep this wood with Plus", Back to birch
- `plus-wall-with-plus.png`: The wall for a family with Plus (alder picked)
- `plus-timer-face.png`: Me, Timer face: Löyly picked, Coal and Brass to try
- `plus-tryon-face-coal.png`, `plus-tryon-face-brass.png`: a face tried on in the small room, "Keep this face with Plus"
- `plus-app-icon.png`: Me, App icon, on the try-on home screen
- `plus-tryon-icon-night.png`, `plus-tryon-icon-lake.png`: an icon tried on, "Keep this icon with Plus"

### With Plus

- `plus-timer-coal.png`: the timer room with the Coal face, 12:43 of 15
- `plus-timer-brass.png`: the timer room with the Brass face
- `plus-every-week.png`: Every week: 40 weeks month by month in the family's wood
- `plus-heat-log.png`, `plus-heat-log-2.png`: the Heat log: hours by month, best run, sessions by type, where, longest session by person (alphabetical)
- `plus-heat-log-locked.png`: the Heat log without Plus: a blurred example and the way to the sheet
- `plus-poster.png`: the wall poster (40 weeks, the Founding family nail on the first slat), Save or print
- `plus-week-founding.png`, `plus-week-founding-rows.png`: Week for a Founding family: the brass nail on the bottom slat; See every week and Print the wall without the "Plus" marks

### Quiet card, Settings and Me

- `plus-quiet-card.png`: the one unprompted ask, at the bottom of Week: See Plus, Not now, Don't show this again
- `plus-settings.png`: Settings with Plus switched on: The wall row, Saunafam Plus, Restore purchases, Leave a tip
- `plus-settings-from-maya.png`: the Saunafam Plus row reads "Plus, from Maya"
- `plus-settings-lapsed.png`: the quiet line after a plan ends
- `plus-me-rows.png`, `plus-me-rows-plus.png`: Me's Heat log, Timer face and App icon rows, without and with Plus

## Self-review: every screen on the merged build (M16)

In `review/`. One Debug simulator build of the merged app (iPhone 17 Pro, iOS
26.5, 1206 x 2622), the preview family on its own clock, status bar 9:41 with
the battery discharging at 100, no dev menu or Tools button. Captured through
the dev driver, no taps. Scenario `family` unless noted.

- `01-welcome.png`: Welcome, the mark where the splash leaves it, Start a family, I have an invite, Sign in
- `onboarding-join-code.png`: Enter your code (preview code filled)
- `onboarding-invite-preview.png`: You're invited, Sunday sauna, 3 people
- `onboarding-sign-in.png`: Sign in, first name empty, Continue waiting
- `onboarding-name-family.png`: Name your family, empty, Continue waiting
- `onboarding-rhythm.png`: Your rhythm, 3 a week, 10 minutes, week starts on Sunday off
- `onboarding-meet-family.png`: Meet Sunday sauna, Maya and Jo, 8 weeks together
- `onboarding-photo.png`: Add a photo, Choose a photo, Skip for now
- `onboarding-how-it-works.png`: How the streak works, the rules list
- `onboarding-invite.png`: Invite your family, the code and link, Who's it for?
- `onboarding-reminders.png`: Remind me if I'm behind, Thu and Sat at 6:30 PM
- `onboarding-notifications.png`: Hear from your family?, Turn on notifications, Not now
- `02-today.png`: Today, 8 weeks together, Week 9 slat at 2 of 3, Start a session, the family list (retaken after the row change; same file as `docs/saunafam/review/2-today.png`)
- `03-week.png`: Week, the wall with Maya's freeze, this week's days, the family
- `04-feed.png`: Feed, Maya's session and the shared one with cheers and comments
- `05-me.png`: Me, your numbers, favorite type and place, your last sessions
- `06-timer.png`: The timer room 12:43 into a 15 minute traditional round
- `07-log-session.png`: Log a session over Today, Today under the scrim
- `08-session-detail.png`: The shared session with comments and quick replies
- `09-edit-session.png`: Edit session, minutes, type, cold plunge, place, note
- `10-nudge.png`: Cheer Jo on, over Today under the scrim
- `11-past-week.png`: Week of Oct 12, over Week under the scrim
- `12-milestone.png`: The 12-week milestone, wall built, number and steam
- `13-settings.png`: Settings
- `14-family-rules.png`: Family rules, as the founder
- `15-take-break.png`: Take a break, the three lengths
- `16-family-members.png`: Family members, Sam, Maya and Jo
- `17-streak-rules.png`: Streak rules
- `18-notifications.png`: Notifications, not asked yet, reminders off, Weekend check-in on
- `19-apple-health.png`: Apple Health, off
- `20-about.png`: About, version 1.0.0 (9)
- `21-invite.png`: Invite someone, the code and Send invite
- `22-edit-profile.png`: Edit profile, name and photo
- `23-plus-sheet.png`: The Plus sheet over Today, preview tag (`plusEnabled`)
- `24-wall.png`: The wall, birch picked, Plus woods to try on (`plusEnabled`)
- `25-timer-face.png`: Timer face, Löyly picked (`plusEnabled`)
- `26-app-icon.png`: App icon, Löyly picked (`plusEnabled`)
- `27-every-week.png`: Every week, the whole wall by month (`plusEnabled`)
- `28-heat-log.png`: Heat log without Plus, the blurred example (`plusEnabled`)
- `29-poster.png`: The wall poster (`plusEnabled`)
- `30-update-required.png`: Time to update (`updateRequired`; the dev-only Leave the preview shows under it)
- `31-cant-reach.png`: This build can't reach Saunafam (the release-only screen, opened by its dev route)
