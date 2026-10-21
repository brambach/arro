/**
 * Saunafam design tokens, Direction A "Löyly": birch, stone and ember
 * (design/saunafam-spec.md, section 2). Every color in the app lives here and
 * nowhere else; `node scripts/check-design.mjs` fails on a hex outside src/theme.
 *
 * This file has no imports on purpose, so the Node scripts (contrast check,
 * brand sheet, icons) can read the same values the app uses.
 */

/**
 * The palette, by material. Use these names in new code.
 *
 * One change from the spec, for contrast: the spec's stone `#8A837A` is 3.0:1 on
 * birch, too faint for 13 pt meta text and 12 pt small caps (AA needs 4.5:1). Text
 * uses `stone`, the same warm grey taken down to `#6C665F` (4.6:1 on birch, 5.2:1
 * on steam). The spec's value lives on as `pebble`, for things that aren't text:
 * empty dots, icon strokes at rest, the wall slats (3:1 is enough for graphics).
 */
export const palette = {
  /** Screen background. Also the native splash and the first JS frame. */
  birch: '#EFE6D8',
  /** Cards and sheets. */
  steam: '#F8F4EE',
  /** Trays, wells, empty slats. */
  aspen: '#E2D3BD',
  /** Hairlines and dividers. */
  grain: '#D3C1A6',
  /** Meta text, small caps, icons. See the note above. */
  stone: '#6C665F',
  /** The spec's stone. Graphics only, never text. */
  pebble: '#8A837A',
  /** Secondary text. */
  smoke: '#55504A',
  /** Primary text, and the dark timer room. */
  char: '#221F1C',
  /** The one accent: main button, active tab, kept weeks. Never small text. */
  ember: '#C9542A',
  /** Ember pressed, and ember-colored text on light backgrounds. */
  coal: '#9E3B1B',
  /** Heat glow, in gradients only. Never text. */
  glow: '#F2A35E',
  /** Cold plunge, freezes. */
  lake: '#5F8794',
  /** "Kept", where ember would be too loud. */
  moss: '#6E7F5C',
} as const;

export type PaletteName = keyof typeof palette;

/**
 * See-through colors, by what they're for. Each is a palette color at an
 * opacity, written out so React Native and SVG can take it directly.
 */
export const alpha = {
  /** Row separators inside cards (the mockup's grain at 55%). */
  hairline: 'rgba(190,168,136,0.55)',
  /** Steam text on the dark room: secondary lines ("Time to cool off at 7:27 PM"). */
  steam72: 'rgba(248,244,238,0.72)',
  /** Steam small caps on the dark room ("TRADITIONAL · 15 MIN"). */
  steam62: 'rgba(248,244,238,0.62)',
  /** Quiet steam actions on the dark room ("Cancel"). */
  steam60: 'rgba(248,244,238,0.6)',
  /** The wall slats behind a light screen. */
  wallLine: 'rgba(185,165,132,0.1)',
  /** The wall slats behind the dark room. */
  wallLineDark: 'rgba(248,244,238,0.035)',
  /** An empty ember dot: a little dent in the wood. */
  dotEmpty: 'rgba(158,120,80,0.16)',
  dotEmptyShade: 'rgba(90,60,30,0.25)',
  /** A pressed text action or row. */
  press: 'rgba(34,31,28,0.05)',
  pressOnDark: 'rgba(248,244,238,0.08)',
  /** The scrim under a sheet. */
  scrim: 'rgba(34,31,28,0.32)',
  /** The translucent button on the dark room ("Throw löyly"). */
  ashTop: 'rgba(255,236,214,0.2)',
  ashBottom: 'rgba(255,226,196,0.12)',
  /** Steam wisps over the light screens and over the dark room. */
  wispLight: 'rgba(205,184,154,0.55)',
  wispDark: 'rgba(248,244,238,0.09)',
  /** The timer room's panels and dialogs: char lifted a little. */
  roomPanel: 'rgba(48,43,39,1)',
  /** The scrim under a panel or dialog in the room. */
  roomScrim: 'rgba(14,12,11,0.55)',
  /** An unpicked chip in the room. */
  roomChip: 'rgba(248,244,238,0.09)',
  /** A hairline in the room. */
  roomLine: 'rgba(248,244,238,0.12)',
  transparent: 'rgba(0,0,0,0)',
  /** Birch at 0, for the fade under the status bar (fading to plain transparent would grey it). */
  birchClear: 'rgba(239,230,216,0)',
} as const;

