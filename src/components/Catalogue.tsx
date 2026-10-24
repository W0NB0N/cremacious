'use client';
import { useState } from 'react';
import { categories, categoryOf, cell, keySpec, priceText, products, rows, type CategoryId } from '@/data/products';
import { site } from '@/data/site';
import { scrollToTarget } from '@/engine';
import { useComparison } from './ComparisonContext';

type Filter = 'all' | CategoryId;

export function Catalogue() {
  const [filter, setFilter] = useState<Filter>('all');
  const [open, setOpen] = useState<string | null>(null);
  const { picks, bring } = useComparison();
  const list = filter === 'all' ? products : products.filter((p) => p.category === filter);
  const filters: { id: Filter; label: string; n: number }[] = [
    { id: 'all', label: 'All', n: products.length },
    ...categories.map((c) => ({ id: c.id, label: c.label, n: products.filter((p) => p.category === c.id).length })),
  ];

  return (
    <section className="catalogue" id="catalogue" aria-labelledby="catalogue-title">
      <div className="catalogue__head">
        <h2 id="catalogue-title" className="section-title">{site.catalogue.heading}</h2>
        <p className="catalogue__lede">{site.catalogue.lede}</p>
        <div className="filters" role="group" aria-label="Filter by category">
          {filters.map((f) => (
            <button key={f.id} type="button" className="filter" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>
              {f.label} <span className="filter__n" aria-hidden="true">{f.n}</span><span className="sr-only">, {f.n} items</span>
            </button>
          ))}
        </div>
      </div>

      <p className="sr-only" aria-live="polite">Showing {list.length} items.</p>
      <ul className="index">
        {list.map((p) => {
          const isOpen = open === p.id;
          const inCompare = picks[p.category].includes(p.id);
          const price = priceText(p);
          return (
            <li key={p.id} className="index__item" data-open={isOpen || undefined}>
              <h3 className="index__h">
                <button
                  type="button"
                  className="row"
                  aria-expanded={isOpen}
                  aria-controls={`spec-${p.id}`}
                  onClick={() => setOpen(isOpen ? null : p.id)}
                >
                  <span className="row__brand">{p.brand}</span>
                  <span className="row__name">{p.name}</span>
                  <span className="row__cat">{categoryOf(p.category).singular}</span>
                  <span className="row__key">{cell(p, keySpec[p.category]).text}</span>
                  <span className={price.text === 'Unconfirmed' ? 'row__price val--unconfirmed' : 'row__price'}>{price.text}</span>
                  <span className="row__icon" aria-hidden="true" />
                </button>
              </h3>
              <div className="index__panel" id={`spec-${p.id}`} hidden={!isOpen}>
                <p className="index__summary">{p.summary}</p>
                <dl className="specs">
                  {rows[p.category].map((r) => {
                    const c = cell(p, r.key);
                    return (
                      <div className="specs__row" key={r.key}>
                        <dt>{r.label}</dt>
                        <dd>
                          <span className={c.note && c.text === 'Unconfirmed' ? 'val val--unconfirmed' : 'val'}>{c.text}</span>
                          {c.source ? <a className="val__src" href={c.source.url} target="_blank" rel="noopener noreferrer" aria-label={`Source: ${c.source.label}`}>↗</a> : null}
                          {c.note ? <span className="val__note">{c.note}</span> : null}
                        </dd>
                      </div>
                    );
                  })}
                  <div className="specs__row">
                    <dt>Price as listed</dt>
                    <dd>
                      <span className="val">{price.text}</span>
                      {price.source ? <a className="val__src" href={price.source.url} target="_blank" rel="noopener noreferrer" aria-label={`Source: ${price.source.label}`}>↗</a> : null}
                      {price.note ? <span className="val__note">{price.note}</span> : null}
                    </dd>
                  </div>
                </dl>
                <div className="index__foot">
                  <ul className="index__sources" aria-label={`Sources for ${p.brand} ${p.name}`}>
                    {p.sources.map((s) => (
                      <li key={s.url}><a className="link" href={s.url} target="_blank" rel="noopener noreferrer">{s.label}</a></li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    className="btn btn--small"
                    data-fill
                    onClick={() => { bring(p.id); scrollToTarget('#compare'); }}
                  >
                    <span className="btn__label">{inCompare ? site.catalogue.added : site.catalogue.add}</span>
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
