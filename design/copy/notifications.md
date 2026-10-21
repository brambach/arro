# Saunafam notifications

Every push and local notification in build 9, with its exact words. The server
pushes below are what `supabase/tests/database/saunafam_push.test.sql` asserts,
so change both together. Names are examples (Sam, Maya and Jo in "Sunday
sauna").

Server pushes use a typographic apostrophe (’), like Arro's did.

## Server pushes

All of them only go out between 07:00 and 21:00 in the recipient's own time
zone. Outside that window the session, cheer, comment or nudge is still saved
and shows in the app. Only the push is skipped, it isn't held for the morning.

| Kind | Who gets it | Title | Body |
|---|---|---|---|
| `session` | family members who weren't in the session | Maya had a sauna | Send a cheer. |
| `session`, shared | the same, for a session of 2 to 4 | Maya, Jo and Sam had a sauna together | Send a cheer. |
| `shared` | everyone the logger added | Maya logged a sauna with you | It counts toward your week. |
| `shared`, short session | the same, when the session is under the family minimum | Maya logged a sauna with you | Tap to see it. |
| `session_cheer` | everyone in the session except the cheerer | Jo cheered you on | For your sauna. |
| `session_comment` | everyone in the session except the commenter | Jo on your sauna | the comment, trimmed |
| `nudge` | the person nudged | Sam is cheering you on | There’s still time this week. |
| `weekend` | people who've kept this week | Maya still has this week | A cheer from you might help. |
| `joined` | everyone already in the family | Jo joined Sunday sauna | You’ll see them on Today from now on. |

How names are joined:

- A shared session lists the logger first, then the others in the order they
  joined the family: "Maya and Jo", "Maya, Jo and Sam", "Maya, Jo, Sam and Ana".
- The weekend title names two people at most: "Maya still has this week",
  "Maya and Jo still have this week", "Maya, Jo and 1 other still have this
  week", "Maya, Jo and 2 others still have this week".

Limits:

- `session`: only the mover's first session of their own day, and not for a
  session logged for yesterday or one under the family minimum.
- `shared`: the spec gives one body, "It counts toward your week." That isn't
  true for a session under the minimum, so those get "Tap to see it." instead.
  👁 Bryce should check this line.
- `session_cheer`: once per session, cheerer and person. Taking a cheer back
  and giving it again doesn't push twice.
- `nudge`: one nudge a day per person (the existing rule, it's refused), and
  at most 2 nudge pushes a week in the person's own week. Never while they're
  on a break. A third nudge in a week is still saved, it just doesn't push.
- `weekend`: Saturday 17:00 to 18:00 in the recipient's zone, once a week,
  only if their "Weekend check-in" switch is on (`members.weekend_checkin`).
  It names only people who haven't kept the week, aren't on a break today,
  aren't in their first week, and can still make it. Nobody to name, no push.

What a tap opens (the `data` payload is in `docs/saunafam/API.md`):

| Kind | Opens |
|---|---|
| `session`, `shared`, `session_cheer`, `session_comment` | SessionDetail for `data.sessionId` |
| `nudge` | Nudge |
| `weekend` | the Week tab |
| `joined` | Family members (unchanged from Arro) |

Arro's old pushes ("Dad went for a run", "Mum cheered you on" for a workout,
comments on workouts, and the evening "still has today") are switched off in
build 9.

## Local notifications

Scheduled on the phone by the app. The server doesn't send these. The app
agent wires them; this is the copy from the spec.

### Timer

| When | Title | Body |
|---|---|---|
| At the target time | 15 minutes in. Time to cool off. | |
| At 45 minutes of continuous heat | Still in there? Time for water and fresh air. | |

- The target line uses the timer's target minutes: "10 minutes in.", "20
  minutes in." and so on.
- Both are scheduled when the timer starts and cancelled when it finishes.

### Weekly reminder

| Title | Body |
|---|---|
| 2 to go this week | Ten minutes counts. Your family will see it. |

- The title counts the sessions still needed: "1 to go this week", "2 to go
  this week".
- The body uses the family minimum in words: "Ten minutes counts.", "Fifteen
  minutes counts."
- Sent on the days and at the time the person picked, only while their week
  isn't kept. Scheduled 4 weeks ahead and rebuilt on every refresh.
- Identifier prefix: `saunafam-reminder-`.

### Legacy cleanup

On the first launch of build 9, cancel every pending notification whose
identifier starts with `arro-`. Otherwise Arro's "You still have today"
reminders keep firing.
