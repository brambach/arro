# Onboarding

A new person starts a family: they sign in, name the family, pick a rhythm,
read the streak rules, can invite someone, set reminders, and end on Today.

## Sub-features

- `onb-start` Welcome to Sign in through "Start a family".
- `onb-name` first name and family name.
- `onb-rhythm` sessions a week and minutes that count.
- `onb-rules` "How the streak works", seven rules.
- `onb-invite` the family code, "Send invite" or "I'll do it later".
- `onb-reminders` reminder days and time, then the notifications ask.
- `onb-today` Today after the last step.

## How to get to it (user POV)

- A fresh install opens on Welcome. "Start a family" starts this path. "I have
  an invite" is the invitee path (see [expired-invite.md](expired-invite.md)).
- "Already have an account? Sign in" is the returning path. Not mapped yet.

## Driving it with verify.mjs

Preconditions:

- `node $V up ... --fresh` or `node $V launch --fresh`, so the app is on Welcome.

- **Start.** Run `node $V tap-text "Start a family"`. `find` reads "Sign in" and "Your first name".
- **Name.** The name field needs the keyboard, so run `node $V send '{"op":"draft","name":"Sam"}'`, then `node $V tap-text "Continue"`. `find` reads "Name your family".
- **Family name.** Run `node $V send '{"op":"draft","familyName":"Sunday sauna"}'` and `node $V tap-text "Continue"`. `find` reads "Your rhythm".
- **Rhythm.** Tap the 4 tile with `node $V tap 245 336`, then `node $V tap-text "Continue"`. The rules screen reads "Each of you does 4 sessions a week", which proves the choice carried through.
- **Rules.** Run `node $V tap-text "Got it"`. `find` reads "Invite your family" and an 8 character code.
- **Invite.** Run `node $V tap-text "do it later"`. ("Send invite" opens the iOS share sheet.) `find` reads "Remind me if I'm behind." and a summary like "Thu and Sat at 6:30 PM".
- **Reminders.** Run `node $V tap-text "Continue"`. `find` reads "Hear from your family?".
- **Notifications.** Run `node $V tap-text "Not now"`. Today shows "Good afternoon, Sam", "8 weeks together", "Start a session".
- **Proof.** `node $V shot <dir>/onboarding/NN-<step>.png` after each step.

## Gotchas

- Sign in with Apple can't finish in the simulator. Without Supabase the screen
  shows "Preview sign-in" and a Continue button, which this path uses.
- Today shows the preview family's numbers (3 a week), not the rhythm picked in
  onboarding. The rules screen is where the rhythm choice shows.
- "Turn on notifications" raises the iOS permission alert. The path above
  skips it so the run doesn't depend on an alert's position.
- The `onboard` driver op jumps straight to Today. Use it only as setup for
  another flow, never as onboarding proof.
