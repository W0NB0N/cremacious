import { accessories } from './accessories';
import { beans } from './beans';
import { grinders } from './grinders';
import { machines } from './machines';
import { isPlaceholder, type CategoryId, type Placeholder, type Price, type Product, type Qty, type Source } from './types';

export * from './types';

export const categories: { id: CategoryId; label: string; singular: string }[] = [
  { id: 'grinders', label: 'Grinders', singular: 'Grinder' },
  { id: 'machines', label: 'Espresso machines', singular: 'Espresso machine' },
  { id: 'beans', label: 'Beans', singular: 'Beans' },
  { id: 'accessories', label: 'Accessories', singular: 'Accessory' },
];

export const products: Product[] = [...grinders, ...machines, ...beans, ...accessories];

export const byCategory = (c: CategoryId) => products.filter((p) => p.category === c);
export const categoryOf = (c: CategoryId) => categories.find((x) => x.id === c)!;

/** One row of the comparison table. `bar` draws a magnitude bar for numeric values (size, not merit). */
export type Row = { key: string; label: string; bar?: boolean };

export const rows: Record<CategoryId, Row[]> = {
  grinders: [
    { key: 'drive', label: 'Drive' },
    { key: 'burrs', label: 'Burrs' },
    { key: 'burrSize', label: 'Burr size', bar: true },
    { key: 'adjustment', label: 'Adjustment' },
    { key: 'capacity', label: 'Capacity', bar: true },
    { key: 'speed', label: 'Speed' },
    { key: 'power', label: 'Motor', bar: true },
    { key: 'weight', label: 'Weight', bar: true },
    { key: 'size', label: 'Size' },
    { key: 'use', label: 'Made for' },
  ],
  machines: [
    { key: 'heating', label: 'Heating' },
    { key: 'brewBoiler', label: 'Brew boiler', bar: true },
    { key: 'steamBoiler', label: 'Steam boiler', bar: true },
    { key: 'pump', label: 'Pump' },
    { key: 'temperature', label: 'Temperature control' },
    { key: 'portafilter', label: 'Portafilter' },
    { key: 'reservoir', label: 'Reservoir', bar: true },
    { key: 'power', label: 'Power', bar: true },
    { key: 'weight', label: 'Weight', bar: true },
    { key: 'size', label: 'Size' },
  ],
  beans: [
    { key: 'style', label: 'Style' },
    { key: 'origins', label: 'Origins' },
    { key: 'process', label: 'Process' },
    { key: 'roast', label: 'Roast' },
    { key: 'notes', label: 'Tasting notes' },
    { key: 'bag', label: 'Bag', bar: true },
    { key: 'recipe', label: 'Roaster’s recipe' },
  ],
  accessories: [
    { key: 'kind', label: 'Kind' },
    { key: 'capacity', label: 'Capacity' },
    { key: 'precision', label: 'Readability' },
    { key: 'power', label: 'Power' },
    { key: 'material', label: 'Material' },
    { key: 'weight', label: 'Weight', bar: true },
    { key: 'size', label: 'Size' },
  ],
};

/** The headline spec shown in a catalogue row. */
export const keySpec: Record<CategoryId, string> = {
  grinders: 'burrSize',
  machines: 'heating',
  beans: 'notes',
  accessories: 'kind',
};

export type Cell = { text: string; value?: number; unit?: string; note?: string; source?: Source };

const isQty = (v: unknown): v is Qty => typeof v === 'object' && v !== null && 'unit' in v && 'value' in v;
const num = (n: number) => (Number.isInteger(n) ? String(n) : String(+n.toFixed(2)));

/** Turn any spec value into display text, a numeric value for bars, or a placeholder note. */
export function cell(p: Product, key: string): Cell {
  const v = (p.specs as Record<string, unknown>)[key];
  const source = sourceOf(p, key);
  if (v === undefined) return { text: '' };
  if (isPlaceholder(v)) return { text: 'Unconfirmed', note: (v as Placeholder).note };
  if (isQty(v)) return { text: v.text ?? `${num(v.value)} ${v.unit}`, value: v.value, unit: v.unit, source };
  return { text: String(v), source };
}

/** The source page that backs one value, if the entry says which. */
function sourceOf(p: Product, key: string): Source | undefined {
  const i = (p.src as Record<string, number | undefined>)[key];
  return i === undefined ? undefined : p.sources[i];
}

const symbols: Record<Price['currency'], string> = { INR: '₹', USD: '$', GBP: '£', CAD: 'CA$', ZAR: 'R ' };
const money = (n: number) => n.toLocaleString('en-IN', { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 });

export function priceText(p: Product): Cell {
  if (isPlaceholder(p.price)) return { text: 'Unconfirmed', note: p.price.note };
  const { amount, upTo, currency, note } = p.price;
  const s = symbols[currency];
  return { text: upTo ? `${s}${money(amount)} to ${s}${money(upTo)}` : `${s}${money(amount)}`, note, source: sourceOf(p, 'price') };
}

/** Real counts for the sourcing section. */
export function stats() {
  let unconfirmed = 0;
  let values = 0;
  for (const p of products) {
    for (const v of [...Object.values(p.specs), p.price]) {
      values++;
      if (isPlaceholder(v)) unconfirmed++;
    }
  }
  const sources = new Set(products.flatMap((p) => p.sources.map((s) => s.url))).size;
  return { items: products.length, categories: categories.length, values, unconfirmed, sources };
}
