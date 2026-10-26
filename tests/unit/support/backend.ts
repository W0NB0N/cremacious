// Shared fixtures for the backend tests. Not a test file (vitest only picks up *.test.ts).
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach } from 'vitest';
import type { PollDeps } from '../../../backend/src/poller';
import { Store } from '../../../backend/src/store';
import type { Offer } from '../../../backend/src/types';

export const offer = (over: Partial<Offer> = {}): Offer => ({
  productId: 'p1', retailer: 'Shop', url: 'https://a.example/products/thing', adapter: 'shopify',
  variantId: 7, price: 1000, checked: '2026-10-25', ...over,
});

export const settings = { hostDelayMs: 0, requestTimeoutMs: 1500, maxMoveFraction: 0.4, hostFailureLimit: 3, userAgent: 'test' };
export const JSON_URL = 'https://a.example/products/thing.js';

export const shopBody = (price: unknown, available = true, compareAt: number | null = null) => ({
  variants: [{ id: 7, price, compare_at_price: compareAt, available }],
});

export const fakeFetch = (pages: Record<string, () => Response>) => {
  const calls: string[] = [];
  const impl = (async (input: RequestInfo | URL) => {
    calls.push(String(input));
    const make = pages[String(input)];
    return make ? make() : new Response('nope', { status: 404 });
  }) as typeof fetch;
  return { impl, calls };
};

/** A fresh temp store per test; the directory is removed afterwards. */
export function withStore() {
  const ctx = {} as { dir: string; store: Store };
  beforeEach(() => { ctx.dir = mkdtempSync(join(tmpdir(), 'crema-h-')); ctx.store = new Store(ctx.dir); });
  afterEach(() => rmSync(ctx.dir, { recursive: true, force: true }));
  return ctx;
}

export const depsFor = (store: Store, offers: Offer[], f: ReturnType<typeof fakeFetch>): PollDeps => ({
  offers, store, fetchImpl: f.impl, settings, sleep: async () => {},
});
