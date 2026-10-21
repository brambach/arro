#!/usr/bin/env node
/**
 * Drives the Saunafam dev client in the iOS Simulator for verification. See
 * ../SKILL.md for the workflow; `verify.mjs help` lists the commands.
 *
 * State for the run (PIDs, the simulator, what this run changed) lives in
 * $SFV_STATE (default /tmp/saunafam-verify) and is removed by `down`. Builds
 * are cached by native fingerprint in $SFV_CACHE (default
 * ~/Library/Caches/saunafam-verify). Evidence goes wherever `shot` is told,
 * never inside the state dir, so `down` can't eat it.
 */
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { closeSync, cpSync, existsSync, realpathSync, mkdirSync, openSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import http from 'node:http';
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '../../../..');
const BUNDLE_ID = 'com.arrofamily.arro';
const STATE_DIR = resolve(process.env.SFV_STATE ?? '/tmp/saunafam-verify');
const STATE_FILE = join(STATE_DIR, 'state.json');
const CACHE = resolve(process.env.SFV_CACHE ?? join(homedir(), 'Library/Caches/saunafam-verify'));
const METRO_PORT = Number(process.env.SFV_METRO_PORT ?? 8085);
const DRIVER_PORT = Number(process.env.SFV_DRIVER_PORT ?? 8098);
const CLICK = process.env.SFV_CLICK ?? '/tmp/m10tools/click';
const DRAG = process.env.SFV_DRAG ?? '/tmp/m10tools/drag';
const ENV_FILES = ['.env', '.env.local', '.env.development', '.env.development.local'];
const SIZES = [
  'extra-small', 'small', 'medium', 'large', 'extra-large', 'extra-extra-large', 'extra-extra-extra-large',
  'accessibility-medium', 'accessibility-large', 'accessibility-extra-large', 'accessibility-extra-extra-large',
  'accessibility-extra-extra-extra-large',
];
const SIZE_ALIASES = { default: 'large', xxxl: 'extra-extra-extra-large', ax1: 'accessibility-medium', ax3: 'accessibility-extra-large', ax5: 'accessibility-extra-extra-extra-large' };
// The ops src/dev/DevDriver.tsx understands. A typo here would otherwise be taken and silently ignored.
const OPS = new Set(['onboard', 'invitee', 'draft', 'scenario', 'nav', 'tab', 'reset', 'scroll', 'back', 'emit', 'openCard', 'cheerCard', 'log', 'cheer', 'comment', 'photo', 'timer', 'dev', 'plusStore', 'emitArg']);

const norm = (t) => t.toLowerCase().replace(/[‘’]/g, "'").replace(/\s+/g, ' ').trim();
const sleep = (s) => new Promise((r) => setTimeout(r, s * 1000));
const fail = (msg) => {
  console.error(`verify: ${msg}`);
  process.exit(1);
};
const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...opts });
const simctl = (...args) => run('xcrun', ['simctl', ...args]);
const tryRun = (fn) => {
  try {
    return fn();
  } catch {
    return null;
  }
};

// ─── State ──────────────────────────────────────────────────────────────────

const readState = () => (existsSync(STATE_FILE) ? JSON.parse(readFileSync(STATE_FILE, 'utf8')) : {});
function writeState(patch) {
  mkdirSync(STATE_DIR, { recursive: true });
  const next = { ...readState(), ...patch };
  writeFileSync(STATE_FILE, JSON.stringify(next, null, 2));
  return next;
}
const alive = (pid) => !!pid && tryRun(() => process.kill(pid, 0)) !== null;
function needState() {
  const s = readState();
  if (!s.udid) fail(`no run in ${STATE_DIR}. Start one with \`verify.mjs up --sim "<name>"\`.`);
  return s;
}

function parseArgs(argv) {
  const flags = {};
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) rest.push(a);
    else if (i + 1 < argv.length && !argv[i + 1].startsWith('--')) flags[a.slice(2)] = argv[++i];
    else flags[a.slice(2)] = true;
  }
  return { flags, rest };
}

// ─── Simulators ─────────────────────────────────────────────────────────────

function allSims() {
  const { devices } = JSON.parse(simctl('list', 'devices', 'available', '-j'));
  return Object.entries(devices).flatMap(([runtime, list]) =>
    list.map((d) => ({ name: d.name, udid: d.udid, state: d.state, os: runtime.replace(/.*iOS-/, '').replace(/-/g, '.') })),
  );
}

