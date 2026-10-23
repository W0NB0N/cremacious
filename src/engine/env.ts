export const prefersReducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
/** Windows High Contrast and similar: the system picks the colours, so colour effects step aside. */
export const forcedColors = () => matchMedia('(forced-colors: active)').matches;
export const isTouch = () => matchMedia('(hover: none), (pointer: coarse)').matches;
export const isMobile = () => matchMedia('(max-width: 767px)').matches;

// Shared easing vocabulary. Use these names everywhere; never invent per-component curves.
export const ease = {
  out: 'expo.out', // default entrance
  inOut: 'expo.inOut', // curtains, page transitions
  soft: 'power3.out', // small UI
  spring: 'back.out(1.6)', // playful pops, use rarely
} as const;
