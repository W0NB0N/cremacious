# Decisions

One entry per non-trivial decision. Newest on top. Model: Sonnet 5.5 unless stated. Entries were written after the change, not before; the process slip is noted in HANDOVER.

## D8. Bump `@types/node` from 20 to 22 (2026-10-27, PR #11)

- Context: Vercel runs `npm install`; `vitest@5.0.5` has optional peer `@types/node` `^22 || >=24`; the repo pinned `^20`. ERESOLVE.
- Options: (a) bump to 22; (b) bump to 24; (c) `--legacy-peer-deps` in Vercel settings; (d) drop vitest.
- Chosen: (a), `^22.20.5`. Dev-only, types only. 22 is the smallest version vitest accepts and still a long-term-support line. (c) hides real conflicts; (d) loses the tests; (b) is a bigger jump than needed.
- New dependency version: `@types/node` 22.20.5, maintained by DefinitelyTyped. Pinned by `package-lock.json`.
- Trade-off: types now describe Node 22 APIs; the runtime Node version is set elsewhere and could be older.
- Revisit if: Vercel is still red, or the project's Node version is below 22.

## D7. Block the four stores whose terms prohibit scraping (2026-10-26, PR #8)

- Context: terms read 2026-10-26. Explicit bans: Fix Coffee s.14(e), Something's Brewing s.12(i), Black Baza s.12(i), Bilihu s.12(i).
- Options: poll anyway at low rate; block by default; delete those offers.
- Chosen: block by default through `BLOCKED_HOSTS`. Blocked offers stay in the registry as `unsupported` with their written price.
- Trade-off: 10 of 41 offers carry a static price that goes stale.
- Revisit if: a store gives permission (set `BLOCKED_HOSTS=`), or the three unread terms pages (Blue Tokai, Araku, Saraca) contain a ban.

## D6. Selling price is the price; compare-at is `listPrice` (2026-10-26, PR #7)

- Context: Shopify reports a selling price and a higher compare-at price. A compare-at price is the store's claim, not a verified saving.
- Options: show compare-at as the price; show the saving; keep it informational.
- Chosen: `amount` = selling price; `listPrice` only when above `amount`, informational. User said "whatever you feel fine".
- Revisit if: the site wants to show discounts.

## D5. Config refuses values that switch a guard off (2026-10-26, PR #9)

- Context: a failure limit of 0 never skips a dead host; an interval of 0 polls in a tight loop.
- Chosen: min and max per setting, error at start-up. Floors: `POLL_INTERVAL_MS` 60,000; `HOST_FAILURE_LIMIT` 1; `REQUEST_TIMEOUT_MS` 1; `MAX_MOVE_FRACTION` 0.01; `UNHEALTHY_RATE` at most 1.
- Open: no maximum yet for the timer values (break-it #1, #11).

## D4. Seller responses are untrusted (2026-10-26, PR #4)

- Chosen: redirects never followed, 1 MB streamed cap, generic error text, stored errors capped at 200 characters, price must be a positive whole paise integer.
- Why: a seller (or someone in the path) can send anything; the output is served to browsers.

## D3. `/health` tells the truth (2026-10-26, PR #3)

- Chosen: 503 with a `reason` before the first cycle, when the last cycle is older than 2 times the interval, or when the failure rate is above `UNHEALTHY_RATE` (0.2).
- Rejected: always 200 (hid a dead poller).
- Changed on purpose: an old test expected 200 before any cycle.
- Open: a cycle that polled nothing still counts healthy (break-it #4); garbage `lastCycle` data is trusted (#3).

## D2. Polling, not webhooks; no Amazon or Flipkart (2026-10-23, PR #1)

- Context: need current prices per seller.
- Options: webhooks; polling Shopify `.js` pages; scraping marketplaces; affiliate APIs.
- Chosen: polling Shopify product `.js` endpoints (public JSON, price in paise), 6 h interval, 2 s between requests to one host, circuit breaker after 3 failures, hold for moves over 40%.
- Rejected: webhooks (a third party cannot subscribe to a seller's); marketplace scraping (page structure and terms); affiliate APIs (need approved accounts, left for later).
- Trade-off: prices are up to 6 h old; the poller is load on someone else's site.

## D1. Flat files for state, not a database (2026-10-23, PR #1)

- Chosen: `snapshot.json` (atomic temp file and rename), `history.jsonl` (append only), both in git-ignored `backend/.data/`.
- Why: 41 offers, one writer, no new service to run or pay for.
- Trade-off: history is never rotated (break-it #8); one machine only; no concurrent writers beyond the lock.
- Revisit if: more than one instance runs, or history passes tens of MB.

## Dependencies added

| Package | Why | Where | Version |
|---|---|---|---|
| `express` | HTTP API | runtime | ^5.3.0 |
| `tsx` | run backend and scripts as TypeScript | dev | ^4.23.15 |
| `vitest` | unit and integration tests | dev | ^5.0.5 |
| `supertest`, `@types/supertest`, `@types/express` | test the API over HTTP | dev | ^7.3.1, ^7.2.1, ^5.0.6 |
| `autocannon` | load test, run with `npx`, not a dependency | none | n/a |
