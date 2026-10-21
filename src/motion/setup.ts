// Global motion: runs once on the client, before the first page initializes.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ease, onPage, onScroll, prefersReducedMotion, scrollToTarget, setTransition } from '@/engine';
import { startShot } from './shot';

gsap.registerPlugin(ScrollTrigger);

export function setupMotion() {
  // Page transition: coffee floods up over the page, then drains down off the next one.
  setTransition({
    leave: (c) => gsap.timeline()
      .set(c, { autoAlpha: 1 })
      .fromTo(c.querySelector('.curtain__panel'), { yPercent: 102 }, { yPercent: 0, duration: 0.85, ease: ease.inOut }),
    enter: (c) => gsap.timeline()
      .to(c.querySelector('.curtain__panel'), { yPercent: 102, duration: 0.9, ease: ease.inOut })
      .set(c, { autoAlpha: 0 }),
  });

  startShot();

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
}
