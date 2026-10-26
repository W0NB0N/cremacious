import { offerKey, type Offer } from './types';

const ADAPTERS = new Set(['shopify', 'manual']);

/**
 * Validate data/offers.json before the poller trusts it. A bad entry stops the backend at start-up with a
 * message naming the entry, instead of crashing every cycle later. Invariant: https only, so a registry
 * typo can never point the poller at a plain-http or non-web address.
 */
export function parseOffers(raw: unknown): Offer[] {
  if (!Array.isArray(raw)) throw new Error('offers must be an array');
  const seen = new Set<string>();
  return raw.map((entry, i) => {
    const o = entry as Partial<Offer> | null;
    const label = `offer #${i} (${o?.productId ?? '?'})`;
    if (!o || typeof o !== 'object') throw new Error(`${label}: not an object`);
    if (typeof o.productId !== 'string' || !o.productId) throw new Error(`${label}: productId missing`);
    if (typeof o.retailer !== 'string' || !o.retailer) throw new Error(`${label}: retailer missing`);
    if (!ADAPTERS.has(o.adapter as string)) throw new Error(`${label}: adapter must be shopify or manual`);
    let url: URL;
    try {
      url = new URL(o.url as string);
    } catch {
      throw new Error(`${label}: url is not a valid URL: ${String(o.url).slice(0, 80)}`);
    }
    if (url.protocol !== 'https:') throw new Error(`${label}: url must be https`);
    if (typeof o.price !== 'number' || !Number.isFinite(o.price) || o.price <= 0) throw new Error(`${label}: price must be a positive number`);
    if (o.adapter === 'shopify' && !Number.isInteger(o.variantId)) throw new Error(`${label}: shopify offers need an integer variantId`);
    const key = offerKey(o as Offer);
    if (seen.has(key)) throw new Error(`${label}: duplicate offer ${key}`);
    seen.add(key);
    return o as Offer;
  });
}
