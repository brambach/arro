#!/usr/bin/env node
/**
 * Takes the raw simulator captures the App Store set is built from, with no
 * taps: the dev build's DevDriver (src/dev/DevDriver.tsx) polls this script for
 * commands, and `xcrun simctl io` takes the screenshots.
 *
 *   EXPO_PUBLIC_DEV_DRIVER=1 EXPO_PUBLIC_DEV_DRIVER_URL=http://localhost:8098 \
 *     CI=1 npx expo start --port 8085          # in another terminal, no .env.local
 *   node scripts/app-store/capture.mjs 6.9 <iPhone 17 Pro Max udid>
 *   node scripts/app-store/capture.mjs 6.3 <iPhone 17 Pro udid>
 *   node scripts/app-store/capture.mjs 6.3 <udid> 1-timer   # just one
 *
 * The timer shot relaunches the app in a made-up time zone where the clock
 * reads 9:41 PM at that moment, so its "Time to cool off at 9:41 PM" matches
 * the status bar. The simulator needs the dev client installed and booted. Writes
 * design/app-store/screenshots/raw/<size>/<n>-<name>.png. Then run
 * scripts/app-store-shots.mjs. Dev builds only; nothing here ships.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import http from 'node:http';
import { join } from 'node:path';
import { repoRoot } from '../lib/load-theme.mjs';
import { samplePhoto } from './sample-photo.mjs';

const [size, udid, only] = process.argv.slice(2);
if (!size || !udid) {
  console.error('usage: node scripts/app-store/capture.mjs <6.9|6.3> <udid> [shot]');
  process.exit(1);
}
const PORT = Number(process.env.DRIVER_PORT ?? 8098);
const METRO = process.env.METRO_URL ?? 'http://localhost:8085';
const out = join(repoRoot, 'design/app-store/screenshots/raw', size);
mkdirSync(out, { recursive: true });

// ─── The driver server ───────────────────────────────────────────────────────

const queue = [];
let lastPoll = 0;
const photo = samplePhoto();
const server = http
  .createServer((req, res) => {
    if (req.url === '/next') {
      lastPoll = Date.now();
      const next = queue.shift();
      if (!next) {
        res.statusCode = 204;
        return res.end();
      }
      res.setHeader('content-type', 'application/json');
      return res.end(JSON.stringify(next));
    }
    if (req.url === '/photo.png') {
      res.setHeader('content-type', 'image/png');
      return res.end(photo);
    }
    res.statusCode = 404;
    res.end();
  })
  .listen(PORT);

const sleep = (s) => new Promise((r) => setTimeout(r, s * 1000));
/** Queue commands and wait until the app has taken them all. */
async function send(...commands) {
  queue.push(...commands);
  while (queue.length) await sleep(0.1);
}
const simctl = (...args) => execFileSync('xcrun', ['simctl', ...args], { stdio: ['ignore', 'pipe', 'pipe'] }).toString();
function shoot(name) {
  const file = join(out, `${name}.png`);
  simctl('io', udid, 'screenshot', file);
  console.log(file);
}

// ─── The states ──────────────────────────────────────────────────────────────

/**
 * How far each screen is scrolled, in points, per size: Today shows the streak
 * card and the whole family list, the log form shows "Sat with someone?", and
 * Feed starts at the shared session with the photo.
 */
const SCROLL = {
  '6.9': { today: 0, log: 1000, feed: 372 },
  '6.3': { today: 128, log: 1000, feed: 372 },
};
if (!SCROLL[size]) throw new Error(`size must be ${Object.keys(SCROLL).join(' or ')}`);

const family = [{ op: 'reset' }, { op: 'scenario', id: 'family' }];
const tab = (t, y = 0) => [{ op: 'tab', tab: t }, { op: 'scroll', y }];

const shots = {
  // Timer in the dark room at 14:32 of a 15 minute traditional round.
  '1-timer': async () => {
    await send(...family, { op: 'timer', ago: 860 }, { op: 'nav', route: 'Timer', params: {} });
    await sleep(4);
    // Set it again just before the shot, so the numerals read 14:32 exactly.
    // The room redraws once a second, so give it 1.2 s: the shot lands at 14:32.7.
    await send({ op: 'timer', ago: 871.5 });
    await sleep(1.2);
    const at = Date.now();
    shoot('1-timer');
    // Picking the scenario again clears its timer.
    await send({ op: 'reset' }, { op: 'scenario', id: 'family' });
    await sleep(1);
    return at;
  },
  // Today: 8 weeks together, your slat at 2 of 3, the family list.
  '2-today': async () => {
    await send(...family, ...tab('Today', 0));
    await sleep(1);
    await send({ op: 'scroll', y: Number(process.env.TODAY_SCROLL ?? SCROLL[size].today) });
    await sleep(2.5);
    shoot('2-today');
  },
  // Week: the wall of slats with Maya's freeze.
  '3-week': async () => {
    await send(...family, ...tab('ThisWeek'));
    await sleep(3);
    shoot('3-week');
  },
  // The log form with Maya and Jo picked: three people in one session.
  '4-log': async () => {
    await send(...family, ...tab('Today'), { op: 'nav', route: 'LogSession', params: {} });
    await sleep(2.5);
    await send(
      { op: 'dev', command: 'form-minutes', args: { v: '25' } },
      { op: 'dev', command: 'form-fill', args: { place: 'Lake cabin', temp: '185', cold: '1' } },
      { op: 'dev', command: 'form-pick', args: { n: '2' } },
    );
    await sleep(0.5);
    await send({ op: 'dev', command: 'form-scroll', args: { y: process.env.LOG_SCROLL ?? String(SCROLL[size].log) } });
    await sleep(1.5);
    shoot('4-log');
    await send({ op: 'dev', command: 'form-discard' });
    await sleep(1.5);
  },
  // Feed: the shared session with a photo, a cheer and two comments.
  '5-feed': async () => {
    await send({ op: 'photo', uri: `http://localhost:${PORT}/photo.png` }, ...family, ...tab('Feed'));
    await sleep(1);
    await send({ op: 'scroll', y: Number(process.env.FEED_SCROLL ?? SCROLL[size].feed) });
    await sleep(Number(process.env.FEED_WAIT ?? 2.5));
    shoot('5-feed');
    await send({ op: 'photo', uri: null });
  },
  // The 12-week milestone card, wall built.
  '6-milestone': async () => {
    await send(...family, { op: 'nav', route: 'Milestone', params: { kind: 'family', weeks: 12 } });
    await sleep(7);
    shoot('6-milestone');
    await send({ op: 'reset' });
  },
};

