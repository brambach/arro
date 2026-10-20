#!/usr/bin/env node
/**
 * The design lint (design/saunafam-spec.md, Quality bar). Fails on:
 *
 * 1. a color literal (hex, rgb or rgba) in src/ outside src/theme/;
 * 2. a padding, margin or gap number in src/ that isn't on the 4 pt scale
 *    (0, 4, 8, 12, 16, 20, 24, 32, 40, 56, 72), as a style value or a prop;
 * 3. an arrow glyph (→ › ↗ ») in src/ or site/public.
 *
 *   node scripts/check-design.mjs            # everything
 *   node scripts/check-design.mjs src/components src/theme   # some paths
 *
 * Prints every hit with its line, then a count per file, and exits non-zero
 * if there are any.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { repoRoot } from './lib/load-theme.mjs';

const SCALE = new Set([0, 4, 8, 12, 16, 20, 24, 32, 40, 56, 72]);
const CODE = /\.(ts|tsx|js|jsx|mjs)$/;
const WEB = /\.(html|css|js|svg|txt|md|json|webmanifest)$/;

const args = process.argv.slice(2);
const roots = args.length ? args : ['src', 'site/public'];

function walk(dir, out = []) {
  let entries;
  try {
    if (statSync(dir).isFile()) return [dir];
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const name of entries) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

const COLOR = /#[0-9a-fA-F]{3,8}\b|\brgba?\(/g;
// A style value: `paddingTop: 18`, `margin: -6`, `gap: 10`.
const STYLE_SPACE = /\b(padding|margin)(Top|Bottom|Left|Right|Horizontal|Vertical|Start|End)?\s*:\s*(-?\d+(?:\.\d+)?)\b|\b(gap|rowGap|columnGap)\s*:\s*(-?\d+(?:\.\d+)?)\b/g;
// A prop: `padding={18}`, `gap={6}`.
const PROP_SPACE = /\b(padding|margin|gap)(Top|Bottom|Left|Right|Horizontal|Vertical)?=\{(-?\d+(?:\.\d+)?)\}/g;
const ARROWS = /[→›↗»]/g;

const hits = [];
for (const root of roots) {
  for (const file of walk(join(repoRoot, root))) {
    const rel = relative(repoRoot, file);
    const inSrc = rel.startsWith('src/');
    const inSite = rel.startsWith('site/public/');
    if (inSrc && !CODE.test(rel)) continue;
    if (inSite && !WEB.test(rel)) continue;
    // Generated wordmark outlines and tests aren't styles.
    if (rel.includes('__tests__')) continue;
    const lines = readFileSync(file, 'utf8').split('\n');
    lines.forEach((line, i) => {
      const at = `${rel}:${i + 1}`;
      if (inSrc && !rel.startsWith('src/theme/')) {
        for (const m of line.matchAll(COLOR)) hits.push({ rel, at, kind: 'color', text: m[0], line });
        for (const m of line.matchAll(STYLE_SPACE)) {
          const n = Number(m[3] ?? m[5]);
          if (!SCALE.has(Math.abs(n))) hits.push({ rel, at, kind: 'spacing', text: m[0], line });
        }
        for (const m of line.matchAll(PROP_SPACE)) {
          const n = Number(m[3]);
          if (!SCALE.has(Math.abs(n))) hits.push({ rel, at, kind: 'spacing', text: m[0], line });
        }
      }
      if (inSrc || inSite) for (const m of line.matchAll(ARROWS)) hits.push({ rel, at, kind: 'arrow', text: m[0], line });
    });
  }
}

for (const h of hits) console.log(`${h.at}  ${h.kind}  ${h.text}    ${h.line.trim().slice(0, 100)}`);
if (!hits.length) {
  console.log(`Design check clean: ${roots.join(', ')}`);
  process.exit(0);
}
const byFile = new Map();
for (const h of hits) byFile.set(h.rel, (byFile.get(h.rel) ?? 0) + 1);
console.log('\nHits per file:');
for (const [f, n] of [...byFile].sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(4)}  ${f}`);
const kinds = ['color', 'spacing', 'arrow'].map((k) => `${hits.filter((h) => h.kind === k).length} ${k}`).join(', ');
console.log(`\n${hits.length} hit(s) in ${byFile.size} file(s): ${kinds}.`);
process.exit(1);
