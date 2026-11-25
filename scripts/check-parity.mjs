/**
 * Fails if the files that form the shared contract drift apart between builds.
 * Each project keeps its own copy (so it stays self-contained); this check
 * makes sure the copies remain byte-identical. Run: node scripts/check-parity.mjs
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const SHARED = [
  'src/lib/tasks.ts',
  'src/lib/tasks.test.ts',
  'src/test/app.behaviour.ts',
  'src/test/setup.ts',
  'src/styles/app.css',
];

let failed = false;
for (const file of SHARED) {
  const [a, b] = await Promise.all(['react', 'vue'].map((dir) => readFile(path.join(ROOT, dir, file), 'utf8')));
  if (a === b) {
    console.log(`identical  ${file}`);
  } else {
    console.error(`DIFFERENT  ${file}`);
    failed = true;
  }
}
process.exit(failed ? 1 : 0);
