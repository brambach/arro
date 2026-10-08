// Bakes the layer SVGs in this folder into WebP images in ../public/scenes/,
// with transparent backgrounds, using a headless Chromium.
// Run after make_svg.py: node bake.mjs
// Needs a Chromium build; set CHROME to its path if it isn't Playwright's
// cached headless shell.
import fs from 'fs';
import path from 'path';
import os from 'os';
import { spawn } from 'child_process';

const here = path.dirname(new URL(import.meta.url).pathname);
const out = path.join(here, '../public/scenes');
const cache = path.join(os.homedir(), 'Library/Caches/ms-playwright');
const chrome = process.env.CHROME || (() => {
  const dir = fs.readdirSync(cache).filter((d) => d.startsWith('chromium_headless_shell')).sort().pop();
  return path.join(cache, dir, 'chrome-headless-shell-mac-arm64/chrome-headless-shell');
})();

const port = 9251;
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'arro-bake-'));
const proc = spawn(chrome, [`--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let target;
for (let i = 0; i < 40 && !target; i++) {
  try { target = await (await fetch(`http://localhost:${port}/json/new?about:blank`, { method: 'PUT' })).json(); } catch { await sleep(250); }
}
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0; const pending = new Map();
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });

await send('Emulation.setDeviceMetricsOverride', { width: 2400, height: 600, deviceScaleFactor: 1, mobile: false });
await send('Emulation.setDefaultBackgroundColorOverride', { color: { r: 0, g: 0, b: 0, a: 0 } });
fs.mkdirSync(out, { recursive: true });
for (const file of fs.readdirSync(here).filter((f) => f.endsWith('.svg')).sort()) {
  await send('Page.navigate', { url: 'file://' + path.join(here, file) });
  await sleep(700);
  const shot = await send('Page.captureScreenshot', { format: 'webp', quality: 80 });
  const dest = path.join(out, file.replace(/\.svg$/, '.webp'));
  fs.writeFileSync(dest, Buffer.from(shot.result.data, 'base64'));
  console.log(path.basename(dest), Math.round(fs.statSync(dest).size / 1024) + ' KB');
}
ws.close();
await new Promise((r) => { proc.once('exit', r); proc.kill(); });
fs.rmSync(profile, { recursive: true, force: true });
