import test from "node:test";
import assert from "node:assert/strict";
import { statSync } from "node:fs";

const BUDGETS = { "site.js": 5000, "styles.css": 25000 };

for (const [file, max] of Object.entries(BUDGETS)) {
  test(`${file} stays within ${max} bytes`, () => {
    const { size } = statSync(new URL(`./public/${file}`, import.meta.url));
    assert.ok(size <= max, `${file} is ${size} bytes, over its ${max} byte budget`);
  });
}
