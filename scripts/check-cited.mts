// Release gate: every cited number still appears on the page it cites. A changed price or a
// rewritten spec sheet shows up here. Text specs are not checked (wording varies too much).
// Run: npm run data:cited   (network; not part of npm test)
import { products } from '../src/data/products/index';
import { isPlaceholder, type Product, type Qty } from '../src/data/products/types';

const headers = { 'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36' };
const pages = new Map<string, Promise<string | null>>();

/** Page HTML plus its visible text, lowercased, with entities and spacing normalised. */
function load(url: string) {
  const get = () => fetch(url, { headers, signal: AbortSignal.timeout(25_000) });
  if (!pages.has(url)) pages.set(url, get().catch(get) // one retry: maker sites time out now and then
    .then(async (r) => {
      if (!r.ok) return null;
      const html = await r.text();
      const text = html.replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ');
      return (html + ' ' + text).replace(/&nbsp;|&#160;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').toLowerCase();
    })
    .catch(() => null));
  return pages.get(url)!;
}

// Same quantity in the other units a page might use.
const alt: Record<string, [string, number][]> = {
  kg: [['g', 1000], ['lb', 2.20462], ['lbs', 2.20462]], g: [['kg', 0.001], ['oz', 0.035274]],
  L: [['ml', 1000], ['litre', 1], ['liter', 1], ['oz', 33.814]], ml: [['l', 0.001], ['oz', 0.033814]],
  mm: [['cm', 0.1]], W: [['watt', 1], ['w', 1]],
};

/** Ways a number may be written: 1300, 1,300, 1.3 (as 1,3 in EU style), with up to 1 decimal of rounding. */
function forms(n: number): string[] {
  const out = new Set<string>();
  for (const d of [0, 1, 2]) {
    const s = n.toFixed(d);
    if (Math.abs(+s - n) > Math.max(0.051, n * 0.01)) continue;
    const t = String(+s);
    out.add(t);
    out.add(t.replace('.', ','));
    out.add((+s).toLocaleString('en-US'));
    out.add((+s).toLocaleString('en-IN'));
  }
  return [...out];
}

/** The number stands alone on the page (not inside a longer number). */
const appears = (page: string, n: string) => new RegExp(`(^|[^\\d.,])${n.replace(/[.,]/g, '\\$&')}(?:\\.00?)?(?![\\d]|[.,]\\d)`).test(page);

function candidates(q: Qty): string[] {
  const vals = [q.value, ...(alt[q.unit] ?? []).map(([, k]) => q.value * k)];
  return vals.flatMap(forms);
}

type Check = { id: string; key: string; url: string; want: string[] };
const checks: Check[] = [];
for (const p of products as Product[]) {
  const src = p.src as Record<string, number | undefined>;
  for (const [key, v] of Object.entries(p.specs)) {
    const i = src[key];
    if (i === undefined || isPlaceholder(v) || typeof v !== 'object' || !v || !('value' in v)) continue;
    checks.push({ id: p.id, key, url: p.sources[i].url, want: candidates(v as Qty) });
  }
  if (!isPlaceholder(p.price) && src.price !== undefined) {
    checks.push({ id: p.id, key: 'price', url: p.sources[src.price].url, want: forms(p.price.amount) });
  }
}

const missing: string[] = [];
const unreachable = new Set<string>();
await Promise.all(checks.map(async (c) => {
  const page = await load(c.url);
  if (page === null) { unreachable.add(c.url); return; }
  if (!c.want.some((n) => appears(page, n))) missing.push(`${c.id}.${c.key}: none of ${c.want.slice(0, 4).join(' / ')} on ${c.url}`);
}));

console.log(`${checks.length} cited numbers, ${missing.length} not found, ${unreachable.size} pages unreachable`);
missing.sort().forEach((m) => console.log('  ' + m));
unreachable.forEach((u) => console.log('  unreachable: ' + u));
process.exit(missing.length || unreachable.size ? 1 : 0);
