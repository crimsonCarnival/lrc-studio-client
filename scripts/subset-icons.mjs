// Builds a Material Symbols font containing only the icons the app references.
//
// The full font is ~4 MB (every icon, all four variation axes). Icons are named
// by ligature, so we collect every word in src/ that is a real icon name and
// keep just those glyphs. Matching is deliberately loose (any bare word that is
// an icon name, e.g. "home" in prose, is kept): over-including a few glyphs
// costs bytes, under-including shows a blank icon.
//
// Icon.tsx only ever uses wght 400, GRAD 0, opsz 24 and toggles FILL 0/1, so
// the other axes are pinned and FILL stays variable.
//
// Output is generated (gitignored); it runs from the predev/prebuild hooks.
import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import subsetFont from 'subset-font';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const pkgDir = dirname(require.resolve('material-symbols/package.json'));

// Icons built from template strings can't be found by scanning; list them here.
const SAFELIST = [];

const dts = readFileSync(join(pkgDir, 'index.d.ts'), 'utf8');
const allNames = new Set([...dts.matchAll(/"([a-z0-9_]+)"/g)].map((m) => m[1]));

const used = new Set(SAFELIST);
function scan(dir) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) scan(p);
    else if (/\.(tsx?|jsx?|html|css)$/.test(entry)) collect(readFileSync(p, 'utf8'));
  }
}
function collect(text) {
  // Icon names appear as string literals or JSX text, so only those count;
  // this keeps ordinary words in comments and identifiers from pulling glyphs in.
  for (const [, w] of text.matchAll(/(?:['"`>])([a-z0-9_]+)(?=['"`<])/g)) if (allNames.has(w)) used.add(w);
}
scan(join(root, 'src'));
collect(readFileSync(join(root, 'index.html'), 'utf8'));

const source = readFileSync(join(pkgDir, 'material-symbols-outlined.woff2'));
const out = await subsetFont(source, [...used].join(' ') + ' ', {
  targetFormat: 'woff2',
  variationAxes: { wght: 400, GRAD: 0, opsz: 24 },
});

const dest = join(root, 'src/assets/fonts/material-symbols-subset.woff2');
mkdirSync(dirname(dest), { recursive: true });
writeFileSync(dest, out);
console.log(`icons: ${used.size} glyphs, ${(source.length / 1024).toFixed(0)} KB -> ${(out.length / 1024).toFixed(0)} KB`);
