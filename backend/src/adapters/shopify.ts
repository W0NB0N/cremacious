import type { Offer, Reading } from '../types';

export type Fetch = typeof fetch;

/** Shopify stores publish every product as JSON at <product url>.js. Prices are in paise. */
export const shopifyJsonUrl = (productUrl: string) => {
  const u = new URL(productUrl);
  return `${u.origin}${u.pathname.replace(/\/$/, '')}.js`;
};

type ShopifyVariant = { id: number; price: number; compare_at_price: number | null; available: boolean };

/** A product page is a few KB. Anything near this size is not one, so stop reading rather than buffer it. */
export const MAX_BODY_BYTES = 1_000_000;

/** Read the body but give up past the cap. Checks the declared length first, then counts bytes as they stream in. */
async function readCapped(res: Response): Promise<string> {
  const declared = Number(res.headers.get('content-length'));
  if (declared > MAX_BODY_BYTES) throw new Error('response too large');
  if (!res.body) return '';
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BODY_BYTES) {
      await reader.cancel();
      throw new Error('response too large');
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString('utf8');
}

export async function readShopify(
  offer: Offer,
  opts: { fetchImpl: Fetch; userAgent: string; timeoutMs: number },
): Promise<Reading> {
  if (offer.variantId === undefined) throw new Error('offer has no variantId');
  const res = await opts.fetchImpl(shopifyJsonUrl(offer.url), {
    headers: { 'user-agent': opts.userAgent, accept: 'application/json' },
    signal: AbortSignal.timeout(opts.timeoutMs),
    // Never follow a redirect: a seller (or whoever sits in front of it) could point the poller at an internal address.
    redirect: 'manual',
  });
  if (res.status >= 300 && res.status < 400) throw new Error(`redirect not followed (HTTP ${res.status})`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  let body: { variants?: ShopifyVariant[] };
  try {
    body = JSON.parse(await readCapped(res));
  } catch (e) {
    if (e instanceof Error && e.message === 'response too large') throw e;
    throw new Error('response was not JSON');
  }
  const variant = body.variants?.find((v) => v.id === offer.variantId);
  if (!variant) throw new Error(`variant ${offer.variantId} not on the page any more`);
  if (!Number.isInteger(variant.price) || variant.price <= 0) throw new Error('unreadable price');

  return {
    amount: variant.price / 100,
    available: variant.available === true,
    compareAt: variant.compare_at_price ? variant.compare_at_price / 100 : null,
  };
}
