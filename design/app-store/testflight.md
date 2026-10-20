# TestFlight: build 9, Arro becomes Saunafam

Build 9 is the first Saunafam build. Testers get it as an update to Arro
(same bundle id `com.arrofamily.arro`), stay signed in and keep their family.
Every step here is Bryce's, and only on his go. Nothing in this file has been
run.

The history of builds 1 to 8 (Xcode archives for 4 to 6, EAS from build 7) is
in this file's git history before 20 October 2026.

## How builds are made now

EAS, as of build 7: `eas.json` has `appVersionSource: "local"`, so
`ios.buildNumber` in `app.json` is the build number. The release PR bumps it to
"9" in its own commit. EAS never sees `.env.local`, so
`EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` must be EAS
environment variables. They are, from build 7. Without them a release build
opens on "This build can't reach Saunafam".

New for Plus, when it's turned on later: `EXPO_PUBLIC_REVENUECAT_IOS_KEY`
(RevenueCat's public SDK key) as an EAS environment variable.

## Build 9 rollout, in order

The same order as `AGENTS.md`, "Release process". Each step only on Bryce's
go.

1. **Site.** Deploy saunafam.com and set up DNS and email routing
   (`site/README.md`), so the privacy and support URLs work before anyone
   reads them. Check arrofamily.com redirects with a 301.
2. **Migrations** on the hosted project: `supabase migration list --linked`,
   `supabase db push --dry-run`, then `supabase db push`, for the six build 9
   migrations:
   - `20261021000001_saunafam_families.sql`
   - `20261021000002_sessions.sql`
   - `20261021000003_weekly_streaks.sql`
   - `20261021000004_session_social.sql`
   - `20261021000005_saunafam_pushes.sql`
   - `20261021000006_saunafam_plus.sql`

   They only add. Build 8 keeps working after them (it just stops getting
   Arro's "moved" pushes). The Plus migration is safe to ship: Plus stays off
   while `app_config.plus_enabled` is false, its default. Do this right before
   build 9 goes to TestFlight, because `saunafam_started_on` is set to the
   date the migration runs.
3. **Edge functions:** deploy `remove-member` and `delete-account` (both
   changed), and `revenuecat-webhook` and `sync-plus` (new). The webhook
   needs JWT checks off: `npx supabase functions deploy revenuecat-webhook
   --no-verify-jwt`.
4. **Secrets:** `REVENUECAT_WEBHOOK_SECRET` and `REVENUECAT_SECRET_API_KEY`
   only matter once RevenueCat exists, so they can wait for Plus. Nothing new
   is needed for build 9 itself.
5. **App Store Connect:**
   - Rename the app to Saunafam, and set the subtitle from `listing.md`.
   - Privacy Policy URL `https://saunafam.com/privacy`, Support URL
     `https://saunafam.com/support`.
   - App Privacy answers from `app-privacy.md` (remove Health and Precise
     Location).
   - TestFlight, Test Information: beta description, feedback email
     `support@saunafam.com`, privacy URL, and the sign-in notes from
     `review-notes.md`.
6. **Build and submit:** `eas build --platform ios --profile production`, then
   `eas submit --platform ios --latest`.
7. **Testers:** add the build to the existing external group and paste the
   "What to Test" note below. A build that changes what's collected may need a
   fresh Beta App Review, usually about a day.

## What to Test (draft, not sent)

For TestFlight's "What to Test" box, from the spec, section 7. A draft for
Bryce. Nobody has sent it.

> Arro is now Saunafam, a weekly sauna streak. Your family carries over and the streak starts fresh. Try the timer, log a session for two people, and cheer someone on.

## What testers will see

- The new splash, then a one-time sheet, "Arro is now Saunafam": "Your family
  is still here. We've moved from daily movement to a weekly sauna streak: 3
  sessions a week each, 10 minutes or more. Everyone starts fresh at week
  one." The founder also gets **Change the rhythm**.
- No onboarding again. Sign-in, family, members, colors, profile photos and
  invites carry over.
- The streak starts at week one. Arro's workouts, cheers, comments and photos
  are hidden in build 9 and deleted in build 10. Active breaks carry over.
- iOS keeps Arro's Health read permission. The support page says how to turn
  it off (Settings, Health, Data Access & Devices).
- Anyone still on build 8 keeps working. After `app_config.min_ios_build` is
  raised, older builds show "A new version of Saunafam is ready. Update in
  TestFlight or the App Store."

## On the phone after installing

- Sign in still works, and you open straight into your family.
- Start the timer, background the app, come back: it kept time.
- Log a session with someone else in it, and check it shows on their phone.
- Cheer and comment, and check the push arrives (between 7 a.m. and 9 p.m.).
- Settings, Privacy and Help open saunafam.com.

## Later: Plus

Plus is built into build 9 switched off. The App Store Connect, RevenueCat and
sandbox steps are in the spec's "Paid tier" section and `REPORT.md`, and they
come after build 9 ships. Then a later build turns it on, with the listing
changes in `listing.md`.
