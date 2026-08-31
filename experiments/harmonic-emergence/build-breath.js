// Embeds breath.json and breath-processor.js into breath.html.
//
//   node build-breath.js
//
// The page carries copies of both so it works on a double-click: file:// blocks the
// fetch, and a few browsers refuse blob-loaded worklets, so the embedded copies are
// the fallback path rather than a convenience. That means they can go stale, and a
// stale copy is invisible -- the page runs old code while the files on disk look
// right. verify-breath.js claim 14 fails when they diverge; this is what fixes it.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const html = readFileSync(join(here, 'breath.html'), 'utf8');
const proc = readFileSync(join(here, 'breath-processor.js'), 'utf8');
const conf = readFileSync(join(here, 'breath.json'), 'utf8');

JSON.parse(conf);                               // refuse to embed invalid config

const block = /const EMBEDDED = [\s\S]*?;\nconst PROCESSOR_SRC = "[\s\S]*?";\n/;
if (!block.test(html)) {
  console.error('could not find the embedded block in breath.html');
  process.exit(1);
}

const next = html.replace(block,
  `const EMBEDDED = ${conf.trim()};\nconst PROCESSOR_SRC = ${JSON.stringify(proc)};\n`);

writeFileSync(join(here, 'breath.html'), next);
console.log(`embedded ${conf.length} bytes of config and ${proc.length} bytes of processor into breath.html`);
