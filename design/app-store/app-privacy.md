# App Privacy answers

Answers for App Store Connect > App Privacy, checked against the code on
2026-10-05, not the plan. Phase 4's push data is covered below ("Push
notifications"). Updated 2026-10-09 for build 3, which uploads photos and
reads workout distance and routes: **Photos or Videos** and **Precise
Location** are now declared. Change the answers in App Store Connect before
build 3 goes to review.

## Do you or your third-party partners collect data from this app?

**Yes.** Supabase stores it on our behalf. A provider that only processes data
for you still counts as "collected" for this label.

## Tracking

**No tracking.** No ad SDKs, no analytics, no crash reporting, no data shared
with data brokers, no IDFA. `package.json` has no analytics package and
`src/` has no tracking calls.

## Data types to declare

Every type below: **Used for: App Functionality** only. **Linked to the user:
Yes** (it's tied to their account). **Used for tracking: No.**

| Apple's type | What Arro stores | Where in the code |
| --- | --- | --- |
| Contact Info > **Name** | Display name, prefilled from Apple's first name, editable | `members.display_name`; `signInWithApple()` and `updateMember()` in `src/state/backend.ts` |
| Contact Info > **Email Address** | The email Apple shares (often a private relay address), kept by Supabase Auth | `signInWithApple()` asks for the EMAIL scope; Supabase stores it in `auth.users` |
| Health & Fitness > **Health** | Workouts and workout routes read through HealthKit | `connectHealth()` and `readRecentHealthWorkouts()` in `src/state/health.ts` |
| Health & Fitness > **Fitness** | Each workout's date, kind, optional duration, source, Health workout ID, start time and distance; manual check-ins too | `insertWorkout()` and `insertHealthWorkout()` in `backend.ts`; `workouts` table |
| Location > **Precise Location** | The route of a Health workout, trimmed by 200 m at each end and thinned, as an encoded polyline. Never the phone's current location | `healthDetails()` in `src/state/healthSync.ts`, `src/state/routes.ts`; `workouts.route` |
| User Content > **Photos or Videos** | Profile and workout photos the person picks, resized to a JPEG and stored in the private `photos` bucket | `photoForUpload()` in `src/state/photos.ts`, `uploadPhoto()` in `backend.ts`; migration `20261008000001` |
| User Content > **Other User Content** | Workout notes (up to 500 characters), family name, cheers and nudges | `workouts.note`, `families.name`, `cheers`, `nudges` |
| Identifiers > **User ID** | Supabase user id and member id | `auth.users.id`, `members.id` |

Why both Health and Fitness: Apple's "Health" type explicitly includes data
from the HealthKit API, and "Fitness" covers exercise data, which is what the
manual "I moved today" check-ins are. Declaring both is the safe reading.

## Not declared, and why

| Type | Why not |
| --- | --- |
| Coarse Location | Not collected. Routes are declared as Precise Location above; the time zone (`members.timezone`) is a setting used to work out "today", not location |
| Contacts | Not read. Invites go out through the share sheet as a code |
| Usage Data, Diagnostics | No analytics or crash reporting |
| Device ID | Arro stores an Expo push token per phone once phase 4 is live (see "Push notifications" below). Apple's Device ID type is about identifiers like the IDFA or a device ID used to recognise the device; a push token used only to deliver the app's own notifications isn't commonly declared there |
| Sensitive Info, Financial Info, Purchases | None. v1 has no in-app purchases |

## Apple Health specifics (Guideline 5.1.3)

Checked in code:

- **Read-only.** `requestAuthorization({ toRead: [workout, workoutRoute] })`,
  nothing in `toShare`. app.json has a `healthUpdatePermission` text only
  because App Store Connect rejected build 1 without NSHealthUpdateUsageDescription;
  the text says Arro never writes to Health.
- **Workouts and their routes only.** No other HealthKit type is requested or read.
- **Today and yesterday only.** `readRecentHealthWorkouts()` queries from local
  midnight yesterday; `sendableHealthWorkouts()` drops anything older and the
  server's `workouts_check_date` trigger refuses it too.
- **What leaves the phone:** HealthKit UUID, local date, mapped type (7 kinds),
  whole minutes, start time, distance in whole metres, and the route trimmed
  by 200 m at each end and thinned to at most 400 points. The source app,
  heart rate and calories are never read into the upload. Routes are shown
  only to the person's own family (RLS on `workouts`).
- **Never for ads**, never sold, never in iCloud. The privacy policy says so in
  its own Health section, which is what 5.1.3 asks for.
- **The Health purpose string** (app.json, `healthSharePermission`) is specific
  and matches: "Arro reads your workouts from Apple Health, including distance
  and route, so moving counts toward your family streak and your family can
  see what you did. Routes are shared only with your family, with the start
  and end left off. Arro only reads today's and yesterday's workouts."

## Push notifications (phase 4)

Checked in `supabase/migrations/20261005000007_push.sql`,
`20261005000008_evening_nudge.sql`, `20261005000009_nudge_push.sql`,
`supabase/functions/send-push/index.ts` and the app side: `expo-notifications`
is in `package.json`, `registerPushToken()` and `forgetPushToken()` are in
`src/state/backend.ts`, called from `src/state/AppState.tsx`. Supabase stores:

- **`public.push_tokens`:** the phone's Expo push token
  (`ExponentPushToken[...]`), the signed-in user's id and when it was last
  updated. Each person can only read or delete their own. Signing out deletes
  the phone's token (`signOut()` in `AppState.tsx`); deleting the account
  deletes it (`on delete cascade`).
- **`private.push_outbox`:** each queued push: the recipient's user id, the
  kind (cheer, joined, evening or nudge), the title and body (which include a
  family member's display name, the family name or the workout kind), a
  workout or member id, and when it was sent. Rows are deleted after 7 days
  (`run_evening_nudges()`) and with the account.

The four kinds: a **cheer** on someone's workout, someone **joined** the
family, the **evening** "X still has today" message to people who already
moved, and a **nudge** ("Mum is cheering you on") when someone taps "Send a
cheer" for a person who hasn't moved yet. A nudge is saved in
`public.nudges` (sender, recipient, date) as before; its push is only queued
between 07:00 and 21:00 in the recipient's time zone.

Pushes go out through Expo's push service (`exp.host`), which hands the token
and message to Apple's APNs. Expo processes them on Arro's behalf.

What it changes in the label: **no new data type.** The push text is made of
data already declared (Name, Other User Content, Fitness). The token is used
only to deliver Arro's own notifications, not to recognise the device or for
tracking. If you'd rather be cautious, add Identifiers > **Device ID**, App
Functionality, linked, not tracking; declaring more than needed doesn't cause
a rejection.

The daily "You still have today" reminder is a local notification scheduled on
the phone (`src/state/reminders.ts`). It sends nothing to the server beyond the
reminder time, which `members.reminder_time` already held before phase 4.

## Purpose strings

Fixed in app.json by the phase 4 thread: the `expo-image-picker` plugin entry
sets a specific photo text (build 3: "Arro uses a photo only when you pick one
for your profile or a workout. Your family sees it in Arro.") and turns the camera and
microphone texts off, so the build no longer asks for things Arro doesn't do
(Guideline 5.1.1(ii)). Check the generated `ios/Arro/Info.plist` after
`npx expo prebuild` (`testflight.md`, step 3).
