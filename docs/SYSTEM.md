# System

One page. Written 2026-10-27 by Sonnet 5.5. Covers the price backend; the site itself is described in `CLAUDE.md` and `DESIGN.md`.

## Modules

| Module | Owns |
|---|---|
| `src/data/products/*.ts` | Typed specs and sources per category (41 products) |
| `src/data/offers.ts` | Seller offers: product, retailer, url, adapter, `variantId`, written price |
| `scripts/export-data.mts` | Writes `data/products.json` and `data/offers.json`; `--check` fails if stale |
| `scripts/check-*.mts`, `blocked-urls.ts` | Release gates: data shape, URLs alive, cited numbers present; skip blocked hosts |
| `backend/src/config.ts` | Environment settings, bounds, default blocked hosts |
| `backend/src/offers.ts` | `parseOffers`: validates the registry at start-up |
| `backend/src/adapters/shopify.ts` | Reads one seller page; returns rupees |
| `backend/src/poller.ts` | One cycle: lock, per-host queues, breaker, suspect hold, history |
| `backend/src/store.ts` | `snapshot.json`, `history.jsonl`, `poll.lock` |
| `backend/src/server.ts` | Routes, health, caching headers, error handler |
| `backend/src/index.ts` | Wiring, timer, signal handling |

## Trust boundaries

| Where outside input enters | Guard |
|---|---|
| Seller page body and headers | No redirects, 1 MB cap, price must be a positive whole paise integer, error text capped |
| `data/offers.json` | `parseOffers` (https only, price above 0, `variantId` for Shopify, no duplicates). Gaps: internal hosts, credentials in URLs |
| Environment | `config.ts` bounds. Gap: no maximum on timer values |
| HTTP request path and query | Unknown route is JSON 404; `?limit` clamped to 1..500. Gap: product id shape |
| `backend/.data/` files | `load()` checks shape. Gap: nested fields (null offer entry) |

## One request, entry to response

`GET /prices/:id` -> `server.ts` route -> `store.load()` reads `snapshot.json` -> filter offers by product id -> JSON with `cache-control: public, max-age=60` (success only) -> any error goes to the error handler: generic JSON, `no-store`.

One polling cycle: `index.ts` timer -> `pollOnce` -> `acquireLock` -> group offers by host -> per host, one request at a time, `HOST_DELAY_MS` apart -> `readShopify` -> compare with last accepted price (hold if the move is over 40%) -> `store.save` and `appendHistory` -> release lock.

## Core data structures

| Structure | Shape | Access | Size | Writer |
|---|---|---|---|---|
| Snapshot | `{ updatedAt, lastCycle, offers: Record<"productId\|url", OfferSnapshot> }` | read whole file per request | about 41 entries | poller only, atomic rename |
| History | JSON lines of `{ t, productId, url, amount, available }` | append; read backwards in 64 KB chunks | grows forever; 153 MB scans in 767 ms | poller only |
| Lock | `poll.lock` containing a pid, created with the `wx` flag | exists or not | one line | poller; a dead owner's lock is taken over |
| Host queue | one chain per host, keyed on the host string | sequential per key | up to ~10 hosts | poller. Key is the raw host (break-it #2) |

## Constraints

- Never poll a host in `BLOCKED_HOSTS`. Never poll Amazon or Flipkart.
- Never run a second poller on the same `backend/.data/`.
- Never commit `backend/.data/` or any `.env`.
- Always keep the last good price when a read fails.
- Always keep the registry (`offers.ts`) as the only place sellers are listed; regenerate `data/*.json` with `npm run data:export`.
- Only the poller writes state; the server only reads it.
- Protected: the spill and theme code in `src/motion/` and the palette in `src/app/palette.ts`.
