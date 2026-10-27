# Handover

Newest entry on top. Read this first, update it last.

## 2026-10-27, Sonnet 5.5: price backend, hardening, Vercel failure

### Done

| Area | What | PR |
|---|---|---|
| Data | India data fixes, `src/data/offers.ts` (41 offers: 40 Shopify with `variantId`, 1 manual), generated `data/*.json` | #1 |
| Backend | Express 5 poller and JSON API in `backend/` | #1 |
| Tests | Integration tests over real sockets | #2 |
| Registry and health | `parseOffers` validation; `/health` returns 503 before a cycle, when stale, or above the failure rate | #3 |
| Untrusted responses | No redirects, 1 MB cap, generic error text, 200 char error cap | #4 |
| Store | Validated load, bounded history read, `poll.lock`, pruning of removed offers | #5 |
| HTTP errors | `no-store` by default, JSON 404, generic 500 | #6 |
| List price | `listPrice` (compare-at) kept apart from `amount` | #7 |
| Terms of service | Four stores that ban scraping are blocked by default | #8 |
| Config | Minimums and maximums on settings that switch a guard off | #9 |
| Data checks | `data:urls` and `data:cited` skip blocked hosts | #10 |
| Vercel | `@types/node` 20 to 22 (see Broken) | #11 |
| Docs | This folder | this PR |

Nothing is merged. Every branch is pushed with its own PR. Stack order: #1 <- #3 <- #4 <- #5 <- #6 <- #7 <- #8 <- #9 <- #10. #2 and #11 sit on #1.

### In progress

Nothing running. No background processes, no servers.

### Broken

| Item | State |
|---|---|
| Vercel build on every PR | `npm install` fails with ERESOLVE: `vitest@5.0.5` has an optional peer `@types/node` `^22 \|\| >=24`, the repo pinned `^20`. Master has no vitest, so it deploys. |
| Fix | PR #11. **Unverified on Vercel.** Could not reproduce locally with npm 10 or 11 on Node 26. Locally on #11: typecheck, lint, 47 tests, build and `npm ci` pass. |
| Other nine PRs | Stay red until the bump reaches them. |
| Break-it round 2 | 14 reproduced findings, **none fixed** (list below). |

### Next

1. Check the Vercel check on PR #11. If red, ask Vanshav (W0NB0N, repo owner) for the Node version in the Vercel project and a fresh log.
2. Decide whether to fix the break-it findings, as three stacked branches, tests first.
3. Decide: should a cycle that polled nothing count as unhealthy (recommended: yes)? Price ceiling (suggested 10,000,000 rupees)?
4. Read the terms pages not yet read: Blue Tokai, Araku, Saraca.
5. By hand: the 10 source URLs and 19 cited numbers that the gate scripts now skip.
6. Write `docs/DEFENSE.md` (yours to draft, not written here).
7. 1,000-user load test (only 100 was run).

### Do not touch

- Do not push or merge to `master` or `main`.
- Do not remove a host from `BLOCKED_HOSTS` without reading that store's terms again or getting its permission.
- Do not point the poller at Amazon or Flipkart pages.
- `src/motion/` and the spill code: unrelated to the backend, signature feature.

### Break-it findings, not fixed

