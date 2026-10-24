import { describe, expect, it } from 'vitest';
import { offers } from '@/data/offers';
import { isPlaceholder, products } from '@/data/products';

describe('offers registry', () => {
  it('every product has at least one offer, and every offer names a real product', () => {
    const ids = new Set(products.map((p) => p.id));
    for (const p of products) expect(offers.some((o) => o.productId === p.id), p.id).toBe(true);
    for (const o of offers) expect(ids.has(o.productId), o.productId).toBe(true);
  });

  it('the first offer of each product carries the price shown on the site', () => {
    for (const p of products) {
      if (isPlaceholder(p.price)) continue;
      const first = offers.find((o) => o.productId === p.id)!;
      expect(first.price, p.id).toBe(p.price.amount);
    }
  });

  it('is well formed: https urls, no duplicates, shopify offers name a variant, ISO dates', () => {
    const seen = new Set<string>();
    for (const o of offers) {
      expect(o.url.startsWith('https://'), o.url).toBe(true);
      const key = `${o.productId}|${o.url}`;
      expect(seen.has(key), key).toBe(false);
      seen.add(key);
      if (o.adapter === 'shopify') expect(Number.isInteger(o.variantId), o.productId).toBe(true);
      expect(o.price, o.productId).toBeGreaterThan(0);
      expect(o.checked).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});
