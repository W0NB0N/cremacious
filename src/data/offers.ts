// Where each product is sold, and what the seller showed the last time a person checked.
// The backend (backend/) polls these pages. A person updates `price` and `checked` only when
// they verify a price by hand; the poller never edits this file.
//
// adapter 'shopify': the backend reads <product url>.js (the store's public JSON) and takes the
//   price of `variantId`. Prices there are in paise.
// adapter 'manual': nothing polls it. Use it for sellers with no public price endpoint.
//
// To add a seller (Amazon, Flipkart or any other page), add one entry with the product's id.
// A product can have several offers; the first one is the reference price shown on the site.

export type OfferAdapter = 'shopify' | 'manual';

export type Offer = {
  productId: string;
  retailer: string;
  /** The page a person would buy from. */
  url: string;
  adapter: OfferAdapter;
  /** shopify only: the variant whose price is tracked. */
  variantId?: number;
  /** Rupees, as the seller showed it on `checked`. */
  price: number;
  /** ISO date a person last verified `price`. */
  checked: string;
};

export const offers: Offer[] = [
  { productId: 'timemore-chestnut-c3s', retailer: 'Brewing Gadgets', url: 'https://brewinggadgets.in/products/timemore-chestnut-c3s-coffee-grinder-black', adapter: 'shopify', variantId: 46487914741980, price: 6785, checked: '2026-10-23' },
  { productId: 'kingrinder-k6', retailer: 'Fix Coffee', url: 'https://fixcoffee.shop/products/kingrinder-k6', adapter: 'shopify', variantId: 47225663717535, price: 12999, checked: '2026-10-23' },
  { productId: '1zpresso-q-air', retailer: 'Fix Coffee', url: 'https://fixcoffee.shop/products/1zpresso-q-air-manual-coffee-grinder-ultra-portable-hand-grinder', adapter: 'shopify', variantId: 62473839444127, price: 6499, checked: '2026-10-23' },
  { productId: '1zpresso-k-ultra', retailer: 'Fix Coffee', url: 'https://fixcoffee.shop/products/1zpresso-k-ultra-manual-coffee-grinder', adapter: 'shopify', variantId: 62201993101471, price: 27999, checked: '2026-10-23' },
  { productId: 'comandante-c40-mk4', retailer: 'Brewing Gadgets', url: 'https://brewinggadgets.in/products/comandante-c40-mk4-nitro-blade-coffee-grinder-natural-wood', adapter: 'shopify', variantId: 47000032215260, price: 33925, checked: '2026-10-23' },
  { productId: 'baratza-encore-esp', retailer: 'Brewing Gadgets', url: 'https://brewinggadgets.in/products/baratza-encore-esp-black', adapter: 'shopify', variantId: 45470226120924, price: 23428, checked: '2026-10-23' },
  { productId: 'fellow-ode-gen-2', retailer: 'Brewing Gadgets', url: 'https://brewinggadgets.in/products/fellow-ode-brew-grinder-gen2', adapter: 'shopify', variantId: 47027475644636, price: 52569, checked: '2026-10-23' },
  { productId: 'df64-gen-2', retailer: 'Brewing Gadgets', url: 'https://brewinggadgets.in/products/df64-gen2', adapter: 'shopify', variantId: 46173486055644, price: 43200, checked: '2026-10-23' },
  { productId: 'eureka-mignon-specialita', retailer: 'Coffee Plus', url: 'https://coffeeplus.in/products/eureka-mignon-specialita-grinder', adapter: 'shopify', variantId: 55646803788145, price: 53850, checked: '2026-10-23' },
  { productId: 'timemore-sculptor-078s', retailer: 'Brewing Gadgets', url: 'https://brewinggadgets.in/products/timemore-sculptor-078s-electric-grinder', adapter: 'shopify', variantId: 46923245650140, price: 91450, checked: '2026-10-23' },
  { productId: 'delonghi-dedica-style-ec685', retailer: 'Something’s Brewing', url: 'https://somethingsbrewing.in/products/delonghi-ec685-r-1350-watt-semi-automatic-espresso-coffee-machine-1', adapter: 'shopify', variantId: 48939663393018, price: 20999, checked: '2026-10-23' },
  { productId: 'gaggia-espresso-evolution', retailer: 'Caramelly', url: 'https://caramelly.in/products/gaggia-espresso-evolution-coffee-machine', adapter: 'shopify', variantId: 45873324064990, price: 32999, checked: '2026-10-23' },
  { productId: 'gaggia-classic-pro-e24', retailer: 'Caramelly', url: 'https://caramelly.in/products/gaggia-classic-color-vibes-coffee-machine', adapter: 'shopify', variantId: 44111370584286, price: 64990, checked: '2026-10-23' },
  { productId: 'lelit-anna-pid', retailer: 'Something’s Brewing', url: 'https://somethingsbrewing.in/products/lelit-anna-with-pid-silver-coffee-machine-espresso-machine', adapter: 'shopify', variantId: 40107396759707, price: 67799, checked: '2026-10-23' },
  { productId: 'rancilio-silvia-v6', retailer: 'Something’s Brewing', url: 'https://somethingsbrewing.in/products/rancilio-silvia-v6-coffee-machine', adapter: 'shopify', variantId: 44900955259130, price: 89999, checked: '2026-10-23' },
  { productId: 'delonghi-la-specialista-touch', retailer: 'Caramelly', url: 'https://caramelly.in/products/delonghi-la-specialista-touch-ec9455-m-barista-style-espresso-coffee-machine', adapter: 'shopify', variantId: 47745352827102, price: 65892, checked: '2026-10-23' },
  { productId: 'breville-barista-express', retailer: 'Caramelly', url: 'https://caramelly.in/products/sage-breville-the-barista-express-espresso-machine-ses875', adapter: 'shopify', variantId: 45963179491550, price: 89990, checked: '2026-10-23' },
  { productId: 'lelit-mara-x-v3', retailer: 'Something’s Brewing', url: 'https://somethingsbrewing.in/products/marax3-hx-coffee-machine-bss-220-240-50-type-q', adapter: 'shopify', variantId: 48371674579194, price: 199999, checked: '2026-10-23' },
  { productId: 'la-marzocco-linea-mini', retailer: 'Kaapi Machines', url: 'https://kaapimachines.com/product/la-marzocco-linea-mini/', adapter: 'manual', price: 569000, checked: '2026-10-23' },
  { productId: 'breville-oracle-jet', retailer: 'Caramelly', url: 'https://caramelly.in/products/sage-breville-the-oracle-jet-espresso-machinesage-breville-the-oracle-jet-espresso-machine', adapter: 'shopify', variantId: 46002245042398, price: 349990, checked: '2026-10-23' },
  { productId: 'blue-tokai-attikan-estate', retailer: 'Blue Tokai', url: 'https://bluetokaicoffee.com/products/attikan-estate', adapter: 'shopify', variantId: 40088519901239, price: 700, checked: '2026-10-23' },
  { productId: 'blue-tokai-vienna-roast', retailer: 'Blue Tokai', url: 'https://bluetokaicoffee.com/products/vienna-roast', adapter: 'shopify', variantId: 40085998075959, price: 650, checked: '2026-10-23' },
  { productId: 'blue-tokai-silver-oak-cafe-blend', retailer: 'Blue Tokai', url: 'https://bluetokaicoffee.com/products/silver-oak-cafe-blend', adapter: 'shopify', variantId: 40086457385015, price: 750, checked: '2026-10-23' },
  { productId: 'blue-tokai-dhak-blend', retailer: 'Blue Tokai', url: 'https://bluetokaicoffee.com/products/dhak-blend', adapter: 'shopify', variantId: 40088515084343, price: 700, checked: '2026-10-23' },
  { productId: 'blue-tokai-monsoon-malabar', retailer: 'Blue Tokai', url: 'https://bluetokaicoffee.com/products/monsoon-malabar', adapter: 'shopify', variantId: 35890410824, price: 700, checked: '2026-10-23' },
  { productId: 'black-baza-kaati', retailer: 'Black Baza', url: 'https://blackbazacoffee.com/products/kaati', adapter: 'shopify', variantId: 43095604396214, price: 640, checked: '2026-10-23' },
  { productId: 'black-baza-jumping-ant', retailer: 'Black Baza', url: 'https://blackbazacoffee.com/products/jumping-ant', adapter: 'shopify', variantId: 29899956682831, price: 640, checked: '2026-10-23' },
  { productId: 'araku-high-altitude', retailer: 'Araku Coffee', url: 'https://arakucoffee.in/products/high-altitude', adapter: 'shopify', variantId: 50926189838656, price: 940, checked: '2026-10-23' },
  { productId: 'corridor-seven-barista-forte', retailer: 'Corridor Seven', url: 'https://corridorseven.coffee/products/barista-forte', adapter: 'shopify', variantId: 40218311360535, price: 690, checked: '2026-10-23' },
  { productId: 'corridor-seven-august-rush', retailer: 'Corridor Seven', url: 'https://corridorseven.coffee/products/august-rush', adapter: 'shopify', variantId: 32975705440279, price: 750, checked: '2026-10-23' },
  { productId: 'timemore-black-mirror-basic-2', retailer: 'Bili Hu', url: 'https://bilihu.in/products/timemore-weighing-scale-black-mirror-basic-2', adapter: 'shopify', variantId: 50301984047403, price: 5399, checked: '2026-10-23' },
  { productId: 'timemore-basic-3', retailer: 'Araku Coffee India', url: 'https://www.arakucoffee.in/products/timemore-basic-3-0-electronic-espresso-scale', adapter: 'shopify', variantId: 67753916596544, price: 5280, checked: '2026-10-23' },
  { productId: 'fellow-stagg-ekg-pro', retailer: 'Araku Coffee India', url: 'https://www.arakucoffee.in/products/fellow-stagg-ekg-pro-electric-kettle-0-9l', adapter: 'shopify', variantId: 51758625784128, price: 30800, checked: '2026-10-23' },
  { productId: 'hario-buono-v60-kettle', retailer: 'Araku Coffee India', url: 'https://www.arakucoffee.in/products/hario-buono-v60-kettle-1-2l', adapter: 'shopify', variantId: 45276020932928, price: 4450, checked: '2026-10-23' },
  { productId: 'hario-v60-02-ceramic', retailer: 'Araku Coffee India', url: 'https://www.arakucoffee.in/products/hario-v60-02-ceramic-coffee-dripper-set-white', adapter: 'shopify', variantId: 52876482511168, price: 4480, checked: '2026-10-23' },
  { productId: 'hario-v60-switch-02', retailer: 'Araku Coffee India', url: 'https://www.arakucoffee.in/products/hario-v60-immersion-dripper-switch-size-02', adapter: 'shopify', variantId: 48874625237312, price: 3940, checked: '2026-10-23' },
  { productId: 'aeropress-original', retailer: 'Araku Coffee India', url: 'https://www.arakucoffee.in/products/aeropress-coffee-maker', adapter: 'shopify', variantId: 45188944953664, price: 4000, checked: '2026-10-23' },
  { productId: 'aeropress-go', retailer: 'Araku Coffee India', url: 'https://www.arakucoffee.in/products/aeropress-go-travel-coffee-maker', adapter: 'shopify', variantId: 52876347703616, price: 4880, checked: '2026-10-23' },
  { productId: 'chemex-classic-six-cup', retailer: 'Araku Coffee India', url: 'https://www.arakucoffee.in/products/chemex-6-cup-wooden-collar?variant=45344117981504', adapter: 'shopify', variantId: 45344117981504, price: 4950, checked: '2026-10-23' },
  { productId: 'bialetti-moka-express-3', retailer: 'Sarāca Coffee Roasters', url: 'https://saracacoffee.in/products/bialetti-moka-express', adapter: 'shopify', variantId: 66870209183789, price: 2499, checked: '2026-10-23' },
  { productId: 'origami-dripper', retailer: 'Araku Coffee India', url: 'https://www.arakucoffee.in/products/origami-dripper-1', adapter: 'shopify', variantId: 50540364529984, price: 3550, checked: '2026-10-23' },
];
