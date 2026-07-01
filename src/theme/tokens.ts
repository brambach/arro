/**
 * Arro design tokens — final "clean native iOS" direction (Arro Mockups.dc.html).
 * Flat off-white surfaces, white cards with a hairline border and near-zero shadow,
 * orange used intentionally. No warm gradients, no heavy glows.
 */

export const colors = {
  // Surfaces
  screen: '#FBF9F5', // app / screen background
  card: '#FFFFFF', // cards
  cardAlt: '#FCFAF6', // tab bar, subtle panels

  // Borders & dividers (warm hairlines)
  border: '#F0E7DA', // card border
  divider: '#F2EBE0', // row divider inside cards
  dividerSoft: '#F3ECE1',

  // Text
  ink: '#221D17', // primary text
  inkSoft: '#6F665C', // secondary / emphasis body
  muted: '#877E72', // body / captions
  faint: '#948B80', // meta
  faint2: '#A89E90', // values, timestamps
  faint3: '#A99F90', // faint labels

  // Accent — used intentionally, not everywhere
  primary: '#F26A1B',
  primaryPress: '#D9631A',

  // Semantic states
  kept: '#4A8A5D',
  keptBg: '#E6F0E8',
  keptCheck: '#4C8A5F',
  freeze: '#4F8FC4',
  freezeBg: '#E6EEF5',
  freezeIcon: '#4F97CF',
  todayPillBg: '#FBE6D2',
  todayPillText: '#D9631A',

  // Tab bar
  tabInactive: '#A79E90',
  tabBarBg: '#FCFAF6',
  tabBarBorder: '#EFE6D9',

  white: '#FFFFFF',
  shadowWarm: '#463219', // rgb(70,50,25) — base for the micro card shadow
} as const;

/** One solid hue per person — avatar circles and status dots. */
export const memberColors = {
  bryce: { color: '#EF6C1A' },
  darcey: { color: '#DF6B96' },
  whit: { color: '#4F97CF' },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  card: 16,
  gutter: 22, // screen horizontal padding
  section: 18,
} as const;

export const radii = {
  pill: 999,
  icon: 8, // settings icon tiles
  button: 16,
  card: 20,
  cardLg: 22,
} as const;

/**
 * Shadows are deliberately minimal — cards rely on the hairline border, not depth.
 * card ≈ `0 1px 2px rgba(70,50,25,.05)`; button is a soft orange lift.
 */
export const shadows = {
  card: {
    shadowColor: colors.shadowWarm,
    shadowOpacity: 0.05,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  button: {
    shadowColor: colors.primary,
    shadowOpacity: 0.32,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
} as const;

export type MemberId = keyof typeof memberColors;
