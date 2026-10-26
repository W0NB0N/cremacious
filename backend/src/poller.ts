import { readShopify, type Fetch } from './adapters/shopify';
import { config } from './config';
import type { Store } from './store';
import { offerKey, type CycleSummary, type HistoryPoint, type Offer, type OfferSnapshot, type Reading, type Snapshot } from './types';

export type PollDeps = {
  offers: Offer[];
  store: Store;
  fetchImpl?: Fetch;
  now?: () => Date;
  sleep?: (ms: number) => Promise<void>;
  log?: (line: string) => void;
  settings?: Pick<typeof config, 'hostDelayMs' | 'requestTimeoutMs' | 'maxMoveFraction' | 'hostFailureLimit' | 'userAgent'>;
  /** Hosts never to request (see config). Defaults to config.blockedHosts. */
  blockedHosts?: string[];
};

const isBlocked = (url: string, blocked: Set<string>) => {
  try {
    return blocked.has(new URL(url).host.toLowerCase().replace(/^www\./, ''));
  } catch {
    return false; // an unparseable url is reported as 'invalid url' further down
  }
};

const realSleep =(ms: number) => new Promise<void>((r) => setTimeout(r, ms));

const base = (o: Offer, prev: OfferSnapshot | undefined): OfferSnapshot => ({
  productId: o.productId,
  retailer: o.retailer,
  url: o.url,
  amount: prev?.amount ?? null,
  available: prev?.available ?? null,
  listPrice: prev?.listPrice ?? null,
  referencePrice: o.price,
  status: prev?.status ?? 'unsupported',
  readAt: prev?.readAt ?? null,
  attemptedAt: prev?.attemptedAt ?? null,
});

/** One cycle at a time per store: a second one would duplicate history rows and race the snapshot write. */
export async function pollOnce(deps: PollDeps): Promise<CycleSummary> {
  const release = deps.store.acquireLock();
  try {
    return await runCycle(deps);
  } finally {
    release();
  }
}

