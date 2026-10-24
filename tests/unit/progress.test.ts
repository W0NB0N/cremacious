import { describe, expect, it } from 'vitest';
import { anchoredProgress } from '@/motion/progress';

describe('anchoredProgress()', () => {
  it('is y / limit while the page height is stable', () => {
    const s = anchoredProgress();
    expect(s.at(0, 1000)).toBe(0);
    expect(s.at(250, 1000)).toBe(0.25);
    expect(s.at(1000, 1000)).toBe(1);
  });

  it('does not jump when the page grows or shrinks without a scroll', () => {
    const s = anchoredProgress();
    const before = s.at(600, 1000);
    expect(s.at(600, 1400)).toBeCloseTo(before); // a row expanded below
    expect(s.at(600, 800)).toBeCloseTo(before); // and collapsed again
  });

  it('still reaches 0 at the top and 1 at the bottom after a change', () => {
    const s = anchoredProgress();
    s.at(600, 1000);
    s.at(600, 1400);
    expect(s.at(1400, 1400)).toBe(1);
    s.at(600, 1400);
    expect(s.at(0, 1400)).toBe(0);
  });

  it('is continuous and increasing on both sides of the anchor', () => {
    const s = anchoredProgress();
    s.at(600, 1000);
    s.at(600, 1400);
    let last = -1;
    for (let y = 0; y <= 1400; y += 50) {
      const p = s.map(y);
      expect(p).toBeGreaterThan(last);
      last = p;
    }
    expect(s.map(599)).toBeCloseTo(s.map(601), 2);
  });

  it('drops the anchor at an end, so later changes start clean', () => {
    const s = anchoredProgress();
    s.at(600, 1000);
    s.at(600, 1400);
    s.at(0, 1400);
    expect(s.map(700)).toBe(0.5);
  });

  it('returns 0 on a page that cannot scroll', () => {
    expect(anchoredProgress().at(0, 0)).toBe(0);
  });
});
