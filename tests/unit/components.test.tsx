import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Catalogue } from '@/components/Catalogue';
import { Compare } from '@/components/Compare';
import { ComparisonProvider, initial } from '@/components/ComparisonContext';
import { byCategory, categories, products } from '@/data/products';

vi.mock('@/engine', () => ({ scrollToTarget: vi.fn() }));

afterEach(cleanup);

const page = () => render(<ComparisonProvider><Compare /><Catalogue /></ComparisonProvider>);
const chips = () => within(screen.getByRole('group', { name: /to compare$/ })).getAllByRole('button');
const pressed = () => chips().filter((b) => b.getAttribute('aria-pressed') === 'true');
const tableNames = () => screen.queryAllByRole('columnheader').slice(1).map((th) => th.textContent);
const name = (id: string) => products.find((p) => p.id === id)!;

describe('Compare', () => {
  it('starts on grinders with the default picks in the table', () => {
    page();
    expect(pressed()).toHaveLength(initial.picks.grinders.length);
    expect(tableNames()).toHaveLength(initial.picks.grinders.length);
    for (const id of initial.picks.grinders) expect(screen.getByRole('columnheader', { name: new RegExp(name(id).name) })).toBeTruthy();
  });

  it('blocks a 4th pick and frees a slot on remove', async () => {
    const u = userEvent.setup();
    page();
    const free = chips().find((b) => b.getAttribute('aria-pressed') === 'false')!;
    expect(free.getAttribute('aria-disabled')).toBe('true');
    await u.click(free);
    expect(pressed()).toHaveLength(3);

    const first = name(initial.picks.grinders[0]);
    await u.click(screen.getAllByRole('button', { name: `Remove ${first.brand} ${first.name}` })[0]);
    expect(pressed()).toHaveLength(2);
    expect(free.getAttribute('aria-disabled')).toBeNull();
    await u.click(free);
    expect(pressed()).toHaveLength(3);
  });

  it('keeps picks per category when switching tabs', async () => {
    const u = userEvent.setup();
    page();
    const tabs = within(screen.getByRole('group', { name: 'Category' })).getAllByRole('button');
    await u.click(tabs[1]);
    expect(tabs[1].getAttribute('aria-pressed')).toBe('true');
    expect(chips()).toHaveLength(byCategory(categories[1].id).length);
    expect(pressed()).toHaveLength(initial.picks[categories[1].id].length);
    await u.click(tabs[0]);
    expect(pressed()).toHaveLength(initial.picks.grinders.length);
  });

  it('shows the empty state when nothing is picked', async () => {
    const u = userEvent.setup();
    page();
    for (const b of pressed()) await u.click(b);
    expect(screen.queryByRole('table')).toBeNull();
    expect(screen.getByText('Pick an item above to start the table.')).toBeTruthy();
  });
});

describe('Catalogue', () => {
  const list = () => screen.getAllByRole('button', { expanded: false }).concat(screen.queryAllByRole('button', { expanded: true }));

  it('filters by category', async () => {
    const u = userEvent.setup();
    page();
    expect(list()).toHaveLength(products.length);
    const filters = within(screen.getByRole('group', { name: 'Filter by category' })).getAllByRole('button');
    await u.click(filters[2]);
    expect(list()).toHaveLength(byCategory(categories[1].id).length);
    await u.click(filters[0]);
    expect(list()).toHaveLength(products.length);
  });

  it('expands one row at a time', async () => {
    const u = userEvent.setup();
    page();
    const [a, b] = screen.getAllByRole('button', { expanded: false });
    await u.click(a);
    expect(a.getAttribute('aria-expanded')).toBe('true');
    expect(document.getElementById(a.getAttribute('aria-controls')!)!.hidden).toBe(false);
    await u.click(b);
    expect(a.getAttribute('aria-expanded')).toBe('false');
    expect(b.getAttribute('aria-expanded')).toBe('true');
    await u.click(b);
    expect(b.getAttribute('aria-expanded')).toBe('false');
  });

  it('"Compare this" switches category and drops the oldest pick when full', async () => {
    const u = userEvent.setup();
    page();
    const target = byCategory('grinders').find((p) => !initial.picks.grinders.includes(p.id))!;
    // Move compare off grinders first so the switch back is observable.
    await u.click(within(screen.getByRole('group', { name: 'Category' })).getAllByRole('button')[1]);
    const row = screen.getAllByRole('button', { expanded: false }).find((b) => b.textContent!.includes(target.name))!;
    await u.click(row);
    await u.click(within(document.getElementById(row.getAttribute('aria-controls')!)!).getByRole('button', { name: /compare/i }));

    const want = [...initial.picks.grinders.slice(1), target.id].map((id) => name(id).name);
    expect(tableNames().map((t) => want.some((w) => t!.includes(w)))).toEqual([true, true, true]);
    expect(tableNames().some((t) => t!.includes(name(initial.picks.grinders[0]).name))).toBe(false);
  });
});
