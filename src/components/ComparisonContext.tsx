'use client';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { products, type CategoryId } from '@/data/products';

export const MAX = 3;

type State = { category: CategoryId; picks: Record<CategoryId, string[]> };
type Api = State & {
  setCategory: (c: CategoryId) => void;
  toggle: (id: string) => void;
  /** From the catalogue: switch to the item's category and make sure it is picked. */
  bring: (id: string) => void;
};

const Ctx = createContext<Api | null>(null);

const initial: State = {
  category: 'grinders',
  picks: {
    grinders: ['niche-zero', 'fellow-ode-gen-2', 'eureka-mignon-specialita'],
    machines: ['gaggia-classic-pro-e24', 'rancilio-silvia-pro-x', 'la-marzocco-linea-micra'],
    beans: ['intelligentsia-black-cat-classic', 'onyx-monarch'],
    accessories: ['acaia-lunar', 'timemore-black-mirror-basic-2'],
  },
};

export function ComparisonProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(initial);

  const setCategory = useCallback((category: CategoryId) => setState((s) => ({ ...s, category })), []);

  const toggle = useCallback((id: string) => setState((s) => {
    const list = s.picks[s.category];
    const next = list.includes(id) ? list.filter((x) => x !== id) : list.length < MAX ? [...list, id] : list;
    return { ...s, picks: { ...s.picks, [s.category]: next } };
  }), []);

  const bring = useCallback((id: string) => setState((s) => {
    const p = products.find((x) => x.id === id);
    if (!p) return s;
    const list = s.picks[p.category];
    const next = list.includes(id) ? list : [...list.slice(-(MAX - 1)), id]; // full: drop the oldest
    return { category: p.category, picks: { ...s.picks, [p.category]: next } };
  }), []);

  const api = useMemo(() => ({ ...state, setCategory, toggle, bring }), [state, setCategory, toggle, bring]);
  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useComparison() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useComparison needs <ComparisonProvider>');
  return v;
}
