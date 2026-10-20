# Review notes and demo family

For App Store Connect, the version's App Review Information, and for the
TestFlight Beta App Review (external testers need one, and it asks the same
questions). Build 9 renames the app and changes what it collects, so expect a
fresh Beta App Review.

Nothing here has been created on the server or entered in App Store Connect.

## The demo account problem

Sign in with Apple is still the only sign-in. There's no email and password to
give the reviewer, and a shared demo Apple ID doesn't work in practice (the
two-factor codes go to a device Bryce holds). So the "demo account" is **a
demo family full of sessions, plus a join code**. The reviewer taps "I have an
invite", enters the code, signs in with their own Apple ID and joins a family
with a weekly streak, sessions, cheers and comments.

In App Store Connect leave "Sign-in required" ticked. For username and password
write "Sign in with Apple, join code in the notes".

## What has to exist on the server (not created)

In the hosted project (`project_id = "arro"` in `supabase/config.toml`, still
named arro):

1. **Three demo users in `auth.users`,** because `members.user_id` must point
   at a real auth user. Create them with the Auth admin API or the dashboard,
   with an address like `demo-maya@saunafam.com` and no password. Nobody signs
   in as them.
2. **One family,** "Sunday sauna", time zone `America/Los_Angeles`, rhythm
   left at the defaults (3 a week, 10 minutes, week starts Monday). Set
   `saunafam_started_on` about five weeks back so the streak has history.
3. **Three `members` rows:** Sam, Maya and Jo, each with a color, the family's
   time zone and `joined_on` about five weeks back.
4. **About five weeks of `sessions`,** three or four per person per week, a mix
   of Traditional, Wood-fired and Infrared, 12 to 25 minutes, a few with a
   place ("Home", "The Y") and a short note, and at least one shared session
   for two people. Use `log_session` where you can. Dates older than
   yesterday are refused by the `sessions_20_check_date` trigger, so
   backfilling needs it bypassed for that one SQL editor session
   (`set session_replication_role = replica;` as the postgres role, then
   reset). Don't disable the trigger on the table.
5. **Some `session_cheers` and `session_comments`** from the other demo
   members on recent sessions.
6. **An `invites` row.** Codes expire after 14 days, so make it, or push
   `expires_at` out to about 60 days, on the day you submit. Put the code in
   the notes.
7. **Keep the week alive during review.** The demo members won't take a sauna
   by themselves. A review that crosses a Sunday will see the family week
   break. Either accept that (Saunafam handles it quietly: "Back at it,
   together", nobody named), or add a pg_cron job that logs one session per
   demo member every other day for the review window and remove it after.

Afterwards, remove the reviewer's member row so the demo family stays tidy.

## Review notes text (4000 bytes max)

> Saunafam (formerly Arro) is a weekly sauna streak for families and friend groups: each person logs their sauna sessions, and the group keeps one shared weekly streak. Families are private and joined by invite code only.
>
> HOW TO SIGN IN AND REACH A FAMILY
> 1. On the welcome screen tap "I have an invite" and enter the join code: {{DEMO_CODE}}
> 2. Sign in with your own Apple ID when asked. Sign in with Apple is the only sign-in.
> 3. You join "Sunday sauna", which has three members, a streak of a few weeks, recent sessions, cheers and comments. Its time zone is Pacific Time.
>
> WHAT TO TRY
> - Today: this week's progress for you and the family.
> - Start a session: a timer for time in the sauna. Tap Done to log it. Or tap "Log one I already did".
> - Log session: minutes and sauna type are required. Temperature, place, photo, note and "Sat with someone?" are optional.
> - Feed: tap a session to see it, cheer it or comment.
> - Week: the family streak and past weeks.
> - Settings > Delete account: deletes your account and data in the app.
>
> APPLE HEALTH
> Optional and write only. If you turn on "Save sessions to Apple Health", each session is saved as mindful minutes. Saunafam never reads Health data. Health data is never used for advertising or marketing and isn't stored in iCloud. Privacy policy: https://saunafam.com/privacy
>
> PHOTOS
> Optional. A photo added to a profile or a session is resized and uploaded to private storage that only signed-in members of that family can open. Deleting your account deletes your photos.
>
> COMMENTS AND SHARED SESSIONS
> Members can comment (up to 200 characters) on sessions in their own family. The person who wrote a comment can delete it, and the person whose session it is can delete any comment on it. A member can log a session for up to three others in the family who sat with them; anyone added gets a notification and can remove themselves from it. The person who started a family can remove a member (Settings > Family members), which deletes that member's sessions, comments and photos. Notifications are not sent between 9 p.m. and 7 a.m. in the recipient's time zone.
>
> LOCATION
> Saunafam never asks for or reads your location. A place is text you type.
>
> {{PLUS_PARAGRAPH}}
>
> iPhone only.
>
> Contact: Bryce Rambach, support@saunafam.com, {{PHONE}}

`{{PLUS_PARAGRAPH}}`:

- **Build 9 (Plus off):** "No in-app purchases are offered in this version."
- **The version that turns Plus on:** the spec's draft, word for word, with
  "Demo account" pointing at the code above:

> Saunafam is free. Logging, the timer, the weekly family streak and everything social are free for everyone and never locked. Saunafam Plus is optional and adds extras: wall woods, timer faces, app icons, full weekly history, family stats and a printable wall poster. One purchase, by any member, covers everyone in that Saunafam family (a group of up to 12 people that members join by invite), whether or not they share an Apple family. This is handled on our server, and Apple Family Sharing is off for these products. To see the purchase screen: Settings, Saunafam Plus. Restore purchases is on that screen and in Settings. The tips (A ladle, A bucket, An armful of birch) are optional thank-yous with no features attached. Demo account: [Bryce adds one, with a family that has a few weeks of sessions].

The labels above come from the spec (section 3). Check each against the build
you submit: "I have an invite", "Log one I already did", "Sat with someone?",
"Save sessions to Apple Health", Settings > Family members and how a comment is
deleted (Arro used touch and hold).

## Before submitting: things App Review checks

Not verified against build 9's code, which other agents are writing now.

- **Account deletion** in the app (Guideline 5.1.1(v)): Settings > Delete
  account, which also warns a Plus payer that deleting doesn't cancel the
  subscription.
- **Sign in with Apple** as the only login (4.8 is satisfied).
- **Purpose strings** match what the app does: photos, camera, Health write
  only, no location (5.1.1(ii)). Check the generated `Info.plist` after
  `npx expo prebuild`.
- **No visible feature that does nothing** (2.1). With `plus_enabled` false,
  no Plus rows, locks, woods or faces appear anywhere.
- **The dev-only Prototype preview** stays behind `__DEV__`.
- **Restore purchases** on the Plus sheet and in Settings (3.1.1), and Terms
  and Privacy links on the sheet (3.1.2), for the Plus version.
