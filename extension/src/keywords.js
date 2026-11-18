// What counts as a spoiler.
//
// Every entry is a piece of a regular expression. It is matched against
// normalised text (see matcher.js): lower-case, accents removed, and
// _ - + . / # : | turned into spaces. So write entries in lower-case and use
// \\s* or \\s+ where people might or might not type a space.
//
// Forking this for another game? This file is the only one you have to change.
(() => {
  'use strict';
  const SS = (globalThis.SpoilerShield ??= {});

  SS.keywords = {
    // Shown on the bar that replaces a hidden post.
    label: 'GTA 6',

    // One hit is enough to hide.
    strong: [
      'gta', // also catches gta6, gta 6, #gta6: anything where "gta" is not followed by a letter
      'gta\\s*(?:vi|six)',
      'g\\s+t\\s+a\\s+(?:6|vi)', // "G.T.A. 6"
      'grand\\s*theft\\s*auto',
      'vice\\s*city',
      'leonida',
      'rockstar\\s*games',
      'rockstar\\s*north',
      // Names from the official trailers.
      'jason\\s+duval',
      'lucia\\s+caminos',
      'cal\\s+hampton',
      'boobie\\s+ike',
      'dre\\s*quan',
      'real\\s+dimez',
      'raul\\s+bautista',
      'brian\\s+heder',
      'port\\s+gellhorn',
      'grassrivers',
      'mount\\s+kalaga',
    ],

    // Ordinary words. A block of text is hidden only when it contains at least
    // `weakThreshold` different ones, so "Jason went to the shop" stays visible
    // and "Jason and Lucia rob a store" does not.
    weak: ['rockstar', 'jason', 'lucia', 'duval', 'caminos', 'take\\s*two', 'ambrosia', 'trailer\\s*[23]'],
    weakThreshold: 2,
  };
})();
