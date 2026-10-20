# App Privacy answers

Answers for App Store Connect, App Privacy, for Saunafam build 9 and the
version that turns Plus on. They follow the spec (section 5 "Privacy page" and
"Paid tier", "App Store listing and privacy updates") and match
`privacy-policy.md`. Written 20 October 2026.

What I didn't check: the build 9 app code. Other agents are writing it in
parallel, so the answers below are from the spec, `docs/saunafam/API.md` and
the migrations, not from `src/`. Before pasting, run the checks at the end of
this file against the build you submit.

## What changes from Arro's label

| Arro (build 3 to 8) | Saunafam (build 9) | Why |
|---|---|---|
| Health & Fitness > Health | **Remove** | Saunafam never reads from HealthKit. Writing mindful minutes isn't collecting Health data: the minutes come from the session the person logged, which is declared under Fitness |
| Location > Precise Location | **Remove** | Routes are gone with the Health import. A place is free text the person types, and the app never asks for location |
| Health & Fitness > Fitness | Keep, now for sauna sessions | |
| Contact Info > Name, Email Address | Keep | |
| User Content > Photos or Videos, Other User Content | Keep | |
| Identifiers > User ID | Keep, and it's now also the RevenueCat app user id | |
| (none) | **Add Purchases > Purchase History** | RevenueCat |

## Do you or your third-party partners collect data from this app?

**Yes.** Supabase stores it on Saunafam's behalf, and RevenueCat processes
purchases. A provider that only processes data for you still counts as
collecting it for this label.

## Tracking

**No tracking.** No ad SDKs, no analytics, no crash reporting, no data
brokers, no IDFA, and no App Tracking Transparency prompt. RevenueCat's own
guidance says it "does not inherently use purchase history to track users
across different apps for advertising", and Saunafam turns on none of its ad
or attribution integrations.

## Data types to declare

Every type: **Linked to the user: Yes** (it's tied to their account). **Used
for tracking: No.** Purpose is **App Functionality** only, except Purchase
History.

| Apple's type | What Saunafam stores | Where |
|---|---|---|
| Contact Info > **Name** | Display name, prefilled from Apple's first name, editable | `members.display_name` |
| Contact Info > **Email Address** | The email Apple shares, often a private relay address, kept by Supabase Auth | `auth.users` |
| Health & Fitness > **Fitness** | Each sauna session: date, start time, minutes, rounds, sauna type, and if added the temperature, humidity, cold plunge and its minutes | `public.sessions` (migration `20261021000002_sessions.sql`) |
| User Content > **Photos or Videos** | Profile and session photos the person picks or takes, resized to a JPEG, in the private `photos` bucket | Storage, `photos` |
| User Content > **Other User Content** | Family name, session notes, place text, comments, cheers, nudges and breaks | `families.name`, `sessions.note`, `sessions.place`, `session_comments`, `session_cheers`, `nudges`, `pauses` |
| Identifiers > **User ID** | The Supabase user id and member id. The same user id is the RevenueCat app user id (`Purchases.logIn`) | `auth.users.id`, `members.id`, RevenueCat |
| Purchases > **Purchase History** | Which Saunafam Plus products and tips the person bought, and their renewal status | RevenueCat, then `public.family_plans` and `public.plus_events` |

**Purchase History purposes: App Functionality and Analytics.** The spec says
App Functionality only. RevenueCat's guide says "All RevenueCat users must
select these two options": App Functionality for receipt validation and fraud
checks, Analytics because its dashboard (Customer History, Charts) uses the
data. Saunafam doesn't run analytics of its own, but RevenueCat's dashboard is
analytics, so both are ticked.

### Fitness or not

The spec lists Name, Email, Photos, User Content and Identifiers, and doesn't
name Fitness. Arro declared Fitness for its manual "I moved today" check-ins,
and a sauna session (minutes, rounds, heat) is the same kind of record. Apple's
Fitness type is "exercise data". A sauna isn't quite exercise, so this is the
cautious reading. Declaring a type you arguably don't need doesn't get an app
rejected. Leaving out one you do need can. If Bryce would like the shorter
label, move the session fields under Other User Content instead.

## Not declared, and why

| Type | Why not |
|---|---|
| Health | No HealthKit reads. Build 9 deletes `healthSync.ts` and the read code. iOS may still list Arro's old read permission, but the app never uses it |
| Precise and Coarse Location | Not collected. The time zone (`members.timezone`) works out your week and isn't location. RevenueCat says it collects "only locale and currency code", which isn't location either |
| Contacts | Not read. Invites go out through the share sheet as a code and a link |
| Financial Info | Apple handles payment. RevenueCat says it "does not collect payment information from users" |
| Usage Data, Diagnostics | No analytics or crash reporting. RevenueCat says it doesn't collect diagnostics, and lists Usage Data only for apps that also run an analytics SDK |
| Device ID | No IDFA. RevenueCat lists Device ID only for ad-identifier integrations, which Saunafam doesn't use. The Expo push token only delivers Saunafam's own notifications. If you'd like to be cautious, add Identifiers > Device ID, App Functionality, linked, not tracking |
| Contact Info via RevenueCat | RevenueCat says this only applies if you put contact details in customer attributes. Saunafam sets one attribute, `family_id` (`supabase/functions/_shared/plus.ts`), and no name or email |
| Sensitive Info, Browsing History, Search History | None |

## RevenueCat: what I checked

Read on 20 October 2026: RevenueCat's "Apple App Privacy" page,
https://www.revenuecat.com/docs/platform-resources/apple-platform-resources/apple-app-privacy
(no last-updated date on the page). What it says, per type:

- **Purchases: required.** "RevenueCat collects purchase history from users."
  Purposes: App Functionality and Analytics, both required.
- **Identifiers: maybe.** "User ID" if you identify users with a custom app
  user id (Saunafam does: the Supabase user id). "Device ID" only for
  integrations that use an ad identifier.
- **Contact Info: maybe.** Only if customer attributes hold contact details.
- **Usage Data: maybe.** Only alongside analytics SDKs such as Mixpanel,
  Firebase, PostHog or Amplitude.
- **Linked to user:** "Yes" when the app user id can be tied to a person.
  Saunafam's can (it's the account id), so Linked.
