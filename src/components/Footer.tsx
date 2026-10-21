import { brand, site } from '@/data/site';

export function Footer() {
  return (
    <footer className="footer" aria-labelledby="footer-title">
      <h2 id="footer-title" className="footer__line" data-split="lines">{site.footer.line}</h2>
      <nav className="footer__nav" aria-label="Footer">
        <ul>
          <li><a className="draw" href="#compare">Compare</a></li>
          <li><a className="draw" href="#catalogue">Catalogue</a></li>
          <li><a className="draw" href="#top">Back to the top</a></li>
        </ul>
      </nav>
      <p className="wordmark wordmark--foot" aria-hidden="true">{brand.name}</p>
      <div className="footer__small">
        <p>{site.footer.colophon}</p>
        <p>Specs last checked {site.checked}. {brand.name} is a working name. © 2026</p>
      </div>
    </footer>
  );
}