| # | Finding | Proposed branch |
|---|---|---|
| 1 | `POLL_INTERVAL_MS` or `HOST_DELAY_MS` above 2^31-1 becomes a 1 ms timer (no maximum) | `fix/backend-host-keys` |
| 2 | Block list and per-host queue key on the raw host: `fixcoffee.shop.` or a port bypasses the block; `www.` and port variants break one-at-a-time per host | `fix/backend-host-keys` |
| 3 | `/health` is healthy on garbage `lastCycle` (`{}`, a 2099 `finishedAt`, null rate) | `fix/backend-state-validation` |
| 4 | `/health` is healthy when nothing was polled | `fix/backend-state-validation` |
| 5 | A null offer in `snapshot.json` makes `/prices` return 500 | `fix/backend-state-validation` |
| 6 | productId `constructor` or `__proto__` breaks `/prices`; oversized id accepted | `fix/backend-state-validation` |
| 7 | A 60 MB history line without a newline blocks the loop 10.7 s, ~1 GB memory | `fix/backend-shutdown-and-history` |
| 8 | History scan of a 153 MB file takes 767 ms (never rotated) | `fix/backend-shutdown-and-history` |
| 9 | SIGTERM hangs while a client holds an incomplete request | `fix/backend-shutdown-and-history` |
| 10 | An empty or `-1` `poll.lock` wedges the poller | `fix/backend-state-validation` |
| 11 | `REQUEST_TIMEOUT_MS` above 4294967295 breaks every poll | `fix/backend-host-keys` |
| 12 | No upper bound on prices (1e20 accepted after two reads) | decision needed |
| 13 | `offers.json` accepts internal hosts, credentials and query strings in URLs | `fix/backend-state-validation` |
| 14 | Smaller: body timeout reported as "not JSON", TypeError text served, `/PRICES` cached, removed offer served until next cycle | `fix/backend-state-validation` (first two) |

Earlier open items: slow price drift (F10), re-poll on restart (F13), recycled pid in the lock.

### Assumptions and open questions

| Assumption | Status |
|---|---|
| Selling price is "the price"; compare-at is informational | Your call ("whatever you feel fine"). Reversible. |
| Four ToS-ban stores blocked by default (10 of 41 offers) | Verified from the terms pages read 2026-10-26. |
| Kaapi's terms also ban scraping | Verified; moot, it is the manual offer and never polled. |
| Brewing Gadgets, Coffee Plus, Caramelly, Corridor Seven terms are silent on automated access | Verified (read). Silence is not permission. |
| Blue Tokai, Araku, Saraca terms | **Unverified.** Pages rate-limited or missing. |
| Black Baza robots.txt | **Unverified.** Could not confirm whether it redirects. |
| `/health` 503 before the first cycle | My choice. Reversible. |
| Poll interval floor 60,000 ms | My choice. |
| Lane A (proof of concept) today | **Unverified.** You did not answer the lane question. If real users arrive, it is Lane B and `DEFENSE.md` is needed first. |
| Vercel failure cause | Read from your pasted log; fix unproven. |
| Polling over webhooks | Verified: sellers offer no webhooks to a third party. |

### Trace: backend build (2026-10-23 to 2026-10-27)

| Step | Result |
|---|---|
| Goal | Live prices per seller for the comparison site, India only |
| Scope | Poll Shopify product pages; serve JSON; no Amazon, no Flipkart |
| Status | Built, hardened through two break-it rounds (round 1 fixed, round 2 open) |
| Combined local checks | 114 unit and integration tests in 14 files, lint, typecheck, `data:check`, `data:export:check`, build: all pass. e2e 22 passed, 4 skipped. `data:urls` 64/64 (10 skipped), `data:cited` 120/120 (19 skipped). |
| Load (100 connections, 15 s each, `POLL=off`, local) | `/prices` 5,949 req/s p99 40 ms; `/prices/:id` 10,263 req/s p99 20 ms; history `limit=500` 2,038 req/s p99 255 ms; `/health` 3,527 req/s p99 137 ms. 0 errors against a 1% threshold. Server memory 74 MB. |
| Open questions | See Next |

### Assumed without being told (end-of-task list)

- That `docs/` is the right place and that `DEFENSE.md` stays yours.
- That the stack tip (#10) is the right base for these docs.
- That the old root `HANDOVER.md` (2026-10-24, untracked, describes the pre-backend state) is left alone; this file supersedes it for the backend.

### Session handoff

- Done: backend v1 plus hardening, ToS blocking, load test, Vercel diagnosis, these docs.
- Left: Vercel confirmation, break-it fixes, unread terms, `DEFENSE.md`.
- Risks: Vercel fix unverified; 14 known weaknesses open; ToS silence on four stores; the site has no real users yet (Lane A).