/** The haze that drifts over the wall (steam-drift): glow and steam, at these opacities. */
export const haze = { warm: 0.16, light: 0.55 } as const;

/**
 * Member colors, handed out in join order: lake, brass, heather, moss,
 * lingonberry, ember. Ember goes last on purpose, so the founder's face never
 * reads as the main button. The server mirrors this list in
 * private.member_palette(); change both together, in a new migration.
 */
export const memberPalette = ['#5F8794', '#B58A3C', '#7B6A93', '#6E7F5C', '#B66A78', '#C9542A'] as const;
export const memberNames = ['lake', 'brass', 'heather', 'moss', 'lingonberry', 'ember'] as const;

/**
 * The color for the member who joined at `joinIndex` (0 = founder). Wraps after
 * the palette. Only for preview data: real members use the color the server stored.
 */
export function memberColor(joinIndex: number): string {
  return memberPalette[joinIndex % memberPalette.length];
}

/**
 * Initials on an avatar. Pure white: the mockup's warm #FBF8F3 is 2.97:1 on
 * brass, just under AA for large text; white is 3.15:1 and looks the same.
 */
export const onMember = '#FFFFFF';

/**
 * Gradients, as stops from top to bottom (or center to edge for radials).
 * Offsets are 0 to 1.
 */
export type Stop = { offset: number; color: string; opacity?: number };

export const gradients = {
  /** The solid ember button: a little lighter at the top, a little deeper below. */
  emberButton: [
    { offset: 0, color: '#D05C31' },
    { offset: 0.55, color: palette.ember },
    { offset: 1, color: '#BF4D25' },
  ],
  /** The same button pressed: coal. */
  coalButton: [
    { offset: 0, color: '#A6421F' },
    { offset: 0.55, color: palette.coal },
    { offset: 1, color: '#923518' },
  ],
  /** A lit ember dot, lit from the upper left. */
  emberDot: [
    { offset: 0, color: '#F6B37A' },
    { offset: 0.38, color: '#E06A35' },
    { offset: 0.62, color: palette.ember },
    { offset: 1, color: palette.coal },
  ],
  /** The dots of the timer arc, a touch hotter so they read on char. */
  arcDot: [
    { offset: 0, color: '#FFC48A' },
    { offset: 0.5, color: '#E56A33' },
    { offset: 1, color: palette.coal },
  ],
  /** The heat glow rising from the bottom of the dark room, at rest. */
  heat: [
    { offset: 0, color: '#E87038', opacity: 1 },
    { offset: 0.3, color: '#D65C2C', opacity: 0.75 },
    { offset: 0.6, color: '#BE4A22', opacity: 0.32 },
    { offset: 0.82, color: '#A03C1C', opacity: 0.08 },
    { offset: 1, color: '#A03C1C', opacity: 0 },
  ],
  /** The heart of the glow, closer to the floor. */
  heatCore: [
    { offset: 0, color: palette.glow, opacity: 0.75 },
    { offset: 0.55, color: palette.glow, opacity: 0.25 },
    { offset: 1, color: palette.glow, opacity: 0 },
  ],
  /** The glow cooled toward lake, when a session finishes. */
  cool: [
    { offset: 0, color: '#7FA3AE', opacity: 0.85 },
    { offset: 0.35, color: palette.lake, opacity: 0.5 },
    { offset: 0.7, color: '#4C6C77', opacity: 0.16 },
    { offset: 1, color: '#4C6C77', opacity: 0 },
  ],
} satisfies Record<string, Stop[]>;

/**
 * The heat steps. The glow warms one step every 5 minutes, ending close to ember:
 * each step is the opacity of the hot layer laid over the resting glow.
 */
