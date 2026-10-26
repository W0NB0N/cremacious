// @vitest-environment node
// The release-gate scripts (data:urls, data:cited) fetch source pages automatically, so they follow the same
// BLOCKED_HOSTS list as the poller.
import { describe, expect, it } from 'vitest';
import { isBlockedUrl } from '../../scripts/blocked-urls';

describe('isBlockedUrl', () => {
  it.each([
    ['https://fixcoffee.shop/products/x', true],
    ['https://www.bilihu.in/products/x', true],
    ['https://BlackBazaCoffee.com/products/x', true],
    ['https://somethingsbrewing.in/', true],
    ['https://brewinggadgets.in/products/x', false],
    ['https://notfixcoffee.shop/products/x', false],
    ['not a url', false],
  ])('%s -> %s', (url, expected) => {
    expect(isBlockedUrl(url)).toBe(expected);
  });
});