// ─── Run ─────────────────────────────────────────────────────────────────────

/**
 * Launches the app fresh and waits for its first poll. `tz` is a POSIX TZ
 * string for the app's process (simctl passes SIMCTL_CHILD_* through).
 */
async function launch(tz) {
  try {
    simctl('terminate', udid, 'com.arrofamily.arro');
  } catch {
    // Not running.
  }
  await sleep(1);
  const env = tz ? { ...process.env, SIMCTL_CHILD_TZ: tz } : process.env;
  execFileSync('xcrun', ['simctl', 'launch', udid, 'com.arrofamily.arro', '--initialUrl', METRO], { env, stdio: 'ignore' });
  console.log(`waiting for the app to load the bundle${tz ? ` (TZ ${tz})` : ''}...`);
  const started = Date.now();
  lastPoll = 0;
  while (Date.now() - lastPoll > 1000) {
    if (Date.now() - started > 180_000) throw new Error('The app never polled the driver. Is Metro running with EXPO_PUBLIC_DEV_DRIVER=1?');
    await sleep(0.5);
  }
  await send({ op: 'onboard' });
  await sleep(3);
}

/**
 * A POSIX TZ string whose clock reads `target` (seconds after midnight) at `at`,
 * so the timer's "Time to cool off at 9:41 PM" agrees with the 9:41 status bar.
 */
function zoneReading(target, at) {
  const utc = (at.getUTCHours() * 3600 + at.getUTCMinutes() * 60 + at.getUTCSeconds()) % 86400;
  let west = (((utc - target) % 86400) + 86400) % 86400;
  if (west > 43200) west -= 86400;
  const sign = west < 0 ? '-' : '+';
  const a = Math.abs(west);
  const two = (n) => String(n).padStart(2, '0');
  return `SFM${sign}${two(Math.floor(a / 3600))}:${two(Math.floor((a % 3600) / 60))}:${two(a % 60)}`;
}

try {
  // No dev chrome: the dev client's first-run menu and its floating Tools button stay away.
  try {
    simctl('terminate', udid, 'com.arrofamily.arro');
  } catch {
    // Not running.
  }
  for (const [key, on] of [
    ['EXDevMenuIsOnboardingFinished', 'YES'],
    ['EXDevMenuShowFloatingActionButton', 'NO'],
    ['EXDevMenuShowsAtLaunch', 'NO'],
    ['EXDevMenuMotionGestureEnabled', 'NO'],
  ]) {
    simctl('spawn', udid, 'defaults', 'write', 'com.arrofamily.arro', key, '-bool', on);
  }
  simctl('status_bar', udid, 'override', '--time', '9:41', '--batteryState', 'charged', '--batteryLevel', '100', '--cellularBars', '4', '--wifiBars', '3');
  const names = Object.keys(shots).filter((n) => !only || n === only);
  if (names.some((n) => n !== '1-timer')) {
    await launch();
    for (const name of names) if (name !== '1-timer') await shots[name]();
  }
  if (names.includes('1-timer')) {
    // The shot lands about `lead` seconds after launch; aim it at 9:41:05 PM, and
    // go again with the measured lead if the clock missed 9:41.
    let lead = 20;
    for (let attempt = 0; attempt < 3; attempt++) {
      const launchedAt = Date.now();
      const tz = zoneReading(21 * 3600 + 41 * 60 + 5, new Date(launchedAt + lead * 1000));
      await launch(tz);
      const shotAt = await shots['1-timer']();
      const actual = (shotAt - launchedAt) / 1000;
      // The cool-off line is the shot plus the 27 seconds left: it must read 9:41 PM.
      const coolOff = 21 * 3600 + 41 * 60 + 5 + (actual - lead) + 27;
      if (coolOff >= 21 * 3600 + 41 * 60 && coolOff < 21 * 3600 + 42 * 60) break;
      console.log(`the clock read ${(coolOff / 60 - 21 * 60).toFixed(2)} min past 9 PM at the cool-off; again with a ${actual.toFixed(1)} s lead`);
      lead = actual;
    }
  }
} finally {
  server.close();
}
