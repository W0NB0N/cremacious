// The shot: the one driver behind the signature. Scroll progress becomes shot time, yield,
// liquid level, cup tilt and pour, so every part of the spill always agrees.
//
// The liquid is a stack of fixed blend layers over the page (DESIGN.md, "Legibility at the liquid line"):
//   invert  difference, white          → every pixel becomes 255 - x
//   lift    plus-lighter, rgb(47 16 1) → together: S - x, the exact palette inverse
//   crema   multiply, the crema band   → brown text stays dark on the tan foam
// So a glyph that crosses the surface is crème below the line and espresso above it.
// For speed, only a thin strip around the surface is a canvas (.shot); the deep coffee under
// it is a pair of plain divs (.pool) that only move by transform, and the pour has its own
// narrow canvases (.stream). The strip and the pool meet at one integer pixel row.
//
// Idle: ripples on the ticker clock, a meniscus at the walls, crema bubbles drifting, and the
// pointer (or scroll velocity on touch) disturbing the surface. Reduced motion: no canvases,
// no cup; the theme steps to dark when the catalogue reaches the middle of the screen.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { isTouch, onPage, prefersReducedMotion, scrollState } from '@/engine';
import { shot } from '@/data/site';

gsap.registerPlugin(ScrollTrigger);

// Cup geometry in the SVG's 160 × 150 viewBox (src/components/Cup.tsx).
const CUP = { w: 160, h: 150, pivot: [127, 132], lip: [137, 16], center: [90, 70.5], full: 52, empty: 118 } as const;
const N = 64; // surface columns
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const smooth = (a: number, b: number, x: number) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };

type C2 = CanvasRenderingContext2D;
let inv: C2, lift: C2, crema: C2, sInv: C2, sLift: C2;
let strips: HTMLCanvasElement[] = [];
let streams: HTMLCanvasElement[] = [];
let pools: HTMLElement[] = [];
let W = 0, H = 0, dpr = 1;
const S = 300; // strip height, css px
let SH = S; // strip height snapped to whole device pixels
let px = 1; // the screen's real device pixel ratio, for snapping
const snap = (v: number) => Math.round(v * px) / px;
const SW = 200; // stream canvas width, css px
let stripY = NaN, poolY = NaN, streamX = NaN, streamOn = false;

const h = new Float32Array(N + 1); // surface height offset (up is positive)
const v = new Float32Array(N + 1);
const ys = new Float32Array(N + 1); // surface y this frame
const foam = new Float32Array(N + 1); // crema thickness this frame

const st = {
  level: -1, tilt: 0, lastVel: 0, hp: 1, heroEnd: 0, lastMove: 0,
  pour: 0, lipX: -1, lipY: -1, angle: 0,
  pinned: null as number | null,
  pinBelow: null as HTMLElement | null, // a page can settle the surface just under one element
  fixed: null as [number, number] | null,
};
const pointer = { x: -1, y: -1, vy: 0, lean: 0 };
type Bubble = { x: number; d: number; r: number; s: number; dark: boolean };
type Drop = { x: number; y: number; vx: number; vy: number; r: number };
let bubbles: Bubble[] = [];
const drops: Drop[] = [];

// Elements of the current page
let cupStage: HTMLElement | null = null;
let cupBody: HTMLElement | null = null;
let cupLiquid: SVGGElement | null = null;
let cupFill: SVGRectElement | null = null;
let cupCrema: SVGRectElement | null = null;
let cupShadow: HTMLElement | null = null;
let cupHandle: SVGPathElement | null = null;
let out = { time: null as HTMLElement | null, yield: null as HTMLElement | null, ratio: null as HTMLElement | null, hint: null as HTMLElement | null };
let shown = '';

