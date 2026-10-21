# Cremacious: design record

## Brief

- **Subject:** a one-page comparison site for coffee gear and beans. Working name "Cremacious"
  (after crema), held in one constant: `brand.name` in `src/data/site.ts`.
- **Audience:** home baristas and coffee nerds who read spec sheets for fun and want two or
  three things side by side before buying.
- **Job:** let people pick a category, pick up to three items, and read real specs across;
  browse a catalogue of everything with its sources.
- **Assets:** none. No product photography (manufacturer photos are not ours to use), so items
  are presented typographically, with one line-drawn glyph per category.
- **Constraints:** Next.js App Router. Specs real and sourced; unverified values are marked as
  placeholders in the data, never filled in. Signature is the coffee spill (CLAUDE.md).
  No deploy without asking.

## Phase 1: three concepts

| | A. The brew card (material) | B. The shot is the scroll (process) | C. The crema line (formal) |
|---|---|---|---|
| Idea | Every product is a cupping form; comparing is filling in a card | Scrolling the page pulls one espresso shot: 18 g in, 36 g out over 28 s, and the yield is the liquid that floods the page | One graphic element only: the amber crema line, used for every rule, underline and boundary |
| Anchor | SCA cupping forms and brew logs that nerds keep | the real 1:2 espresso recipe (18 g dose, about 36 g yield, 25 to 30 s, first drops near 6 s) | crema is the thin foam on top of a shot, the thing the name comes from |
| Layout | form fields, ruled boxes | poster hero with the cup, a readout that rides the liquid, index catalogue | everything hangs off horizontal lines |
| Motion verb | stamp, tick | pour and settle | draw a line |
| Signature | boxes tick as you choose | the cup tips, the shot pools as live UI and floods the theme from crème to coffee | the line draws across sections |
| Screenshot | a half-filled card | the page split by a moving crema line, light above, coffee below, a sentence cut cleanly in two | a page of lines |
| O / F / Fe / P | 3 / 4 / 5 / 3 | 4 / 5 / 3 / 1 | 3 / 3 / 5 / 3 |

**Pick B.** The brief's spill becomes a measured shot instead of a decoration, so the liquid
carries real information (shot time, yield, ratio) and the end of the page is literally the
end of the shot. Steal from C: the crema band on the liquid is the site's only accent. Steal
from A: the comparison table reads like a brew log (rows of measured values, tabular figures).

## Concept card

```
Idea:        Scrolling pulls a shot: the cup tips, the yield pools at the bottom and rises until the page is coffee.
Metaphor:    an espresso extraction, measured (dose, time, yield, ratio).
Signature:   the spill. One driver maps scroll progress to shot time, yield, liquid level, cup angle and pour.
             Liquid is three fixed canvases (difference, plus-lighter, multiply) that invert the page palette
             exactly under the surface, so text is split cleanly at the line. Code: src/motion/shot.ts
Emotion:     warm, slow, a little indulgent; the first seconds feel like watching crema settle.
Motion verb: pour and settle. Things rise from below and settle without bounce; fills flood upward.
Screenshot:  mid-page, a sentence cut in half by a moving crema line, light above, coffee below,
             the readout "18.6 s  19.2 g" floating in the liquid.
```

## Legibility at the liquid line (the hard part)

Two copies of the content would break hover, focus and form state under the liquid, so there
is one DOM. The liquid is drawn over it with blend modes that turn the light palette into the
dark one pixel by pixel:

1. `difference` canvas filled white inside the liquid: every color becomes `255 - x`.
2. `plus-lighter` canvas filled `rgb(47 16 1)` inside the liquid: adds the constant.

Together they map every pixel to `S - x`, with `S = ground + ink = (302, 271, 256)`. Crème
`#F2E8DE` becomes espresso `#3C2722` and espresso becomes crème, exactly, so a glyph crossing
the surface is crème below and brown above. The dark tokens (`html.is-dark`, used by the reduced
motion path) are the same `S - x`, so both paths produce the same colors.

