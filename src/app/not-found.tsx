import type { Metadata } from 'next';
import Link from 'next/link';
import { site } from '@/data/site';

export const metadata: Metadata = {
  title: 'Page not found',
  description: 'This address does not exist. The comparison and the full catalogue are one click away on the home page.',
  robots: { index: false },
};

// The 404 pins the shot: a channeled shot gushes, so the liquid sits high and fast.
export default function NotFound() {
  return (
    <section className="lost" data-shot-pin="0.42" data-shot-readout="9.4,52.0" aria-labelledby="lost-title">
      <p className="lost__code" aria-hidden="true">404</p>
      <h1 id="lost-title" className="lost__title">{site.notFound.title}</h1>
      <p className="lost__text">{site.notFound.text}</p>
      <p data-reveal="up" data-intro data-delay="0.3">
        <Link className="btn btn--back" href="/" data-fill><span className="btn__label">{site.notFound.back}</span></Link>
      </p>
    </section>
  );
}
