// Scroll progress for the shot, 0 at the top and 1 at the bottom. Plain y / limit would move the
// coffee when the page changes height without a scroll (a pick, an expanded row). So when the limit
// changes, the current (y, p) becomes an anchor and progress runs linearly from it to each end:
// continuous at the change, still 0 at the top and 1 at the bottom.
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

export function anchoredProgress() {
  let limit = 0;
  let anchor: [number, number] | null = null;
  let p = 0;

  /** Progress at scroll y; pass the live scroll limit. */
  function at(y: number, nextLimit: number) {
    if (nextLimit <= 0) return (p = 0);
    if (limit && nextLimit !== limit && y > 0 && y < nextLimit) anchor = [y, p];
    limit = nextLimit;
    if (y <= 0 || y >= limit) anchor = null; // back at an end: the plain mapping agrees again
    return (p = map(y));
  }

  /** Progress a scroll position would have under the current mapping (no state change). */
  function map(y: number) {
    if (limit <= 0) return 0;
    if (!anchor || anchor[0] >= limit) return clamp01(y / limit);
    const [ay, ap] = anchor;
    return clamp01(y < ay ? (ap * y) / ay : ap + ((1 - ap) * (y - ay)) / (limit - ay));
  }

  function reset() { limit = 0; anchor = null; p = 0; }

  return { at, map, reset };
}
