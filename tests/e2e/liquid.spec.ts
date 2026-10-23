import { expect, test } from '@playwright/test';
import { open } from './helpers';

// axe cannot see through the blend layers, so the liquid line is checked on real pixels:
// crème page above it, the exact inverse (espresso) below it, and readable text in the crema band.
const creme = [242, 232, 222];
const espresso = [60, 39, 34];

const lum = (c: number[]) => {
  const f = (v: number) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
};
const contrast = (a: number[], b: number[]) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
const near = (a: number[], b: number[]) => a.every((v, i) => Math.abs(v - b[i]) <= 2);

test('liquid line keeps both palettes exact and the crema band readable', async ({ page, isMobile }) => {
  test.skip(isMobile, 'same layers on phones; one viewport is enough');
  await open(page);
  await page.mouse.move(1, 1);
  for (let i = 0; i < 6; i++) { await page.mouse.wheel(0, 700); await page.waitForTimeout(250); }
  await page.waitForTimeout(2500); // the level eases in, and the surface settles

  const png = await page.screenshot();
  const x = page.viewportSize()!.width - 20; // page gutter: no text, only the background
  const column: number[][] = await page.evaluate(async ([b64, x]) => {
    const img = new Image();
    img.src = `data:image/png;base64,${b64}`;
    await img.decode();
    const ctx = new OffscreenCanvas(img.width, img.height).getContext('2d')!;
    ctx.drawImage(img, 0, 0);
    return Array.from({ length: img.height }, (_, y) => [...ctx.getImageData(x as number, y, 1, 1).data.slice(0, 3)]);
  }, [png.toString('base64'), x] as const);

  const top = column.findIndex((c) => !near(c, creme));
  expect(top, 'the surface is on screen').toBeGreaterThan(0);
  // The band ends after the last pixel that is not espresso (the sheen under the crema fades out).
  let bottom = column.length;
  while (bottom > top && near(column[bottom - 1], espresso)) bottom--;
  expect(bottom - top, 'crema band plus sheen is thin').toBeLessThan(120);
  expect(column.length - bottom, 'espresso fills the rest of the screen').toBeGreaterThan(200);
  expect(column.slice(0, top).every((c) => near(c, creme))).toBe(true);

  // Text in the band is multiplied by the same foam colour as its background.
  const band = column[top + 2];
  const text = espresso.map((v, i) => (v * band[i]) / creme[i]);
  expect(contrast(text, band)).toBeGreaterThanOrEqual(4.5);
});
