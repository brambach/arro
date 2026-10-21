# Saunafam verification map

The flows a person goes through in Saunafam, and how to prove each one in the
simulator with `scripts/verify.mjs`. Read this first, then the feature file.

## Baseline

- Dev client built for the current native fingerprint (`node $V fingerprint`).
- `node $V up --sim "iPhone 17 Pro" --os 26.2 --fresh` from the repo root, no env files.
- `node $V doctor` all `ok`, with "taps available".
- The app runs on the local preview family: Sam (you), Maya and Jo in "Sunday
  sauna", 8 weeks together, week 9, Sam on 2 of 3. Its calendar runs a day
  ahead of the simulator's clock, so the device's "Today" is the family's
  "Yesterday".
- Text size `large` (the default) unless the flow says otherwise.

## Conventions

- `V=.claude/skills/verify-saunafam/scripts/verify.mjs`, run from the repo root.
- Act with real taps: `tap-text` by the visible label, `tap X Y` only for icons.
- Set state and type text with driver ops (`send`). Say so when an op stands in for a person.
- Check each step with `node $V find` before the next tap. Screens animate for about a second.
- After `text-size`, find things again. Scroll offsets change with the size.
- Never tap with anything but the helper.

## Proof

- One folder per flow, numbered shots: before the action, after it, and a
  second view of the stored result.
- Quote what `find` read for each claim, and look at the image for clipping.
- A step you couldn't do goes in the report with the command you tried and
  what was missing. Don't swap in a different path and call it the same proof.

## Features

- [Onboarding](onboarding.md): starting a family from Welcome to Today.
- [Log a session](log-session.md): "Log one I already did", the form, the Feed card.
- [Timer](timer.md): Start a session, the running timer, Done into the log form.
- [Family](family.md): Family members from Me, the invite sheet, closing it with a swipe.
- [Plus sheet](plus-sheet.md): Saunafam Plus from Settings, a preview purchase, the Settings row after.
- [Expired invite](expired-invite.md): "I have an invite", the error on Join code and on Meet the family.
- [Dynamic Type](dynamic-type.md): switching text sizes and what to check at each.
