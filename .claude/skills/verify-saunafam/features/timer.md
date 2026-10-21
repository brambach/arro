# Timer

A person starts a session timer in the sauna, sees it count, and ends it, which
opens the log form with the minutes filled in.

## Sub-features

- `timer-start` "Start a session" on Today.
- `timer-run` the count, "IN THE HEAT · ROUND 1", the cool-off time, "Throw löyly".
- `timer-rounds` "Add a round".
- `timer-done` Done opens "Log this session".
- `timer-cancel` Cancel.

## How to get to it (user POV)

- Today: "Start a session".

## Driving it with verify.mjs

Preconditions:

- On Today at the top: `node $V send '{"op":"reset"}' '{"op":"tab","tab":"Today"}' '{"op":"scroll","y":0}'`.

- **Start.** Run `node $V tap-text "Start a session"`. `find` reads "IN THE HEAT · ROUND 1", a count like "0:02", the sauna type and target ("WOOD-FIRED · 15 MIN" if the last log was wood-fired) and "Time to cool off at <time>".
- **Running.** Wait and read again: `node $V shot <dir>/timer/02.png --wait 5` then `node $V find`. The count has moved on by about 5 seconds.
- **Done.** Run `node $V tap-text "Done"`. `find` reads "Log this session", the start time, "Minutes" with the elapsed minutes, and "Sessions under 10 minutes are saved but don't count toward the week."
- **Save.** Run `node $V tap-text "Save session"`. Back on Today.
- **Long timer, for stills.** `send '{"op":"timer","ago":860}' '{"op":"nav","route":"Timer","params":{}}'` shows a timer 14:20 in. That's setup, not proof of the start.

## Gotchas

- The timer screen is dark, so the tap calibration needs words on screen. It
  has plenty, but recalibrate on a light screen if the window moved.
- The type and target come from the last session logged on this phone.
- Swipe down is off on the timer (`gestureEnabled: false`). Use Cancel or Done.
