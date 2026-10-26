// All settings come from the environment, with safe defaults. Nothing here is a secret.
const num = (name: string, fallback: number) => {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) throw new Error(`${name} must be a non-negative number, got "${raw}"`);
  return n;
};

/** "Foo.com, www.bar.in" -> ['foo.com', 'bar.in']. Hosts compare without case or a leading www. */
export const hostList = (raw: string) =>
  raw.split(',').map((h) => h.trim().toLowerCase().replace(/^www\./, '')).filter(Boolean);

// Stores whose terms of service prohibit scraping or crawling (read 2026-10-26): Fix Coffee s.14(e),
// Something's Brewing s.12(i), Black Baza s.12(i), Bilihu s.12(i). Set BLOCKED_HOSTS= (empty) once a store allows it.
const DEFAULT_BLOCKED_HOSTS = 'fixcoffee.shop,somethingsbrewing.in,blackbazacoffee.com,bilihu.in';

export const config = {
  /** Offers on these hosts are never requested; they show as 'unsupported' and keep the registry price. */
  blockedHosts: hostList(process.env.BLOCKED_HOSTS ?? DEFAULT_BLOCKED_HOSTS),
  port: num('PORT', 4000),
  /** Time between full polling cycles. */
  pollIntervalMs: num('POLL_INTERVAL_MS', 6 * 60 * 60 * 1000),
  /** Pause between two requests to the same host. */
  hostDelayMs: num('HOST_DELAY_MS', 2000),
  requestTimeoutMs: num('REQUEST_TIMEOUT_MS', 20_000),
  /** A new price further than this fraction from the last accepted one is held as 'suspect'. */
  maxMoveFraction: num('MAX_MOVE_FRACTION', 0.4),
  /** Skip the rest of a host in a cycle after this many failures in a row. */
  hostFailureLimit: num('HOST_FAILURE_LIMIT', 3),
  /** Above this failure rate the cycle is reported unhealthy and the next one waits longer. */
  unhealthyRate: num('UNHEALTHY_RATE', 0.2),
  /** Set POLL=off to serve the stored snapshot without polling. */
  polling: process.env.POLL !== 'off',
  storeDir: process.env.STORE_DIR ?? 'backend/.data',
  /** Browsers from this origin may call the API. Empty means no CORS header is sent. */
  allowedOrigin: process.env.ALLOWED_ORIGIN ?? '',
  userAgent: process.env.USER_AGENT ?? 'CremaciousPriceBot/0.1 (price comparison; reads public product pages)',
};