const base = () => Math.min(120, Math.max(72, H * 0.11)); // resting pool: holds the readout
// How much of the shot has been pulled, 0 to 1. While the hero holds the cup on screen, only the
// pour itself raises the pool a little (HERO_SHARE), so the coffee never rises over the cup.
const HERO_SHARE = 0.06;
function pulled(p: number) {
  const he = st.heroEnd;
  if (!he) return clamp01((p - 0.02) / 0.94); // no hero on this page
  if (p <= he) return HERO_SHARE * smooth(0, 1, p / he);
  return HERO_SHARE + (1 - HERO_SHARE) * clamp01((p - he) / (0.96 - he));
}
const levelFor = (p: number) => { const b = base(); return b + (H + 70 - b) * pulled(p); };

function resize() {
  W = document.documentElement.clientWidth;
  H = innerHeight;
  dpr = Math.min(devicePixelRatio || 1, isTouch() ? 1.5 : 2);
  px = devicePixelRatio || 1;
  SH = Math.round(S * px) / px;
  strips.forEach((c) => { c.width = Math.round(W * dpr); c.height = Math.round(SH * dpr); c.style.height = `${SH}px`; });
  streams.forEach((c) => { c.width = Math.round(SW * dpr); c.height = Math.round(H * dpr); });
  stripY = poolY = streamX = NaN;
}

const place = (els: HTMLElement[], x: number, y: number) => els.forEach((e) => { e.style.transform = `translate3d(${x}px, ${y}px, 0)`; });

// ---------- Cup ----------

function updateCup(time: number) {
  if (!cupBody || !cupStage) { st.pour = 0; return; }
  const hp = st.hp;
  const lean = pointer.lean * 4 * (1 - smooth(0, 0.12, hp)); // anticipation before the first scroll
  const a = 96 * smooth(0.02, 0.62, hp) + lean;
  const fill = 1 - 0.8 * clamp01((hp - 0.34) / 0.62); // a little stays behind, so it still reads as a cup
  st.angle = a;
  st.pour = smooth(52, 78, a) * clamp01((fill - 0.2) / 0.05);

  gsap.set(cupBody, { rotation: a });
  // The hand turns the cup toward you as it tips: the handle foreshortens instead of pointing up like a bag.
  if (cupHandle) gsap.set(cupHandle, { scaleX: 1 - 0.78 * smooth(15, 75, a), svgOrigin: '50 68' });
  if (cupLiquid && cupFill && cupCrema) {
    const rad = (a * Math.PI) / 180;
    const s = (CUP.full - CUP.center[1] + (CUP.empty - CUP.full) * (1 - fill)) * (1 - 0.2 * Math.abs(Math.sin(rad)));
    const y = CUP.center[1] + s + Math.sin(time * 2.1) * 0.6; // the shot settles in the glass
    gsap.set(cupLiquid, { rotation: -a, svgOrigin: `${CUP.center[0]} ${CUP.center[1]}` });
    cupCrema.setAttribute('y', y.toFixed(2));
    cupCrema.style.opacity = String(smooth(0.02, 0.1, fill)); // an empty glass keeps no crema
    cupFill.setAttribute('y', (y + 9).toFixed(2));
  }
  if (cupShadow) cupShadow.style.opacity = String(1 - smooth(0, 30, a));

  // Lip position on screen: rotate the lip around the pivot, in the stage's pixel space.
  const r = cupStage.getBoundingClientRect();
  if (r.bottom < -200 || r.top > H) { st.lipX = -1; return; }
  const sx = r.width / CUP.w, sy = r.height / CUP.h;
  const px = CUP.pivot[0] * sx, py = CUP.pivot[1] * sy;
  const dx = CUP.lip[0] * sx - px, dy = CUP.lip[1] * sy - py;
  const rad = (a * Math.PI) / 180;
  st.lipX = r.left + px + dx * Math.cos(rad) - dy * Math.sin(rad);
  st.lipY = r.top + py + dx * Math.sin(rad) + dy * Math.cos(rad);
}

// ---------- Surface simulation ----------

