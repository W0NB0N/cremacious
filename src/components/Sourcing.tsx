import { stats } from '@/data/products';
import { site } from '@/data/site';

export function Sourcing() {
  const s = stats();
  const facts = [
    { n: s.items, label: 'items checked' },
    { n: s.categories, label: 'categories' },
    { n: s.sources, label: 'source pages' },
    { n: s.unconfirmed, label: `of ${s.values} values unconfirmed` },
  ];
  return (
    <section className="sourcing" aria-labelledby="sourcing-title">
      <h2 id="sourcing-title" className="sourcing__title" data-split="lines">{site.sourcing.heading}</h2>
      <p className="sourcing__text" data-split="lines" data-delay="0.1">{site.sourcing.text}</p>
      <dl className="facts">
        {facts.map((f, i) => (
          <div className="facts__item" key={f.label} data-reveal="up" data-delay={String(i * 0.06)}>
            <dt className="facts__label">{f.label}</dt>
            <dd className="facts__n">{f.n}</dd>
          </div>
        ))}
      </dl>
      <p className="sourcing__date">Sources read on {site.checked}.</p>
    </section>
  );
}
