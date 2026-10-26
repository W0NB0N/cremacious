// @vitest-environment node
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { readShopify, shopifyJsonUrl } from '../../backend/src/adapters/shopify';
import { pollOnce, type PollDeps } from '../../backend/src/poller';
import { createApp } from '../../backend/src/server';
import { Store } from '../../backend/src/store';
import type { Offer } from '../../backend/src/types';

const offer = (over: Partial<Offer> = {}): Offer => ({
  productId: 'p1', retailer: 'Shop', url: 'https://a.example/products/thing', adapter: 'shopify',
  variantId: 7, price: 1000, checked: '2026-10-23', ...over,
});

/** A fake Shopify store: url -> body (or status). Counts calls. */
function fakeFetch(pages: Record<string, { price?: number; available?: boolean; status?: number; raw?: string }>) {
  const calls: string[] = [];
  const impl = (async (input: RequestInfo | URL) => {
    const url = String(input);
    calls.push(url);
    const page = pages[url];
    if (!page) return new Response('nope', { status: 404 });
    if (page.status) return new Response('x', { status: page.status });
    if (page.raw !== undefined) return new Response(page.raw, { status: 200 });
    return Response.json({ variants: [{ id: 7, price: page.price, compare_at_price: null, available: page.available ?? true }] });
  }) as typeof fetch;
  return { impl, calls };
}

const settings = { hostDelayMs: 0, requestTimeoutMs: 1000, maxMoveFraction: 0.4, hostFailureLimit: 3, userAgent: 'test' };
const JSON_URL = 'https://a.example/products/thing.js';

let dir: string;
let store: Store;
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'crema-')); store = new Store(dir); });
afterEach(() => rmSync(dir, { recursive: true, force: true }));

const deps = (offers: Offer[], f: ReturnType<typeof fakeFetch>): PollDeps => ({ offers, store, fetchImpl: f.impl, settings, sleep: async () => {} });

describe('shopify adapter', () => {
  it('builds the .js url, trailing slash or not', () => {
    expect(shopifyJsonUrl('https://a.example/products/thing/')).toBe(JSON_URL);
    expect(shopifyJsonUrl('https://a.example/products/thing?variant=1')).toBe(JSON_URL);
  });

  it('reads paise as rupees and the availability flag', async () => {
    const f = fakeFetch({ [JSON_URL]: { price: 678500, available: false } });
    const r = await readShopify(offer(), { fetchImpl: f.impl, userAgent: 'test', timeoutMs: 1000 });
    expect(r).toEqual({ amount: 6785, available: false, compareAt: null });
  });

  it.each([
    ['an HTTP error', { status: 429 }, 'HTTP 429'],
    ['a non-JSON body', { raw: '<html>' }, 'not JSON'],
    ['a price of zero', { price: 0 }, 'unreadable price'],
  ])('rejects %s', async (_n, page, msg) => {
    const f = fakeFetch({ [JSON_URL]: page });
    await expect(readShopify(offer(), { fetchImpl: f.impl, userAgent: 't', timeoutMs: 1000 })).rejects.toThrow(msg);
  });

  it('rejects a variant that is gone', async () => {
    const f = fakeFetch({ [JSON_URL]: { price: 100 } });
    await expect(readShopify(offer({ variantId: 99 }), { fetchImpl: f.impl, userAgent: 't', timeoutMs: 1000 })).rejects.toThrow('not on the page');
  });
});