function step(r: number) {
  const vel = gsap.utils.clamp(-80, 80, scrollState().velocity);
  const acc = vel - st.lastVel;
  st.lastVel = vel;
  st.tilt += (vel * 0.5 - st.tilt) * (1 - Math.pow(0.9, r)); // the surface leans into the scroll
  for (let i = 0; i <= N; i++) v[i] += (i / N - 0.5) * acc * 0.45; // and sloshes when it changes

  if (pointer.y >= 0 && W) {
    const i = Math.round((pointer.x / W) * N);
    if (i >= 0 && i <= N) {
      const d = Math.abs(pointer.y - ys[i]);
      if (d < 90) {
        const f = (1 - d / 90) * pointer.vy * 0.3;
        for (let k = -3; k <= 3; k++) { const j = i + k; if (j >= 0 && j <= N) v[j] -= f * (1 - Math.abs(k) / 4); }
      }
    }
  }
  pointer.vy *= Math.pow(0.8, r);

  if (st.pour > 0.02 && st.lipX >= 0) {
    const i = Math.round((gsap.utils.clamp(0, W, st.lipX + 14 * st.pour) / W) * N);
    for (let k = -1; k <= 1; k++) { const j = i + k; if (j >= 0 && j <= N) v[j] -= 0.5 * st.pour * (k ? 0.5 : 1); }
  }

  const steps = Math.min(4, Math.max(1, Math.round(r * 2)));
  for (let s = 0; s < steps; s++) {
    for (let i = 0; i <= N; i++) {
      const l = h[i > 0 ? i - 1 : 0], rr = h[i < N ? i + 1 : N];
      v[i] = (v[i] + (l + rr - 2 * h[i]) * 0.2 - h[i] * 0.012) * 0.988;
    }
    for (let i = 0; i <= N; i++) h[i] = gsap.utils.clamp(-60, 60, h[i] + v[i] * 0.5);
  }
}

function surface(t: number) {
  const froth = Math.min(8, Math.abs(st.lastVel) * 0.12);
  const yb = H - st.level;
  for (let i = 0; i <= N; i++) {
    const x = (i / N) * W;
    const ripple = 1.3 * Math.sin(x * 0.011 + t * 1.25) + 0.8 * Math.sin(x * 0.027 - t * 1.9) + 0.45 * Math.sin(x * 0.063 + t * 3.1);
    const meniscus = 9 * (Math.exp(-x / 18) + Math.exp(-(W - x) / 18));
    ys[i] = yb - h[i] - ripple - meniscus + st.tilt * (x / W - 0.5) * 2;
    const nearPour = st.pour > 0 ? st.pour * 9 * Math.exp(-(((x - st.lipX) / 140) ** 2)) : 0;
    foam[i] = 7 + 1.8 * Math.sin(i * 0.83 + t * 0.6) + 1.2 * Math.sin(i * 2.1 - t * 0.9) + froth + nearPour; // thin: text under it stays legible
  }
}

// ---------- Drawing ----------

function trace(p: Path2D, y: (i: number) => number, reverse = false) {
  const pt = (k: number) => { const i = reverse ? N - k : k; return [(i / N) * W, y(i)]; };
  let [px, py] = pt(0);
  p.lineTo(reverse ? W + 2 : -2, py);
  for (let k = 1; k <= N; k++) {
    const [x, yy] = pt(k);
    p.quadraticCurveTo(px, py, (px + x) / 2, (py + yy) / 2);
    px = x; py = yy;
  }
  p.lineTo(reverse ? -2 : W + 2, py);
}

function streamPath(): Path2D | null {
  if (st.pour < 0.01 || st.lipX < 0) return null;
  const top = st.lipY, i = Math.round((gsap.utils.clamp(0, W, st.lipX) / W) * N);
  const bottom = ys[gsap.utils.clamp(0, N, i)] + 2; // ends in the crema band, never in the pool
  if (bottom - top < 8) return null;
  const t = gsap.ticker.time;
  const M = 28, left: number[][] = [], right: number[][] = [];
  for (let k = 0; k <= M; k++) {
    const y = top + ((bottom - top) * k) / M;
    const fall = y - top;
    const arc = 14 * st.pour * (1 - Math.exp(-fall / 36)); // leaves the lip moving outward
    const wob = Math.sin(t * 13 + fall * 0.05) * 1.1 * st.pour;
    const w = (3 + 11 * st.pour) * (0.55 + 0.45 * Math.exp(-fall / 60)) + (k === M ? 3 : 0);
    const x = st.lipX + arc + wob;
    left.push([x - w / 2, y]);
    right.push([x + w / 2, y]);
  }
  const p = new Path2D();
  p.moveTo(left[0][0], left[0][1]);
  left.forEach(([x, y]) => p.lineTo(x, y));
  right.reverse().forEach(([x, y]) => p.lineTo(x, y));
  p.closePath();
  return p;
}

