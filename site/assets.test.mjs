import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const here = fileURLToPath(new URL(".", import.meta.url));
const publicDir = join(here, "public");

const stripComments = (src) =>
  src.replace(/("(?:\\.|[^"\\])*")|\/\/[^\n]*|\/\*[\s\S]*?\*\//g, (m, str) => str ?? "");
const config = JSON.parse(stripComments(readFileSync(join(here, "wrangler.jsonc"), "utf8")));
const rules = config.assets.run_worker_first;

const toRegex = (glob) =>
  new RegExp("^" + glob.split("*").map((s) => s.replace(/[.+?^${}()|[\]\\]/g, "\\$&")).join(".*") + "$");
const positives = rules.filter((r) => !r.startsWith("!")).map(toRegex);
const negatives = rules.filter((r) => r.startsWith("!")).map((r) => toRegex(r.slice(1)));
const workerRuns = (path) => !negatives.some((re) => re.test(path)) && positives.some((re) => re.test(path));
const excluded = (path) => negatives.some((re) => re.test(path));

const notServed = new Set(["_headers", "_redirects", ".assetsignore"]);
const walk = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)],
  );

test("run_worker_first is a list", () => {
  assert.ok(Array.isArray(rules), "run_worker_first should be a list of patterns");
});

test("every non-HTML file in public/ skips the Worker", () => {
  const assets = walk(publicDir)
    .map((f) => "/" + relative(publicDir, f).split(sep).join("/"))
    .filter((p) => !p.endsWith(".html") && !notServed.has(p.slice(1)));
  assert.ok(assets.length > 0, "found asset files");
  const missed = assets.filter((p) => !excluded(p));
  assert.deepEqual(missed, [], "add these to a ! pattern in wrangler.jsonc run_worker_first");
});

test("the Worker still runs for pages, joins, the API and unknown paths", () => {
  for (const path of ["/", "/privacy/", "/join/ABC23456", "/api/waitlist", "/no-such-page"]) {
    assert.ok(workerRuns(path), `Worker should run for ${path}`);
  }
});

test("a new asset folder is caught until it's listed", () => {
  assert.ok(!excluded("/plates/x.png"), "/plates/x.png isn't excluded, so the walk would flag it");
  assert.ok(workerRuns("/plates/x.png"));
});
