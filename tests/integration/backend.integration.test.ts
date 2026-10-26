// @vitest-environment node
// Real boundaries: the poller's real fetch talks over a socket to a local fake Shopify server, the
// store writes real files, and the real Express app answers real HTTP. Nothing is mocked.
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { pollOnce, type PollDeps } from '../../backend/src/poller';
import { createApp } from '../../backend/src/server';
import { Store } from '../../backend/src/store';
import type { Offer } from '../../backend/src/types';

type Behaviour = { price?: number; available?: boolean; status?: number; delayMs?: number; body?: string };

// handle -> behaviour; mutated by tests to change what the "retailer" says.
const shop: Record<string, Behaviour> = {};
const hits: string[] = [];
let fake: Server;
let base: string;

beforeAll(async () => {
  fake = createServer((req, res) => {
    hits.push(req.url ?? '');
    const handle = (req.url ?? '').replace(/^\/products\//, '').replace(/\.js$/, '');
    const b = shop[handle] ?? shop['*'];
    const send = () => {
      if (!b) { res.writeHead(404).end('not found'); return; }
      if (b.status) { res.writeHead(b.status).end('error'); return; }
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(b.body ?? JSON.stringify({ variants: [{ id: 1, price: b.price, compare_at_price: null, available: b.available ?? true }] }));
    };
    if (b?.delayMs) setTimeout(send, b.delayMs); else send();
  });
  await new Promise<void>((r) => fake.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${(fake.address() as AddressInfo).port}`;
});
afterAll(() => new Promise<void>((r) => fake.close(() => r())));

let dir: string;
let store: Store;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'crema-int-'));
  store = new Store(dir);
  for (const k of Object.keys(shop)) delete shop[k];
  hits.length = 0;
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

const settings = { hostDelayMs: 0, requestTimeoutMs: 300, maxMoveFraction: 0.4, hostFailureLimit: 3, userAgent: 'integration-test' };
const deps = (offers: Offer[]): PollDeps => ({ offers, store, settings });
const mk = (id: string, handle: string, price = 1000): Offer => ({
  productId: id, retailer: 'Fake', url: `${base}/products/${handle}`, adapter: 'shopify', variantId: 1, price, checked: '2026-10-25',
});

async function serve(offers: Offer[]) {
  const app = createApp({ store, offers });
  const server = await new Promise<Server>((r) => { const s = app.listen(0, '127.0.0.1', () => r(s)); });
  return { url: `http://127.0.0.1:${(server.address() as AddressInfo).port}`, close: () => new Promise<void>((r) => server.close(() => r())) };
}

describe('poller -> store -> API over real sockets', () => {
  it('a price change travels from the retailer to /prices and /history', async () => {
    const offers = [mk('a', 'a')];
    const api = await serve(offers);
    shop.a = { price: 100000 };
    await pollOnce(deps(offers));
    expect((await (await fetch(`${api.url}/prices/a`)).json()).offers[0]).toMatchObject({ amount: 1000, status: 'ok' });

    shop.a = { price: 90000, available: false };
    await pollOnce(deps(offers));
    const after = (await (await fetch(`${api.url}/prices/a`)).json()).offers[0];
    expect(after).toMatchObject({ amount: 900, available: false });
    const hist = (await (await fetch(`${api.url}/prices/a/history`)).json()).points;
    expect(hist.map((p: { amount: number }) => p.amount)).toEqual([1000, 900]);
    await api.close();
  });

  it('a timeout, a 500 and garbage JSON each become an error, never a crash, and the good price survives', async () => {
    const offers = [mk('a', 'a'), mk('b', 'b'), mk('c', 'c')];
    shop['*'] = { price: 100000 };
    await pollOnce(deps(offers));
    shop.a = { price: 100000, delayMs: 800 };
    shop.b = { status: 500 };
    shop.c = { body: '{"variants": [' };
    const s = await pollOnce(deps(offers));
    expect(s.error).toBe(3);
    const snap = store.load();
    for (const o of Object.values(snap.offers)) expect(o).toMatchObject({ status: 'error', amount: 1000 });
  });

  it('stops hitting a host that keeps refusing, over a real connection', async () => {
    shop['*'] = { status: 429 };
    const offers = ['a', 'b', 'c', 'd', 'e', 'f'].map((h, i) => mk(`p${i}`, h));
    await pollOnce(deps(offers));
    expect(hits).toHaveLength(3);
  });

  it('survives a corrupt snapshot file and rebuilds it', async () => {
    const offers = [mk('a', 'a')];
    shop.a = { price: 100000 };
    await pollOnce(deps(offers));
    const { writeFileSync } = await import('node:fs');
    writeFileSync(join(dir, 'snapshot.json'), '{not json');
    const api = await serve(offers);
    expect((await fetch(`${api.url}/prices`)).status).toBe(200);
    await pollOnce(deps(offers));
    expect(Object.values(store.load().offers)[0]).toMatchObject({ amount: 1000 });
    await api.close();
  });
});

describe('the real registry', () => {
  it('all shopify entries in data/offers.json poll cleanly when their host is replaced by the fake', async () => {
    const real = JSON.parse(readFileSync('data/offers.json', 'utf8')) as Offer[];
    // Same product handles and variant ids as production; only the origin changes, and each handle is served
    // with its variant at the registry price.
    const offers = real.map((o) => ({ ...o, url: `${base}${new URL(o.url).pathname}` }));
    for (const o of offers.filter((x) => x.adapter === 'shopify')) {
      const handle = new URL(o.url).pathname.replace(/^\/products\//, '');
      shop[handle] = { body: JSON.stringify({ variants: [{ id: o.variantId, price: o.price * 100, compare_at_price: null, available: true }] }) };
    }
    const s = await pollOnce({ ...deps(offers), settings: { ...settings, requestTimeoutMs: 2000 } });
    const shopify = offers.filter((o) => o.adapter === 'shopify').length;
    expect(s.ok).toBe(shopify);
    expect(s.error + s.suspect).toBe(0);
    expect(s.unsupported).toBe(offers.length - shopify);
    // 41 real sockets one after another on a busy laptop took over the 5 s default; the assertions are unchanged.
  }, 30_000);
});
