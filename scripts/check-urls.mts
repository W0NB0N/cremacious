// Release gate: every source URL still answers. Prices and stock go stale; dead pages go first.
// Run: npm run data:urls   (network; not part of npm test)
import { products } from '../src/data/products/index';

const urls = [...new Set(products.flatMap((p) => p.sources.map((s) => s.url)))];
const used = (url: string) => products.filter((p) => p.sources.some((s) => s.url === url)).map((p) => p.id);
const headers = { 'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36' };

async function check(url: string): Promise<string | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, { headers, redirect: 'follow', signal: AbortSignal.timeout(20_000) });
      await res.body?.cancel();
      if (res.ok) return null;
      if (attempt) return `HTTP ${res.status}`;
    } catch (e) {
      if (attempt) return (e as Error).message;
    }
  }
  return 'unreachable';
}

const failures: string[] = [];
const queue = [...urls];
await Promise.all(Array.from({ length: 6 }, async () => {
  for (let url = queue.shift(); url; url = queue.shift()) {
    const err = await check(url);
    if (err) failures.push(`${err}  ${url}  (${used(url).join(', ')})`);
  }
}));
console.log(`${urls.length} source URLs, ${failures.length} failing`);
failures.forEach((f) => console.log('  ' + f));
process.exit(failures.length ? 1 : 0);
