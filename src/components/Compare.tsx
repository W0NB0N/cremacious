'use client';
import { byCategory, categories, cell, priceText, products, rows, type Cell, type Product } from '@/data/products';
import { site } from '@/data/site';
import { MAX, useComparison } from './ComparisonContext';

function Value({ c, max }: { c: Cell; max?: number }) {
  return (
    <>
      <span className={c.note && c.text === 'Unconfirmed' ? 'val val--unconfirmed' : 'val'}>{c.text}</span>
      {c.source ? <a className="val__src" href={c.source.url} target="_blank" rel="noopener noreferrer" aria-label={`Source: ${c.source.label}`}>↗</a> : null}
      {max && c.value !== undefined ? (
        <span className="bar" aria-hidden="true"><span className="bar__fill" style={{ scale: `${c.value / max} 1` }} /></span>
      ) : null}
      {c.note ? <span className="val__note">{c.note}</span> : null}
    </>
  );
}

/** An item's name in the table head, with the × that removes it. */
function Name({ p, onRemove }: { p: Product; onRemove: () => void }) {
  return (
    <span className="table__name">
      <span className="table__name-text">{p.name}</span>
      <button type="button" className="table__x" onClick={onRemove} aria-label={`Remove ${p.brand} ${p.name}`}>
        <span aria-hidden="true">×</span>
      </button>
    </span>
  );
}

/** Bars only compare like with like: two or more numbers in the same unit. */
function barMax(cells: Cell[]) {
  const nums = cells.filter((c) => c.value !== undefined);
  if (nums.length < 2 || new Set(nums.map((c) => c.unit)).size > 1) return undefined;
  return Math.max(...nums.map((c) => c.value!));
}

export function Compare() {
  const { category, picks, setCategory, toggle } = useComparison();
  const items = byCategory(category);
  const picked = picks[category].map((id) => products.find((p) => p.id === id)).filter(Boolean) as Product[];
  const full = picked.length >= MAX;
  const label = categories.find((c) => c.id === category)!.label;

  return (
    <section className="compare" id="compare" aria-labelledby="compare-title">
      <div className="compare__head">
        <h2 id="compare-title" className="section-title">{site.compare.heading}</h2>
        <p className="compare__lede">{site.compare.lede}</p>
      </div>

      <div className="compare__controls">
        <div className="tabs" role="group" aria-label="Category">
          {categories.map((c) => (
            <button key={c.id} type="button" className="tab" aria-pressed={c.id === category} onClick={() => setCategory(c.id)}>
              <span className="tab__label">{c.label}</span>
              <span className="tab__count" aria-hidden="true">{byCategory(c.id).length}</span>
              <span className="sr-only">, {byCategory(c.id).length} items</span>
            </button>
          ))}
        </div>
        <div className="chips" role="group" aria-label={`${label} to compare`}>
          {items.map((p) => {
            const on = picks[category].includes(p.id);
            const blocked = full && !on;
            return (
              <button
                key={p.id}
                type="button"
                className="chip"
                aria-pressed={on}
                aria-disabled={blocked || undefined}
                onClick={() => !blocked && toggle(p.id)}
              >
                <span className="chip__mark" aria-hidden="true" />
                <span className="chip__brand">{p.brand}</span> {p.name}
              </button>
            );
          })}
        </div>
        <p className="compare__status" aria-live="polite">
          {picked.length} of {MAX} picked{full ? `. ${site.compare.full}` : '.'} <span className="compare__bars">{site.compare.bars}</span>
        </p>
      </div>

      {picked.length ? (
        <div className="table-wrap" tabIndex={0} role="region" aria-label={`${label} comparison table`}>
          <table className="table" style={{ ['--n' as string]: picked.length }}>
            <caption className="sr-only">{label}: {picked.map((p) => `${p.brand} ${p.name}`).join(', ')}</caption>
            <thead>
              <tr>
                <th scope="col" className="table__corner"><span className="sr-only">Spec</span></th>
                {picked.map((p) => (
                  <th scope="col" key={p.id} className="table__item">
                    <span className="table__brand">{p.brand}</span>
                    <Name p={p} onRemove={() => toggle(p.id)} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Price as listed</th>
                {picked.map((p) => <td key={p.id}><Value c={priceText(p)} /></td>)}
              </tr>
              {rows[category].map((r) => {
                const cells = picked.map((p) => cell(p, r.key));
                const max = r.bar ? barMax(cells) : undefined;
                return (
                  <tr key={r.key}>
                    <th scope="row">{r.label}</th>
                    {cells.map((c, i) => <td key={picked[i].id}><Value c={c} max={max} /></td>)}
                  </tr>
                );
              })}
              <tr className="table__sources">
                <th scope="row">Sources</th>
                {picked.map((p) => (
                  <td key={p.id}>
                    <ul>
                      {p.sources.map((s) => (
                        <li key={s.url}><a className="link" href={s.url} target="_blank" rel="noopener noreferrer">{s.label}</a></li>
                      ))}
                    </ul>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      ) : null}
      {picked.length ? (
        // Phone layout: one block per spec, the picked items side by side inside it.
        <div className="cards" style={{ ['--n' as string]: picked.length }}>
          <div className="cards__names">
            {picked.map((p) => (
              <p key={p.id}><span className="table__brand">{p.brand}</span><Name p={p} onRemove={() => toggle(p.id)} /></p>
            ))}
          </div>
          <dl>
            {[{ key: 'price', label: 'Price as listed', cells: picked.map(priceText), max: undefined as number | undefined },
              ...rows[category].map((r) => {
                const cells = picked.map((p) => cell(p, r.key));
                return { key: r.key, label: r.label, cells, max: r.bar ? barMax(cells) : undefined };
              })].map((r) => (
              <div className="cards__row" key={r.key}>
                <dt>{r.label}</dt>
                <dd>
                  {r.cells.map((c, i) => (
                    <span key={picked[i].id}>
                      <span className="sr-only">{picked[i].brand} {picked[i].name}: </span>
                      <Value c={c} max={r.max} />
                    </span>
                  ))}
                </dd>
              </div>
            ))}
            <div className="cards__row">
              <dt>Sources</dt>
              <dd>
                {picked.map((p) => (
                  <ul key={p.id} className="cards__sources">
                    {p.sources.map((s) => (
                      <li key={s.url}><a className="link" href={s.url} target="_blank" rel="noopener noreferrer">{s.label}</a></li>
                    ))}
                  </ul>
                ))}
              </dd>
            </div>
          </dl>
        </div>
      ) : (
        <p className="compare__empty">Pick an item above to start the table.</p>
      )}
    </section>
  );
}
