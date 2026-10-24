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
| `GET /health` | `200` with `healthy`, or `503` when the last cycle's failure rate is above `UNHEALTHY_RATE`. |
| `GET /prices` | Every offer, grouped by product id. |
| `GET /prices/:productId` | One product's offers. `404` for an unknown id. |
| `GET /prices/:productId/history?limit=` | Accepted price changes, newest last (limit 1 to 500). |

## Guards

- Hosts are polled side by side, but one request at a time per host, `HOST_DELAY_MS` apart.
- After `HOST_FAILURE_LIMIT` failures in a row a host is skipped for the rest of the cycle.
- A price that moves more than `MAX_MOVE_FRACTION` (40%) from the last accepted one is held as `suspect` until a second read agrees.
- A cycle above `UNHEALTHY_RATE` doubles the wait before the next one (up to 24 h).
- A failed read never overwrites the last good price.

## Adding a seller

Add an entry to `src/data/offers.ts`, then `npm run data:export`.

- Shopify stores (`/products/<handle>.js` returns JSON): `adapter: 'shopify'` and the `variantId` to track. The price there is in paise.
- Anything else: `adapter: 'manual'`. It is listed but never polled.

Amazon and Flipkart have no adapter. Their product pages are built to resist automated reading and their terms forbid it, so a scraper would break often and risk the bot being blocked. The supported routes are the Amazon Associates Product Advertising API and the Flipkart Affiliate API, both of which need an approved affiliate account. Add an adapter once you have credentials; keep them in environment variables, never in the repo.