/** A name ("iPhone 17 Pro") or a UDID; `os` ("26.2") breaks a tie between runtimes. */
function resolveSim(want, os) {
  const sims = allSims();
  const byId = sims.find((d) => d.udid === want);
  if (byId) return byId;
  let hits = sims.filter((d) => d.name === want && (!os || d.os === os));
  if (hits.length > 1) {
    const booted = hits.filter((d) => d.state === 'Booted');
    if (booted.length === 1) hits = booted;
  }
  if (hits.length === 1) return hits[0];
  const list = sims.filter((d) => d.name.startsWith('iPhone')).map((d) => `  ${d.name} (iOS ${d.os}) ${d.udid} ${d.state}`).join('\n');
  fail(hits.length ? `"${want}" matches ${hits.length} simulators; add --os <version>:\n${list}` : `no simulator named "${want}"${os ? ` on iOS ${os}` : ''}:\n${list}`);
}
const simState = (udid) => allSims().find((d) => d.udid === udid)?.state;

// ─── Native build ───────────────────────────────────────────────────────────

function refuseEnvFiles(root) {
  const found = ENV_FILES.filter((f) => existsSync(join(root, f)));
  if (found.length) fail(`${found.join(', ')} exists in ${root}. Verification runs on the preview family with no Supabase env; move it aside first (don't print it).`);
}

/**
 * The native fingerprint (@expo/fingerprint) minus the generated ios/ folder,
 * which prebuild rewrites and .gitignore keeps out of git. Same hash, same
 * dev client: only JS changed, so Metro serves the new code to the old build.
 */
async function nativeFingerprint(root) {
  const req = createRequire(join(root, 'package.json'));
  const { createFingerprintAsync } = req('@expo/fingerprint');
  const fp = await createFingerprintAsync(root, { platforms: ['ios'] });
  const kept = fp.sources.filter((s) => s.filePath !== 'ios');
  return createHash('sha1').update(JSON.stringify(kept.map((s) => [s.type, s.filePath ?? s.id, s.hash]))).digest('hex');
}
// The real path: /tmp is a symlink, and the fingerprint (like lsof's cwd) sees through it.
const rootOf = (flags) => realpathSync(resolve(flags.root ?? REPO));
const cachedApp = (fp) => join(CACHE, 'builds', fp, 'Saunafam.app');

function runLogged(cmd, args, cwd, log, env = process.env) {
  mkdirSync(dirname(log), { recursive: true });
  const fd = openSync(log, 'w');
  const r = spawnSync(cmd, args, { cwd, env, stdio: ['ignore', fd, fd] });
  closeSync(fd);
  if (r.status !== 0) fail(`${cmd} ${args.slice(0, 3).join(' ')} failed (exit ${r.status}). Log: ${log}`);
}

async function build({ flags }) {
  const root = rootOf(flags);
  refuseEnvFiles(root);
  const fp = await nativeFingerprint(root);
  const app = cachedApp(fp);
  if (existsSync(app) && !flags.force) {
    console.log(`native fingerprint ${fp}: reusing ${app}`);
    return;
  }
  const sim = resolveSim(flags.sim ?? readState().udid ?? 'iPhone 17 Pro', flags.os);
  const logs = join(CACHE, 'logs');
  const env = { ...process.env, CI: '1' };
  console.log(`native fingerprint ${fp}: no cached build. Prebuild (log ${logs}/prebuild-${fp}.log)...`);
  runLogged('npx', ['expo', 'prebuild', '--platform', 'ios', '--clean'], root, join(logs, `prebuild-${fp}.log`), env);
  const ws = readdirSync(join(root, 'ios')).find((f) => f.endsWith('.xcworkspace'));
  if (!ws) fail(`prebuild left no .xcworkspace in ${root}/ios`);
  const scheme = basename(ws, '.xcworkspace');
  // Outside ios/, which prebuild --clean deletes, so the next native change builds incrementally.
  const dd = join(CACHE, 'dd', createHash('sha1').update(root).digest('hex').slice(0, 8));
  console.log(`xcodebuild ${scheme} Debug for ${sim.name} (log ${logs}/xcodebuild-${fp}.log). This takes a while the first time...`);
  runLogged(
    'xcodebuild',
    ['-workspace', join(root, 'ios', ws), '-scheme', scheme, '-configuration', 'Debug', '-sdk', 'iphonesimulator',
      '-destination', `platform=iOS Simulator,id=${sim.udid}`, '-derivedDataPath', dd, 'build'],
    root,
    join(logs, `xcodebuild-${fp}.log`),
    env,
  );
  const products = join(dd, 'Build/Products/Debug-iphonesimulator');
  const built = readdirSync(products).find((f) => f.endsWith('.app'));
  if (!built) fail(`no .app in ${products}`);
  const after = await nativeFingerprint(root);
  if (after !== fp) fail(`the fingerprint moved during the build (${fp} to ${after}); something outside ios/ changed. Run build again.`);
  const tmp = `${dirname(app)}.tmp`;
  rmSync(tmp, { recursive: true, force: true });
  mkdirSync(tmp, { recursive: true });
  cpSync(join(products, built), join(tmp, 'Saunafam.app'), { recursive: true });
  rmSync(dirname(app), { recursive: true, force: true });
  renameSync(tmp, dirname(app));
  console.log(`built ${app}`);
}