/** Read every offer once. Hosts run side by side; offers on one host run one at a time, politely spaced. */
async function runCycle(deps: PollDeps): Promise<CycleSummary> {
  const { offers, store } = deps;
  const fetchImpl = deps.fetchImpl ?? fetch;
  const now = deps.now ?? (() => new Date());
  const sleep = deps.sleep ?? realSleep;
  const log = deps.log ?? (() => {});
  const s = deps.settings ?? config;

  const startedAt = now().toISOString();
  const snapshot: Snapshot = store.load();
  const history: HistoryPoint[] = [];
  const counts = { ok: 0, suspect: 0, error: 0, unsupported: 0, changed: 0 };

  const pollOne = async (o: Offer) => {
    const key = offerKey(o);
    const prev = snapshot.offers[key];
    const next = base(o, prev);
    next.attemptedAt = now().toISOString();

    let reading: Reading;
    try {
      reading = await readShopify(o, { fetchImpl, userAgent: s.userAgent, timeoutMs: s.requestTimeoutMs });
    } catch (e) {
      next.status = 'error';
      // The text is served by the API, so it is capped and never carries more than a short reason.
      next.error = (e instanceof Error ? e.message : String(e)).slice(0, 200);
      // A held price is still waiting for a second reading; one failed read in between must not forget it.
      if (prev?.suspectAmount !== undefined) next.suspectAmount = prev.suspectAmount;
      snapshot.offers[key] = next;
      counts.error++;
      return false;
    }

    const last = prev?.amount ?? o.price;
    const moved = Math.abs(reading.amount - last) / last;
    const confirmsSuspect = prev?.suspectAmount !== undefined && prev.suspectAmount === reading.amount;

    if (moved > s.maxMoveFraction && !confirmsSuspect) {
      // Keep the last good price; accept the new one only if the next read agrees.
      next.status = 'suspect';
      next.suspectAmount = reading.amount;
      snapshot.offers[key] = next;
      counts.suspect++;
      log(`suspect ${o.productId} @ ${o.retailer}: ${last} -> ${reading.amount}`);
      return true;
    }

    const changed = prev?.amount !== reading.amount || prev?.available !== reading.available;
    next.amount = reading.amount;
    next.available = reading.available;
    next.listPrice = reading.compareAt !== null && reading.compareAt > reading.amount ? reading.compareAt : null;
    next.status = 'ok';
    next.readAt = next.attemptedAt;
    delete next.error;
    delete next.suspectAmount;
    snapshot.offers[key] = next;
    counts.ok++;
    if (changed) {
      counts.changed++;
      history.push({ t: next.attemptedAt, productId: o.productId, url: o.url, amount: reading.amount, available: reading.available });
    }
    return true;
  };

  const blocked = new Set(deps.blockedHosts ?? config.blockedHosts);
  const byHost = new Map<string, Offer[]>();
  for (const o of offers) {
    if (o.adapter !== 'shopify' || isBlocked(o.url, blocked)) {
      snapshot.offers[offerKey(o)] = { ...base(o, snapshot.offers[offerKey(o)]), status: 'unsupported' };
      counts.unsupported++;
      continue;
    }
    let host: string;
    try {
      host = new URL(o.url).host;
    } catch {
      // One bad entry must not take the whole cycle down with it.
      const key = offerKey(o);
      snapshot.offers[key] = { ...base(o, snapshot.offers[key]), status: 'error', error: 'invalid url', attemptedAt: now().toISOString() };
      counts.error++;
      continue;
    }
    byHost.set(host, [...(byHost.get(host) ?? []), o]);
  }

  await Promise.all(
    [...byHost.entries()].map(async ([host, list]) => {
      let failuresInARow = 0;
      for (const [i, o] of list.entries()) {
        if (failuresInARow >= s.hostFailureLimit) {
          // The host is refusing us. Stop asking rather than make it worse.
          const key = offerKey(o);
          snapshot.offers[key] = { ...base(o, snapshot.offers[key]), status: 'error', error: `skipped: ${host} failed ${failuresInARow} times in a row`, attemptedAt: now().toISOString() };
          counts.error++;
          continue;
        }
        const ok = await pollOne(o);
        failuresInARow = ok ? 0 : failuresInARow + 1;
        if (i < list.length - 1) await sleep(s.hostDelayMs);
      }
    }),
  );

  // Offers removed from the registry must stop being served as current prices.
  const current = new Set(offers.map(offerKey));
  for (const key of Object.keys(snapshot.offers)) if (!current.has(key)) delete snapshot.offers[key];

  const polled = counts.ok + counts.suspect + counts.error;
  const summary: CycleSummary = {
    startedAt,
    finishedAt: now().toISOString(),
    total: offers.length,
    ...counts,
    failureRate: polled === 0 ? 0 : (counts.error + counts.suspect) / polled,
  };
  snapshot.updatedAt = summary.finishedAt;
  snapshot.lastCycle = summary;
  store.appendHistory(history);
  store.save(snapshot);
  log(`cycle: ${counts.ok} ok, ${counts.suspect} suspect, ${counts.error} error, ${counts.unsupported} unsupported, ${counts.changed} changed, failure rate ${(summary.failureRate * 100).toFixed(1)}%`);
  return summary;
}

/** Poll forever, one cycle at a time. A bad cycle doubles the wait (up to a day). Returns a stop function. */
export function startPolling(deps: PollDeps, intervalMs = config.pollIntervalMs, unhealthyRate = config.unhealthyRate) {
  let stopped = false;
  let timer: NodeJS.Timeout | undefined;
  let wait = intervalMs;
  const log = deps.log ?? (() => {});

  const tick = async () => {
    try {
      const summary = await pollOnce(deps);
      if (summary.failureRate > unhealthyRate) {
        wait = Math.min(wait * 2, 24 * 60 * 60 * 1000);
        log(`UNHEALTHY: failure rate ${(summary.failureRate * 100).toFixed(1)}% is above ${(unhealthyRate * 100).toFixed(0)}%. Backing off to ${Math.round(wait / 60000)} min.`);
      } else {
        wait = intervalMs;
      }
    } catch (e) {
      log(`cycle crashed: ${e instanceof Error ? e.message : String(e)}`);
    }
    if (!stopped) timer = setTimeout(tick, wait);
  };

  void tick();
  return () => {
    stopped = true;
    if (timer) clearTimeout(timer);
  };
}
