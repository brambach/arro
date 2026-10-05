# Route to the first TestFlight build

Goal: your family installs Arro from TestFlight, signed in to the hosted `arro`
Supabase project, before the public release.

Nothing here has been run against your Apple account. Steps marked **You** are
yours in App Store Connect or Xcode; nothing in this file buys, installs or
uploads by itself.

## Xcode Archive or EAS?

| | Xcode Archive and upload | EAS Build and Submit |
| --- | --- | --- |
| New accounts or tools | None. Xcode, CocoaPods and signing already work for your dev builds | Already set up by phase 4: `eas.json` in the project root, the project linked to `@brycerambach/arro`, `npx eas-cli` signed in on your Mac |
| Signing | Xcode "Automatically manage signing" makes the distribution certificate and profile | EAS asks for your Apple ID once and makes and stores them |
| Supabase URL and key | Read from `.env.local` at bundle time. Checked: a release bundle built here contains the hosted project's URL | `.env.local` is git-ignored, so EAS never uploads it. You'd have to add both values as EAS environment variables, or the build quietly runs on local fake data |
| Speed | About 5-10 minutes on your Mac | Free plan: 15 iOS builds a month, low-priority queue (can wait a while), 45 minute timeout |
| Build number | Bump `ios.buildNumber` in app.json yourself | Same as Xcode today (`appVersionSource: "local"`); can auto-increment if you switch it |
| Upload | Xcode Organizer > Distribute App | `eas submit` (Apple ID or an App Store Connect API key) |
| Repeatability | Depends on your Mac's Xcode (26.6 now) | Same cloud image every time; your Mac doesn't matter |

**Recommendation: Xcode Archive for the TestFlight builds.** It reuses the
setup that already builds Arro for your phone, uses no EAS build minutes, and
picks up the Supabase settings from `.env.local` the same way your dev build
does. Phase 4 has since set up EAS for push (`eas.json`, the Expo project
link), so the EAS route is closer than it was, but the `.env.local` problem
below still applies. The
EAS gotcha with `.env.local` is exactly the kind that produces a TestFlight
build that silently isn't talking to the server. Move to EAS later if you want
builds that don't depend on your Mac, or when phase 7 adds more native setup.
The EAS steps are at the end in case you'd rather.

## 1. App Store Connect (You)

1. **Check the App ID.** developer.apple.com > Certificates, Identifiers &
   Profiles > Identifiers. `com.arrofamily.arro` should already be there from
   the dev builds, with HealthKit and Sign in with Apple ticked. If it isn't,
   add it with both capabilities.
2. **Create the app record and reserve the name.** appstoreconnect.apple.com >
   Apps > + > New App:
   - Platform: iOS
   - Name: `Arro: Family Move Streak` (this is the moment the name is
     reserved; fallbacks are in `listing.md`)
   - Primary language: English (U.S.) or English (Australia)
   - Bundle ID: `com.arrofamily.arro`
   - SKU: `arro-ios-1`
   - User access: Full access
3. **Agreements.** Business > Agreements: the free apps agreement is accepted
   with your membership. v1 is free, so the Paid Apps agreement, tax and
   banking can wait for phase 7.
4. **App Information.** Subtitle, category (Health & Fitness, Lifestyle) and
   privacy policy URL from `listing.md` and `hosting.md`.
5. **App Privacy.** Answer it from `app-privacy.md`. It's needed before App
   Store submission; doing it now means it's done.

## 2. app.json changes (done)

The phase 4 thread applied these to app.json. They're kept here so you know
what each one is for:

```json
{
  "expo": {
    "version": "1.0.0",
    "ios": {
      "buildNumber": "1",
      "config": { "usesNonExemptEncryption": false }
    },
    "plugins": [
      [
        "expo-image-picker",
        {
          "photosPermission": "Arro uses a photo only when you pick one for your profile or a workout. Photos stay on your phone.",
          "cameraPermission": false,
          "microphonePermission": false
        }
      ]
    ]
  }
}
```

- `version` is already `1.0.0`. Leave it until the App Store release.
- `buildNumber` goes up by one for every upload (2, 3, ...). Apple refuses a
  repeated build number for the same version.
- `usesNonExemptEncryption: false`: Arro only uses HTTPS, which is exempt. This
  stops App Store Connect asking the export compliance question on every build.
- The image picker entry replaces the vague default photo text, and stops
  adding camera and microphone text for features Arro doesn't have. Add it to
  the existing `plugins` array; keep the other plugins as they are.
- The Health text (`healthSharePermission`) is already specific and correct.
  `healthUpdatePermission: false` is right, since Arro never writes to Health.