export const heatSteps = [0, 0.2, 0.4, 0.6, 0.8, 1] as const;

/** The hot layer the heat steps fade in: brighter, closer to ember at the core. */
export const heatHot: Stop[] = [
  { offset: 0, color: '#FF9C55', opacity: 1 },
  { offset: 0.35, color: palette.ember, opacity: 0.7 },
  { offset: 0.7, color: palette.coal, opacity: 0.18 },
  { offset: 1, color: palette.coal, opacity: 0 },
];

/**
 * Wood. Each slat is a gradient plus a grain color drawn over it. `birch` is the
 * free wall; cedar, alder and charred pine are Plus woods (spec, Paid tier).
 * In every wood, a kept week is stained ember so it still reads as kept.
 */
export type WoodName = 'birch' | 'cedar' | 'alder' | 'charred_pine';

export type WoodFinish = {
  /** Gradient top to bottom. */
  stops: Stop[];
  /** Grain lines. */
  grain: string;
  grainOpacity: number;
  /** The light catching the top edge, and the shade on the bottom edge. */
  rimTop: string;
  rimBottom: string;
};

export type Wood = {
  /** An open slat: this week's, a paused week, the tray behind dots. */
  open: WoodFinish;
  /** A kept week. */
  kept: WoodFinish;
};

export const woods: Record<WoodName, Wood> = {
  birch: {
    open: {
      stops: [
        { offset: 0, color: '#E8DBC7' },
        { offset: 0.45, color: palette.aspen },
        { offset: 1, color: '#DAC9B0' },
      ],
      grain: '#9C7B52',
      grainOpacity: 0.35,
      rimTop: 'rgba(255,255,255,0.55)',
      rimBottom: 'rgba(158,120,80,0.18)',
    },
    kept: {
      stops: [
        { offset: 0, color: '#D4643A' },
        { offset: 0.5, color: palette.ember },
        { offset: 1, color: '#B84A24' },
      ],
      grain: '#FFD9B5',
      grainOpacity: 0.32,
      rimTop: 'rgba(255,214,170,0.45)',
      rimBottom: 'rgba(90,30,10,0.25)',
    },
  },
  cedar: {
    open: {
      stops: [
        { offset: 0, color: '#D2A882' },
        { offset: 0.45, color: '#C69A72' },
        { offset: 1, color: '#B78A63' },
      ],
      grain: '#7A4E2E',
      grainOpacity: 0.4,
      rimTop: 'rgba(255,232,206,0.45)',
      rimBottom: 'rgba(90,50,24,0.22)',
    },
    kept: {
      stops: [
        { offset: 0, color: '#C25A33' },
        { offset: 0.5, color: '#B04A26' },
        { offset: 1, color: '#963C1D' },
      ],
      grain: '#FFC9A0',
      grainOpacity: 0.3,
      rimTop: 'rgba(255,200,160,0.4)',
      rimBottom: 'rgba(70,24,8,0.28)',
    },
  },
  alder: {
    open: {
      stops: [
        { offset: 0, color: '#E2C29E' },
        { offset: 0.45, color: '#D8B48C' },
        { offset: 1, color: '#CAA57C' },
      ],
      grain: '#8C6440',
      grainOpacity: 0.36,
      rimTop: 'rgba(255,240,220,0.5)',
      rimBottom: 'rgba(110,70,36,0.2)',
    },
    kept: {
      stops: [
        { offset: 0, color: '#D0623A' },
        { offset: 0.5, color: '#C3552C' },
        { offset: 1, color: '#AC4723' },
      ],
      grain: '#FFD4AE',
      grainOpacity: 0.3,
      rimTop: 'rgba(255,210,170,0.42)',
      rimBottom: 'rgba(84,28,10,0.26)',
    },
  },
  charred_pine: {
    open: {
      stops: [
        { offset: 0, color: '#4A423B' },
        { offset: 0.45, color: '#3B3430' },
        { offset: 1, color: '#2F2925' },
      ],
      grain: '#8A7360',
      grainOpacity: 0.32,
      rimTop: 'rgba(255,236,214,0.14)',
      rimBottom: 'rgba(0,0,0,0.3)',
    },
    kept: {
      stops: [
        { offset: 0, color: '#C95A30' },
        { offset: 0.5, color: '#A94220' },
        { offset: 1, color: '#7E2F16' },
      ],
      grain: '#2A1D16',
      grainOpacity: 0.42,
      rimTop: 'rgba(255,190,140,0.4)',
      rimBottom: 'rgba(30,10,4,0.4)',
    },
  },
};

