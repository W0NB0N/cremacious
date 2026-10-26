// @vitest-environment node
// TDD, spec first (break-it finding on config): values that disable a guard are refused at start-up.
import { afterEach, describe, expect, it, vi } from 'vitest';

const load = async (env: Record<string, string>) => {
  vi.resetModules();
  for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v);
  return (await import('../../backend/src/config')).config;
};
afterEach(() => vi.unstubAllEnvs());

describe('config minimums', () => {
  it.each([
    ['HOST_FAILURE_LIMIT', '0', /at least 1/],
    ['POLL_INTERVAL_MS', '0', /at least 60000/],
    ['POLL_INTERVAL_MS', '59999', /at least 60000/],
    ['REQUEST_TIMEOUT_MS', '0', /at least 1/],
    ['MAX_MOVE_FRACTION', '0', /at least/],
    ['UNHEALTHY_RATE', '1.5', /at most 1/],
    ['PORT', 'abc', /number/],
    ['HOST_DELAY_MS', '-1', /number/],
  ])('%s=%s is refused', async (name, value, message) => {
    await expect(load({ [name]: value })).rejects.toThrow(message);
  });

  it('the defaults and a polite interval are accepted', async () => {
    const c = await load({ POLL_INTERVAL_MS: '60000', HOST_FAILURE_LIMIT: '1' });
    expect(c).toMatchObject({ pollIntervalMs: 60000, hostFailureLimit: 1, hostDelayMs: 2000 });
  });
});
