# Dynamic Type

People who set a large text size in iOS get every screen reflowed: text wraps
instead of cutting off, and from AX1 up, list rows put their icon above the text.

## Sub-features

- `dt-xxxl` the largest standard size.
- `dt-ax` the accessibility sizes, AX1 to AX5.
- `dt-rows` `ListRow` stacking at AX sizes (Today's "Log yesterday's", Family members).

## How to get to it (user POV)

- iOS Settings, Accessibility, Display & Text Size, Larger Text. The app follows without a relaunch.

## Driving it with verify.mjs

Preconditions:

- Any screen up. `node $V doctor` reports the size before the run.

- **Switch.** Run `node $V text-size ax5` (or `default`, `xxxl`, `ax1`, `ax3`). It reads the size back from the simulator and fails if it didn't take.
- **Find again.** Scroll with `send '{"op":"scroll","y":<n>}'` and check `node $V find` until the part you want is on screen. On Today at AX5, "Log yesterday's" sits around y 1150.
- **Check words.** At AX5, `find` should read whole words on each line ("yesterday's", not "yesterday'" over "s"). Look at the shot for clipping too.
- **Back.** Run `node $V text-size default`. `down` also puts back the size it found.

## Gotchas

- Scroll offsets that work at one size don't work at another.
- OCR splits a heading across lines into separate entries. Read them top to bottom.
- At AX5 the tab labels sometimes read "To...", "W..." and sometimes "Today", "Week" (seen in two runs on 21 October, cause not traced). Shoot twice before calling it a bug or a fix.
