# Plus sheet

A person opens Saunafam Plus, sees what it adds and the prices, and buys it for
the whole family. Build 9 ships with Plus off on the server.

## Sub-features

- `plus-open` the sheet from Settings.
- `plus-prices` Yearly and Founding family, "Get Plus for $24.99 a year".
- `plus-buy` a purchase and the thank-you state.
- `plus-row` the Settings row reads "Plus" afterward.
- `plus-tips` the tip jar.
- `plus-states` failed, owned, lapsed (driver `plusStore`).

## How to get to it (user POV)

- Settings, "Saunafam Plus" (also "Leave a tip").
- "Keep it" on the Wall, Timer face and App icon screens, and "See Plus" on Heat log.

## Driving it with verify.mjs

Preconditions:

- Plus on: `node $V send '{"op":"scenario","id":"plusEnabled"}' '{"op":"reset"}' '{"op":"nav","route":"Settings"}'`. This stands in for `app_config.plus_enabled`, which is false in build 9.

- **Row.** Scroll Settings until `node $V find "Saunafam Plus"` shows it (around `send '{"op":"scroll","y":300}'`).
- **Open.** Run `node $V tap-text "Saunafam Plus"`. `find` reads "PREVIEW, NO REAL PURCHASE", "Saunafam Plus", "One purchase covers everyone in Sunday sauna."
- **Prices.** Swipe up twice: `node $V drag 200 700 200 200`, `node $V drag 200 700 200 250`. `find` reads "$24.99 a year", "$59.99 once", "Get Plus for $24.99 a year", the tip prices.
- **Buy.** Run `node $V tap-text "Get Plus for"`. `find` reads "Thank you. The wall is yours." and "Everyone in Sunday sauna has Plus now."
- **Stored.** Run `node $V tap-text "Done"`. Settings shows "Saunafam Plus" with the value "Plus".
- **Other states.** `send '{"op":"plusStore","behavior":"<behavior>"}'` before buying. The behaviors are `PreviewBehavior` in `src/state/purchases.ts`.

## Gotchas

- Without the `plusEnabled` scenario, Settings has no Plus section. That's
  correct for build 9, not a bug.
- `tap-text "Saunafam Plus"` needs the same-case match: the group label above
  it reads "SAUNAFAM PLUS".
- Nothing here touches StoreKit or RevenueCat.
