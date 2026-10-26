import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";

const site = new URL("./", import.meta.url);
const pub = new URL("./public/", site);

const html = readdirSync(pub, { recursive: true })
  .filter((p) => p.endsWith(".html"))
  .map((p) => new URL(p, pub));
const files = [...html, new URL("worker.js", site), new URL("waitlist.js", site)];

const read = (url) => readFileSync(url, "utf8");
const index = read(new URL("index.html", pub));

for (const url of files) {
  const name = url.pathname.slice(site.pathname.length);
  test(`${name} has no em dash, en dash or arrow glyph`, () => {
    const hits = [...read(url).matchAll(/[\u2013\u2014\u2190-\u21FF]/g)].map(
      (m) => `U+${m[0].codePointAt(0).toString(16).toUpperCase()} at ${m.index}`,
    );
    assert.deepEqual(hits, []);
  });
}

test("index.html meta descriptions match the copy", () => {
  const description =
    "Keep a weekly sauna streak with your family or your sauna crew. Coming soon for iPhone. Join the waitlist.";
  for (const attr of ['name="description"', 'property="og:description"', 'name="twitter:description"']) {
    assert.ok(index.includes(`<meta ${attr} content="${description}">`), `${attr} is the waitlist description`);
  }
});

test("index.html has exactly one founder note marker", () => {
  assert.equal(index.match(/data-todo="founder-note"/g)?.length, 1);
});

test("the FAQ has seven questions", () => {
  const faq = index.match(/<div class="faq"[^>]*>([\s\S]*?)<\/section>/)?.[1] ?? "";
  assert.equal(faq.match(/<summary>/g)?.length, 7);
});
