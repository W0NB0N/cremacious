import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { chips, open, tableItems, watchErrors } from './helpers';

test('home loads with no console errors', async ({ page }) => {
  const errors = watchErrors(page);
  const res = await open(page);
  expect(res?.status()).toBe(200);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.locator('html')).toHaveClass(/\bshot-live\b/); // the liquid driver started
  await page.mouse.wheel(0, 3000);
  await page.waitForTimeout(500);
  expect(errors).toEqual([]);
});

test('no horizontal scroll', async ({ page }) => {
  await open(page);
  const [scrollW, viewW] = await page.evaluate(() => [document.documentElement.scrollWidth, innerWidth]);
  expect(scrollW).toBeLessThanOrEqual(viewW);
});

test('compare: pick, cap at three, remove, switch category', async ({ page }) => {
  await open(page);
  const pressed = chips(page).and(page.locator('[aria-pressed="true"]'));
  await expect(pressed).toHaveCount(3);
  const all = chips(page);
  const states = await all.evaluateAll((bs) => bs.map((b) => b.getAttribute('aria-pressed')));
  const on = all.nth(states.indexOf('true'));
  const free = all.nth(states.indexOf('false')); // fixed positions: these locators must not re-resolve
  await expect(free).toHaveAttribute('aria-disabled', 'true');
  await free.click({ force: true }); // aria-disabled, not disabled: still clickable, must do nothing
  await expect(free).toHaveAttribute('aria-pressed', 'false');

  await on.click();
  await expect(pressed).toHaveCount(2);
  await free.click();
  await expect(free).toHaveAttribute('aria-pressed', 'true');

  await page.getByRole('group', { name: 'Category' }).getByRole('button').nth(2).click();
  await expect(page.getByRole('group', { name: 'Beans to compare' })).toBeVisible();
});

test('catalogue row brings its item into compare', async ({ page }) => {
  await open(page);
  await page.getByRole('group', { name: 'Filter by category' }).getByRole('button').nth(2).click(); // machines
  const row = page.locator('#catalogue .row').first();
  const name = (await row.locator('.row__name').textContent())!;
  await row.click();
  await expect(row).toHaveAttribute('aria-expanded', 'true');
  await page.locator(`#${await row.getAttribute('aria-controls')}`).getByRole('button', { name: /compare/i }).click();
  await expect(page.getByRole('group', { name: 'Espresso machines to compare' }).getByRole('button', { name, exact: false })).toHaveAttribute('aria-pressed', 'true');
  const visible = page.viewportSize()!.width > 900 ? tableItems(page) : page.locator('.cards__names p');
  await expect(visible.filter({ hasText: name })).toHaveCount(1);
});

test('keyboard only: skip link, category tab and chip', async ({ page, isMobile }) => {
  test.skip(isMobile, 'keyboard path is a desktop concern');
  await open(page);
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
  const tab = page.getByRole('group', { name: 'Category' }).getByRole('button').nth(1);
  await tab.focus();
  await page.keyboard.press('Enter');
  await expect(tab).toHaveAttribute('aria-pressed', 'true');
  const states = await chips(page).evaluateAll((bs) => bs.map((b) => b.getAttribute('aria-pressed')));
  const chip = chips(page).nth(states.indexOf('true'));
  await chip.focus();
  await page.keyboard.press('Space');
  await expect(chip).toHaveAttribute('aria-pressed', 'false');
});

test('source arrows sit on the same line as their value', async ({ page, isMobile }) => {
  test.skip(isMobile, 'table layout only');
  await open(page);
  const cell = page.locator('.table td').filter({ has: page.locator('.val__src') }).first();
  const [v, a] = await Promise.all([cell.locator('.val').boundingBox(), cell.locator('.val__src').boundingBox()]);
  expect(Math.abs(v!.y + v!.height / 2 - (a!.y + a!.height / 2))).toBeLessThan(8);
});

test('mobile shows cards, not the table', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'phone layout only');
  await open(page);
  await expect(page.locator('.cards')).toBeVisible();
  await expect(page.locator('.table-wrap')).toBeHidden();
});

test('404 page', async ({ page }) => {
  const errors = watchErrors(page);
  const res = await open(page, '/no-such-page');
  expect(res?.status()).toBe(404);
  await expect(page.getByText('This shot channeled.')).toBeVisible();
  expect(errors.filter((e) => !/404/.test(e))).toEqual([]);
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('no liquid; theme steps to dark at the catalogue and back', async ({ page }) => {
    const errors = watchErrors(page);
    await open(page);
    await expect(page.locator('html')).not.toHaveClass(/\bshot-live\b/);
    await expect(page.locator('canvas.shot').first()).toBeHidden();
    await expect(page.locator('html')).not.toHaveClass(/\bis-dark\b/);
    await page.locator('#catalogue').evaluate((el) => el.scrollIntoView());
    await expect(page.locator('html')).toHaveClass(/\bis-dark\b/);
    await page.evaluate(() => scrollTo(0, 0));
    await expect(page.locator('html')).not.toHaveClass(/\bis-dark\b/);
    expect(errors).toEqual([]);
  });
});

test.describe('accessibility (axe)', () => {
  // The live liquid is a blend-mode overlay axe cannot see through, so contrast is checked on the
  // two flat palettes: light at the top and dark (reduced motion, past the catalogue).
  test.use({ reducedMotion: 'reduce' });

  test('light palette', async ({ page }) => {
    await open(page);
    const r = await new AxeBuilder({ page }).analyze();
    expect(r.violations.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
  });

  test('dark palette', async ({ page }) => {
    await open(page);
    await page.locator('#catalogue').evaluate((el) => el.scrollIntoView());
    await expect(page.locator('html')).toHaveClass(/\bis-dark\b/);
    await page.waitForTimeout(600); // theme transition
    const r = await new AxeBuilder({ page }).analyze();
    expect(r.violations.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
  });
});
