// The palette's single source. layout.tsx publishes it as CSS custom properties (tokens.css,
// globals.css read those) and shot.ts draws the liquid with it. Change colours here only.

const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const css = (c: number[], a?: number) => `rgb(${c.join(' ')}${a === undefined ? '' : ` / ${a}`})`;

export const creme = '#f2e8de';
export const espresso = '#3c2722';

/** Crema foam, top to bottom. */
export const foam = { top: '#ecd6b1', mid: '#d6a66b', base: '#b77a3f', bubble: '#f2e0c0', bubbleDark: 'rgb(150 96 48 / 0.7)', glint: 'rgb(255 236 210 / 0.22)' };

// The liquid inverts the page with difference (white) then plus-lighter (lift): 255 - x + lift.
// With lift = creme + espresso - 255, crème becomes espresso and espresso becomes crème exactly.
const liftRgb = rgb(creme).map((c, i) => c + rgb(espresso)[i] - 255);
if (liftRgb.some((c) => c < 0)) throw new Error('palette: creme + espresso must be at least 255 per channel for the liquid to invert');
export const lift = css(liftRgb);
/** A little light just under the crema. */
export const sheen = css(liftRgb.map((c, i) => c + [17, 14, 11][i]));

/** Custom properties for the root element. */
export const paletteVars = {
  '--creme': creme,
  '--espresso': espresso,
  '--lift': lift,
  '--foam-top': foam.top,
  '--foam-mid': foam.mid,
  '--foam-base': foam.base,
} as Record<string, string>;