// ─── Driver server (the app's DevDriver polls it) ───────────────────────────

function serve() {
  const queue = [];
  let lastPoll = 0;
  http
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
      if (req.url === '/status') {
        res.setHeader('content-type', 'application/json');
        return res.end(JSON.stringify({ queue: queue.length, lastPollMsAgo: lastPoll ? Date.now() - lastPoll : null }));
      }
      if (req.method === 'POST' && req.url === '/push') {
        let body = '';
        req.on('data', (c) => (body += c));
        req.on('end', () => {
          const ops = JSON.parse(body);
          queue.push(...(Array.isArray(ops) ? ops : [ops]));
          res.end('ok');
        });
        return;
      }
      res.statusCode = 404;
      res.end();
    })
    .listen(DRIVER_PORT, '127.0.0.1', () => console.log(`driver on ${DRIVER_PORT}`));
}

function httpGet(url, timeoutMs = 1500) {
  return new Promise((ok) => {
    const req = http.get(url, { timeout: timeoutMs }, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => ok({ status: res.statusCode, body }));
    });
    req.on('timeout', () => req.destroy());
    req.on('error', () => ok(null));
  });
}
async function driverStatus() {
  const r = await httpGet(`http://127.0.0.1:${DRIVER_PORT}/status`);
  return r?.status === 200 ? JSON.parse(r.body) : null;
}

async function send({ rest }) {
  needState();
  const ops = rest.map((a) => {
    const op = tryRun(() => JSON.parse(a));
    if (!op || !OPS.has(op.op)) fail(`not a driver op: ${a}. Known: ${[...OPS].join(', ')}`);
    return op;
  });
  if (!ops.length) fail('send needs at least one JSON op');
  await new Promise((ok, no) => {
    const req = http.request(`http://127.0.0.1:${DRIVER_PORT}/push`, { method: 'POST' }, (res) => res.resume().on('end', ok));
    req.on('error', no);
    req.end(JSON.stringify(ops));
  }).catch(() => fail(`the driver server isn't up on ${DRIVER_PORT}. Run \`verify.mjs up\`.`));
  const started = Date.now();
  for (;;) {
    const s = await driverStatus();
    if (s && s.queue === 0) return;
    if (Date.now() - started > 20_000) fail(`the app didn't take ${s?.queue ?? '?'} queued op(s) in 20 s. Is it running and polling? Run \`verify.mjs doctor\`.`);
    await sleep(0.1);
  }
}

// ─── Metro ──────────────────────────────────────────────────────────────────

function listenerPid(port) {
  const out = tryRun(() => run('lsof', ['-nP', `-iTCP:${port}`, '-sTCP:LISTEN', '-t']));
  return out ? Number(out.trim().split('\n')[0]) : null;
}
function cwdOf(pid) {
  const out = tryRun(() => run('lsof', ['-a', '-p', String(pid), '-d', 'cwd', '-Fn']));
  return out?.split('\n').find((l) => l.startsWith('n'))?.slice(1) ?? null;
}
/** Kills a process group this run started (spawned detached, so its PID is the group). */
function killGroup(pid) {
  if (!alive(pid)) return;
  tryRun(() => process.kill(-pid, 'SIGTERM'));
  tryRun(() => process.kill(pid, 'SIGTERM'));
}

