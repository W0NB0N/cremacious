// Every visible string that is not product data lives here.
// Assumptions (mirrored in the hand-off): "Cremacious" is a working name; the production URL
// is a placeholder; there is no contact address yet, so none is shown.

/** The brand name. Change it here and everywhere follows (titles, wordmarks, metadata). */
export const brand = {
  name: 'Cremacious',
  /** Placeholder: replace with the real domain before deploy. */
  url: 'https://cremacious.coffee',
};

/** The shot the page pulls as you scroll. Real recipe shape: 1:2 ratio in 25 to 30 s. */
export const shot = { dose: 18, yield: 36, seconds: 28 };

export const site = {
  title: `${brand.name} | Compare coffee grinders, espresso machines and beans`,
  description:
    'Pick two or three grinders, espresso machines, beans or brewing tools and read their specs side by side. Every value links to its source.',
  checked: '23 October 2026',
  hero: {
    title: 'Compare coffee gear side by side.',
    lede: 'Grinders, espresso machines, beans and brewing tools. Real numbers from spec sheets and roaster pages, with the source next to every one.',
    cta: 'Start a comparison',
    hint: 'Scroll to pull the shot',
  },
  sourcing: {
    heading: 'Spec sheets disagree. We show our working.',
    text:
      'Makers round, retailers copy each other, and some numbers are never published. Every value here links to the page it came from. Where no source confirmed a number, the table says Unconfirmed instead of guessing.',
  },
  compare: {
    heading: 'Start a comparison',
    lede: 'Choose a category, then up to three items.',
    full: 'Three is the limit. Remove one to add another.',
    bars: 'Bars show size, not merit.',
  },
  catalogue: {
    heading: 'Catalogue',
    lede: 'Everything we have checked, with full specs and sources.',
    add: 'Compare this',
    added: 'In comparison',
  },
  footer: {
    line: `${shot.dose} g in, ${shot.yield} g out, ${shot.seconds} seconds. That was the shot.`,
    colophon:
      'Prices are in rupees (₹), as the Indian seller listed them on the day checked. They change often. Set in Bricolage Grotesque and Host Grotesk.',
  },
  notFound: {
    title: 'This shot channeled.',
    text: 'Water found a crack in the puck and rushed straight through. Nothing worth tasting came out at this address.',
    back: 'Back to the bar',
  },
};
