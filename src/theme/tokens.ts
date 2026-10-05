/**
 * Arro design tokens — "Paper and clay" (design/visual-direction.md, direction A).
 * Warm paper surfaces, dark ink, flat cards with a hairline border and no shadow.
 * One muted clay accent, kept for the main action on a screen and the active tab.
 */

export const colors = {
  // Surfaces
  screen: '#F5F1E8', // app / screen background (paper)
  card: '#FFFDF8', // cards
  cardAlt: '#F5F1E8', // tab bar, subtle panels

  // Borders & dividers (warm hairlines)
  border: '#E6DFD2', // card border
  borderStrong: '#D6CEC0', // radio rings, inputs that need a firmer edge
  divider: '#ECE5D9', // row divider inside cards
  dividerSoft: '#ECE5D9',
  track: '#E9E2D6', // empty part of rings and progress bars

  // Text
  ink: '#2B2722', // primary text
  inkSoft: '#575049', // secondary / emphasis body
  muted: '#6B645B', // body / captions
  faint: '#7D766C', // meta
  faint2: '#8C8478', // values, timestamps
  faint3: '#8C8478', // faint labels
  chevron: '#B3AA9C', // row chevrons

  // Accent — clay, used rarely
  primary: '#A65A3C',
  primaryPress: '#8A4A31',
  accentTint: '#F2E6DD', // selected chip background

  // Semantic states
  kept: '#5D7A63',
  keptBg: '#E8ECE3',
  keptCheck: '#5D7A63',
  freeze: '#5E7C93',
  freezeBg: '#E6EAEE',
  freezeIcon: '#5E7C93',
  // "Still has today" is neutral on purpose: not moving yet is not an alert.
  todayPillBg: '#EDE6DA',
  todayPillText: '#575049',

  // Tab bar
  tabInactive: '#958D81',
  tabBarBg: '#F5F1E8',
  tabBarBorder: '#E6DFD2',

  photoPlaceholder: '#CFC6B8',

  white: '#FFFFFF',
  shadowWarm: '#463219', // rgb(70,50,25), base for shadows if one is ever needed
} as const;

/**
 * One solid hue per person — avatar circles and status dots. Handed out in
 * join order: the founder gets the first, the next person to join the second.
 * The server keeps a copy in private.member_palette()
 * (supabase/migrations/20261005000001_schema.sql), hands out the first colour no
 * current member has, and stores the hex on the member. Change both together.
 */
export const memberPalette = ['#EF6C1A', '#DF6B96', '#4F97CF', '#4FA06B', '#7B7FD0', '#D9A23A'] as const;

/**
 * The colour for the member who joined at `joinIndex` (0 = founder). Wraps after the palette.
 * Only for the fake data: real members use the colour the server stored.
 */
export function memberColor(joinIndex: number): string {
  return memberPalette[joinIndex % memberPalette.length];
}

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  card: 18,
  gutter: 20, // screen horizontal padding
  section: 28,
} as const;

export const radii = {
  pill: 999,
  icon: 8, // settings icon tiles
  button: 14,
  card: 16,
  cardLg: 16,
} as const;

/**
 * No shadows: cards are paper sections edged by a hairline, and the button is a
 * flat block of clay. Kept as objects so screens can still spread them.
 */
export const shadows = {
  card: {
    shadowColor: colors.shadowWarm,
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
  button: {
    shadowColor: colors.shadowWarm,
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
} as const;
