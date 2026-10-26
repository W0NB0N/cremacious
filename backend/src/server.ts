import express from 'express';
import { config } from './config';
import type { Store } from './store';
import type { Offer } from './types';

/** Read-only JSON API over the stored snapshot. It never calls a seller itself; the poller does. */
export function createApp(deps: { store: Store; offers: Offer[]; allowedOrigin?: string; now?: () => Date; pollIntervalMs?: number }) {
  const { store, offers } = deps;
  const now = deps.now ?? (() => new Date());
  const pollIntervalMs = deps.pollIntervalMs ?? config.pollIntervalMs;
  const known = new Set(offers.map((o) => o.productId));
  const allowedOrigin = deps.allowedOrigin ?? config.allowedOrigin;
  const app = express();
  app.disable('x-powered-by');

  app.use((req, res, next) => {
    if (allowedOrigin) res.setHeader('access-control-allow-origin', allowedOrigin);
    // Prices change every few hours; a short cache keeps repeat visits cheap.
    res.setHeader('cache-control', 'public, max-age=60');
    next();
  });

  app.get('/health', (_req, res) => {
    const snap = store.load();
    const cycle = snap.lastCycle;
    // Unhealthy when: no cycle yet, the last one is older than twice the interval (poller dead), or too many reads failed.
    let reason: string | undefined;
    if (cycle === null) reason = 'no completed cycle yet';
    else if (now().getTime() - Date.parse(cycle.finishedAt) > 2 * pollIntervalMs) reason = 'stale';
    else if (cycle.failureRate > config.unhealthyRate) reason = `failure rate ${(cycle.failureRate * 100).toFixed(1)}% is above ${(config.unhealthyRate * 100).toFixed(0)}%`;
    res.status(reason ? 503 : 200).json({ healthy: !reason, ...(reason && { reason }), polledAt: snap.updatedAt, lastCycle: cycle });
  });

  app.get('/prices', (_req, res) => {
    const snap = store.load();
    const byProduct: Record<string, unknown[]> = {};
    for (const o of Object.values(snap.offers)) (byProduct[o.productId] ??= []).push(o);
    res.json({ updatedAt: snap.updatedAt, products: byProduct });
  });

  app.get('/prices/:productId', (req, res) => {
    const { productId } = req.params;
    if (!known.has(productId)) return void res.status(404).json({ error: 'unknown product' });
    const snap = store.load();
    res.json({
      productId,
      updatedAt: snap.updatedAt,
      offers: Object.values(snap.offers).filter((o) => o.productId === productId),
    });
  });

  app.get('/prices/:productId/history', (req, res) => {
    const { productId } = req.params;
    if (!known.has(productId)) return void res.status(404).json({ error: 'unknown product' });
    const asked = req.query.limit === undefined || req.query.limit === '' ? 100 : Number(req.query.limit);
    const limit = Number.isFinite(asked) ? Math.min(Math.max(Math.trunc(asked), 1), 500) : 100;
    res.json({ productId, points: store.history(productId, limit) });
  });

  return app;
}
