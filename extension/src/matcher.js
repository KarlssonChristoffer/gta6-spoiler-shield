// Decides whether a piece of text is a spoiler. No DOM in here, so it runs in
// Node for the unit tests (test/unit/matcher.test.js).
(() => {
  'use strict';
  const SS = (globalThis.SpoilerShield ??= {});

  const MAX_LENGTH = 20000;

  /** Lower-case, strip accents and apostrophes, turn URL and hashtag punctuation into spaces. */
  function normalize(text) {
    return text
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[̀-ͯ'’`]/g, '')
      .replace(/[_\-+./#:|]+/g, ' ');
  }

  const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  /** The user's extra words: plain text, one per line or comma separated. */
  function extraPatterns(extra) {
    return String(extra || '')
      .split(/[\n,]/)
      .map((word) => normalize(word).trim())
      .filter((word) => word.length > 1)
      .map((word) => escapeRegExp(word).replace(/\s+/g, '\\s+'));
  }

  /**
   * @param {{strong: string[], weak?: string[], weakThreshold?: number, extra?: string}} options
   * @returns {{isSpoiler: (text: string) => boolean}}
   */
  function createMatcher({ strong, weak = [], weakThreshold = 2, extra = '' }) {
    // A pattern must start at a word boundary and must not run into another
    // letter: "gta" matches "gta6" and "#gta" but not "megtastic" or "gtag".
    const strongRe = new RegExp(
      '(?<![a-z0-9])(?:' +
        strong
          .concat(extraPatterns(extra))
          .map((p) => p + '(?![a-z])')
          .join('|') +
        ')'
    );
    const weakRes = weak.map((p) => new RegExp('(?<![a-z0-9])(?:' + p + ')(?![a-z0-9])'));

    function isSpoiler(text) {
      if (!text || text.length < 3) return false;
      const t = normalize(text.length > MAX_LENGTH ? text.slice(0, MAX_LENGTH) : text);
      if (strongRe.test(t)) return true;
      let hits = 0;
      for (const re of weakRes) if (re.test(t) && ++hits >= weakThreshold) return true;
      return false;
    }

    return { isSpoiler };
  }

  SS.normalize = normalize;
  SS.createMatcher = createMatcher;
})();
