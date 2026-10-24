// Smooth scroll on ONE clock: Lenis is driven by gsap.ticker, ScrollTrigger reads Lenis.
// Reduced motion → native scroll, no Lenis.
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { prefersReducedMotion } from './env';

gsap.registerPlugin(ScrollTrigger);

let lenis: Lenis | null = null;
const listeners = new Set<(s: ScrollState) => void>();

export type ScrollState = { y: number; velocity: number; progress: number };
const state: ScrollState = { y: 0, velocity: 0, progress: 0 };

let watching = false;

export function initScroll() {
  if (!watching) { watching = true; watchLayout(); }
  if (lenis || prefersReducedMotion()) {
    // Still publish native scroll position for WebGL sync.
    if (!lenis) addEventListener('scroll', nativeTick, { passive: true });
    return;
  }
  // anchors off: setup.ts owns in-page links (eased scroll, focus, history). Both used to fire.
  lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 1, touchMultiplier: 1.2 });
  lenis.on('scroll', (l: Lenis) => {
    state.y = l.scroll;
    state.velocity = l.velocity;
    state.progress = l.limit > 0 ? l.scroll / l.limit : 0; // Lenis reports 1 on pages that cannot scroll
    ScrollTrigger.update();
    listeners.forEach((fn) => fn(state));
  });
  gsap.ticker.add((time) => lenis?.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
}

/** ScrollTrigger only re-measures on window resize. Content that React grows or shrinks (picks,
 *  expanded rows) moves every trigger below it, so re-measure when the page height changes. */
function watchLayout() {
  let height = document.documentElement.scrollHeight;
  let timer = 0;
  new ResizeObserver(() => {
    const next = document.documentElement.scrollHeight;
    if (next === height) return;
    height = next;
    clearTimeout(timer);
    timer = window.setTimeout(() => ScrollTrigger.refresh(), 150);
  }).observe(document.body);
}

function nativeTick() {
  const max = document.documentElement.scrollHeight - innerHeight;
  state.velocity = scrollY - state.y;
  state.y = scrollY;
  state.progress = max > 0 ? scrollY / max : 0;
  listeners.forEach((fn) => fn(state));
}

export const onScroll = (fn: (s: ScrollState) => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};
export const scrollState = () => state;
/** The current maximum scroll in px, read live (layout can change without a scroll event). */
export const scrollLimit = () => (lenis ? lenis.limit : document.documentElement.scrollHeight - innerHeight);
export const stopScroll = () => lenis?.stop();
export const startScroll = () => lenis?.start();
export function resetScroll() {
  if (lenis) lenis.scrollTo(0, { immediate: true, force: true });
  else scrollTo(0, 0);
  state.y = 0;
  state.velocity = 0;
}
export function scrollToTarget(target: string | HTMLElement | number) {
  if (lenis) lenis.scrollTo(target, { duration: 1.4, easing: (t) => 1 - Math.pow(1 - t, 4) });
  else if (typeof target === 'number') scrollTo({ top: target });
  else (typeof target === 'string' ? document.querySelector(target) : target)?.scrollIntoView();
}