- **Tracking:** not by RevenueCat itself.
- **Not collected by RevenueCat:** health, fitness, financial, location (only
  locale and currency code), sensitive info, contacts, browsing, search,
  diagnostics.

The page doesn't mention the SDK's privacy manifest (`PrivacyInfo.xcprivacy`).
I didn't check the manifest that ships in `react-native-purchases`. After
`npx expo prebuild`, Xcode's privacy report (Product, Archive, then Generate
Privacy Report in the Organizer) lists what every SDK declares. Compare it with
this file.

## When to change it in App Store Connect

- **With build 9:** remove Health and Precise Location, keep the rest, and add
  Purchase History if build 9 configures the RevenueCat SDK at launch even
  with Plus off. If the app only configures RevenueCat when `plus_enabled` is
  true, Purchase History can wait for the Plus version. Either way it does no
  harm to add it with build 9.
- App Privacy answers apply to the app, not one version, and can be edited at
  any time. Edit them before build 9 goes to Beta App Review.

## Apple Health (Guideline 5.1.3)

- **Write only.** Mindful Minutes (`HKCategoryTypeIdentifierMindfulSession`),
  only if the person turns on "Save sessions to Apple Health". Nothing is read.
- **Purpose string** (spec, section 3): "Saunafam saves your sauna sessions to
  Apple Health as mindful minutes, if you turn it on. It never reads your
  Health data."
- **Never for ads,** never sold, never in iCloud. The privacy policy says so in
  its own Apple Health section.
- Arro's read permission can't be removed by the app. `privacy-policy.md` and
  the support page tell people how to turn it off.

## Push notifications

Supabase stores the Expo push token per phone (`public.push_tokens`) and each
queued push (`private.push_outbox`), with the title and body, for up to 7
days. Push text is built from data declared above (names, the family name,
comments). The token goes through Expo's push service to Apple's APNs. No new
data type.

## Purpose strings

From the spec (section 6, `app.json`), for the app agents to set:

- Photos: "Saunafam uses a photo only when you pick one for your profile or a
  session. Your family sees it in Saunafam."
- Camera: added (spec Default). Its exact text isn't in the spec. It's in
  `design/copy/app-copy.md` once the app agents write it.
- Health write: the string above. The read string goes if the plugin allows.

## Check before pasting

- `grep -rn "requestAuthorization\|toRead" src/` finds no Health reads.
- `grep -rn "Location" app.json src/` finds no location permission.
- `package.json` has no analytics or crash reporting package.
- Where `Purchases.configure` is called, and whether it runs with Plus off.
- `Purchases.setAttributes` only sets `family_id`.