function updateDrops(r: number) {
  if (st.pour > 0.15 && st.lipX >= 0 && drops.length < 26 && Math.random() < st.pour * 0.5 * r) {
    const i = Math.round((gsap.utils.clamp(0, W, st.lipX + 14 * st.pour) / W) * N);
    drops.push({ x: st.lipX + 14 * st.pour, y: ys[i], vx: (Math.random() - 0.5) * 3.2, vy: -1.5 - Math.random() * 3.5 * st.pour, r: 1 + Math.random() * 2 });
  }
  for (let k = drops.length - 1; k >= 0; k--) {
    const d = drops[k];
    d.vy += 0.32 * r; d.x += d.vx * r; d.y += d.vy * r;
    const i = gsap.utils.clamp(0, N, Math.round((d.x / W) * N));
    if (d.vy > 0 && d.y > ys[i] + 2) drops.splice(k, 1);
  }
}

function draw() {
  let top = Infinity, bottom = -Infinity;
  for (let i = 0; i <= N; i++) { top = Math.min(top, ys[i]); bottom = Math.max(bottom, ys[i] + foam[i]); }

  // The strip holds the surface; the pool starts exactly where the strip ends. The strip only moves
  // when the surface is about to leave it (ripples and the pointer never move it), and both sit on
  // whole device pixels: a moving join shows as a one-frame hairline.
  const needTop = top - 56, needBot = bottom + 64;
  if (Number.isNaN(stripY) || needTop < stripY || needBot > stripY + SH) {
    stripY = snap(needBot - needTop > SH ? needBot - SH : (needTop + needBot) / 2 - SH / 2);
    place(strips, 0, stripY);
  }
  const y0 = stripY;
  const py = bottom < -2 ? 0 : Math.max(0, snap(y0 + SH)); // flooded: the pool covers everything
  if (py !== poolY) { place(pools, 0, py); poolY = py; }

  const k = strips[0].height / SH;
  [inv, lift, crema].forEach((x) => { x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, x.canvas.width, x.canvas.height); x.setTransform(k, 0, 0, k, 0, -y0 * k); });
  drawStream();
  if (top > H + 4 || bottom < -2) return; // the surface is off screen: the pool divs do the work

  const end = y0 + SH;
  const body = new Path2D();
  body.moveTo(-2, end);
  trace(body, (i) => ys[i] + foam[i]);
  body.lineTo(W + 2, end);
  body.closePath();

  const band = new Path2D();
  band.moveTo(-2, ys[0]);
  trace(band, (i) => ys[i]);
  trace(band, (i) => ys[i] + foam[i], true);
  band.closePath();

  // 1 + 2: the inverse palette below the crema
  inv.fillStyle = '#fff';
  inv.fill(body);
  const sheenTop = bottom - 4;
  const sheen = lift.createLinearGradient(0, sheenTop, 0, sheenTop + 48);
  sheen.addColorStop(0, 'rgb(64 30 12)'); // a little light just under the crema
  sheen.addColorStop(1, 'rgb(47 16 1)');
  lift.fillStyle = sheen;
  lift.fill(body);
  lift.fillStyle = 'rgb(47 16 1)';
  for (const d of drops) {
    const p = new Path2D(); p.arc(d.x, d.y, d.r, 0, Math.PI * 2);
    inv.fill(p); lift.fill(p);
  }

  // 3: the crema band, multiplied over whatever is under it
  crema.fillStyle = '#d6a66b';
  crema.fill(band);
  crema.save();
  crema.clip(band);
  const edge = new Path2D();
  edge.moveTo(-2, ys[0] + 2);
  trace(edge, (i) => ys[i] + 2);
  crema.lineWidth = 3.5; crema.strokeStyle = '#ecd6b1'; crema.stroke(edge); // pale top of the foam
  const under = new Path2D();
  under.moveTo(-2, ys[0] + foam[0]);
  trace(under, (i) => ys[i] + foam[i]);
  crema.lineWidth = 4; crema.strokeStyle = '#b77a3f'; crema.stroke(under); // darker where it meets the coffee
  for (const b of bubbles) {
    const x = b.x * W, i = Math.round(b.x * N);
    const y = ys[i] + foam[i] * b.d;
    crema.beginPath();
    crema.arc(x, y, b.dark ? b.r * 0.55 : b.r, 0, Math.PI * 2);
    crema.fillStyle = b.dark ? 'rgb(150 96 48 / 0.7)' : '#f2e0c0';
    crema.fill();
  }
  crema.restore();

  // A thin glint on the meniscus
  const glint = new Path2D();
  glint.moveTo(-2, ys[0]);
  trace(glint, (i) => ys[i]);
  lift.lineWidth = 1.2;
  lift.strokeStyle = 'rgb(255 236 210 / 0.22)';
  lift.stroke(glint);
}

