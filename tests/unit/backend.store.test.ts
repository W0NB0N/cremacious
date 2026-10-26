// @vitest-environment node
// TDD, spec first (break-it findings F5, F6, F7, F11, F12): the stored state stays bounded, valid and truthful.
import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { pollOnce } from '../../backend/src/poller';
import { createApp } from '../../backend/src/server';
import { Store } from '../../backend/src/store';
import { depsFor, fakeFetch, JSON_URL, offer, settings, shopBody, withStore } from './support/backend';

const ctx = withStore();
const ok = (p: number) => fakeFetch({ [JSON_URL]: () => Response.json(shopBody(p)) });

describe('F5 history is bounded', () => {
  const fill = () => {
    const filler = JSON.stringify({ t: 'x', productId: 'other', url: 'u', amount: 1, available: true }) + '\n';
    writeFileSync(join(ctx.dir, 'history.jsonl'), filler.repeat(Math.ceil(30_000_000 / filler.length)));
    for (let i = 1; i <= 5; i++) appendFileSync(join(ctx.dir, 'history.jsonl'), JSON.stringify({ t: `t${i}`, productId: 'p1', url: 'u', amount: i, available: true }) + '\n');
  };

  it('returns the last rows of a 30 MB file in under 100 ms', () => {
    fill();
    const t0 = performance.now();
    const rows = ctx.store.history('p1', 3);
    expect(performance.now() - t0).toBeLessThan(100);
    expect(rows.map((r) => r.amount)).toEqual([3, 4, 5]);
  });

  it('still finds a product whose rows are all far from the end, and skips a damaged line', () => {
    const p = join(ctx.dir, 'history.jsonl');
    writeFileSync(p, JSON.stringify({ t: 'a', productId: 'p1', url: 'u', amount: 7, available: true }) + '\nnot json\n' + (JSON.stringify({ t: 'b', productId: 'z', url: 'u', amount: 1, available: true }) + '\n').repeat(5000));
    expect(ctx.store.history('p1', 5).map((r) => r.amount)).toEqual([7]);
  });

  it('clamps ?limit to 1..500 and falls back to 100 when it is not a number', async () => {
    fill();
    const app = createApp({ store: ctx.store, offers: [offer()] });
    const n = async (q: string) => (await request(app).get(`/prices/p1/history${q}`)).body.points.length;
    expect(await n('?limit=0')).toBe(1);
    expect(await n('?limit=-5')).toBe(1);
    expect(await n('?limit=2')).toBe(2);
    expect(await n('?limit=abc')).toBe(5);
    expect(await n('')).toBe(5);
  });
});

describe('F6 the snapshot only lists current offers', () => {
  it('offers no longer in the registry are removed after a cycle', async () => {
    const f = fakeFetch({ [JSON_URL]: () => Response.json(shopBody(100000)), 'https://a.example/products/new.js': () => Response.json(shopBody(100000)) });
    await pollOnce(depsFor(ctx.store, [offer()], f));
    await pollOnce(depsFor(ctx.store, [offer({ url: 'https://a.example/products/new' })], f));
    expect(Object.keys(ctx.store.load().offers)).toEqual(['p1|https://a.example/products/new']);
  });
});

describe('F7 a damaged snapshot loads as empty', () => {
  it.each([['{}'], ['null'], ['[]'], ['{"offers": 5}'], ['{"offers": null}'], ['"text"']])('%s', async (content) => {
    writeFileSync(join(ctx.dir, 'snapshot.json'), content);
    const app = createApp({ store: ctx.store, offers: [offer()] });
    await request(app).get('/prices').expect(200);
    await request(app).get('/prices/p1').expect(200);
    await request(app).get('/health').expect(503);
    expect((await pollOnce(depsFor(ctx.store, [offer()], ok(100000)))).ok).toBe(1);
  });
});

describe('F11 a held price survives a failed read in between', () => {
  it('is accepted when the next successful read agrees', async () => {
    const o = offer({ price: 100 });
    await pollOnce(depsFor(ctx.store, [o], ok(10000)));
    await pollOnce(depsFor(ctx.store, [o], ok(30000)));
    expect(Object.values(ctx.store.load().offers)[0]).toMatchObject({ status: 'suspect', suspectAmount: 300 });
    await pollOnce(depsFor(ctx.store, [o], fakeFetch({ [JSON_URL]: () => new Response('x', { status: 500 }) })));
    await pollOnce(depsFor(ctx.store, [o], ok(30000)));
    expect(Object.values(ctx.store.load().offers)[0]).toMatchObject({ status: 'ok', amount: 300 });
  });

  it('is still dropped when the next read disagrees', async () => {
    const o = offer({ price: 100 });
    await pollOnce(depsFor(ctx.store, [o], ok(10000)));
    await pollOnce(depsFor(ctx.store, [o], ok(30000)));
    await pollOnce(depsFor(ctx.store, [o], ok(10100)));
    expect(Object.values(ctx.store.load().offers)[0]).toMatchObject({ status: 'ok', amount: 101 });
  });
});

describe('F12 one cycle at a time per store', () => {
  const slowFetch = () => {
    let release!: () => void;
    const gate = new Promise<void>((r) => { release = r; });
    const impl = (async () => { await gate; return Response.json(shopBody(100000)); }) as unknown as typeof fetch;
    return { impl, release };
  };

  it('a second cycle started while one runs is refused, and history is not duplicated', async () => {
    const slow = slowFetch();
    const first = pollOnce({ offers: [offer()], store: ctx.store, fetchImpl: slow.impl, settings });
    await new Promise((r) => setTimeout(r, 20));
    await expect(pollOnce({ offers: [offer()], store: ctx.store, fetchImpl: slow.impl, settings })).rejects.toThrow(/already running/i);
    slow.release();
    await first;
    expect(readFileSync(join(ctx.dir, 'history.jsonl'), 'utf8').trim().split('\n')).toHaveLength(1);
  });

  it('the lock is released afterwards, even when the cycle throws', async () => {
    await pollOnce(depsFor(ctx.store, [offer()], ok(100000)));
    class BrokenDisk extends Store { load(): never { throw new Error('disk'); } }
    await expect(pollOnce({ offers: [offer()], store: new BrokenDisk(ctx.dir), settings })).rejects.toThrow('disk');
    expect(existsSync(join(ctx.dir, 'poll.lock'))).toBe(false);
    await pollOnce(depsFor(ctx.store, [offer()], ok(100000)));
  });

  it('a lock left behind by a dead process does not block the next cycle', async () => {
    writeFileSync(join(ctx.dir, 'poll.lock'), '2147483646');
    expect((await pollOnce(depsFor(ctx.store, [offer()], ok(100000)))).ok).toBe(1);
  });
});
