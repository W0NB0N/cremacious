import { expect, type Page } from '@playwright/test';

/** Collect console errors and uncaught exceptions for the whole test. */
export function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(e.message));
  return errors;
}

/** Load the home page and wait until the engine has booted. */
export async function open(page: Page, path = '/') {
  const res = await page.goto(path);
  await expect(page.locator('html')).toHaveClass(/\bis-booted\b/);
  return res;
}

export const chips = (page: Page) => page.getByRole('group', { name: /to compare$/ }).getByRole('button');
export const tableItems = (page: Page) => page.locator('.table__item');