async function startMetro(root, clear) {
  const s = readState();
  if (s.metro && alive(s.metro.pid)) {
    if (s.metro.root === root && !clear) return;
    killGroup(s.metro.pid);
    for (let i = 0; i < 50 && listenerPid(METRO_PORT); i++) await sleep(0.2);
  }
  const holder = listenerPid(METRO_PORT);
  if (holder) fail(`port ${METRO_PORT} is held by pid ${holder} (cwd ${cwdOf(holder)}), which this run didn't start. Stop it yourself or set SFV_METRO_PORT.`);
  refuseEnvFiles(root);
  if (!existsSync(join(root, 'node_modules'))) fail(`${root} has no node_modules. Run npm ci there (or clone the repo's with cp -cR when the lockfiles match).`);
  // Only the driver's EXPO_PUBLIC_* values: nothing from the caller's shell reaches the bundle.
  const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('EXPO_PUBLIC_')));
  Object.assign(env, { CI: '1', EXPO_PUBLIC_DEV_DRIVER: '1', EXPO_PUBLIC_DEV_DRIVER_URL: `http://localhost:${DRIVER_PORT}` });
  const log = join(STATE_DIR, 'metro.log');
  const fd = openSync(log, 'w');
  const args = ['expo', 'start', '--port', String(METRO_PORT), ...(clear ? ['--clear'] : [])];
  const child = spawn('npx', args, { cwd: root, env, detached: true, stdio: ['ignore', fd, fd] });
  child.unref();
  closeSync(fd);
  writeState({ metro: { pid: child.pid, root, port: METRO_PORT, log } });
  console.log(`Metro starting from ${root} (pid ${child.pid}, log ${log})`);
  for (let i = 0; i < 240; i++) {
    const r = await httpGet(`http://localhost:${METRO_PORT}/status`);
    if (r?.body?.includes('packager-status:running')) return;
    if (!alive(child.pid)) fail(`Metro exited. Log: ${log}`);
    await sleep(0.5);
  }
  fail(`Metro never answered /status on ${METRO_PORT}. Log: ${log}`);
}

// ─── App install and launch ─────────────────────────────────────────────────

function binaryHash(app) {
  const h = createHash('sha1');
  for (const f of ['Saunafam', 'Saunafam.debug.dylib', 'Info.plist']) if (existsSync(join(app, f))) h.update(readFileSync(join(app, f)));
  return h.digest('hex');
}
const installedApp = (udid) => tryRun(() => simctl('get_app_container', udid, BUNDLE_ID, 'app').trim());

async function launch({ flags }) {
  const s = needState();
  const root = s.metro?.root ?? REPO;
  const app = cachedApp(await nativeFingerprint(root));
  if (!existsSync(app)) fail(`no dev client for ${root}'s native fingerprint. Run \`verify.mjs build --root ${root}\`.`);
  tryRun(() => simctl('terminate', s.udid, BUNDLE_ID));
  if (flags.fresh) tryRun(() => simctl('uninstall', s.udid, BUNDLE_ID));
  const have = installedApp(s.udid);
  if (!have || binaryHash(have) !== binaryHash(app)) {
    console.log(`installing ${app}`);
    simctl('install', s.udid, app);
  }
  // No dev chrome in the evidence: the dev menu's first-run sheet and floating button stay away.
  for (const [key, on] of [['EXDevMenuIsOnboardingFinished', 'YES'], ['EXDevMenuShowFloatingActionButton', 'NO'], ['EXDevMenuShowsAtLaunch', 'NO'], ['EXDevMenuMotionGestureEnabled', 'NO']]) {
    simctl('spawn', s.udid, 'defaults', 'write', BUNDLE_ID, key, '-bool', on);
  }
  statusBar(s.udid);
  const env = flags.tz ? { ...process.env, SIMCTL_CHILD_TZ: flags.tz } : process.env;
  run('xcrun', ['simctl', 'launch', s.udid, BUNDLE_ID, '--initialUrl', `http://localhost:${METRO_PORT}`], { env });
  const before = Date.now();
  console.log('launched; waiting for the app to poll the driver (the first bundle can take a minute)...');
  for (;;) {
    const st = await driverStatus();
    if (st?.lastPollMsAgo != null && Date.now() - st.lastPollMsAgo > before + 500) break;
    if (Date.now() - before > 300_000) fail('the app never polled the driver. Check the Metro log and `verify.mjs doctor`.');
    await sleep(0.5);
  }
  console.log('app is polling');
}

function statusBar(udid) {
  simctl('status_bar', udid, 'clear');
  // Discharging at 100%: a plain full battery. "charged" draws it green with a bolt.
  simctl('status_bar', udid, 'override', '--time', '9:41', '--dataNetwork', 'wifi', '--wifiMode', 'active', '--wifiBars', '3',
    '--cellularMode', 'active', '--cellularBars', '4', '--batteryState', 'discharging', '--batteryLevel', '100');
}

const simulatorAppPids = () => (tryRun(() => run('pgrep', ['-x', 'Simulator']))?.trim().split('\n').filter(Boolean).map(Number)) ?? [];

