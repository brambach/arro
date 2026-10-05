# Review notes and demo family

For App Store Connect > the version > App Review Information, and for the
TestFlight Beta App Review (external testers need one for the first build, and
it asks the same questions).

## The demo account problem

Arro's only sign-in is Sign in with Apple (`signInWithApple()` in
`src/state/backend.ts`). There's no email and password to hand the reviewer,
and a shared demo Apple ID doesn't work in practice (two-factor codes go to a
device you hold). So "a demo account already in a family" can't be a login.

What works: **a demo family that's already full of life, plus a join code.**
The reviewer taps "I have an invite", enters the code, signs in with their own
Apple ID and lands in a family with a streak, workouts and cheers. That gets
them past the invite step without anyone having to accept anything. In App
Store Connect, leave "Sign-in required" ticked, and where it asks for a
username and password write "Sign in with Apple, join code in the notes".

## What has to exist on the server (not created)

In the hosted `arro` project (ref mvbphoguqaipuqmdbuir):

1. **Three demo users in `auth.users`**, because `members.user_id` must point
   at a real auth user. Create them with the Auth admin API or the dashboard
   (Authentication > Add user, email like `demo-mum@arrofamily.com`, no
   password needed). Nobody signs in as them.
2. **One family**, for example "The Demo Family", time zone
   `America/Los_Angeles` (Cupertino reviewers).
3. **Three `members` rows** in it: "Mum", "Dad", "Sam", each with a palette
   colour, the family's time zone, and `joined_on` about 30 days back.
4. **About 22 days of `workouts`** spread across them, a mix of walk, run,
   yoga and swim, some with short notes ("Loop round the park with the dog").
   A streak in the low 20s shows "Your first 30 days together" in progress.
   Don't aim for the milestone card: it only shows while the current streak is
   30 or 31 and equals the longest (`buildView.ts`, goal status `done`), so it
   would be gone again two days into the review.
   The `workouts_check_date` trigger refuses dates before yesterday, so
   backfilling needs it bypassed for that one session, for example
   `set session_replication_role = replica;` run as the postgres role in the
   SQL editor, then reset. Don't disable the trigger on the table.
5. **Some `cheers`** on recent workouts from the other demo members.
6. **An `invites` row** for the family. Codes expire after 14 days
   (`invites.expires_at`), so make it, or push `expires_at` out to about 60 days,
   on the day you submit. Put the code in the notes.
7. **Keep it alive during review.** A review can take a few days, and the demo
   members won't move by themselves, so the family streak will break while the
   reviewer looks. Either accept that (Arro handles a broken streak gently,
   which is fine to show), or add a scheduled job (pg_cron) that inserts one
   workout per demo member each day for the review window and is removed
   afterwards.

Also worth doing: delete the reviewer's member row after review if they leave
it behind, so the demo family stays tidy for the next version.

## Review notes text (4000 characters max)

> Arro is a daily ritual for families who live apart: each person logs that they moved today, and the family keeps one shared streak. Families are private and invite-only.
>
> HOW TO SIGN IN AND REACH A FAMILY
> 1. On the welcome screen tap "I have an invite" and enter the join code: {{DEMO_CODE}}
> 2. Sign in with your own Apple ID when asked (Sign in with Apple is the only sign-in).
> 3. You join "The Demo Family", which has three members, a family streak of about three weeks, recent workouts and cheers. Its time zone is Pacific Time.
>
> WHAT TO TRY
> - Today: who in the family has moved today.
> - Log today: tap "I moved today", pick a kind of workout. Duration, note and photo are optional.
> - Feed: tap a workout to see it and cheer it.
> - Settings > How you move: switch between "I moved today" and Apple Health.
> - Settings > Delete account: deletes your account and data in the app.
>
> APPLE HEALTH
> Apple Health is optional. Arro only reads workouts (read-only, never writes), and only today's and yesterday's, to count them toward the family streak. If the review device has no workouts in Health, "I moved today" covers everything. Health data is never used for advertising or marketing and isn't stored in iCloud. Privacy policy: https://arrofamily.com/privacy
>
> PHOTOS
> Photos you add stay on the device. They are not uploaded.
>
> No in-app purchases. iPhone only.
>
> Contact: Bryce Rambach, {{SUPPORT_EMAIL}}, {{PHONE}}

The labels match `WelcomeScreen.tsx` ("I have an invite") and
`JoinCodeScreen.tsx` ("Enter your code") today. Check them against the build
you submit, since phase 4 may add onboarding steps.

## Fix before submitting: things App Review flags

Found while checking the code. These are app changes, outside this thread.

1. **Done: the placeholder comment bar is gone.** The phase 4 thread removed
   the "Add a comment…" bar from `src/screens/WorkoutDetailScreen.tsx`, so
   there's no visible feature that does nothing (Guideline 2.1).
2. **Done: photo, camera and microphone purpose strings.** app.json now sets a
   specific photo text and turns camera and microphone off. Check the
   generated `Info.plist` before archiving (`testflight.md`, step 3).
3. **Invite link points at a domain that doesn't exist yet.** See `hosting.md`.

Already fine: in-app account deletion (Settings > Delete account, Guideline
5.1.1(v)), Sign in with Apple as the only login (4.8 is satisfied), the
"Prototype preview" switch in Settings is behind `__DEV__` so it's absent from
release builds, and the Health purpose string is specific.
