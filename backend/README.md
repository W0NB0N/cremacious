# Price backend

Polls the sellers listed in `src/data/offers.ts`, keeps the latest price per offer and a history of changes, and serves them as JSON. The site itself stays static; specs live in `src/data/products/`.

```
src/data/offers.ts ──npm run data:export──▶ data/offers.json ──▶ poller ──▶ backend/.data/{snapshot.json,history.jsonl} ──▶ GET /prices
```

## Run

| Command | What |
|---|---|
| `npm run data:export` | Regenerate `data/*.json` from the TypeScript. Run after editing products or offers. |
| `npm run backend:poll` | One polling cycle, print a summary, exit (code 1 if the failure rate is above 20%). |
| `npm run backend` | Serve the API on `PORT` (default 4000) and poll every `POLL_INTERVAL_MS` (default 6 h). `POLL=off` serves the stored snapshot only. |

Stop it with Ctrl-C (SIGINT/SIGTERM close the server cleanly). State is in `backend/.data/` (git-ignored).

## API

| Route | Returns |
|---|---|
| `GET /health` | `200` with `healthy`, or `503` with a `reason`: no cycle has finished yet, the last one is older than twice `POLL_INTERVAL_MS` (`stale`), or its failure rate is above `UNHEALTHY_RATE`. |
| `GET /prices` | Every offer, grouped by product id. `amount` is the selling price; `listPrice` is the store's own higher compare-at price or `null` (informational, not a saving). |
| `GET /prices/:productId` | One product's offers. `404` for an unknown id. |
| `GET /prices/:productId/history?limit=` | Accepted price changes, newest last (limit 1 to 500). |

## Guards

- Hosts in `BLOCKED_HOSTS` are never requested (they show as `unsupported` and keep the registry price). The default is the four stores whose terms of service prohibit scraping or crawling: fixcoffee.shop, somethingsbrewing.in, blackbazacoffee.com, bilihu.in. Set `BLOCKED_HOSTS=` once a store gives permission.
- Hosts are polled side by side, but one request at a time per host, `HOST_DELAY_MS` apart.
- After `HOST_FAILURE_LIMIT` failures in a row a host is skipped for the rest of the cycle.
- A price that moves more than `MAX_MOVE_FRACTION` (40%) from the last accepted one is held as `suspect` until a second read agrees.
- A cycle above `UNHEALTHY_RATE` doubles the wait before the next one (up to 24 h).
- A failed read never overwrites the last good price, and does not forget a held `suspect` reading.
- Seller responses are untrusted: redirects are never followed, bodies over 1 MB are rejected, stored error text is capped at 200 characters.
- `data/offers.json` is validated at start-up (https only, positive price, `variantId` for Shopify, no duplicates); the backend refuses to start on a bad entry.
- One cycle at a time per store (`poll.lock` holds the pid; a dead owner's lock is taken over).
- Errors are generic JSON and sent with `no-store`; only successful price reads are cacheable (60 s).

## Adding a seller

Add an entry to `src/data/offers.ts`, then `npm run data:export`.

- Shopify stores (`/products/<handle>.js` returns JSON): `adapter: 'shopify'` and the `variantId` to track. The price there is in paise.
- Anything else: `adapter: 'manual'`. It is listed but never polled.

Amazon and Flipkart have no adapter. Their product pages are built to resist automated reading and their terms forbid it, so a scraper would break often and risk the bot being blocked. The supported routes are the Amazon Associates Product Advertising API and the Flipkart Affiliate API, both of which need an approved affiliate account. Add an adapter once you have credentials; keep them in environment variables, never in the repo.
