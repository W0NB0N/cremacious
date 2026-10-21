/* eslint-disable @next/next/no-html-link-for-pages -- in-page anchors: setup.ts smooth-scrolls them with Lenis; next/link would also scroll */
import { brand } from '@/data/site';

// Section links on one page: the motion layer marks the section in view with aria-current.
export function Header() {
  return (
    <header className="header">
      <a className="header__brand draw" href="/#top" data-nav="top">{brand.name}</a>
      <nav aria-label="Sections">
        <ul className="header__nav">
          <li><a className="draw" href="/#compare" data-nav="compare">Compare</a></li>
          <li><a className="draw" href="/#catalogue" data-nav="catalogue">Catalogue</a></li>
        </ul>
      </nav>
    </header>
  );
}
