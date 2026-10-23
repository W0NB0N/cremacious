import type { Metadata, Viewport } from 'next';
import { Header } from '@/components/Header';
import { Motion } from '@/components/Motion';
import { brand, site } from '@/data/site';
import { display, text } from './fonts';
import { creme, foam, paletteVars } from './palette';
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

export const viewport: Viewport = { themeColor: creme };

// Runs before first paint: hidden-until-revealed styles only apply when JS and motion are on.
const flags = `document.documentElement.classList.add('js');if(!matchMedia('(prefers-reduced-motion: reduce)').matches)document.documentElement.classList.add('motion')`;

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={`${display.variable} ${text.variable}`} style={paletteVars} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: flags }} />
      </head>
      <body>
        <a className="skip-link" href="#main">Skip to content</a>
        <div id="curtain" aria-hidden="true">
          <div className="curtain__panel">
            <svg className="curtain__wave" viewBox="0 0 1600 44" preserveAspectRatio="none" data-curtain-wave>
              <defs>
                <linearGradient id="curtain-crema" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor={foam.top} />
                  <stop offset="0.5" stopColor={foam.mid} />
                  <stop offset="1" stopColor={foam.base} />
                </linearGradient>
              </defs>
              <path className="curtain__crema" d="M0 16 Q100 4 200 16 T400 16 T600 16 T800 16 T1000 16 T1200 16 T1400 16 T1600 16 V44 H0 Z" />
              <path className="curtain__coffee" d="M0 28 Q100 16 200 28 T400 28 T600 28 T800 28 T1000 28 T1200 28 T1400 28 T1600 28 V44 H0 Z" />
            </svg>
          </div>
        </div>
        <Header />
        <main id="main" tabIndex={-1}>{children}</main>
        {/* The liquid: blend layers that invert the page palette below the surface (DESIGN.md).
            The pool renders on the server at its resting level, so the first frame already has it. */}
        {/* The pointer sits under the liquid layers, so it inverts with the page like everything else. */}
        <div className="pointer" aria-hidden="true" data-pointer>
          <span className="pointer__dot-wrap" data-pointer-stretch><span className="pointer__dot" data-pointer-dot /></span>
          <span className="pointer__bean-wrap" data-pointer-tilt>
            <svg className="pointer__bean" viewBox="0 0 40 52" data-pointer-bean>
              <ellipse cx="20" cy="26" rx="15.5" ry="21.5" />
              <path d="M20.5 6.5 C 12.5 17, 28.5 33, 19.5 45.5" />
            </svg>
          </span>
        </div>
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
