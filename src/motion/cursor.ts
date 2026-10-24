// The pointer: a small espresso dot that trails the native cursor, stretching along its
// path, and turns into a coffee bean over button controls. It lives under the liquid
// layers (z-index between the page and the shot), so the flood inverts it with the page: espresso
// on crème above the line, crème on espresso below it. Fine pointers only, off under reduced motion;
// the native cursor always stays visible.
import { gsap } from 'gsap';
import { ease, isTouch, onPage, onScroll, prefersReducedMotion } from '@/engine';

const PRESSABLE = 'button, .btn';
const BEAN_REST = -28; // a bean lies on the diagonal

export function startCursor() {
  if (isTouch() || prefersReducedMotion()) return;
  const root = document.querySelector<HTMLElement>('[data-pointer]');
  const stretch = root?.querySelector<HTMLElement>('[data-pointer-stretch]');
  const dot = root?.querySelector<HTMLElement>('[data-pointer-dot]');
  const tilt = root?.querySelector<HTMLElement>('[data-pointer-tilt]');
  const bean = root?.querySelector<SVGElement>('[data-pointer-bean]');
  if (!root || !stretch || !dot || !tilt || !bean) return;

  document.documentElement.classList.add('has-pointer');

  gsap.set(root, { autoAlpha: 0 });
  gsap.set(dot, { scale: 1, autoAlpha: 1 });
  gsap.set(bean, { scale: 1, autoAlpha: 0, rotation: BEAN_REST, transformOrigin: '50% 50%' });
  const setX = gsap.quickSetter(root, 'x', 'px');
  const setY = gsap.quickSetter(root, 'y', 'px');
  const aim = { x: -100, y: -100 };
  const pos = { x: -100, y: -100 };
  let shown = false;
  let over = false;
  let lean = 0;

  const pressableAt = (el: Element | null) => {
    const t = el?.closest(PRESSABLE);
    return !!t && !t.matches('[aria-disabled="true"], :disabled');
  };
  const morph = (on: boolean) => {
    if (on === over) return;
    over = on;
    if (on) {
      gsap.to(dot, { scale: 0, autoAlpha: 0, duration: 0.2, ease: ease.out, overwrite: true });
      gsap.to(bean, { scale: 1.12, autoAlpha: 1, rotation: 0, duration: 0.45, ease: ease.out, overwrite: true });
    } else {
      gsap.to(dot, { scale: 1, autoAlpha: 1, duration: 0.25, ease: ease.out, overwrite: true });
      gsap.to(bean, { scale: 1, autoAlpha: 0, rotation: BEAN_REST, duration: 0.25, ease: ease.soft, overwrite: true });
    }
  };
  // Whatever is under a still pointer changes when the page scrolls or swaps: check again then.
  const recheck = () => { if (shown) morph(pressableAt(document.elementFromPoint(aim.x, aim.y))); };

  addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    aim.x = e.clientX;
    aim.y = e.clientY;
    if (!shown) {
      shown = true;
      pos.x = aim.x; pos.y = aim.y;
      gsap.to(root, { autoAlpha: 1, duration: 0.4, ease: ease.soft });
    }
    morph(pressableAt(e.target as Element));
  }, { passive: true });
  document.documentElement.addEventListener('pointerleave', () => {
    shown = false;
    gsap.to(root, { autoAlpha: 0, duration: 0.3, ease: ease.soft });
  });
  addEventListener('pointerdown', () => gsap.to(over ? bean : dot, { scale: 0.8, duration: 0.18, ease: ease.soft, overwrite: 'auto' }));
  addEventListener('pointerup', () => gsap.to(over ? bean : dot, { scale: 1, duration: 0.6, ease: ease.out, overwrite: 'auto' }));
  onScroll(recheck);
  onPage(() => { requestAnimationFrame(recheck); });

  gsap.ticker.add(() => {
    if (!shown) return;
    const r = gsap.ticker.deltaRatio(60);
    const k = 1 - Math.pow(0.78, r); // trails a few frames behind, never far
    pos.x += (aim.x - pos.x) * k;
    pos.y += (aim.y - pos.y) * k;
    setX(pos.x);
    setY(pos.y);
    const dx = aim.x - pos.x;
    const dy = aim.y - pos.y;
    const speed = Math.hypot(dx, dy);
    gsap.set(stretch, {
      rotation: (Math.atan2(dy, dx) * 180) / Math.PI,
      scaleX: 1 + Math.min(speed / 45, 0.7),
      scaleY: 1 - Math.min(speed / 140, 0.3),
    });
    lean += (gsap.utils.clamp(-24, 24, dx * 0.9) - lean) * (1 - Math.pow(0.85, r));
    gsap.set(tilt, { rotation: BEAN_REST + lean });
  });
}