- The icon: `"icon": "./assets/icon.png"` stays. The image is now option A
  from `icon-options.md`.

Optional, for the app thread: `pickPhoto()` in `src/state/photos.ts` asks for
full photo library access before opening the picker. iOS's picker doesn't need
that permission, so dropping the request means one less prompt and no photo
library access at all.

## 3. Build and upload (You, on your Mac)

From `/Users/bryce/claude-hub/personal-projects/arro`, with phase 4's and this
thread's changes committed:

1. Type-check: `npx tsc --noEmit`
2. Regenerate the native project from app.json:
   `npx expo prebuild --platform ios --clean`
   This deletes and rebuilds the git-ignored `ios/` folder, so app.json
   changes (build number, purpose strings, icon) are actually in it.
   `npx expo run:ios` recreates it for dev builds later.
3. Check `ios/Arro/Info.plist` now has your photo text, no camera or
   microphone text, `CFBundleVersion` matching the build number and
   `ITSAppUsesNonExemptEncryption` false. If the camera or microphone keys are
   still there, tell the app thread; they need setting in app.json instead.
4. Open the workspace: `open ios/Arro.xcworkspace`
5. Arro target > Signing & Capabilities: "Automatically manage signing" on,
   Team = your individual team. HealthKit (with Background Delivery), Sign in
   with Apple and Push Notifications (added by `expo-notifications`) should
   all be listed.
6. In the toolbar, set the destination to **Any iOS Device (arm64)**.
7. Product > Archive. This builds Release, which bundles the JavaScript into
   the app (no dev server) and leaves out the dev launcher.
8. When the Organizer opens: Distribute App > App Store Connect (or
   "TestFlight & App Store") > Upload, with automatic signing.
9. Wait for Apple's "has completed processing" email, usually 5-30 minutes.

## 4. TestFlight (You)

1. **Yourself first (internal testing, no review).** App Store Connect > Arro >
   TestFlight > Internal Testing > + group "Me", add yourself and the build.
   Install the TestFlight app on your iPhone, accept, install Arro. Delete the
   dev build first; they share a bundle ID.
2. **Check on that build:**
   - Sign in with Apple is offered, works, and you land in your real family.
     If there's no Apple button, or Settings > Sign out warns "This preview
     keeps your family on this phone only", the Supabase settings didn't make
     it into the build (cancel that sign-out).
   - Settings > How you move > Apple Health shows Apple's sheet and a recent
     workout appears.
   - Log today works, and a cheer shows up for another family member.
3. **Test Information** (TestFlight > Test Information): beta description,
   feedback email, privacy policy URL, and the sign-in info from
   `review-notes.md`.
4. **Your family (external testing).** External Testing > + group "Family",
   add the build, submit for Beta App Review. The first build of a version
   usually takes about a day; later builds are often approved straight away.
5. **Add testers** by email (they get an invite in their inbox) or turn on a
   public link and send it in the family chat. Each person installs TestFlight,
   opens the invite, then installs Arro and joins with your family's code.
6. Builds expire after 90 days. Each new build: bump `ios.buildNumber`, steps
   3.1 to 3.9, then add it to the Family group.

Your dad (Strava) should turn on Strava's Apple Health connection, so his runs
reach Arro through Health.

## The EAS route, if you'd rather

Phase 4 already did the setup: `eas.json` is in the project root (a
development profile, an empty `production` build profile and an empty
`production` submit profile), the project is linked to `@brycerambach/arro`
(`owner` and `extra.eas.projectId` in app.json), and `npx eas-cli` is signed in
on your Mac. Don't run `eas build:configure`; edit the existing file.

1. **Build numbers.** `eas.json` has `"appVersionSource": "local"`, so
   app.json's `ios.buildNumber` is the build number on both routes. Leave it
   that way if you might still archive in Xcode. If you go EAS only, set
   `"appVersionSource": "remote"` under `cli` and `"autoIncrement": true` in
   `build.production`, so EAS counts builds itself (start it above any number
   you've already uploaded).
2. Add the Supabase settings, since `.env.local` isn't uploaded:
   `npx eas-cli env:create --environment production --name EXPO_PUBLIC_SUPABASE_URL --value <url> --visibility plaintext`
   and the same for `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
3. `npx eas-cli build --platform ios --profile production`. It asks for
   your Apple ID if it needs to, creates the distribution certificate and
   profile, and syncs HealthKit, Sign in with Apple and push from the
   entitlements. The APNs key from phase 4 is separate and stays as it is.
4. `npx eas-cli submit --platform ios --latest` (it can find the app record by
   bundle ID, or set `ascAppId` in `eas.json`'s `submit.production`).
5. Then section 4 above.