3. `multiply` canvas draws the crema band (tan, bubbles) on the surface. Multiply keeps the
   brown text dark on the tan, so text inside the band stays readable.

Layer structure (for speed): only a 300 px strip around the surface is canvas. The deep coffee
under it is two plain `.pool` divs (difference + plus-lighter) that move by transform only, and
the pour has its own 200 px wide canvases. The strip's body fill and the pool meet on one integer
pixel row, so there is no seam. The pool is rendered on the server at its resting level, so the
first frame already shows the split wordmark before any JavaScript runs.

Performance note: blend layers are cheap on a GPU (measured: 60 fps headless with the GPU on,
about 120 fps on a 120 Hz screen, the same as with the layers removed). Under software
compositing (headless Chrome without a GPU) the same page reads 26 to 28 fps; that number is a
floor of the test rig, not of real devices.

Consequences, decided on purpose: no photography in the content layer (it would invert), and
the amber accent never appears in content, only in the liquid, the cup and the readout, which
sit above or inside the liquid. Focus rings, selection and fills use ink, which inverts cleanly.

## System

**Palette** (light; dark is the exact inverse `S - x`)

| Role | Light | Dark | Use |
|---|---|---|---|
| ground | `#F2E8DE` crème | `#3C2722` | page |
| ink | `#3C2722` espresso | `#F2E8DE` | text, rules, fills |
| muted | `#715A4E` (5.3:1) | `#BDB5B2` (6.9:1) | secondary text |
| line | ink at 16% | crème at 16% | hairlines |
| well | `#E8DACB` | `#463535` | table bands, chips |
| crema | `#C98A3E` amber, `#D9B07C` tan | same | liquid band, cup, readout only |

Named references: the inside of a white demitasse (ground), a ristretto (ink), tiger striping
on crema (tan and amber).

**Type**
- Display: Bricolage Grotesque (Google, variable opsz, wdth, wght). Ink-trap grotesk with warmth;
  set tight, wordmark at mega size, weight 700 to 800, tracking -0.05em.
- Text and UI: Host Grotesk (Google). Tabular figures for every number.
- No mono: numbers carry the data voice through tabular figures in the text face.
- Scale: tokens in `globals.css` (`--t-mega` to `--t-xs`), body 17 px, UI 13 to 14 px.

**Grid:** 12 columns, fluid gutter, outer margin = gutter. Three hang lines: col 1, col 5, col 9.
Section rhythm varies: hero full viewport (sticky), statement airy, compare normal, catalogue
tight rows, footer full viewport.

**Shape:** one radius rule: `999px` for pills (chips, buttons, tabs), `0` for everything else.
A cup is round; the page is ruled.

**Motion language:** eases from the engine (`expo.out` entrances, `expo.inOut` curtains,
`power3.out` UI). Durations: hover 0.35 to 0.5 s, reveals 1.1 to 1.3 s. "Pour and settle":
reveals rise from below a mask; button fills flood upward from the bottom edge with a wavy
top; nav underlines pour left to right. Utility links change color only.

**Idle:** the liquid surface keeps moving at rest (small ripples on the ticker, the meniscus at
the walls, crema bubbles drifting); the pointer near the surface disturbs it; scroll velocity
sloshes it. Paused when the tab is hidden; still under reduced motion.

**Readout:** the Shot / Yield / Ratio pill runs while the shot runs. It stays in the hero and at
the end, and fades out 0.6 s after scrolling stops mid-page, so it never sits on what you are
reading.

**Cup:** a glass cup, so the shot shows through. While the hero holds it on screen, only the pour
raises the pool (6% of the shot), so the coffee never rises over the cup (it would invert the
crema to blue). The handle foreshortens as it tips, as if the hand turns the cup toward you, and
some coffee stays in the glass so it still reads as a cup on its side. Steam wisps were cut in the
"remove one accessory" pass.

**Phone comparison:** one block per spec with the picked items side by side, instead of a
sideways-scrolling table.

