# App Privacy answers

Answers for App Store Connect > App Privacy, checked against the code on
2026-10-05, not the plan. Re-check after phase 4 (notifications) and after
photos move to Supabase Storage: both change the answers below.

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
| Health & Fitness > **Health** | Workouts read through HealthKit | `connectHealth()` and `readRecentHealthWorkouts()` in `src/state/health.ts` |
| Health & Fitness > **Fitness** | Each workout's date, kind, optional duration, source, Health workout ID; manual check-ins too | `insertWorkout()` and `insertHealthWorkout()` in `backend.ts`; `workouts` table |
| User Content > **Other User Content** | Workout notes (up to 500 characters), family name, cheers and nudges | `workouts.note`, `families.name`, `cheers`, `nudges` |
| Identifiers > **User ID** | Supabase user id and member id | `auth.users.id`, `members.id` |

Why both Health and Fitness: Apple's "Health" type explicitly includes data
from the HealthKit API, and "Fitness" covers exercise data, which is what the
manual "I moved today" check-ins are. Declaring both is the safe reading.

## Not declared, and why

| Type | Why not |
| --- | --- |
| Photos or Videos | Profile and workout photos stay on the phone (`photos` and `me.photoUri` in `src/state/session.ts`, AsyncStorage). `insertWorkout()` never sends them, and `photo_path` is never written. Data processed only on the device isn't "collected". **Declare it as soon as photos upload.** |
| Location (precise or coarse) | Not read. The time zone (`members.timezone`) is a setting used to work out "today", not location |
| Contacts | Not read. Invites go out through the share sheet as a code |
| Usage Data, Diagnostics | No analytics or crash reporting |
| Device ID | Not collected today. Phase 4 will store push tokens; Apple doesn't list push tokens as a Device ID, but re-read this row when phase 4 lands |
| Sensitive Info, Financial Info, Purchases | None. v1 has no in-app purchases |

## Apple Health specifics (Guideline 5.1.3)

Checked in code:

- **Read-only.** `requestAuthorization({ toRead: [workout] })`, nothing in
  `toShare`; app.json sets `healthUpdatePermission: false`.
- **Workouts only.** No other HealthKit type is requested or read.
- **Today and yesterday only.** `readRecentHealthWorkouts()` queries from local
  midnight yesterday; `sendableHealthWorkouts()` drops anything older and the
  server's `workouts_check_date` trigger refuses it too.
- **Only four fields leave the phone:** HealthKit UUID, local date, mapped type
  (7 kinds) and whole minutes. The start time, source app, heart rate,
  calories and route are never read into the upload.
- **Never for ads**, never sold, never in iCloud. The privacy policy says so in
  its own Health section, which is what 5.1.3 asks for.
- **The Health purpose string** (app.json, `healthSharePermission`) is specific
  and matches: "Arro reads your workouts from Apple Health so moving counts
  toward your family streak. It only reads workouts, and only today's and
  yesterday's."

## Purpose strings that will get the build rejected

From the generated `ios/Arro/Info.plist` of the current dev build (git ignores
`ios/`, so this was read locally):

- `NSPhotoLibraryUsageDescription`: "Allow $(PRODUCT_NAME) to access your
  photos". Too vague for Guideline 5.1.1(ii).
- `NSCameraUsageDescription` and `NSMicrophoneUsageDescription`: same default
  text, and Arro uses neither.

They come from expo-image-picker's defaults. The fix is an app.json change,
listed in `testflight.md` under "app.json changes" for the phase 4 thread or
you to apply.
