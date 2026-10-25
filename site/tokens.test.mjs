import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("./public/styles.css", import.meta.url), "utf8");
const root = css.match(/:root\s*\{([^}]*)\}/)[1];
const tokens = Object.fromEntries([...root.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6})/gi)].map((m) => [m[1], m[2]]));

const luminance = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

const TEXT = 4.5;
const EDGE = 3;
// [foreground, background, minimum], from architect-plan.md sections 6.1 and 6.2.
const pairs = [
  ["steam", "ember-deep", TEXT],
  ["steam", "coal", TEXT],
  ["ember-deep", "birch", EDGE],
  ["ember-deep", "char", EDGE],
  ...["birch", "steam", "aspen"].flatMap((bg) => [["char", bg, TEXT], ["smoke", bg, TEXT]]),
  ["coal", "birch", TEXT],
  ["coal", "steam", TEXT],
  ["stone", "birch", EDGE],
  ["stone", "steam", EDGE],
  ["cedar", "birch", EDGE],
  ["cedar", "steam", EDGE],
  ["ember", "birch", EDGE],
  ["lake", "birch", EDGE],
  ["birch", "char", TEXT],
  ["ash", "char", TEXT],
  ["steam", "char", TEXT],
];

test("every palette pair meets its WCAG threshold", (t) => {
  const rows = pairs.map(([fg, bg, min]) => {
    assert.ok(tokens[fg] && tokens[bg], `--${fg} and --${bg} are defined in :root`);
    return { fg, bg, ratio: contrast(tokens[fg], tokens[bg]), min };
  });
  for (const r of rows) t.diagnostic(`${`${r.fg} on ${r.bg}`.padEnd(22)} ${r.ratio.toFixed(2).padStart(5)}  (min ${r.min})`);
  for (const r of rows) assert.ok(r.ratio >= r.min, `${r.fg} on ${r.bg} is ${r.ratio.toFixed(2)}, needs ${r.min}`);
});

test("night text, links and errors use a color that passes on char", () => {
  const rule = css.match(/\n\.night :is\([^)]*\.join-error[^)]*\)\s*\{([^}]*)\}/)?.[1];
  assert.ok(rule, "a .night rule colors .join-error");
  const fg = rule.match(/color:\s*var\(--([\w-]+)\)/)[1];
  assert.ok(contrast(tokens[fg], tokens.char) >= TEXT, `--${fg} on char needs ${TEXT}`);
});

test("the button is a flat ember-deep fill", () => {
  const rule = css.match(/\n\.button\s*\{([^}]*)\}/)[1];
  assert.match(rule, /background:\s*var\(--ember-deep\);/);
  assert.doesNotMatch(rule, /gradient|--ember\)/);
});