async function up({ flags }) {
  const prev = readState();
  if (prev.udid && flags.sim && resolveSim(flags.sim, flags.os).udid !== prev.udid) fail(`a run on ${prev.simName} is already up. \`verify.mjs down\` first.`);
  const sim = prev.udid ? { udid: prev.udid, name: prev.simName } : resolveSim(flags.sim ?? 'iPhone 17 Pro', flags.os);
  const root = rootOf(flags);
  if (!prev.udid) {
    const state = simState(sim.udid);
    writeState({ udid: sim.udid, simName: sim.name, bootedByUs: state !== 'Booted', contentSizeBefore: null, simulatorAppPid: null });
  }
  if (simState(sim.udid) !== 'Booted') {
    console.log(`booting ${sim.name} ${sim.udid}`);
    simctl('boot', sim.udid);
  }
  simctl('bootstatus', sim.udid, '-b');
  const st = readState();
  if (st.contentSizeBefore == null) writeState({ contentSizeBefore: simctl('ui', sim.udid, 'content_size').trim() });
  if (!flags.headless && !simulatorAppPids().length) {
    // -g: open without activating, so it doesn't take focus. Taps need its window.
    run('open', ['-g', '-a', 'Simulator', '--args', '-CurrentDeviceUDID', sim.udid]);
    for (let i = 0; i < 40 && !simulatorAppPids().length; i++) await sleep(0.25);
    writeState({ simulatorAppPid: simulatorAppPids()[0] ?? null });
  }
  if (!(await driverStatus())) {
    const holder = listenerPid(DRIVER_PORT);
    if (holder) fail(`port ${DRIVER_PORT} is held by pid ${holder}, which this run didn't start. Set SFV_DRIVER_PORT or stop it.`);
    mkdirSync(STATE_DIR, { recursive: true });
    const fd = openSync(join(STATE_DIR, 'driver.log'), 'w');
    const child = spawn(process.execPath, [fileURLToPath(import.meta.url), 'serve'], { detached: true, stdio: ['ignore', fd, fd] });
    child.unref();
    closeSync(fd);
    writeState({ driverPid: child.pid });
    for (let i = 0; i < 40 && !(await driverStatus()); i++) await sleep(0.25);
    if (!(await driverStatus())) fail('the driver server did not start');
  }
  await startMetro(root, !!flags.clear);
  await launch({ flags });
}

// ─── Doctor ─────────────────────────────────────────────────────────────────

async function doctor() {
  const s = readState();
  let bad = 0;
  const line = (ok, what) => {
    if (!ok) bad++;
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`);
  };
  const info = (what) => console.log(`info ${what}`);
  const root = s.metro?.root ?? REPO;
  const envs = ENV_FILES.filter((f) => existsSync(join(root, f)));
  line(!envs.length, envs.length ? `${envs.join(', ')} present in ${root}` : `no .env files in ${root}`);
  if (!s.udid) return line(false, `no run in ${STATE_DIR}; run \`verify.mjs up\``), process.exit(1);
  const state = simState(s.udid);
  line(state === 'Booted', `${s.simName} ${s.udid} is ${state}`);
  const fp = await nativeFingerprint(root);
  const app = cachedApp(fp);
  line(existsSync(app), `dev client for fingerprint ${fp.slice(0, 12)}: ${existsSync(app) ? app : 'not built'}`);
  const have = installedApp(s.udid);
  line(!!have && existsSync(app) && binaryHash(have) === binaryHash(app), have ? 'installed app matches that build' : 'app not installed');
  const mp = listenerPid(METRO_PORT);
  const ours = s.metro && alive(s.metro.pid);
  const status = await httpGet(`http://localhost:${METRO_PORT}/status`);
  line(!!ours && !!mp && status?.body?.includes('packager-status:running'), `Metro on ${METRO_PORT}: ${ours ? `ours (pid ${s.metro.pid})` : 'not ours'}, ${status ? 'running' : 'not answering'}`);
  if (mp) line(cwdOf(mp) === root, `Metro serves ${cwdOf(mp)}`);
  const d = await driverStatus();
  line(!!d && alive(s.driverPid), `driver server on ${DRIVER_PORT}: ${d ? `queue ${d.queue}` : 'down'}`);
  line(d?.lastPollMsAgo != null && d.lastPollMsAgo < 3000, `app polling: ${d?.lastPollMsAgo == null ? 'never' : `${Math.round(d.lastPollMsAgo / 100) / 10} s ago`}`);
  info(`text size ${simctl('ui', s.udid, 'content_size').trim()} (was ${s.contentSizeBefore} before this run)`);
  const w = tryRun(() => simWindow(s));
  info(w ? `Simulator window at ${w.x},${w.y} ${w.w}x${w.h}, scale ${w.scale.toFixed(3)} (fitted on ${w.words} words, worst miss ${w.worst.toFixed(1)} pt); taps available` : `no usable Simulator window; taps will refuse (${tryRun(() => simWindow(s, true)) ?? 'not found'})`);
  if (bad) process.exit(1);
}

// ─── Taps ───────────────────────────────────────────────────────────────────

