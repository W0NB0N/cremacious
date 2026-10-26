// @vitest-environment node
// TDD, spec first (break-it findings F3 and F4): whatever a retailer sends is untrusted input.
import { createServer, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, describe, expect, it } from 'vitest';
import { pollOnce } from '../../backend/src/poller';
import { offer, settings, shopBody, withStore } from './support/backend';

const ctx = withStore();
const closers: Array<() => Promise<void>> = [];
afterEach(async () => { await Promise.all(closers.splice(0).map((c) => c())); });

/** A throwaway local "retailer"; returns its origin. */
const retailer = async (handler: (res: ServerResponse) => void, onHit?: (url: string) => void) => {
  const s = createServer((req, res) => { onHit?.(req.url ?? ''); handler(res); });
  await new Promise<void>((r) => s.listen(0, '127.0.0.1', r));
  closers.push(() => new Promise<void>((r) => s.close(() => r())));
  return `http://127.0.0.1:${(s.address() as AddressInfo).port}`;
};
const json = (res: ServerResponse, body: unknown) => res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify(body));
const onlyError = () => Object.values(ctx.store.load().offers)[0].error ?? '';

describe('F3 redirects', () => {
  it('a redirect is an error and the redirect target is never requested', async () => {
    const internalHits: string[] = [];
    const internal = await retailer((res) => json(res, shopBody(500000)), (u) => internalHits.push(u));
    const origin = await retailer((res) => res.writeHead(302, { location: `${internal}/internal-only` }).end());
    const s = await pollOnce({ offers: [offer({ url: `${origin}/products/thing` })], store: ctx.store, settings });
    expect(s.error).toBe(1);
    expect(onlyError()).toMatch(/redirect/i);
    expect(internalHits).toHaveLength(0);
  });
});

describe('F4 retailer text and size', () => {
  it('a hostile price value never reaches the stored error text, which is capped at 200 characters', async () => {
    const payload = '<img src=x onerror=alert(1)>'.repeat(5000);
    const origin = await retailer((res) => json(res, shopBody(payload)));
    await pollOnce({ offers: [offer({ url: `${origin}/products/thing` })], store: ctx.store, settings });
    expect(onlyError().length).toBeGreaterThan(0);
    expect(onlyError().length).toBeLessThanOrEqual(200);
    expect(onlyError()).not.toContain('<img');
  });

  it('a response body over 1 MB is rejected as too large', async () => {
    const origin = await retailer((res) => json(res, { variants: [], pad: 'x'.repeat(3_000_000) }));
    await pollOnce({ offers: [offer({ url: `${origin}/products/thing` })], store: ctx.store, settings });
    expect(onlyError()).toMatch(/too large/i);
  });

  it('a body just under the cap still parses', async () => {
    const origin = await retailer((res) => json(res, { ...shopBody(100000), pad: 'x'.repeat(900_000) }));
    const s = await pollOnce({ offers: [offer({ url: `${origin}/products/thing` })], store: ctx.store, settings });
    expect(s.ok).toBe(1);
  });
});
