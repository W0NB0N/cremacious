// @vitest-environment node
// TDD, spec first (backend/README.md plus break-it findings F1 and F2). Written before the fix.
import { readFileSync } from 'node:fs';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { parseOffers } from '../../backend/src/offers';
import { pollOnce } from '../../backend/src/poller';
import { createApp } from '../../backend/src/server';
import { depsFor, fakeFetch, JSON_URL, offer, shopBody, withStore } from './support/backend';

const ctx = withStore();

describe('F1 bad offer data must not stop the others', () => {
  it('an offer with an unparseable url becomes an error for that offer only', async () => {
    const good = offer({ productId: 'good' });
    const bad = offer({ productId: 'bad', url: 'not a url' });
    const f = fakeFetch({ [JSON_URL]: () => Response.json(shopBody(100000)) });
    const s = await pollOnce(depsFor(ctx.store, [bad, good], f));
    expect(s).toMatchObject({ ok: 1, error: 1 });
    expect(ctx.store.load().offers['bad|not a url'].error).toMatch(/invalid url/i);
  });

  it('parseOffers rejects a malformed registry with a message naming the entry', () => {
    expect(() => parseOffers({})).toThrow(/array/i);
    expect(() => parseOffers([offer({ url: 'not a url' })])).toThrow(/p1.*url|url.*p1/i);
    expect(() => parseOffers([offer({ url: 'http://a.example/products/x' })])).toThrow(/https/i);
    expect(() => parseOffers([offer({ price: 0 })])).toThrow(/price/i);
    expect(() => parseOffers([offer({ variantId: undefined })])).toThrow(/variantId/i);
    expect(() => parseOffers([offer(), offer()])).toThrow(/duplicate/i);
  });

  it('parseOffers accepts the real registry', () => {
    expect(parseOffers(JSON.parse(readFileSync('data/offers.json', 'utf8')))).toHaveLength(41);
  });
});

describe('F2 health must notice a dead poller', () => {
  const at = (iso: string) => () => new Date(iso);
  const cycleAt = async (iso: string) => {
    await pollOnce({ ...depsFor(ctx.store, [offer()], fakeFetch({ [JSON_URL]: () => Response.json(shopBody(100000)) })), now: at(iso) });
  };
  const app = (nowIso: string) => createApp({ store: ctx.store, offers: [offer()], now: at(nowIso), pollIntervalMs: 6 * 3600_000 });

  it('is healthy right after a cycle', async () => {
    await cycleAt('2026-10-25T00:00:00Z');
    const r = await request(app('2026-10-25T01:00:00Z')).get('/health').expect(200);
    expect(r.body.healthy).toBe(true);
  });

  it('is 503 with reason "stale" when the last cycle is older than twice the interval', async () => {
    await cycleAt('2026-10-25T00:00:00Z');
    const r = await request(app('2026-10-25T13:00:00Z')).get('/health').expect(503);
    expect(r.body).toMatchObject({ healthy: false, reason: 'stale' });
  });

  it('is 503 with a reason before any cycle has completed', async () => {
    const r = await request(app('2026-10-25T00:00:00Z')).get('/health').expect(503);
    expect(r.body).toMatchObject({ healthy: false, reason: expect.stringMatching(/no completed cycle/i) });
  });
});
