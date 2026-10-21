/**
 * Loads plain-data theme modules (src/theme/*.ts with no React Native imports)
 * into Node, compiled with the project's TypeScript, so scripts read the same
 * values as the app: `const { tokens } = await loadTheme(['tokens'])`.
 */
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import ts from 'typescript';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

export async function loadTheme(names) {
  // A name is a file in src/theme, or a path from the repo root ('src/components/material').
  const dir = mkdtempSync(join(tmpdir(), 'saunafam-theme-'));
  try {
    for (const name of names) {
      const file = name.includes('/') ? join(root, `${name}.ts`) : join(root, 'src/theme', `${name}.ts`);
      const src = readFileSync(file, 'utf8');
      const out = ts.transpileModule(src, {
        compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 },
      }).outputText;
      // Relative imports between theme files point at the compiled copies.
      writeFileSync(join(dir, `${base(name)}.mjs`), out.replace(/from '\.\/([a-zA-Z]+)'/g, "from './$1.mjs'"));
    }
    const mods = {};
    for (const name of names) mods[base(name)] = await import(pathToFileURL(join(dir, `${base(name)}.mjs`)).href);
    return mods;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const base = (name) => name.split('/').pop();

export const repoRoot = root;
