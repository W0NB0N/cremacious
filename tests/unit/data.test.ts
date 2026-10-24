import { describe, expect, it } from 'vitest';
import { categories, cell, isPlaceholder, keySpec, placeholder, priceText, products, rows, stats, type Product } from '@/data/products';
import { initial } from '@/components/ComparisonContext';

const grinder = products.find((p) => p.category === 'grinders')!;
const withSpecs = (specs: Record<string, unknown>, extra: Partial<Product> = {}) =>
  ({ ...grinder, specs: { ...grinder.specs, ...specs }, src: {}, ...extra }) as Product;

describe('cell()', () => {
  it('formats a quantity and keeps its number for bars', () => {
    const c = cell(withSpecs({ burrSize: { value: 38, unit: 'mm' } }), 'burrSize');
    expect(c).toMatchObject({ text: '38 mm', value: 38, unit: 'mm' });
  });
  it('prefers a quantity\'s own text and trims long decimals', () => {
    expect(cell(withSpecs({ weight: { value: 0.63, unit: 'kg', text: 'About 630 g' } }), 'weight').text).toBe('About 630 g');
    expect(cell(withSpecs({ weight: { value: 1.23456, unit: 'kg' } }), 'weight').text).toBe('1.23 kg');
  });
  it('passes strings and None through', () => {
    expect(cell(withSpecs({ burrs: 'Flat' }), 'burrs').text).toBe('Flat');
    expect(cell(withSpecs({ power: 'None' }), 'power').text).toBe('None');
  });
  it('renders a placeholder as Unconfirmed with its note and no source', () => {
    const p = withSpecs({ weight: placeholder('not stated') }, { src: { weight: 0 } } as Partial<Product>);
    expect(cell(p, 'weight')).toEqual({ text: 'Unconfirmed', note: 'not stated' });
  });
  it('attaches the source named in src', () => {
    const p = withSpecs({ burrs: 'Flat' }, { src: { burrs: 1 } } as Partial<Product>);
    expect(cell(p, 'burrs').source).toBe(p.sources[1]);
  });
  it('returns empty text for a missing key', () => {
    expect(cell(grinder, 'nope')).toEqual({ text: '' });
  });
});

describe('priceText()', () => {
  it('formats a single INR price with Indian digit grouping', () => {
    expect(priceText(withSpecs({}, { price: { amount: 123456, currency: 'INR' } })).text).toBe('₹1,23,456');
  });
  it('formats a range', () => {
    expect(priceText(withSpecs({}, { price: { amount: 999, upTo: 1499.5, currency: 'INR' } })).text).toBe('₹999 to ₹1,499.50');
  });
  it('renders a placeholder price as Unconfirmed', () => {
    expect(priceText(withSpecs({}, { price: placeholder('sold out') })).text).toBe('Unconfirmed');
  });
});

describe('catalogue data', () => {
  it('has unique ids', () => {
    expect(new Set(products.map((p) => p.id)).size).toBe(products.length);
  });
  it('has products in every category and nothing outside them', () => {
    for (const c of categories) expect(products.some((p) => p.category === c.id)).toBe(true);
    expect(products.every((p) => categories.some((c) => c.id === p.category))).toBe(true);
  });
  it('defines every table row and key spec on each product (catches row-key typos)', () => {
    for (const p of products) {
      for (const r of rows[p.category]) expect(p.specs, `${p.id}.${r.key}`).toHaveProperty(r.key);
      expect(p.specs, `${p.id} keySpec`).toHaveProperty(keySpec[p.category]);
    }
  });
  it('resolves every src index and never sources a placeholder', () => {
    for (const p of products) {
      for (const [k, i] of Object.entries(p.src)) {
        expect(p.sources[i as number], `${p.id}.${k}`).toBeDefined();
        const v = k === 'price' ? p.price : (p.specs as Record<string, unknown>)[k];
        expect(isPlaceholder(v), `${p.id}.${k}`).toBe(false);
      }
    }
  });
  it('uses https source URLs and an ISO checked date', () => {
    for (const p of products) {
      for (const s of p.sources) expect(s.url, p.id).toMatch(/^https:\/\//);
      expect(p.checked).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
  it('prices everything in INR', () => {
    for (const p of products) if (!isPlaceholder(p.price)) expect(p.price.currency, p.id).toBe('INR');
  });
});

describe('stats()', () => {
  it('counts items, values and distinct sources', () => {
    const s = stats();
    const values = products.reduce((n, p) => n + Object.keys(p.specs).length + 1, 0);
    expect(s).toMatchObject({ items: products.length, categories: categories.length, values });
    expect(s.unconfirmed).toBeGreaterThan(0);
    expect(s.unconfirmed).toBeLessThan(values);
    expect(s.sources).toBe(new Set(products.flatMap((p) => p.sources.map((x) => x.url))).size);
  });
});

describe('compare defaults', () => {
  it('point at existing products in the right category, at most 3 each', () => {
    for (const [cat, ids] of Object.entries(initial.picks)) {
      expect(ids.length).toBeLessThanOrEqual(3);
      for (const id of ids) expect(products.find((p) => p.id === id)?.category, id).toBe(cat);
    }
  });
});
