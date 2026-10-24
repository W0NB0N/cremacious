import type { Offer, Reading } from '../types';

export type Fetch = typeof fetch;

/** Shopify stores publish every product as JSON at <product url>.js. Prices are in paise. */
export const shopifyJsonUrl = (productUrl: string) => {
  const u = new URL(productUrl);
  return `${u.origin}${u.pathname.replace(/\/$/, '')}.js`;
};

type ShopifyVariant = { id: number; price: number; compare_at_price: number | null; available: boolean };

export async function readShopify(
  offer: Offer,
  opts: { fetchImpl: Fetch; userAgent: string; timeoutMs: number },
): Promise<Reading> {
  if (offer.variantId === undefined) throw new Error('offer has no variantId');
  const res = await opts.fetchImpl(shopifyJsonUrl(offer.url), {
    headers: { 'user-agent': opts.userAgent, accept: 'application/json' },
    signal: AbortSignal.timeout(opts.timeoutMs),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  let body: { variants?: ShopifyVariant[] };
  try {
    body = await res.json();
  } catch {
    throw new Error('response was not JSON');
  }
  const variant = body.variants?.find((v) => v.id === offer.variantId);
  if (!variant) throw new Error(`variant ${offer.variantId} not on the page any more`);
  if (!Number.isInteger(variant.price) || variant.price <= 0) throw new Error(`unreadable price "${variant.price}"`);

  return {
    amount: variant.price / 100,
    available: variant.available === true,
    compareAt: variant.compare_at_price ? variant.compare_at_price / 100 : null,
  };
}
