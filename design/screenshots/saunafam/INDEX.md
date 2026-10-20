# Saunafam screenshots

One line per screen and state. iPhone 17 Pro Simulator (1206 x 2622), the
preview family "Sunday sauna" on its own clock (Thursday 4:10 PM, Monday 8:10 AM
for the Monday state), status bar pinned to 4:10. Each milestone adds its own
section.

## Main screens (M9)

Captured with the dev-only capture driver (`src/dev/DevDriver.tsx`, Metro with
`EXPO_PUBLIC_DEV_DRIVER=1`). Scenario names are from `src/data/preview.ts`.

### Today

- `today-family.png`: Today, the family: greeting, the This week hero (8 weeks together, Week 9 slat with 2 of 3 dots), Start a session, Log one I already did, Log yesterday's
- `today-family-list.png`: Today, the family list: latest sessions, mini dots, Kept in moss, the Apple Health offer under it
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
- `today-dynamic-type.png`, `today-dynamic-type-2.png`, `today-dynamic-type-3.png`: Today at the largest accessibility text size (AX5), top, middle and family list

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
