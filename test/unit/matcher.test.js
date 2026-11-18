// Unit tests for the text matcher. Run with: npm run test:unit
// Keep the examples spoiler-free: made-up titles only.
const { test } = require('node:test');
const assert = require('node:assert/strict');

require('../../extension/src/keywords.js');
require('../../extension/src/matcher.js');
const { keywords, createMatcher } = globalThis.SpoilerShield;

const { isSpoiler } = createMatcher(keywords);

const HIDE = [
  'GTA 6 ending explained',
  'gta6 map',
  'GTA VI first hour',
  '#GTAVI',
  'GTAVI',
  'GTA Ⅵ', // the single-character roman numeral
  'G.T.A. 6',
  'Grand Theft Auto VI review',
  'GrandTheftAuto',
  'Welcome to Vice City',
  'A road trip through Leonida',
  'Rockstar Games statement',
  'Lucía Caminos voice actor',
  "Dre'Quan",
  '/r/GTA6/comments/abc/a_neutral_title',
  'https://example.com/news/gta-6-sales',
  'Jason and Lucia rob a store', // two weak words together
  'Rockstar drops Trailer 3',
];

const KEEP = [
  '',
  'Best pasta recipes',
  'Jason went to the shop', // one weak word alone
  'She is a rockstar developer',
  'Leonidas of Sparta',
  'Install gtag on your site',
  'megtastic',
  'A vice-president visits the city council',
  'Stagtalent agency',
];

for (const text of HIDE) {
  test(`hides: ${text}`, () => assert.equal(isSpoiler(text), true));
}

for (const text of KEEP) {
  test(`keeps: ${text || '(empty)'}`, () => assert.equal(isSpoiler(text), false));
}

test('extra words from the user are matched whole, with or without punctuation', () => {
  const custom = createMatcher({ ...keywords, extra: 'half-life, Red Dead\nportal' });
  assert.equal(custom.isSpoiler('Half Life 3 confirmed'), true);
  assert.equal(custom.isSpoiler('red   dead online'), true);
  assert.equal(custom.isSpoiler('Portal speedrun'), true);
  assert.equal(custom.isSpoiler('important news'), false); // "portal" must not match inside "important"
});

test('extra words cannot break the pattern', () => {
  const custom = createMatcher({ ...keywords, extra: 'c++ (beta)' });
  assert.equal(custom.isSpoiler('nothing here'), false);
});
