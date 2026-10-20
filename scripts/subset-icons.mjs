// Builds a Material Symbols font containing only the icons the app references, and
// the name -> codepoint map the <Icon> component renders through.
//
// Why by codepoint and not by ligature name
// ------------------------------------------
// Material Symbols is addressed two ways: by typing the icon's name and letting a GSUB
// ligature fuse it ("favorite" -> one glyph), or by the Private Use Area codepoint that
// same glyph sits at (U+E87D). Subsetting by NAME looks like it works and does almost
// nothing: passing the names as text keeps the letters a-z, and the subsetter must then
// retain every glyph those letters can still reach through the ligature table — which is
// every icon in the font, because every icon name is spelled with the same 26 letters.
// That is how the previous version of this script produced a 308 KB "subset" of 219
// icons: 6177 glyphs survived and GSUB alone was 117 KB.
//
// Subsetting by CODEPOINT has no such closure. The glyphs we ask for are the glyphs we
// get, GSUB drops out entirely, and the same 165 icons come to ~15 KB.
//
// The cost is that the ligature no longer resolves at runtime, so <Icon> must emit the
// codepoint rather than the name. That is what ICON_CODEPOINTS (generated below) is for.
//
// FILL is left variable on purpose. Pinning it to 0 saves a further ~4.5 KB, but then
// every <Icon filled> on a font-drawn icon needs a second font file and a hand-kept list
// of which icons are allowed to fill — a list that silently breaks the day someone adds
// an icon to it and forgets. 4.5 KB is not worth that.
//
// Output: src/assets/fonts/material-symbols-subset.woff2 (gitignored) and
// src/shared/ui/icon-codepoints.ts (committed, so tsc and tests work without a prebuild).
// Runs from the predev/prebuild hooks.
import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import subsetFont from 'subset-font';
import * as fontkit from 'fontkit';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const pkgDir = dirname(require.resolve('material-symbols/package.json'));

// Icons built from template strings can't be found by scanning; list them here.
const SAFELIST = [];

const dts = readFileSync(join(pkgDir, 'index.d.ts'), 'utf8');
const allNames = new Set([...dts.matchAll(/"([a-z0-9_]+)"/g)].map((m) => m[1]));

// Two passes with different confidence, because they get different error handling.
// `declared` is an unambiguous <Icon name="..."> and must resolve or the build fails.
// `scanned` is any bare word that happens to be an icon name — "ghost" from
// variant="ghost", "2d" from getContext('2d') — so a miss there is just skipped.
const declared = new Set(SAFELIST);
const scanned = new Set();

function collect(text) {
  for (const [, w] of text.matchAll(/(?:['"`>])([a-z0-9_]+)(?=['"`<])/g)) {
    if (allNames.has(w)) scanned.add(w);
  }
  for (const [, w] of text.matchAll(
    /(?:<Icon[^>]*?\bname=|\biconName[:=]\s*|\bicon:\s*|\bmedal:\s*)\{?['"]([a-z0-9_]+)['"]/g,
  )) {
    declared.add(w);
  }
}
function scan(dir) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) scan(p);
    else if (/\.(tsx?|jsx?|html|css)$/.test(entry)) collect(readFileSync(p, 'utf8'));
  }
}
scan(join(root, 'src'));
collect(readFileSync(join(root, 'index.html'), 'utf8'));

// Icons that icon-paths.ts draws as SVG never reach the font, so they never reach here.
const shapesSrc = readFileSync(join(root, 'src/shared/ui/icon-paths.ts'), 'utf8');
const svgDrawn = new Set(
  [...shapesSrc.slice(shapesSrc.indexOf('export const ICON_SHAPES')).matchAll(/^ {2}([a-z0-9_]+):\s*\{/gm)]
    .map((m) => m[1]),
);

const font = fontkit.openSync(join(pkgDir, 'material-symbols-outlined.woff2'));

// glyph id -> the PUA codepoint that reaches it. Built by walking the cmap rather than
// assuming name === codepoint, because plenty of names are aliases that only the
// ligature table knows about: location_on is the glyph "place", laptop is "computer".
const glyphToCodepoint = new Map();
for (const cp of font.characterSet) {
  if (cp >= 0xe000 && cp <= 0xf8ff) {
    const { id } = font.glyphForCodePoint(cp);
    if (!glyphToCodepoint.has(id)) glyphToCodepoint.set(id, cp);
  }
}

/** Resolve an icon name to the codepoint of the single glyph it renders, or null. */
function codepointFor(name) {
  const { glyphs } = font.layout(name);
  // More than one glyph means the name is not a ligature in this build of the font, so
  // it renders as its own letters — the bug this check exists to catch.
  if (glyphs.length !== 1) return null;
  return glyphToCodepoint.get(glyphs[0].id) ?? null;
}

const codepoints = new Map();
const broken = [];
for (const name of new Set([...declared, ...scanned])) {
  if (svgDrawn.has(name)) continue;
  const cp = codepointFor(name);
  if (cp) codepoints.set(name, cp);
  else if (declared.has(name)) broken.push(name);
}

if (broken.length) {
  console.error(
    `\nicons: ${broken.length} icon name(s) do not exist in material-symbols and would render as ` +
      `their own letters:\n` +
      broken.map((n) => `  - ${n}`).join('\n') +
      `\n\nFix the <Icon name="..."> call site: use the real Material Symbols name, or add the ` +
      `icon to ICON_SHAPES in src/shared/ui/icon-paths.ts to draw it as SVG.\n`,
  );
  process.exit(1);
}

const sorted = [...codepoints].sort(([a], [b]) => (a < b ? -1 : 1));
const source = readFileSync(join(pkgDir, 'material-symbols-outlined.woff2'));
const out = await subsetFont(source, sorted.map(([, cp]) => String.fromCodePoint(cp)).join(''), {
  targetFormat: 'woff2',
  variationAxes: { wght: 400, GRAD: 0, opsz: 24 },
});

const fontDest = join(root, 'src/assets/fonts/material-symbols-subset.woff2');
mkdirSync(dirname(fontDest), { recursive: true });
writeFileSync(fontDest, out);

// A literal backslash, so the emitted file carries a real \u{...} escape; spelling
// it inline here would be read as an escape in this file instead.
const BACKSLASH = String.fromCharCode(92);
const mapDest = join(root, 'src/shared/ui/icon-codepoints.ts');
writeFileSync(
  mapDest,
  `// GENERATED by scripts/subset-icons.mjs — do not edit by hand.\n` +
    `// Committed rather than gitignored so tsc and the tests run without a prebuild.\n` +
    `//\n` +
    `// <Icon> renders these codepoints instead of the icon's name because the font is\n` +
    `// subset by codepoint, which drops the ligature table the name would need.\n` +
    `export const ICON_CODEPOINTS: Record<string, string> = {\n` +
    sorted.map(([n, cp]) => `  ${/^[a-z][a-z0-9_]*$/.test(n) ? n : JSON.stringify(n)}: '${BACKSLASH}u{${cp.toString(16)}}',`).join('\n') +
    `\n};\n`,
  'utf8',
);

console.log(
  `icons: ${sorted.length} glyphs, ${(source.length / 1024).toFixed(0)} KB -> ${(out.length / 1024).toFixed(1)} KB`,
);