function drawStream() {
  const path = streamPath();
  if (!path) {
    if (streamOn) { streams.forEach((c) => (c.style.visibility = 'hidden')); streamOn = false; }
    return;
  }
  if (!streamOn) { streams.forEach((c) => (c.style.visibility = 'visible')); streamOn = true; }
  // Kept inside the viewport: a fixed element past the edge widens the layout viewport on phones.
  const x0 = Math.round(gsap.utils.clamp(0, Math.max(0, W - SW), st.lipX - 60));
  if (x0 !== streamX) { place(streams, x0, 0); streamX = x0; }
  [sInv, sLift].forEach((x) => { x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, SW * dpr, H * dpr); x.setTransform(dpr, 0, 0, dpr, -x0 * dpr, 0); });
  sInv.fillStyle = '#fff'; sInv.fill(path);
  sLift.fillStyle = 'rgb(47 16 1)'; sLift.fill(path);
}

/** First matching element that is actually rendered (routers may keep old pages hidden). */
function visible<T extends Element>(sel: string): T | null {
  return [...document.querySelectorAll<T>(sel)].find((e) => (e as Element & { checkVisibility?: () => boolean }).checkVisibility?.() ?? true) ?? null;
}

// ---------- Readout ----------

function readout(p: number) {
  const [tSec, g] = st.fixed ?? [shot.seconds * clamp01(p / 0.96), shot.yield * pulled(p)];
  const text = `${tSec.toFixed(1)}|${g.toFixed(1)}`;
  if (text === shown) return;
  shown = text;
  if (out.time) out.time.textContent = tSec.toFixed(1);
  if (out.yield) out.yield.textContent = g.toFixed(1);
  if (out.ratio) out.ratio.textContent = (g / shot.dose).toFixed(1);
  document.documentElement.classList.toggle('shot-started', p > 0.015 || !!st.fixed);
}

/** The readout runs while the shot runs: it fades when scrolling stops mid-page, so it never sits on what you read. */
function rest(p: number, time: number) {
  if (Math.abs(scrollState().velocity) > 0.2) st.lastMove = time;
  const resting = !st.fixed && p > Math.max(0.03, st.heroEnd) && p < 0.97 && time - st.lastMove > 0.6;
  document.documentElement.classList.toggle('readout-rest', resting);
}

// ---------- Loop ----------

function tick(time: number) {
  if (!W || document.hidden) return;
  const r = Math.min(4, gsap.ticker.deltaRatio(60));
  const p = st.pinned ?? scrollState().progress;
  const target = st.pinBelow ? H - (st.pinBelow.getBoundingClientRect().bottom + 22) : levelFor(p);
  st.level = st.level < 0 ? target : st.level + (target - st.level) * (1 - Math.pow(0.9, r));
  pointer.lean += ((pointer.x >= 0 ? pointer.x / W - 0.5 : 0) - pointer.lean) * (1 - Math.pow(0.95, r));
  updateCup(time);
  step(r);
  surface(time);
  for (const b of bubbles) b.x = (b.x + b.s * r + st.tilt * 0.00002 * r + 1) % 1;
  updateDrops(r);
  draw();
  readout(p);
  rest(p, time);
}

