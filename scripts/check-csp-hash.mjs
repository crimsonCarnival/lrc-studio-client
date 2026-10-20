// Verifies that the script hash in the CSP still matches the inline script in index.html.
//
// index.html carries one inline script: the first-paint theme seed, which has to run
// before anything renders (an external file would paint the wrong theme first). CSP
// allows exactly that one script by its sha256, so editing the script without updating
// the hash silently stops it from running — the theme would flash, and only in
// production, where the header is set. This turns that into a build failure.
//
// Runs from the prebuild hook. While the CSP is Report-Only a mismatch only means a
// console report rather than a broken page, but the check is what makes it safe to flip
// the header to enforcing later.
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(root, 'index.html'), 'utf8');
const config = JSON.parse(readFileSync(join(root, 'vercel.json'), 'utf8'));

// Inline <script> blocks that actually execute: no src, and not a data block such as
// application/ld+json (which CSP does not treat as script).
const inline = [...html.matchAll(/<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/g)]
  .filter(([, attrs]) => !/type\s*=\s*"application\/ld\+json"/.test(attrs))
  .map(([, , body]) => body);

const csp = (config.headers ?? [])
  .flatMap((entry) => entry.headers ?? [])
  .find((h) => /^content-security-policy(-report-only)?$/i.test(h.key))?.value;

if (!csp) {
  console.error('csp: no Content-Security-Policy header found in vercel.json');
  process.exit(1);
}

const failures = [];
for (const body of inline) {
  const hash = `sha256-${createHash('sha256').update(body).digest('base64')}`;
  if (!csp.includes(hash)) failures.push(hash);
}

if (failures.length) {
  console.error(
    `\ncsp: index.html has ${failures.length} inline script(s) the CSP does not allow.\n` +
      `Add the hash(es) below to script-src in vercel.json:\n` +
      failures.map((h) => `  '${h}'`).join('\n') +
      `\n`,
  );
  process.exit(1);
}

console.log(`csp: ${inline.length} inline script(s) allowed by hash`);
