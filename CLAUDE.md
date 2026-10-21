# Cremacious (working name)

A one-page website where coffee nerds compare everything coffee: beans, grinders, espresso machines and accessories. The idea is simple. The execution has to be Awwwards-level: careful design, smooth interactions and motion, and a premium feel. It should feel like the crema on a good shot of espresso.

"Cremacious" is a placeholder name, after crema. The final name isn't chosen, so keep the name in one constant or token so it can be swapped later.

## Page structure (single page)

1. **Hero**: the brand moment.
2. **Start comparison**: pick items in a category and compare their specs side by side.
3. **Product catalogue**: information on every item, filterable by category.
4. **Footer**

## Signature interaction: the coffee spill

- As the user scrolls, a coffee cup tips and spills.
- The spilled coffee collects at the bottom of the viewport as part of the UI, and the level rises with scroll progress.
- By the end it fills the whole page, which turns the theme from light to dark:
  - Light: crème background, coffee-brown text.
  - Dark: coffee-brown background, crème text.
- The liquid has to look fluid and satisfying: a moving surface, a meniscus and crema foam on the surface line. A flat wipe is not enough.
- Text must stay readable where the liquid line crosses it. Content under the liquid uses the dark palette and content above it uses the light one. Possible ways to do this: a duplicated content layer clipped by the liquid height, or per-section theme tokens switched as the line passes.
- Scroll-scrubbed and reversible: scrolling back up drains the coffee.
- Reduced motion: no spill animation. Switch the theme with a calm crossfade or step.

## Palette direction

Crème (#f3e9dc-ish), espresso/coffee browns, and a crema amber accent. The final palette and fonts are recorded in `DESIGN.md` once the `/awwwards` skill sets them.

## Tooling

- Build with the `/awwwards` skill (github.com/juliobsz/skills): GSAP and ScrollTrigger, Lenis and OGL. Next.js App Router by default.
- Score the result with `/jury` from the same repo.
- `/anatomy` skill (wheresryan22/anatomy) is installed in `.agents/skills/anatomy`. It makes isometric explainer figures.

## Product data

Keep catalogue and comparison data in typed structured files (JSON or TS), one schema per category with shared fields: name, brand, price and so on. Specs must be real and sourced. Don't invent specs.