function reducedPath() {
  const dark = (on: boolean) => document.documentElement.classList.toggle('is-dark', on);
  onPage(() => {
    const pin = visible<HTMLElement>('[data-shot-pin]');
    if (pin) { dark(+pin.dataset.shotPin! > 0.5); return () => dark(false); }
    const cat = document.getElementById('catalogue');
    if (!cat) return;
    ScrollTrigger.create({ trigger: cat, start: 'top 55%', onEnter: () => dark(true), onLeaveBack: () => dark(false) });
    return () => dark(false);
  });
}

/** Call once from setupMotion. */
export function startShot() {
  if (prefersReducedMotion()) return reducedPath();
  strips = [...document.querySelectorAll<HTMLCanvasElement>('canvas.shot')];
  streams = [...document.querySelectorAll<HTMLCanvasElement>('canvas.stream')];
  pools = [...document.querySelectorAll<HTMLElement>('.pool')];
  if (strips.length !== 3 || streams.length !== 2) return;
  [inv, lift, crema] = strips.map((c) => c.getContext('2d')!);
  [sInv, sLift] = streams.map((c) => c.getContext('2d')!);
  document.documentElement.classList.add('shot-live');
  bubbles = Array.from({ length: 70 }, () => ({
    x: Math.random(), d: 0.18 + Math.random() * 0.64, r: 0.7 + Math.random() ** 2 * 2.3,
    s: (Math.random() - 0.5) * 0.00012, dark: Math.random() < 0.3,
  }));
  out = {
    time: document.querySelector('[data-shot-time]'),
    yield: document.querySelector('[data-shot-yield]'),
    ratio: document.querySelector('[data-shot-ratio]'),
    hint: document.querySelector('[data-shot-hint]'),
  };
  resize();
  addEventListener('resize', resize);
  if (!isTouch()) {
    addEventListener('pointermove', (e) => {
      pointer.vy = gsap.utils.clamp(-30, 30, e.clientY - (pointer.y < 0 ? e.clientY : pointer.y));
      pointer.x = e.clientX; pointer.y = e.clientY;
    }, { passive: true });
    document.addEventListener('pointerleave', () => { pointer.y = -1; pointer.x = -1; });
  }
  gsap.ticker.add(tick);

  onPage(() => {
    const pin = visible<HTMLElement>('[data-shot-pin]');
    st.pinned = pin ? +pin.dataset.shotPin! : null;
    st.pinBelow = pin?.dataset.shotPinBelow ? document.getElementById(pin.dataset.shotPinBelow) : null;
    st.fixed = pin?.dataset.shotReadout ? (pin.dataset.shotReadout.split(',').map(Number) as [number, number]) : null;
    shown = '';
    cupStage = document.querySelector('[data-cup-stage]');
    cupBody = document.querySelector('[data-cup]');
    cupLiquid = document.querySelector('[data-cup-liquid]');
    cupFill = document.querySelector('[data-cup-fill]');
    cupCrema = document.querySelector('[data-cup-crema]');
    cupShadow = document.querySelector('[data-cup-shadow]');
    cupHandle = document.querySelector('[data-cup-handle]');
    st.hp = cupBody ? 0 : 1;
    const hero = document.querySelector('[data-hero]');
    st.heroEnd = 0;
    if (hero) ScrollTrigger.create({
      trigger: hero, start: 'top top', end: 'bottom bottom',
      onUpdate: (s) => { st.hp = s.progress; },
      onRefresh: (s) => { const max = ScrollTrigger.maxScroll(window); st.heroEnd = max > 0 ? s.end / max : 0; },
    });
    return () => { st.pinBelow = null; cupStage = cupBody = cupShadow = null; cupHandle = null; cupLiquid = null; cupFill = cupCrema = null; st.pour = 0; drops.length = 0; };
  });
}
