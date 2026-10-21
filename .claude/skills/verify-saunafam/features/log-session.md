# Log a session

A person logs a sauna they already had: when, how long and what kind, and it
shows in the Feed and counts toward their week.

## Sub-features

- `log-open` the log form from Today.
- `log-fill` minutes chips, sauna type, place, temperature, cold plunge, people who sat with you.
- `log-save` "Save session" back to Today.
- `log-feed` the new card in the Feed.
- `log-yesterday` "Log yesterday's" opens the form on yesterday.

## How to get to it (user POV)

- Today: "Log one I already did".
- Today: the "Log yesterday's" row ("Forgot one? It still counts"), shown while yesterday is open.
- The timer's Done (see [timer.md](timer.md)) opens the same form as "Log this session".

## Driving it with verify.mjs

Preconditions:

- Onboarded, on Today: `node $V send '{"op":"reset"}' '{"op":"tab","tab":"Today"}' '{"op":"scroll","y":0}'`.

- **Open.** Run `node $V tap-text "Log one I already did"`. `find` reads "Log a session", "When", "Minutes", "Sauna" and "Save session".
- **Minutes.** Tap the 20 chip with `node $V tap 163 443`. The minutes field reads 20.
- **Type.** Run `node $V tap-text "Wood-fired"`.
- **More fields.** Place, temperature and cold plunge need the keyboard: `node $V send '{"op":"dev","command":"form-fill","args":{"place":"Lake cabin","temp":"185","cold":"1"}}'`. People who sat with you: `'{"op":"dev","command":"form-pick","args":{"n":"2"}}'`. Scroll the form with `'{"op":"dev","command":"form-scroll","args":{"y":"950"}}'`.
- **Save.** Run `node $V tap-text "Save session"`. The form closes onto Today.
- **Stored.** Run `node $V tap-text "Feed"`, then scroll with `send '{"op":"scroll","y":500}'`. `find` reads "You had a sauna", the day and start time, and "20 min · Wood-fired".
- **Proof.** Shots of Today before, the filled form, and the Feed card.

## Gotchas

- The preview family's calendar runs a day ahead of the simulator's clock. A
  session saved for the device's "Today" shows as "Yesterday" in the Feed. Sam
  already has a session that day, and two in one day count once, so Today stays
  at "2 of 3". Prove the save with the Feed card, not the count.
- Logs in the preview live in memory. A relaunch drops them.
- To leave the form without saving, send `'{"op":"dev","command":"form-discard"}'`. It slides the form away like closing it.
