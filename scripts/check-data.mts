// Data gate: every confirmed value names its source, every source index exists, no duplicate ids,
// prices are INR. Run: npm run data:check
import { products } from '../src/data/products/index';
import { isPlaceholder } from '../src/data/products/types';

const errors: string[] = [];
const ids = new Set<string>();
for (const p of products) {
  const at = (m: string) => errors.push(`${p.id}: ${m}`);
  if (ids.has(p.id)) at('duplicate id');
  ids.add(p.id);
  if (!p.sources.length) at('no sources');
  if (!p.src) { at('missing src map'); continue; }
  const vals: [string, unknown][] = [...Object.entries(p.specs), ['price', p.price]];
  for (const [k, v] of vals) {
    const i = (p.src as Record<string, number | undefined>)[k];
    const plain = v === 'None' || v === 'n/a' || k === 'drive' || k === 'style';
    if (isPlaceholder(v)) { if (i !== undefined) at(`${k} is a placeholder but has a source`); continue; }
    if (i === undefined && !plain) at(`${k} has no src`);
    if (i !== undefined && !p.sources[i]) at(`${k} src ${i} out of range`);
  }
  for (const k of Object.keys(p.src)) if (!vals.some(([x]) => x === k)) at(`src key ${k} is not a value`);
  if (!isPlaceholder(p.price) && p.price.currency !== 'INR') at('price is not INR');
}
const un = products.flatMap((p) => Object.values(p.specs).filter(isPlaceholder)).length;
console.log(`${products.length} products, ${un} unconfirmed specs, ${errors.length} errors`);
errors.forEach((e) => console.log('  ' + e));
process.exit(errors.length ? 1 : 0);