/** A frozen week: lake, with frost stipple over the grain. */
export const frozenFinish: WoodFinish = {
  stops: [
    { offset: 0, color: '#6C94A1' },
    { offset: 0.5, color: palette.lake },
    { offset: 1, color: '#557C89' },
  ],
  grain: '#E8F4F8',
  grainOpacity: 0.25,
  rimTop: 'rgba(230,245,250,0.4)',
  rimBottom: 'rgba(20,45,55,0.25)',
};
export const frost = '#FFFFFF';

/**
 * The stone mark, as the app draws it (the splash): the icon's stone and heat,
 * with the same colors as the masters in assets/brand (scripts/brand/icon-art.mjs).
 * React Native SVG has no blur, so soft light is drawn with radial gradients.
 */
export const stoneArt = {
  /** The body, lit from the upper left. */
  body: [
    { offset: 0, color: '#7B756F' },
    { offset: 0.42, color: '#48433F' },
    { offset: 0.8, color: '#2C2926' },
    { offset: 1, color: '#1C1A18' },
  ],
  /** Heat lighting the underside, brightest where it meets the heat. */
  under: [
    { offset: 0, color: '#D9612F', opacity: 0 },
    { offset: 0.55, color: '#E06A35', opacity: 0.22 },
    { offset: 0.85, color: '#F08848', opacity: 0.7 },
    { offset: 1, color: '#FFC284', opacity: 1 },
  ],
} satisfies Record<string, Stop[]>;

/** Single colors and peak opacities for the stone mark's smooth glows (SoftEllipse falloff). */
export const stoneGlow = {
  spill: { color: palette.glow, opacity: 0.48 },
  floor: { color: '#F08848', opacity: 1 },
  core: { color: '#FFE2BC', opacity: 1 },
  rim: { color: '#FFD7A6', opacity: 0.9 },
  sheen: { color: '#FFFFFF', opacity: 0.16 },
} as const;


/**
 * The Plus timer faces (spec, Paid tier). Löyly is the free face: the dotted
 * ember arc on char. Coal is direction B's ring on soot; Brass is direction
 * C's clock, a brass bezel around a cream dial, hung in the same dark room.
 */
export const faces = {
  coal: {
    /** The room behind the Coal face. */
    soot: '#141110',
    /** The empty track of the ring. */
    track: 'rgba(248,244,238,0.07)',
    /** The ring, from its start to its hot end. */
    ring: [
      { offset: 0, color: '#8E3418' },
      { offset: 0.6, color: '#D5592A' },
      { offset: 1, color: '#FF8F4F' },
    ],
    /** The numerals: warm ash, a little gold. */
    numerals: '#F3CFA4',
    head: '#FFE1BF',
  },
  brass: {
    bezel: [
      { offset: 0, color: '#D9B272' },
      { offset: 0.5, color: '#B08745' },
      { offset: 1, color: '#7E5C2A' },
    ],
    /** The dial face. */
    dial: '#F7F0E2',
    dialEdge: '#E6D9C1',
    /** Ticks, figures and the hand. */
    ink: palette.char,
    /** The wedge for the target, and the seconds hand. */
    wedge: palette.ember,
    wedgeOpacity: 0.78,
    pin: '#B08745',
  },
} as const;

/** The small tile behind each app icon choice, and the try-on's home screen. */
export const homeScreen = [
  { offset: 0, color: '#3E4A52' },
  { offset: 0.55, color: '#5D5A55' },
  { offset: 1, color: '#9A6B4A' },
] satisfies Stop[];

/**
 * Spacing: a 4 pt grid, and only these values. Padding, margin and gap take one
 * of these (`node scripts/check-design.mjs` checks).
 */