function swiftBin(name) {
  const bin = join(CACHE, 'bin', name);
  const src = join(HERE, `${name}.swift`);
  if (!existsSync(bin) || statSync(bin).mtimeMs < statSync(src).mtimeMs) {
    mkdirSync(dirname(bin), { recursive: true });
    run('swiftc', ['-O', src, '-o', bin]);
  }
  return bin;
}
const windowsBin = () => swiftBin('windows');

function devicePixels(s) {
  if (s.pixels) return s.pixels;
  const tmp = join(STATE_DIR, 'probe.png');
  simctl('io', s.udid, 'screenshot', tmp);
  const png = readFileSync(tmp);
  rmSync(tmp);
  const pixels = { w: png.readUInt32BE(16), h: png.readUInt32BE(20) };
  writeState({ pixels });
  return pixels;
}

/** Text boxes in a PNG, centers in that image's pixels. */
const ocr = (file) => JSON.parse(run(swiftBin('ocr'), [file])).map((h) => ({ text: norm(h.text), cx: h.x + h.w / 2, cy: h.y + h.h / 2 }));

/**
 * Where the device screen sits inside the Simulator window. Bezels, the toolbar
 * and the window scale all vary, so it's measured: the same words are read
 * from a capture of the window and from the device screenshot, and a scale and
 * offset are fitted to their centers. Kept in the run state until the window
 * moves or resizes.
 */
function calibrate(s, win) {
  const key = `${win.x},${win.y},${win.w},${win.h}`;
  if (s.calib?.key === key) return s.calib;
  const winPng = join(STATE_DIR, 'window.png');
  const devPng = join(STATE_DIR, 'device.png');
  run('screencapture', ['-x', '-o', `-l${win.id}`, winPng]);
  simctl('io', s.udid, 'screenshot', devPng);
  const ratio = readFileSync(winPng).readUInt32BE(16) / win.w;
  const once = (list) => new Map([...Map.groupBy(list, (h) => h.text)].filter(([t, v]) => v.length === 1 && t.length >= 3).map(([t, [v]]) => [t, v]));
  const a = once(ocr(winPng));
  const b = once(ocr(devPng));
  rmSync(winPng);
  rmSync(devPng);
  const pairs = [...b].filter(([t]) => a.has(t)).map(([t, d]) => ({ px: d.cx / 3, py: d.cy / 3, qx: a.get(t).cx / ratio, qy: a.get(t).cy / ratio }));
  if (pairs.length < 2) throw new Error(`only ${pairs.length} word(s) read in both the window and the screenshot; put a screen with more text up and try again`);
  // One scale for both axes, least squares over x and y together.
  const n = pairs.length;
  const mean = (f) => pairs.reduce((t, p) => t + f(p), 0) / n;
  const [mpx, mpy, mqx, mqy] = [mean((p) => p.px), mean((p) => p.py), mean((p) => p.qx), mean((p) => p.qy)];
  const num = pairs.reduce((t, p) => t + (p.px - mpx) * (p.qx - mqx) + (p.py - mpy) * (p.qy - mqy), 0);
  const den = pairs.reduce((t, p) => t + (p.px - mpx) ** 2 + (p.py - mpy) ** 2, 0);
  const scale = num / den;
  const ox = mqx - scale * mpx;
  const oy = mqy - scale * mpy;
  const worst = Math.max(...pairs.map((p) => Math.hypot(ox + scale * p.px - p.qx, oy + scale * p.py - p.qy)));
  if (!(scale > 0.3 && scale < 3) || worst > 4) throw new Error(`calibration didn't fit (scale ${scale.toFixed(3)}, worst miss ${worst.toFixed(1)} pt over ${n} words)`);
  const calib = { key, scale, ox, oy, words: n, worst };
  writeState({ calib });
  return calib;
}

/**
 * The Simulator window showing this device, and how device points map into
 * it. Throws (or returns the reason, with `why`) when there isn't exactly one.
 */
function simWindow(s, why = false) {
  const wins = JSON.parse(run(windowsBin(), []));
  const own = wins.filter((w) => w.owner === 'Simulator' && w.layer === 0 && w.name.startsWith(s.simName) && w.w > 100);
  const sameName = wins.filter((w) => w.owner === 'Simulator' && w.layer === 0 && w.name.startsWith(s.simName.replace(/ (Pro Max|Pro|Plus)$/, '')) && w.w > 100);
  const reason = !own.length ? `no on-screen Simulator window titled "${s.simName}"` : own.length > 1 || sameName.length > own.length ? `more than one Simulator window could be "${s.simName}"` : null;
  if (reason) {
    if (why) return reason;
    throw new Error(reason);
  }
  const win = own[0];
  const px = devicePixels(s);
  // Every iPhone Saunafam supports is @3x.
  const pts = { w: px.w / 3, h: px.h / 3 };
  let calib;
  try {
    calib = calibrate(s, win);
  } catch (e) {
    if (why) return e.message;
    throw e;
  }
  return { ...win, index: wins.indexOf(win), wins, pts, ...calib };
}