**Fills:** every hover fill (buttons, pills, catalogue rows) rises from the bottom edge with a long,
shallow wave on its surface (160 px wavelength, about 4 px high, drifting slowly), and leaves
through the top once full. Catalogue rows are full bleed, so their fill spans the screen. The page
transition's leading edge is the liquid surface: a crema band on a drifting wave.

**Removing an item:** a cross beside each name in the comparison head. Pointing at it strikes the
name through and turns the cross. Source links keep an underline at rest; on hover it runs out to
the right and pours back in from the left, and the arrow nudges toward the source.

**Pointer:** a 10 px espresso dot trails the native cursor a few frames behind
(`src/motion/cursor.ts`), stretching along its path like a drop. Over anything pressable it
becomes a coffee bean (30 px, crème crease and rim) that leans into horizontal motion. It sits
between the page and the liquid layers, so the flood inverts it with everything else. The native
cursor stays visible. Off on touch and under reduced motion.

**First load:** the page arrives from under the coffee: the transition curtain starts over the page
and drains off it in pure CSS (no wait for JavaScript), then hands itself to GSAP for page
transitions. The headline reveal waits until the coffee has passed.

**Loader:** none. It cost 3 to 7 s on a throttled phone, and the server-rendered pool already
makes the first frame the brand moment. The intro is the headline rising line by line.

**Reduced motion:** no canvases, no cup tip, no smooth scroll. The theme steps from light to
dark when the catalogue reaches the middle of the viewport (`html.is-dark`, same colors).

## Composition plan

```
HERO (poster, sticky stage 200svh)
+--------------------------------------------------------------+
| Cremacious                              Compare  Catalogue    |
|                                                  .---.        |
| Compare beans, grinders and                    _( cup )_      |
| espresso machines side by side.                 (tips →)      |
| [Start a comparison]                                          |
| CREMACIOUS (mega wordmark, full width, baseline near pool)    |
|~~~~~~~~~~~~~~~~~ crema line ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~|
| 0.0 s   0.0 g                              Scroll to pull     |
+--------------------------------------------------------------+

SOURCING (statement, cols 5 to 12, airy)
|            Every number on this page links to where it came    |
|            from. If we could not confirm it, it says so.       |
|  20 items   4 categories   checked 21 Oct 2026  (real counts)  |

COMPARE (data / brew log)
| h2 Start a comparison                                          |
| (Beans) (Grinders) (Machines) (Accessories)    pick up to 3    |
| [chip][chip][chip][chip][chip]                                 |
| spec            | Niche Zero   | Ode Gen 2   | Specialità      |
| Burr            | 63 mm ▇▇▇▇   | 64 mm ▇▇▇▇  | 55 mm ▇▇▇       |
| ...             | sources under each column                    |

CATALOGUE (index list)
| h2 Catalogue                 All Beans Grinders Machines Acc.  |
| Brand     Name                     Category   Price   [+]      |
| row expands: full spec list + sources + "Compare this"         |

FOOTER (finale, fully flooded)
| 36.0 g out in 28 s. That is the shot.                          |
| CREMACIOUS (mega, crème on coffee)                             |
| Specs policy · Sources · Back to top · © 2026                  |
```

Phone (390 px): hero stacks statement, cup, wordmark at 17vw; compare table becomes one block
per spec with the chosen items in small columns; catalogue rows collapse to name, brand, price.

## Genericness test

- "Cream background, brown serif, amber accent" is the obvious coffee site. Changed: no serif at
  all; an ink-trap grotesk; the amber appears only in the liquid.
- "Product cards with photos" is the obvious catalogue. Changed: an index list with real
  numbers, no imagery.
- "Liquid fill as a wipe" is the obvious spill. Changed: the fill is a measured extraction with a
  readout, a meniscus, slosh and a crema band, and it inverts the page exactly at the line.

## Content rules

- Specs live in `src/data/products/*.ts`, one typed schema per category on a shared base.
- Every product lists its sources and the date checked (21 Oct 2026). Prices are shown in the
  currency the source listed, never converted.
- `placeholder(note)` marks any value no source confirmed; the UI renders it as "Unconfirmed".