export const spaceScale = [4, 8, 12, 16, 20, 24, 32, 40, 56, 72] as const;
export type Space = (typeof spaceScale)[number];

export const space = {
  s4: 4,
  s8: 8,
  s12: 12,
  s16: 16,
  s20: 20,
  s24: 24,
  s32: 32,
  s40: 40,
  s56: 56,
  s72: 72,
} as const satisfies Record<string, Space>;

/** Layout constants built from the scale. */
export const layout = {
  /** Screen edge to card edge. */
  gutter: 16,
  /** Screen edge to a heading or small caps label (gutter plus 8). */
  inset: 24,
  /** Inside a card. */
  cardPad: 20,
  /** Between sections. */
  section: 32,
  /** The big ember button. */
  buttonTall: 64,
  /** The standard solid button. */
  button: 52,
  /** A list row with a subtitle, and without. */
  row: 60,
  rowCompact: 52,
  /** Minimum touch target. */
  touch: 44,
} as const;

export const radii = {
  /** A slat on the wall (small). */
  slatSmall: 6,
  /** A slat at full width, the day tiles, small tiles. */
  slat: 9,
  /** Text fields. */
  field: 12,
  /** Solid buttons: a soft rectangle, never a capsule. */
  button: 16,
  /** Sauna type tiles. */
  tile: 16,
  /** Cards. */
  card: 22,
  /** Sheets. */
  sheet: 28,
  /** Avatars and dots only. */
  round: 999,
} as const;

/**
 * Depth, as CSS box-shadow strings (React Native's boxShadow, new architecture).
 * The lifted card from the mockup: a half-point ring in char, a close contact
 * shadow and a long soft one that starts well below the edge, so it reads as
 * raised, not outlined.
 */
export const depth = {
  card:
    '0px 0px 0px 0.5px rgba(34,31,28,0.10), 0px 1px 1.5px 0px rgba(34,31,28,0.05), ' +
    '0px 10px 28px -12px rgba(34,31,28,0.20)',
  /** A sheet or a card that sits higher (the milestone card). */
  float:
    '0px 0px 0px 0.5px rgba(34,31,28,0.08), 0px 2px 6px 0px rgba(34,31,28,0.05), ' +
    '0px 30px 60px -30px rgba(34,31,28,0.36)',
  /** The ember button: a warm inner highlight, a contact shadow and an ember-tinted fall. */
  button:
    'inset 0px 1px 0px 0px rgba(255,220,190,0.35), 0px 1px 2px 0px rgba(120,40,15,0.25), ' +
    '0px 12px 24px -10px rgba(158,59,27,0.55)',
  /** The same button pressed: closer to the page. */
  buttonPressed:
    'inset 0px 1px 0px 0px rgba(255,200,170,0.22), 0px 1px 1px 0px rgba(90,30,10,0.3), ' +
    '0px 6px 14px -8px rgba(120,40,15,0.5)',
  /** The translucent button on the dark room. */
  ash: 'inset 0px 1px 0px 0px rgba(255,255,255,0.14), 0px 10px 24px -14px rgba(0,0,0,0.5)',
  /** A tray or well, pressed into the page (fields, day tiles). */
  sunk: 'inset 0px 1px 1.5px 0px rgba(90,60,30,0.12)',
  /** A field with focus: an ember ring. */
  focus: '0px 0px 0px 1.5px rgba(201,84,42,0.55)',
  /** An avatar: a faint edge and a light top. */
  avatar: 'inset 0px 0px 0px 0.5px rgba(0,0,0,0.08), inset 0px 1px 0px 0px rgba(255,255,255,0.18)',
  /** The toggle thumb. */
  thumb: '0px 0px 0px 0.5px rgba(34,31,28,0.08), 0px 2px 4px 0px rgba(34,31,28,0.18)',
  /** The tab bar's top edge. */
  tabBar: '0px -0.5px 0px 0px rgba(211,193,166,1)',
} as const;

/**
 * Semantic colors. New code can use these or the palette names; both are fine.
 */
export const colors = {
  ...palette,
  ...alpha,
  onMember,

} as const;

