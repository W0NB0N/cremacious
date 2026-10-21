// Global motion: runs once on the client, before the first page initializes.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ease, onPage, onScroll, prefersReducedMotion, scrollToTarget, setTransition } from '@/engine';
import { startCursor } from './cursor';
import { startShot } from './shot';

gsap.registerPlugin(ScrollTrigger);

export function setupMotion() {
  // Page transition: coffee floods up over the page, then drains down off the next one.
  // The panel travels in px past the bottom edge so the wave above it is hidden too. The wave on its
  // leading edge drifts sideways while it moves (one period = 25% of its width).
  const drift = (c: HTMLElement, d: number) => gsap.fromTo(c.querySelector('[data-curtain-wave]'), { xPercent: 0 }, { xPercent: -25, duration: d, ease: 'none' });
  setTransition({
    leave: (c) => gsap.timeline()
      .set(c, { autoAlpha: 1 })
      .fromTo(c.querySelector('.curtain__panel'), { y: innerHeight + 60 }, { y: 0, duration: 0.85, ease: ease.inOut })
      .add(drift(c, 0.85), 0),
    enter: (c) => gsap.timeline()
      .to(c.querySelector('.curtain__panel'), { y: innerHeight + 60, duration: 0.9, ease: ease.inOut })
      .add(drift(c, 0.9), 0)
      .set(c, { autoAlpha: 0 }),
  });

  startShot();
  startCursor();

  // First load: the curtain drains off the page in CSS (globals.css). Hand it back to GSAP for page
  // transitions once that has finished, and hold the page intro until the coffee has passed.
  const curtain = document.getElementById('curtain');
  const panel = curtain?.querySelector('.curtain__panel');
  let draining = !!panel?.getAnimations().some((a) => a.playState !== 'finished');
  if (curtain && panel) {
    const done = () => curtain.classList.add('is-done');
    if (draining) panel.addEventListener('animationend', done, { once: true });
    else done();
  }

  // In-page links from any page: smooth scroll when the target is here, else navigate home.
  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
    const a = (e.target as Element).closest<HTMLAnchorElement>('a[href*="#"]');
    if (!a) return;
    const url = new URL(a.href, location.href);
    if (url.pathname !== location.pathname || !url.hash) return;
    const target = document.querySelector<HTMLElement>(url.hash);
    if (!target) return;
    e.preventDefault();
    scrollToTarget(url.hash === '#top' ? 0 : target);
    history.replaceState(null, '', url.hash);
    target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  });

  // The header steps aside while reading down and returns on the way up.
  let last = 0;
  onScroll(({ y }) => {
    if (Math.abs(y - last) < 6) return;
    document.documentElement.classList.toggle('frame-away', y > 200 && y > last);
    document.documentElement.classList.toggle('frame-solid', y > 120);
    last = y;
  });

  // Mark the section in view.
  onPage(() => {
    const links = [...document.querySelectorAll<HTMLAnchorElement>('[data-nav]')];
    const set = (id: string | null) => links.forEach((l) => (l.dataset.nav === id ? l.setAttribute('aria-current', 'location') : l.removeAttribute('aria-current')));
    ['compare', 'catalogue'].forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      ScrollTrigger.create({ trigger: el, start: 'top 50%', end: 'bottom 50%', onToggle: (s) => (s.isActive ? set(id) : set(null)) });
    });
    return () => set(null);
  });

  // The cup settles onto the wordmark as the page arrives.
  onPage(({ intro }) => {
    const stage = document.querySelector('[data-cup-stage]');
    if (!stage || prefersReducedMotion()) return;
    intro.add(gsap.from(stage, { y: -40, autoAlpha: 0, duration: 1.3, ease: ease.out }), 0.15);
  });

  // Registered last, so it shifts everything the other page functions added to the intro.
  onPage(({ intro }) => {
    if (!draining) return;
    draining = false;
    intro.shiftChildren(0.55, true);
  });
}
