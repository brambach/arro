import { alpha, memberNames, memberPalette, onMember, palette } from './tokens';

/**
 * Every text and background pair the design uses, with the smallest text that
 * appears in it. `node scripts/check-contrast.mjs` checks each against WCAG AA:
 * 4.5:1 for body text, 3:1 for large text.
 *
 * Large text is 18 pt and up, or 14 pt and up at weight 600 or more. WCAG
 * says "bold" for the second; this counts SF Pro Semibold (600) as bold, the
 * way Apple's own contrast guidance treats it. A pair that's only allowed at
 * large sizes says so in `rule`, and the components keep to it.
 *
 * Add a pair here whenever a screen puts text on a new background.
 */
export type TextPair = {
  fg: string;
  bg: string;
  /** Where it's used. */
  use: string;
  /** The smallest size and weight this pair is used at. */
  size: number;
  weight: 400 | 500 | 600;
  /** A usage rule the components follow, if the pair only works one way. */
  rule?: string;
  /** For see-through text, what it sits on (alpha is composited over this). */
  over?: string;
};

const p = palette;

export const textPairs: TextPair[] = [
  // Light screens: birch.
  { fg: p.char, bg: p.birch, use: 'titles, body on the screen', size: 12, weight: 400 },
  { fg: p.smoke, bg: p.birch, use: 'secondary text on the screen', size: 13, weight: 400 },
  { fg: p.stone, bg: p.birch, use: 'small caps labels, meta, tab labels', size: 12, weight: 400 },
  { fg: p.coal, bg: p.birch, use: 'ember-colored text', size: 13, weight: 400 },
  { fg: p.coal, bg: p.birch, use: 'active tab label (its icon is ember: 3.6:1, fine for a graphic)', size: 12, weight: 600, rule: 'ember is never text on light backgrounds; ember-colored text is coal' },
  // Cards: steam.
  { fg: p.char, bg: p.steam, use: 'card text, row names', size: 12, weight: 400 },
  { fg: p.smoke, bg: p.steam, use: 'card body, row values', size: 13, weight: 400 },
  { fg: p.stone, bg: p.steam, use: 'row subtitles, stat labels, quiet values', size: 12, weight: 400 },
  { fg: p.coal, bg: p.steam, use: 'the streak number, ember-colored text in cards', size: 13, weight: 400 },
  { fg: p.moss, bg: p.steam, use: '"Kept" in rows', size: 15, weight: 600, rule: 'moss text only at 15 pt and up, weight 600' },
  { fg: p.lake, bg: p.steam, use: '"Frozen" in rows', size: 15, weight: 600, rule: 'lake text only at 15 pt and up, weight 600' },
  // Trays: aspen (slats, day tiles, unpicked tiles).
  { fg: p.char, bg: p.aspen, use: 'today in the day tiles, tile labels', size: 12, weight: 600 },
  { fg: p.smoke, bg: p.aspen, use: 'small caps on a slat ("Week 8"), day letters', size: 12, weight: 400, rule: 'on aspen, labels take smoke, never stone' },
  // Ember: the button, picked tiles, kept days.
  { fg: p.steam, bg: p.ember, use: 'button label, picked tile, kept day letters', size: 15, weight: 600, rule: 'text on ember is steam at 15 pt and up, weight 600 (the button is 17/600)' },
  { fg: p.steam, bg: p.coal, use: 'pressed button label', size: 15, weight: 600 },
  { fg: p.steam, bg: p.lake, use: 'frozen tile label', size: 15, weight: 600, rule: 'text on lake is steam at 15 pt and up, weight 600' },
  // The dark room: char.
  { fg: p.steam, bg: p.char, use: 'timer numerals, actions', size: 15, weight: 400 },
  { fg: alpha.steam72, bg: p.char, over: p.char, use: '"Time to cool off at 7:27 PM"', size: 15, weight: 400 },
  { fg: alpha.steam62, bg: p.char, over: p.char, use: 'small caps in the room', size: 12, weight: 600 },
  { fg: alpha.steam60, bg: p.char, over: p.char, use: '"Cancel" in the room', size: 17, weight: 500 },
  // The room's panels and dialogs (M8): char lifted a little.
  { fg: p.steam, bg: alpha.roomPanel, use: 'dialog titles and buttons in the room', size: 15, weight: 600 },
  { fg: alpha.steam72, bg: alpha.roomPanel, over: alpha.roomPanel, use: 'dialog body in the room', size: 15, weight: 400 },
  { fg: alpha.steam62, bg: alpha.roomPanel, over: alpha.roomPanel, use: '"Target", "Sauna" small caps on the room panel', size: 12, weight: 600 },
  { fg: alpha.steam60, bg: alpha.roomPanel, over: alpha.roomPanel, use: '"Cancel session", "Discard" in a room dialog', size: 17, weight: 600 },
  { fg: alpha.steam72, bg: p.char, over: p.char, use: 'an unpicked chip in the room', size: 15, weight: 600 },
  // The log sheet (M8), birch.
  { fg: p.char, bg: p.aspen, use: 'sauna tile names on aspen', size: 15, weight: 600 },
  // Avatars: initials on every member color.
  ...memberPalette.map(
    (color, i): TextPair => ({
      fg: onMember,
      bg: color,
      use: `avatar initial on ${memberNames[i]}`,
      size: 15,
      weight: 600,
      rule: 'avatar initials are 15 pt and up, weight 600',
    }),
  ),
];
