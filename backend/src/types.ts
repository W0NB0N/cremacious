import type { Offer } from '../../src/data/offers';

export type { Offer };

/** What an adapter read from a seller's page. Rupees. */
export type Reading = { amount: number; available: boolean; compareAt: number | null };

/**
 * ok          price read and accepted
 * suspect     price read but it moved too far from the last accepted price; kept out until it repeats
 * error       the read failed (network, HTTP error, variant gone, unreadable body)
 * unsupported no adapter polls this offer (adapter 'manual')
 */
export type OfferStatus = 'ok' | 'suspect' | 'error' | 'unsupported';

export type OfferSnapshot = {
  productId: string;
  retailer: string;
  url: string;
  /** Last accepted price in rupees; null if none has been read yet. */
  amount: number | null;
  available: boolean | null;
  /**
   * The store's own compare-at ("MRP", "was") price, only when it is above `amount`. Informational: it is the
   * store's claim, not a market price, so it must never be shown as a saving or used as `amount`.
   */
  listPrice: number | null;
  /** The price written in src/data/offers.ts, for comparison. */
  referencePrice: number;
  status: OfferStatus;
  error?: string;
  /** A rejected reading, shown while status is 'suspect'. */
  suspectAmount?: number;
  /** When `amount` was last read successfully (ISO). */
  readAt: string | null;
  /** When the last attempt was made (ISO). */
  attemptedAt: string | null;
};

export type CycleSummary = {
  startedAt: string;
  finishedAt: string;
  total: number;
  ok: number;
  suspect: number;
  error: number;
  unsupported: number;
  /** (error + suspect) / polled offers; unsupported offers are not polled. */
  failureRate: number;
  changed: number;
};

export type Snapshot = {
  updatedAt: string | null;
  lastCycle: CycleSummary | null;
  offers: Record<string, OfferSnapshot>;
};

export type HistoryPoint = { t: string; productId: string; url: string; amount: number; available: boolean };

export const offerKey = (o: Pick<Offer, 'productId' | 'url'>) => `${o.productId}|${o.url}`;
