// @vitest-environment node
// TDD, spec first (break-it findings F8 and F9): errors say little and are never cached.
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../backend/src/server';
import { Store } from '../../backend/src/store';
import { offer, withStore } from './support/backend';

const ctx = withStore();
const app = () => createApp({ store: ctx.store, offers: [offer()] });

describe('F8 errors do not leak', () => {
  it('a malformed URL gets a JSON 400 with no file paths or stack', async () => {
    const r = await request(app()).get('/prices/%E0%A4%A').expect(400);
    expect(r.headers['content-type']).toMatch(/json/);
    expect(r.text).not.toMatch(/node_modules|\/Users\/|\.ts:\d+/);
  });

  it('an unknown route gets a JSON 404', async () => {
    const r = await request(app()).get('/nope').expect(404);
    expect(r.headers['content-type']).toMatch(/json/);
    expect(r.body).toEqual({ error: 'not found' });
  });

  it('an unexpected failure is a generic JSON 500 and the message stays in the log', async () => {
    class BrokenDisk extends Store { load(): never { throw new Error('secret path /Users/x/backend/.data'); } }
    const logged: string[] = [];
    const broken = createApp({ store: new BrokenDisk(ctx.dir), offers: [offer()], log: (l) => logged.push(l) });
    const r = await request(broken).get('/prices').expect(500);
    expect(r.body).toEqual({ error: 'internal error' });
    expect(r.text).not.toContain('secret');
    expect(logged.join('\n')).toContain('secret path');
  });
});

describe('F9 only successful price reads are cacheable', () => {
  it('200s on the price routes say max-age=60', async () => {
    for (const path of ['/prices', '/prices/p1', '/prices/p1/history']) {
      expect((await request(app()).get(path).expect(200)).headers['cache-control']).toMatch(/max-age=60/);
    }
  });

  it('errors, 404s and /health say no-store', async () => {
    for (const path of ['/prices/nope', '/prices/nope/history', '/nope', '/prices/%E0%A4%A', '/health']) {
      expect((await request(app()).get(path)).headers['cache-control']).toBe('no-store');
    }
  });
});
