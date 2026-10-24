// Writes the plain-JSON copy of the catalogue that the backend reads (data/).
// The TypeScript files stay the single source of truth; data/ is generated from them.
// Run: npm run data:export          write data/*.json
//      npm run data:export -- --check   fail if data/*.json is out of date (used in CI)
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { offers } from '../src/data/offers';
import { products } from '../src/data/products/index';

const files = {
  'data/products.json': products,
  'data/offers.json': offers,
};

const check = process.argv.includes('--check');
let stale = 0;

mkdirSync('data', { recursive: true });
for (const [path, value] of Object.entries(files)) {
  const next = JSON.stringify(value, null, 2) + '\n';
  if (check) {
    let current = '';
    try { current = readFileSync(path, 'utf8'); } catch { /* missing counts as stale */ }
    if (current !== next) { console.error(`${path} is out of date. Run: npm run data:export`); stale++; }
  } else {
    writeFileSync(path, next);
    console.log(`wrote ${path} (${Array.isArray(value) ? value.length : 0} entries)`);
  }
}
if (stale) process.exit(1);
if (check) console.log('data/*.json is up to date');
