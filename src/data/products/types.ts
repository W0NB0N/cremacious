// Shared product schema. One spec interface per category, all on the same base.
// Rule: a value is either confirmed by a listed source or a placeholder. Never guess.

export type CategoryId = 'beans' | 'grinders' | 'machines' | 'accessories';

export type Source = { label: string; url: string };

/** A value no source confirmed. The UI shows "Unconfirmed" and the note. */
export type Placeholder = { placeholder: true; note: string };
export const placeholder = (note: string): Placeholder => ({ placeholder: true, note });
export const isPlaceholder = (v: unknown): v is Placeholder =>
  typeof v === 'object' && v !== null && (v as Placeholder).placeholder === true;

export type Val<T> = T | Placeholder;

/** Prices are kept in the currency the source listed. They are never converted. */
export type Price = { amount: number; currency: 'INR' | 'USD' | 'GBP' | 'CAD' | 'ZAR'; upTo?: number; note?: string };

/** A measured quantity. `text` overrides the formatted value when a source gives a range or a qualifier. */
export type Qty = { value: number; unit: string; text?: string };

type Base<C extends CategoryId, S> = {
  id: string;
  category: C;
  brand: string;
  name: string;
  price: Val<Price>;
  /** One factual line, drawn from the sources. */
  summary: string;
  sources: Source[];
  /** Which source backs each value: spec key (or 'price') to an index into `sources`. Placeholders need none. */
  src: Partial<Record<keyof S | 'price', number>>;
  /** ISO date the sources were read. */
  checked: string;
};

export type BeanSpecs = {
  style: 'Blend' | 'Single origin';
  origins: Val<string>;
  process: Val<string>;
  roast: Val<string>;
  notes: Val<string>;
  bag: Val<Qty>;
  recipe: Val<string>;
};

export type Bean = Base<'beans', BeanSpecs> & { specs: BeanSpecs };

export type GrinderSpecs = {
  drive: 'Electric' | 'Hand';
  burrs: Val<string>;
  burrSize: Val<Qty>;
  adjustment: Val<string>;
  capacity: Val<Qty>;
  speed: Val<Qty>;
  power: Val<Qty> | 'None';
  weight: Val<Qty>;
  size: Val<string>;
  use: Val<string>;
};

export type Grinder = Base<'grinders', GrinderSpecs> & { specs: GrinderSpecs };

export type MachineSpecs = {
  heating: Val<string>;
  brewBoiler: Val<Qty>;
  steamBoiler: Val<Qty> | 'None';
  pump: Val<string>;
  temperature: Val<string>;
  portafilter: Val<Qty>;
  reservoir: Val<Qty>;
  power: Val<Qty>;
  weight: Val<Qty>;
  size: Val<string>;
};

export type Machine = Base<'machines', MachineSpecs> & { specs: MachineSpecs };

export type AccessorySpecs = {
  kind: string;
  capacity: Val<Qty>;
  precision: Val<string> | 'n/a';
  power: Val<string> | 'None';
  material: Val<string>;
  weight: Val<Qty>;
  size: Val<string>;
};

export type Accessory = Base<'accessories', AccessorySpecs> & { specs: AccessorySpecs };

export type Product = Bean | Grinder | Machine | Accessory;
