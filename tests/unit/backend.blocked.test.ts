// @vitest-environment node
// TDD, spec first. Decision: a store whose terms of service prohibit scraping or crawling is not polled.
// Read 2026-10-26: Fix Coffee (s.14e), Something's Brewing (s.12i), Black Baza (s.12i), Bilihu (s.12i).
import { describe, expect, it } from 'vitest';
import { config, hostList } from '../../backend/src/config';
import { pollOnce } from '../../backend/src/poller';
import { fakeFetch, offer, settings, shopBody, withStore } from './support/backend';

const ctx = withStore();
const okPage = (url: string) => ({ [url]: () => Response.json(shopBody(100000)) });
const urlOf = (host: string) => `https://${host}/products/thing`;

describe('blocked hosts', () => {
  it('are never requested, are reported unsupported, and do not stop the others', async () => {
    const f = fakeFetch({ ...okPage(`${urlOf('open.example')}.js`), ...okPage(`${urlOf('banned.example')}.js`) });
    const offers = [offer({ productId: 'a', url: urlOf('open.example') }), offer({ productId: 'b', url: urlOf('banned.example') })];
    const s = await pollOnce({ offers, store: ctx.store, fetchImpl: f.impl, settings, sleep: async () => {}, blockedHosts: ['banned.example'] });
    expect(s).toMatchObject({ ok: 1, unsupported: 1, error: 0 });
    expect(f.calls).toEqual([`${urlOf('open.example')}.js`]);
    expect(ctx.store.load().offers[`b|${urlOf('banned.example')}`].status).toBe('unsupported');
  });

  it('match regardless of a www. prefix or letter case', async () => {
    const f = fakeFetch({});
    const offers = [offer({ url: urlOf('www.Banned.example') })];
    const s = await pollOnce({ offers, store: ctx.store, fetchImpl: f.impl, settings, sleep: async () => {}, blockedHosts: ['banned.example'] });
    expect(s.unsupported).toBe(1);
    expect(f.calls).toHaveLength(0);
  });

  it('an empty list polls everything', async () => {
    const f = fakeFetch(okPage(`${urlOf('banned.example')}.js`));
    const s = await pollOnce({ offers: [offer({ url: urlOf('banned.example') })], store: ctx.store, fetchImpl: f.impl, settings, sleep: async () => {}, blockedHosts: [] });
    expect(s.ok).toBe(1);
  });

  it('the default list is the four stores whose terms prohibit scraping', () => {
    expect([...config.blockedHosts].sort()).toEqual(['bilihu.in', 'blackbazacoffee.com', 'fixcoffee.shop', 'somethingsbrewing.in']);
  });

  it('hostList trims, lowercases, strips www. and drops empties', () => {
    expect(hostList(' Foo.com, www.Bar.in ,,')).toEqual(['foo.com', 'bar.in']);
  });
});
