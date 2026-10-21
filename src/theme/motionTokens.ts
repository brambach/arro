/**
 * The motion numbers, with no imports, so Node scripts (the brand sheet) can
 * read them too. motion.ts re-exports these and builds the easings from them;
 * use motion.ts in the app.
 */

/** Cubic bezier control points, so the web, the docs and the brand sheet can quote them. */
export const curves = {
  settle: [0.22, 1, 0.36, 1],
  ember: [0.34, 1.25, 0.64, 1],
  /** ease-out (the CSS keyword), for utility. */
  utility: [0, 0, 0.58, 1],
  /** A symmetric ease for fades out and lifts that leave. */
  leave: [0.4, 0, 0.2, 1],
  /** Breathing loops. */
  breathe: [0.37, 0, 0.63, 1],
  /** A burst that flies out fast and slows. */
  burst: [0.16, 1, 0.3, 1],
} as const satisfies Record<string, readonly [number, number, number, number]>;

export const durations = {
  settle: 1100,
  ember: 520,
  utility: 240,
} as const;

/** Between items in one arrival. */
export const stagger = 70;

/**
 * Springs for physical moves (withSpring configs). Each one is tuned to settle
 * without a visible wobble: weight, not bounce.
 */
export const springs = {
  /** A slat dropping onto the wall: a small settle at the end. */
  slat: { damping: 15, stiffness: 190, mass: 1 },
  /** The button's frame growing into the full screen (the door closes). */
  morph: { damping: 26, stiffness: 150, mass: 1 },
  /** Press feedback on buttons and tiles. */
  press: { damping: 24, stiffness: 460, mass: 0.6 },
  /** The toggle's thumb. */
  toggle: { damping: 20, stiffness: 340, mass: 0.8 },
} as const;


/** The ambient loops' numbers (motion.ts `loops` adds the easing). */
export const loopTokens = {
  glowBreathe: { name: 'glow-breathe', duration: 6000, from: 0.55, to: 0.75 },
  steamDrift: { name: 'steam-drift', duration: 20000, distance: 24 },
} as const;

/**
 * The key moments in one line each, for the brand sheet and the docs. A test
 * (src/theme/__tests__/theme.test.ts) checks these against `moments` in motion.ts.
 */
export const momentSummary = [
  { moment: 'Splash: wisps draw', ms: '0 to 600', curve: 'settle', key: 'splash.wisps' },
  { moment: 'Splash: stone settles 0.96 to 1', ms: '400 to 1000', curve: 'settle', key: 'splash.stone' },
  { moment: 'Splash: wordmark, spacing 2 to 0', ms: '700 to 1200', curve: 'settle', key: 'splash.wordmark' },
  { moment: 'Splash: lift 8 pt and fade', ms: '1200 to 1500', curve: 'leave', key: 'splash.exit' },
  { moment: 'Returning: fade into Today', ms: '400', curve: 'utility', key: 'splash.returning' },
  { moment: 'Today arrival, 70 ms apart', ms: '1100', curve: 'settle', key: 'todayArrival' },
  { moment: 'Door closes: room to char', ms: '800', curve: 'settle', key: 'doorCloses.room' },
  { moment: 'Door closes: glow rises', ms: '1400', curve: 'settle', key: 'doorCloses.glowRise' },
  { moment: 'Finish: glow cools to lake', ms: '700', curve: 'leave', key: 'finishCool.glow' },
  { moment: 'Check-in: ember dot ignites', ms: '520', curve: 'ember', key: 'checkInIgnite' },
  { moment: 'Week kept: slat fills', ms: '700', curve: 'settle', key: 'weekKept.fill' },
  { moment: 'Week kept: 10 sparks', ms: '900', curve: 'burst', key: 'weekKept.sparks' },
  { moment: 'Milestone: a slat every 50 ms', ms: 'spring slat', curve: 'spring', key: 'milestoneWall' },
  { moment: 'Plus: wood crossfade per slat', ms: '400', curve: 'settle', key: 'plusWoodCrossfade' },
  { moment: 'Waiting on the App Store: button dots', ms: '600, 200 apart', curve: 'breathe', key: 'waiting' },
  { moment: 'Plus: a purchase re-grains the wall', ms: '900', curve: 'settle', key: 'plusLanded' },
  { moment: 'Throw löyly: wisps burst', ms: '1600', curve: 'burst', key: 'loylyBurst' },
] as const;
