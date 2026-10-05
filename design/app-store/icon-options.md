# Launcher icon options

**Picked: A** (Oct 2026). `assets/` now has the clay tile with the paper "a",
and `scripts/generate-icons.mjs` uses those colours.

Before that, `assets/icon.png` was the white lowercase-"a" route mark on Arro
orange `#F26A1B`, from the direction before Paper and clay. All three options keep the
same mark (geometry from `scripts/generate-icons.mjs`) and only change colour,
so the brand stays recognisable. Previews (512 px, square; iOS rounds the
corners) are in `icon-options/`.

| Option | Tile | Mark | Preview |
| --- | --- | --- | --- |
| **A. Clay tile** | clay `#A65A3C` | paper `#FBF9F5` | `icon-options/a-clay-tile.png` |
| **B. Paper tile** | paper `#F5F1E8` | clay `#A65A3C` | `icon-options/b-paper-tile.png` |
| **C. Paper, ink and a clay dot** | paper `#F5F1E8` | ink `#2B2722`, plus a small clay dot after the "a" | `icon-options/c-paper-ink-dot.png` |

## Which one

**A is the one I'd pick.** It's the easiest to find on a home screen, it's the
same idea as today's icon in the new colour, and clay as the one solid block
matches how the app uses it (the one main button). B is the closest to the
app's screens but light icons fade on light wallpapers and next to Notes or
Mail. C is the most "Paper and clay" in spirit; the dot hints at "every day
forward", but it's the least legible at small sizes.

## What regenerating changes

`scripts/generate-icons.mjs` writes, in `assets/`:

- `icon.png` (1024, the iOS icon app.json points at)
- `splash-icon.png`, `favicon.png`
- `android-icon-background.png`, `-foreground.png`, `-monochrome.png`

Running it needs `npm install --no-save sharp`. The option A files in `assets/`
were drawn without sharp, by a one-off CoreGraphics script using the same
geometry and colours, so the script hasn't been run with the new colours yet.
app.json's `android.adaptiveIcon.backgroundColor` is now clay `#A65A3C` too.

## Later, optional

Expo SDK 57 accepts `ios.icon` as `{ light, dark, tinted }` images or an Icon
Composer `.icon` folder, for iOS's dark and tinted home screens. A flat 1024
PNG is enough for TestFlight and v1; iOS makes its own dark and tinted versions.