describe('pollOnce', () => {
  it('stores a read price and records history only when it changes', async () => {
    const f = fakeFetch({ [JSON_URL]: { price: 100000 } });
    const first = await pollOnce(deps([offer()], f));
    expect(first).toMatchObject({ ok: 1, changed: 1, failureRate: 0 });
    const again = await pollOnce(deps([offer()], f));
    expect(again.changed).toBe(0);
    expect(store.history('p1', 10)).toHaveLength(1);
    expect(Object.values(store.load().offers)[0]).toMatchObject({ amount: 1000, status: 'ok', available: true });
  });

  it('holds a jump of more than 40% as suspect, then accepts it when the next read agrees', async () => {
    await pollOnce(deps([offer()], fakeFetch({ [JSON_URL]: { price: 100000 } })));
    const jump = fakeFetch({ [JSON_URL]: { price: 10000 } });
    const held = await pollOnce(deps([offer()], jump));
    expect(held).toMatchObject({ suspect: 1, ok: 0 });
    expect(Object.values(store.load().offers)[0]).toMatchObject({ amount: 1000, status: 'suspect', suspectAmount: 100 });
    const accepted = await pollOnce(deps([offer()], jump));
    expect(accepted).toMatchObject({ ok: 1, suspect: 0 });
    expect(Object.values(store.load().offers)[0].amount).toBe(100);
  });

  it('keeps the last good price when a read fails, and counts the failure', async () => {
    await pollOnce(deps([offer()], fakeFetch({ [JSON_URL]: { price: 100000 } })));
    const s = await pollOnce(deps([offer()], fakeFetch({ [JSON_URL]: { status: 500 } })));
    expect(s).toMatchObject({ error: 1, failureRate: 1 });
    expect(Object.values(store.load().offers)[0]).toMatchObject({ amount: 1000, status: 'error', error: 'HTTP 500' });
  });

  it('does not poll manual offers and does not count them as failures', async () => {
    const f = fakeFetch({});
    const s = await pollOnce(deps([offer({ adapter: 'manual', variantId: undefined })], f));
    expect(f.calls).toHaveLength(0);
    expect(s).toMatchObject({ unsupported: 1, failureRate: 0 });
  });

  it('stops asking a host after 3 failures in a row', async () => {
    const urls = ['a', 'b', 'c', 'd', 'e'].map((n) => `https://a.example/products/${n}`);
    const list = urls.map((url, i) => offer({ productId: `p${i}`, url }));
    const f = fakeFetch(Object.fromEntries(urls.map((u) => [`${u}.js`, { status: 429 }])));
    const s = await pollOnce(deps(list, f));
    expect(f.calls).toHaveLength(3);
    expect(s.error).toBe(5);
    expect(Object.values(store.load().offers).filter((o) => o.error?.startsWith('skipped'))).toHaveLength(2);
  });
});

describe('api', () => {
  it('serves prices, history and health from the snapshot, and 404s unknown products', async () => {
    const o = offer();
    await pollOnce(deps([o], fakeFetch({ [JSON_URL]: { price: 100000 } })));
    const app = createApp({ store, offers: [o] });

    const all = await request(app).get('/prices').expect(200);
    expect(all.body.products.p1[0]).toMatchObject({ amount: 1000, retailer: 'Shop' });

    const one = await request(app).get('/prices/p1').expect(200);
    expect(one.body.offers).toHaveLength(1);

    const hist = await request(app).get('/prices/p1/history?limit=5').expect(200);
    expect(hist.body.points).toHaveLength(1);

    await request(app).get('/prices/nope').expect(404);
    await request(app).get('/prices/nope/history').expect(404);
    expect((await request(app).get('/health').expect(200)).body.healthy).toBe(true);
  });

  it('health is 503 when the last cycle mostly failed, and also 503 before any cycle', async () => {
    const o = offer();
    const app = createApp({ store, offers: [o] });
    await request(app).get('/health').expect(503);
    await pollOnce(deps([o], fakeFetch({ [JSON_URL]: { status: 500 } })));
    const res = await request(app).get('/health').expect(503);
    expect(res.body.healthy).toBe(false);
  });

  it('sends a CORS header only when an origin is configured', async () => {
    const o = offer();
    const off = await request(createApp({ store, offers: [o] })).get('/prices');
    expect(off.headers['access-control-allow-origin']).toBeUndefined();
    const on = await request(createApp({ store, offers: [o], allowedOrigin: 'https://site.example' })).get('/prices');
    expect(on.headers['access-control-allow-origin']).toBe('https://site.example');
  });
});
