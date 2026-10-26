// @vitest-environment node
// TDD, spec first. Decision: the price is the selling price. The store's compare-at ("MRP", "was") is the store's own
// claim, so it is kept as an informational `listPrice` and never replaces `amount`.
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { pollOnce } from '../../backend/src/poller';
import { createApp } from '../../backend/src/server';
import { depsFor, fakeFetch, JSON_URL, offer, shopBody, withStore } from './support/backend';

const ctx = withStore();
const poll = (price: unknown, compareAt: unknown) =>
  pollOnce(depsFor(ctx.store, [offer({ price: 659 })], fakeFetch({ [JSON_URL]: () => Response.json(shopBody(price, true, compareAt as number | null)) })));
const only = () => Object.values(ctx.store.load().offers)[0];

describe('listPrice', () => {
  it('amount stays the selling price and listPrice carries the higher compare-at', async () => {
    await poll(65892, 129990);
    expect(only()).toMatchObject({ amount: 658.92, listPrice: 1299.9 });
  });

  it.each([[null], [0], [65892], [50000], ['abc'], [-5], [1.5]])('a compare-at of %j is not a list price', async (compareAt) => {
    await poll(65892, compareAt);
    expect(only().listPrice).toBeNull();
    expect(only().amount).toBe(658.92);
  });

  it('is cleared when the store drops its compare-at', async () => {
    await poll(65892, 129990);
    await poll(65892, null);
    expect(only().listPrice).toBeNull();
  });

  it('is kept through a failed read', async () => {
    await poll(65892, 129990);
    await pollOnce(depsFor(ctx.store, [offer({ price: 659 })], fakeFetch({ [JSON_URL]: () => new Response('x', { status: 500 }) })));
    expect(only()).toMatchObject({ status: 'error', listPrice: 1299.9 });
  });

  it('is served by the API', async () => {
    await poll(65892, 129990);
    const r = await request(createApp({ store: ctx.store, offers: [offer({ price: 659 })] })).get('/prices/p1').expect(200);
    expect(r.body.offers[0]).toMatchObject({ amount: 658.92, listPrice: 1299.9 });
  });
});
