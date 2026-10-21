# Expired invite

Someone with an old or wrong code tries to join and is told it's expired, with
what to do next.

## Sub-features

- `inv-code` "I have an invite", Enter your code.
- `inv-expired-code` the error on Enter your code.
- `inv-meet` You're invited, Sign in, Meet Sunday sauna.
- `inv-expired-meet` the error on Meet the family, "Ask them for a new code."

## How to get to it (user POV)

- Welcome: "I have an invite", then type the code from the message.
- A saunafam.com/join link opens the same path with the code filled in. Not mapped yet.

## Driving it with verify.mjs

Preconditions:

- A fresh install on Welcome: `node $V launch --fresh`.

- **Open.** Run `node $V tap-text "I have an invite"`. `find` reads "Enter your code" and "In this preview, any code opens Sunday sauna."
- **Type.** Run `node $V send '{"op":"draft","joinCode":"OLD4CODE"}'`. The field reads OLD4CODE.
- **Expired here.** Run `node $V send '{"op":"emit","event":"inviteExpired"}'`. `find` reads "That code has expired or doesn't exist."
- **Meet the family.** Run `node $V tap-text "Find my family"` ("You're invited", "Sunday sauna", "3 people are in"), `node $V tap-text "Continue"` (Sign in), `send '{"op":"draft","name":"Sam"}'`, `node $V tap-text "Continue"`. `find` reads "Meet Sunday sauna" and "Maya invited you."
- **Expired there.** Run `node $V send '{"op":"emit","event":"inviteExpired"}'`. `find` reads "That code has expired or doesn't exist. Ask them for a new code."
- **Proof.** Shots before and after each `emit`.

## Gotchas

- The preview accepts any code, so the server's answer for an expired code is
  played by `emit inviteExpired`. It sets the same error text the app shows for
  a real `notFound` from the server. The server path itself isn't covered.
- The `invitee` op starts this path with a code already in. Use it as setup only.