function toScreen(win, x, y) {
  if (x < 0 || y < 0 || x > win.pts.w || y > win.pts.h) fail(`(${x}, ${y}) is outside the ${win.pts.w}x${win.pts.h} point screen`);
  return { sx: win.x + win.ox + win.scale * x, sy: win.y + win.oy + win.scale * y };
}
function coveredBy(win, sx, sy) {
  return win.wins.slice(0, win.index).find((w) => w.alpha > 0 && sx >= w.x && sx < w.x + w.w && sy >= w.y && sy < w.y + w.h);
}
const idleSeconds = () => Number(/"HIDIdleTime" = (\d+)/.exec(run('ioreg', ['-c', 'IOHIDSystem', '-d', '4']))?.[1] ?? 0) / 1e9;

/** Waits for a quiet second from the person at the Mac, then checks the window again. */
async function safePoints(points) {
  const s = needState();
  for (const p of [CLICK, DRAG]) if (!existsSync(p)) fail(`${p} is missing; taps go only through it`);
  const started = Date.now();
  while (idleSeconds() < 1) {
    if (Date.now() - started > 30_000) fail('someone has been using the mouse or keyboard for 30 s; not tapping. Use the driver op instead.');
    await sleep(0.25);
  }
  let win;
  try {
    win = simWindow(s);
  } catch (e) {
    fail(`not tapping: ${e.message}. Use the driver op instead.`);
  }
  return points.map(([x, y]) => {
    const p = toScreen(win, x, y);
    const over = coveredBy(win, p.sx, p.sy);
    if (over) fail(`not tapping: (${x}, ${y}) is under ${over.owner}'s window "${over.name}". Use the driver op instead.`);
    return p;
  });
}

async function tap({ rest }) {
  const [x, y] = rest.map(Number);
  if (!Number.isFinite(x) || !Number.isFinite(y)) fail('tap <x> <y> takes device points');
  const [p] = await safePoints([[x, y]]);
  run(CLICK, [p.sx.toFixed(1), p.sy.toFixed(1)]);
  console.log(`tapped (${x}, ${y}) at screen ${p.sx.toFixed(1)}, ${p.sy.toFixed(1)}`);
}

async function drag({ rest }) {
  const [x1, y1, x2, y2] = rest.map(Number);
  if (![x1, y1, x2, y2].every(Number.isFinite)) fail('drag <x1> <y1> <x2> <y2> takes device points');
  // The midpoint is checked for cover too, though only the ends are passed on.
  const [a, , b] = await safePoints([[x1, y1], [(x1 + x2) / 2, (y1 + y2) / 2], [x2, y2]]);
  run(DRAG, [a.sx, a.sy, b.sx, b.sy].map((v) => v.toFixed(1)));
  console.log(`dragged (${x1}, ${y1}) to (${x2}, ${y2})`);
}

// ─── Finding text on screen ─────────────────────────────────────────────────


/** On-screen text matching `want` (case and apostrophe style ignored), top to bottom, centers in device points. */
function findText(s, want) {
  const tmp = join(STATE_DIR, 'ocr.png');
  simctl('io', s.udid, 'screenshot', tmp);
  const hits = JSON.parse(run(swiftBin('ocr'), [tmp]));
  rmSync(tmp);
  const w = norm(want);
  const loose = hits.filter((h) => norm(h.text).includes(w));
  // "Saunafam Plus" should beat the "SAUNAFAM PLUS" label above it: same-case matches win when there are any.
  const strict = loose.filter((h) => h.text.replace(/[‘’]/g, "'").includes(want.replace(/[‘’]/g, "'")));
  return (strict.length ? strict : loose)
    .map((h) => ({ text: h.text, x: Math.round((h.x + h.w / 2) / 3), y: Math.round((h.y + h.h / 2) / 3) }))
    .sort((a, b) => a.y - b.y);
}

async function find({ rest }) {
  const s = needState();
  const hits = findText(s, rest.join(' '));
  if (!hits.length) fail(rest.length ? `"${rest.join(' ')}" isn't on screen` : 'no text on screen');
  for (const h of hits) console.log(`${h.x} ${h.y} ${h.text}`);
}

async function tapText({ rest, flags }) {
  const s = needState();
  const want = rest.join(' ') || fail('tap-text <text> [--nth N]');
  const hits = findText(s, want);
  const h = hits[Number(flags.nth ?? 1) - 1];
  if (!h) fail(`"${want}" isn't on screen${hits.length ? ` ${flags.nth} times` : ''}`);
  await tap({ rest: [String(h.x), String(h.y)] });
}

