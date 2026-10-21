import { brand, site } from '@/data/site';
import { Cup } from './Cup';

export function Hero() {
  return (
    <section className="hero" id="top" aria-labelledby="hero-title" data-hero>
      <div className="hero__stage">
        <div className="hero__copy">
          <h1 id="hero-title" className="hero__title" data-split="lines" data-intro>{site.hero.title}</h1>
          <p className="hero__lede">{site.hero.lede}</p>
          <p className="hero__cta">
            <a className="btn" href="#compare" data-fill>
              <span className="btn__label">{site.hero.cta}</span>
            </a>
          </p>
        </div>
        <div className="hero__mark">
          <Cup />
          <p className="wordmark" aria-hidden="true">{brand.name}</p>
        </div>
      </div>
    </section>
  );
}
