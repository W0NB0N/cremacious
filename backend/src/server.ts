import express, { type ErrorRequestHandler, type Response } from 'express';
import { config } from './config';
import type { Store } from './store';
import type { Offer } from './types';

/** Read-only JSON API over the stored snapshot. It never calls a seller itself; the poller does. */
/** Prices change every few hours; a short cache keeps repeat visits cheap. Only called on a successful read. */
const cacheable = (res: Response) => res.setHeader('cache-control', 'public, max-age=60');

export function createApp(deps: { store: Store; offers: Offer[]; allowedOrigin?: string; now?: () => Date; pollIntervalMs?: number; log?: (line: string) => void }) {
  const { store, offers } = deps;
  const now = deps.now ?? (() => new Date());
  const pollIntervalMs = deps.pollIntervalMs ?? config.pollIntervalMs;
  const known = new Set(offers.map((o) => o.productId));
  const allowedOrigin = deps.allowedOrigin ?? config.allowedOrigin;
  const app = express();
  app.disable('x-powered-by');

  app.use((req, res, next) => {
    if (allowedOrigin) res.setHeader('access-control-allow-origin', allowedOrigin);
    // Default is no cache, so an error or health answer is never stored by a proxy; price routes opt in below.
    res.setHeader('cache-control', 'no-store');
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
    cacheable(res);
    res.json({ updatedAt: snap.updatedAt, products: byProduct });
  });

  app.get('/prices/:productId', (req, res) => {
    const { productId } = req.params;
    if (!known.has(productId)) return void res.status(404).json({ error: 'unknown product' });
    const snap = store.load();
    cacheable(res);
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
    const points = store.history(productId, limit);
    cacheable(res);
    res.json({ productId, points });
  });

  app.use((_req, res) => void res.status(404).json({ error: 'not found' }));

  // Last in the chain. Clients get a short generic message; the real error (which can hold paths) goes to the log only.
  // Express recognises an error handler only by its four parameters, so `_next` must stay even though it is unused.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const onError: ErrorRequestHandler = (err, _req, res, _next) => {
    const status = typeof err?.status === 'number' && err.status >= 400 && err.status < 500 ? err.status : 500;
    if (status === 500) deps.log?.(`error: ${err instanceof Error ? err.stack ?? err.message : String(err)}`);
    res.status(status).json({ error: status === 500 ? 'internal error' : 'bad request' });
  };
  app.use(onError);

  return app;
}