// ─── Evidence and settings ──────────────────────────────────────────────────

async function shot({ rest, flags }) {
  const s = needState();
  const file = resolve(rest[0] ?? fail('shot <file.png>'));
  if (file.startsWith(STATE_DIR + '/')) fail(`evidence can't live in ${STATE_DIR}; \`down\` removes it`);
  if (flags.wait) await sleep(Number(flags.wait));
  mkdirSync(dirname(file), { recursive: true });
  simctl('io', s.udid, 'screenshot', file);
  console.log(file);
}

async function textSize({ rest, flags }) {
  const s = needState();
  const want = SIZE_ALIASES[rest[0]] ?? rest[0];
  if (!SIZES.includes(want)) fail(`text-size takes one of ${SIZES.join(', ')} (or ${Object.keys(SIZE_ALIASES).join(', ')})`);
  simctl('ui', s.udid, 'content_size', want);
  const now = simctl('ui', s.udid, 'content_size').trim();
  if (now !== want) fail(`asked for ${want}, the simulator reports ${now}`);
  // The app reads the new size on its next layout; give it a moment unless told otherwise.
  await sleep(Number(flags.wait ?? 1.5));
  console.log(`text size ${now}`);
}

async function down() {
  const s = readState();
  if (s.metro) killGroup(s.metro.pid);
  if (s.driverPid) killGroup(s.driverPid);
  if (s.udid && simState(s.udid) === 'Booted') {
    tryRun(() => simctl('terminate', s.udid, BUNDLE_ID));
    tryRun(() => simctl('status_bar', s.udid, 'clear'));
    if (s.contentSizeBefore && SIZES.includes(s.contentSizeBefore)) tryRun(() => simctl('ui', s.udid, 'content_size', s.contentSizeBefore));
    if (s.bootedByUs) tryRun(() => simctl('shutdown', s.udid));
  }
  if (s.simulatorAppPid && alive(s.simulatorAppPid) && s.bootedByUs) tryRun(() => process.kill(s.simulatorAppPid, 'SIGTERM'));
  rmSync(STATE_DIR, { recursive: true, force: true });
  console.log(`down: ${s.metro ? 'Metro stopped, ' : ''}${s.driverPid ? 'driver stopped, ' : ''}${s.bootedByUs ? `${s.simName} shut down, ` : ''}text size back to ${s.contentSizeBefore ?? 'unchanged'}; ${STATE_DIR} removed`);
}

async function fingerprint({ flags }) {
  const root = rootOf(flags);
  const fp = await nativeFingerprint(root);
  console.log(`${fp} ${existsSync(cachedApp(fp)) ? cachedApp(fp) : '(not built)'}`);
}

function sims() {
  for (const d of allSims().filter((x) => x.name.startsWith('iPhone'))) {
    const app = d.state === 'Booted' ? (installedApp(d.udid) ? 'app installed' : 'no app') : '';
    console.log(`${d.name} (iOS ${d.os}) ${d.udid} ${d.state} ${app}`);
  }
}

const HELP = `verify.mjs <command>
  sims                                   list iPhone simulators
  fingerprint [--root DIR]               native fingerprint, and its cached dev client if built
  build [--sim NAME --os V] [--root DIR] [--force]
                                         prebuild + xcodebuild Debug, cached by native fingerprint
  up --sim NAME [--os V] [--root DIR] [--fresh] [--clear] [--headless]
                                         boot, driver server, Metro (from DIR), install, launch
  launch [--fresh] [--tz TZ]             reinstall if needed and relaunch; --fresh wipes app data
  doctor                                 read-only health check of this run
  send '<json op>' ...                   queue DevDriver ops and wait until the app takes them
  tap X Y | drag X1 Y1 X2 Y2             real taps in device points, through ${CLICK}
  find [TEXT]                            where TEXT (or all text) is on screen, OCR, as device points
  tap-text TEXT [--nth N]                tap the Nth match of TEXT, top to bottom
  shot FILE [--wait S]                   simulator screenshot
  text-size SIZE                         ${Object.keys(SIZE_ALIASES).join(', ')} or a simctl content size
  down                                   stop what this run started, restore the simulator`;

const commands = { sims, fingerprint, build, up, launch, doctor, send, tap, drag, find, 'tap-text': tapText, shot, 'text-size': textSize, down, serve, help: () => console.log(HELP) };
const [cmd, ...argv] = process.argv.slice(2);
if (!commands[cmd]) {
  console.log(HELP);
  process.exit(cmd ? 1 : 0);
}
await commands[cmd](parseArgs(argv));
