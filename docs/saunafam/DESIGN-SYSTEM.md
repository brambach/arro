# Saunafam design system (Löyly)

For the agents building the screens. Everything here exists in `src/theme/` and
`src/components/` as of M6 and M7. Open the Design sheet in a dev build to see
it all running: Settings, Design sheet, or start Metro with
`EXPO_PUBLIC_DEV_SCREEN=DesignSheet npx expo start --dev-client`. The static
version is `design/brand/brand-sheet.png`.

## Rules the checks enforce

```bash
npm run typecheck && npm test && npm run lint
node scripts/check-contrast.mjs   # every text/background pair, WCAG AA
node scripts/check-design.mjs     # hex outside src/theme, off-scale spacing, arrow glyphs
node scripts/check-design.mjs src/screens/TodayScreen.tsx   # just your files
```

- No color literal (hex, rgb, rgba) outside `src/theme/`. Import a token.
- Padding, margin and gap only take 0, 4, 8, 12, 16, 20, 24, 32, 40, 56 or 72.
  Use `space.s16` and friends, or `layout.*`.
- No `→ › ↗ »` anywhere in `src/` or `site/public`. Rows don't get chevrons.
- New text on a new background? Add the pair to `src/theme/contrast.ts` and run
  the contrast check.
- Shared values: write with `.set()` (`scale.set(withSpring(1, springs.press))`).
  The React Compiler lint rejects `.value =` in handlers.
- In SVG gradients, put alpha in `stopOpacity`, never in an rgba `stopColor`.
  iOS draws rgba stops as black.

## Tokens (`src/theme/tokens.ts`)

```ts
import { palette, alpha, space, layout, radii, depth, memberColor } from '../theme/tokens';
```

| Token | Hex | Use |
|---|---|---|
| `birch` | `#EFE6D8` | screen background, the native splash |
| `steam` | `#F8F4EE` | cards, sheets; text on ember and char |
| `aspen` | `#E2D3BD` | trays, wells, empty slats |
| `grain` | `#D3C1A6` | hairlines |
| `stone` | `#6C665F` | meta text, small caps, icons at rest |
| `pebble` | `#8A837A` | graphics only (never text) |
| `smoke` | `#55504A` | secondary text; labels on aspen |
| `char` | `#221F1C` | primary text, the dark timer room |
| `ember` | `#C9542A` | the one accent: main button, active tab icon, kept weeks |
| `coal` | `#9E3B1B` | ember pressed, and any ember-colored text on a light background |
| `glow` | `#F2A35E` | heat, gradients only |
| `lake` | `#5F8794` | cold plunge, freezes |
| `moss` | `#6E7F5C` | "Kept" in rows |

