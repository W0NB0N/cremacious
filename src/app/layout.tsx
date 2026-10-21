import type { Metadata, Viewport } from 'next';
import { Header } from '@/components/Header';
import { Motion } from '@/components/Motion';
import { brand, site } from '@/data/site';
import { display, text } from './fonts';
import './tokens.css';
import './engine.css';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(brand.url),
  title: { default: site.title, template: `%s | ${brand.name}` },
  description: site.description,
  alternates: { canonical: './' },
  openGraph: { type: 'website', siteName: brand.name, title: site.title, description: site.description, images: ['/og.png'] },
  twitter: { card: 'summary_large_image', title: site.title, description: site.description, images: ['/og.png'] },
};

export const viewport: Viewport = { themeColor: '#f2e8de' };

// Runs before first paint: hidden-until-revealed styles only apply when JS and motion are on.
const flags = `document.documentElement.classList.add('js');if(!matchMedia('(prefers-reduced-motion: reduce)').matches)document.documentElement.classList.add('motion')`;

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={`${display.variable} ${text.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: flags }} />
      </head>
      <body>
        <a className="skip-link" href="#main">Skip to content</a>
        <div id="curtain" aria-hidden="true">
          <div className="curtain__panel"><span className="curtain__crema" /></div>
        </div>
        <Header />
        <main id="main" tabIndex={-1}>{children}</main>
        {/* The liquid: blend layers that invert the page palette below the surface (DESIGN.md).
            The pool renders on the server at its resting level, so the first frame already has it. */}
        <div className="pool pool--invert" aria-hidden="true" />
        <div className="pool pool--lift" aria-hidden="true" />
        <div className="pool-crema" aria-hidden="true" />
        <canvas className="shot shot--invert" aria-hidden="true" />
        <canvas className="shot shot--lift" aria-hidden="true" />
        <canvas className="shot shot--crema" aria-hidden="true" />
        <canvas className="stream stream--invert" aria-hidden="true" />
        <canvas className="stream stream--lift" aria-hidden="true" />
        <div className="readout" aria-hidden="true">
          <div className="readout__cells">
            <p className="readout__cell">
              <span className="readout__label">Shot</span>
              <span className="readout__value"><span data-shot-time>0.0</span>&nbsp;s</span>
            </p>
            <p className="readout__cell">
              <span className="readout__label">Yield</span>
              <span className="readout__value"><span data-shot-yield>0.0</span>&nbsp;g</span>
            </p>
            <p className="readout__cell readout__cell--ratio">
              <span className="readout__label">Ratio</span>
              <span className="readout__value">1:<span data-shot-ratio>0.0</span></span>
            </p>
          </div>
          <p className="readout__hint" data-shot-hint>{site.hero.hint}</p>
        </div>
        <Motion />
      </body>
    </html>
  );
}