Two changes from the spec, both for contrast. `stone` is darker than the spec's
`#8A837A` (that's 3.0:1 on birch, too faint for 13 pt meta); the spec value is
`pebble`. Avatar initials are white (`onMember`), since the spec's warm white is
2.97:1 on brass.

Usage rules from the contrast check:

- Ember is never text on light backgrounds. Use `coal` (the active tab label is coal, its icon ember).
- Moss and lake text only at 15 pt and up, weight 600.
- Text on ember or lake: steam, 15 pt and up, weight 600.
- On aspen (slats, day tiles) small labels take `smoke`, not `stone`.
- In the dark room, secondary text is `alpha.steam72`, small caps `alpha.steam62`, quiet actions `alpha.steam60`.

Member colors: `memberPalette` (lake, brass, heather, moss, lingonberry, ember),
in join order, mirrored by the server's `private.member_palette()`. Use the color
the server stored; `memberColor(i)` is for preview data only.

Spacing and layout: `space.s4` to `space.s72`; `layout.gutter` 16 (screen edge to
card), `layout.inset` 24 (screen edge to a heading), `layout.cardPad` 20,
`layout.section` 32, `layout.buttonTall` 64, `layout.button` 52, `layout.row` 60.

Radii: `slatSmall` 6, `slat` 9, `field` 12, `button` 16, `tile` 16, `card` 22,
`sheet` 28, `round` for avatars and dots. Never a capsule button.

Depth (`boxShadow` strings): `depth.card` (the lifted card, ring and shadow in
char), `depth.float` (sheets, the milestone card), `depth.button`,
`depth.sunk` (trays), `depth.focus`.

Old Arro names (`colors.ink`, `colors.primary`, `type.meta`, `radii.pill`,
`shadows.card` and so on) still work and map onto Löyly, so old screens compile.
They're marked `@deprecated`. Don't use them in rebuilt screens.

## Type (`src/theme/typography.ts`)

```tsx
<Text style={type.title}>Good evening, Sam</Text>
<Text style={type.caption}>This week</Text>
```

| Style | Size | Face |
|---|---|---|
| `display` | 64/64 | Fraunces 600 |
| `title` | 34/38 | Fraunces 600 |
| `heading` (`headingStrong`) | 24/28 | Fraunces 400 (600) |
| `body` (`bodyStrong`) | 17/24 | SF Pro 400 (600) |
| `bodySmall` (`bodySmallStrong`) | 15/21 | SF Pro, smoke |
| `label` (`labelStrong`) | 13/18 | SF Pro, stone |
| `caption` | 12/16 | SF Pro 600, uppercase, 0.8 tracking, stone |
| `timer` | 96/104 | Fraunces 400, steam |
| `tab` | 12/16 | the caption's size without caps, tab labels only |

Fraunces is the soft cut (SOFT 100, WONK 0) at optical size 48, two static files
built by `scripts/brand/build-fonts.py`. Don't set `fontWeight` on a Fraunces
style; pick `fonts.display` or `fonts.displaySemibold`. `maxFontScale` caps
Dynamic Type for the big styles (`maxFontSizeMultiplier={maxFontScale.title}`).

Changing numbers in Fraunces go through `FixedDigits`, since Fraunces has no
tabular figures:

```tsx
<FixedDigits value="12:40" accessibilityLabel="12 minutes 40 seconds" />
<FixedDigits value={String(weeks)} variant="display" color={palette.coal} />
```

## Motion (`src/theme/motion.ts`)

```ts
import { timing, springs, moments, stagger, easing, useReduceMotion, emberPeakMs } from '../theme/motion';
```

| Token | Value | Use |
|---|---|---|
| `timing.settle` | 1100 ms, bezier(0.22, 1, 0.36, 1) | one arrival per screen, once |
| `timing.ember` | 520 ms, bezier(0.34, 1.25, 0.64, 1) | check-ins only |
| `timing.utility` | 240 ms, ease-out | small state changes |
| `springs.slat`, `morph`, `press`, `toggle` | see the file | physical moves |
| `stagger` | 70 ms | between items in an arrival |
| `loops.glowBreathe` | 6 s, opacity 0.55 to 0.75 | the heat glow |
| `loops.steamDrift` | 20 s, 24 pt | the haze, the splash wisps |

`moments` has every key moment from the spec with its numbers:
`moments.splash`, `todayArrival`, `doorCloses`, `finishCool`, `checkInIgnite`,
`weekKept`, `milestoneWall`, `plusWoodCrossfade`, `loylyBurst`. Read durations
from there; don't type a number into a component.

Today's arrival, for example:

```tsx
const { rise, stagger: gap, ...settle } = moments.todayArrival;
const o = useSharedValue(0);
useEffect(() => {
  o.set(withDelay(index * gap, withTiming(1, settle)));
}, []);
const s = useAnimatedStyle(() => ({ opacity: o.value, transform: [{ translateY: (1 - o.value) * rise }] }));
```

Transform and opacity only. `useReduceMotion()` is live (null until the first
answer, so you can hold instead of flashing). With Reduce Motion on, show the
finished state and crossfade with `timing.utility`. Ambient loops pause when the
screen isn't visible: `useScreenVisible()` does the focus and app-state work.

`springTouchdownMs(springs.slat)` and `emberPeakMs` tell you when a spring first
reaches its target and when the ember curve peaks, so haptics can fire then.

## Haptics (`src/theme/haptics.ts`)

```ts
import { haptics } from '../theme/haptics';
haptics.timerStart();
```

| Moment | Function | Haptic |
|---|---|---|
| timer start | `timerStart` | medium |
| 5-minute tick | `fiveMinuteTick` | light |
| löyly | `loyly` | soft |
| finish | `finish` | success |
| save | `save` | success |
| cheer | `cheer` | light |
| week kept | `weekKept` | success |
| milestone | `milestone` | heavy, then success 180 ms later |
| errors | `error` | warning |

Fire them when the motion arrives: `EmberDots` and `Slat` take `onIgnitePeak`,
`Slat` takes `onFilled`, `SlatWall` takes `onSlatDown` and `onBuilt`.

## Components

All in `src/components/`. Each file's header comment has the details.

| Component | Props | Notes |
|---|---|---|
| `Backdrop` | `tone?: 'light' \| 'dark'`, `haze?`, `seed?` | First child of a screen's root. The wall slats and the steam-drift haze. `Screen` adds it for birch screens. |
| `Card` | `padding?` (scale), `float?`, `onPress?`, `background?` | Steam, radius 22, `depth.card`. Pressable with a spring when `onPress` is set. |
| `SolidButton` | `title`, `onPress`, `icon?`, `size?: 'regular' \| 'large'`, `tone?: 'ember' \| 'ash'`, `disabled?`, `fill?` | The primary action. `large` is the 64 pt "Start a session". `ash` is the translucent button in the dark room. |
| `TextAction` | `label`, `onPress`, `tone?: 'ink' \| 'coal' \| 'steam' \| 'steamDim'`, `size?` | Secondary actions: plain text, 600, no underline. |
| `ListGroup` / `ListRow` | group: `inset?: 'leading' \| 'text'`; row: `title`, `subtitle?`, `value?`, `valueTone?: 'default' \| 'kept' \| 'quiet'`, `leading?`, `trailing?`, `onPress?` | Whole-width tap, value on the right only when there is one. |
| `Field` | `label`, `hint?`, `error?`, plus every `TextInput` prop | Steam well, ember focus ring, coal errors. |
| `Toggle` | `value`, `onValueChange`, `accessibilityLabel` | Not the system Switch. |
| `Avatar` | `name`, `color`, `photoUri?`, `size?` | The color circle is drawn first at full size; the photo fades over it. |
| `EmberDots` / `EmberDot` | `count`, `filled`, `size?: 'large' \| 'small' \| 'mini'`, `onIgnitePeak?` | A dot that turns lit after mount ignites with the ember overshoot. |
| `Slat` | `state: 'kept' \| 'frozen' \| 'paused' \| 'current' \| 'open'`, `wood?`, `height?` (21 wall, 54 Today), `dots?`, `label?`, `seed?`, `onFilled?`, `onIgnitePeak?`, `woodDelay?` | Going from `current` to `kept` fills ember from the left. Changing `wood` crossfades. |
| `SlatWall` | `weeks: { state, dots? }[]` (oldest first), `wood?`, `slatHeight?`, `build?`, `onSlatDown?`, `onBuilt?` | Stacks from the bottom, a bench gap every fourth slat. `build` plays the milestone drop, 50 ms apart. |
| `HeatGlow` | `warmth?` (0 to 5), `cooled?`, `rise?`, `breathe?`, `width?`, `height?` | The timer room's glow. `rise` on mount is the door closing; `cooled` is Done. |
| `SteamWisps` | `width`, `height`, `tone?`, `columns?`, `base?`, `rise?`, `draw?`, `burstKey?`, `sway?` | Drawn wisps that drift; bump `burstKey` to throw löyly. |
| `SparkBurst` | `burstKey` | 10 sparks from a point, for "Week kept, together". Off with Reduce Motion. |
| `FixedDigits` | `value`, `variant?`, `color?` | Fixed-width Fraunces numerals. |
| `Icon` | `name`, `size?`, `color?` | The custom set on a 24 pt grid, stroke 1.75. Names below. |
| `TabBar` | navigator props | Already wired in `MainTabs`. |
| `brand/StoneMark`, `brand/Wordmark` | `width`; `fontSize`, `spacing?` | The icon's stone and the outlined "saunafam". Use the wordmark on Welcome. |
| `AnimatedSplash` | `ready`, `returning`, `onDone` | Wired in `App.tsx`. Don't mount it elsewhere. |

Icons: tabs `today week feed me`; sauna types `traditional woodFired infrared
steam smoke banya other`; things `stone stoneFilled slat snowflake heart
heartFilled ladle gear camera photo droplet thermometer timer bell family
calendar pause pencil share personPlus`; controls `close check plus minus back
more`. `back` is for a screen's top bar only.

A row on Today, as the mockup draws it:

```tsx
<ListGroup inset="leading">
  <ListRow
    title="Maya"
    subtitle="Tonight · 20 min · 85°C"
    leading={<Avatar name="Maya" color={member.color} size={38} />}
    trailing={<EmberDots count={3} filled={3} size="mini" />}
    value="Kept"
    valueTone="kept"
    onPress={() => navigation.navigate('SessionDetail', { id })}
  />
</ListGroup>
```

The week card:

```tsx
<Card>
  <Slat state="current" height={54} dots={{ filled: 2, count: 3 }} label="Week 8" onIgnitePeak={haptics.save} />
</Card>
```

## Assets

- Icon masters: `assets/brand/icon.svg` (over 60 px), `icon-small.svg` (21 to
  60), `icon-tiny.svg` (20 and under), `favicon.svg`, `icon-dark.svg`,
  `icon-tinted.svg`, the Android layers. Written by
  `scripts/brand/build-icon-masters.mjs` from `scripts/brand/stone-icon.mjs`.
- Every PNG: `node scripts/generate-icons.mjs` (into `assets/brand/out/`, the
  `assets/*.png` paths in `app.json`, and `site/public/`).
- Wordmark: `assets/brand/wordmark.svg`, from `scripts/brand/build-fonts.py`.
- Proof sheets: `node scripts/render-brand.mjs` (needs Chrome).
