// The engine: watches the page, finds spoiler text, hides what contains it.
// Loaded last. docs/ARCHITECTURE.md explains the flow.
(() => {
  'use strict';
  const SS = globalThis.SpoilerShield;
  if (!SS || SS.shield) return; // already running in this frame

  // Tests and the demo page pretend to be another site with this.
  const host = globalThis.__spoilerShieldTestHost || location.hostname;
  const site = SS.sites.forHost(host);
  const label = SS.keywords.label;

  // Attributes that carry text a person can see or that name where a link goes.
  const TEXT_ATTRS = ['alt', 'title', 'aria-label', 'href', 'post-title', 'subreddit-prefixed-name', 'permalink', 'content-href'];
  const WATCHED_ATTRS = ['alt', 'title', 'aria-label', 'href', 'post-title'];
  const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'INPUT', 'SELECT', 'TITLE', 'HEAD', 'META', 'LINK']);
  const INLINE_TAGS = new Set(['A', 'SPAN', 'B', 'I', 'EM', 'STRONG', 'MARK', 'FONT', 'SMALL', 'CODE', 'U', 'IMG', 'PICTURE', 'SVG', 'YT-FORMATTED-STRING']);
  const PAGE_TAGS = new Set(['BODY', 'HTML', 'MAIN']); // never hide these
  const NATURAL_BLOCKS = 'article, li, tr, figure, blockquote, dd, [role="article"], [role="listitem"]';
  const STYLE_ID = 'gta6-shield-style';

  // data-gss="hide"  a site card, collapsed into a bar
  // data-gss="blur"  a block on any other site, blurred in place
  // data-gss="shown" revealed by a click
  const MARK = 'data-gss';
  const CSS = `
[${MARK}="hide"]{display:block!important;position:relative!important;overflow:hidden!important;box-sizing:border-box!important;padding:0!important;height:40px!important;min-height:40px!important;max-height:40px!important;visibility:hidden!important}
[${MARK}="hide"] *{visibility:hidden!important}
[${MARK}="hide"]::before{content:"${label} hidden · click to show";visibility:visible!important;position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font:600 12px/1 system-ui,sans-serif;letter-spacing:.02em;color:#8b8f98;background:#16171a;border:1px dashed #33363d;border-radius:8px;cursor:pointer;z-index:2147483646;box-sizing:border-box}
[${MARK}="blur"]{filter:blur(10px)!important;cursor:pointer!important;user-select:none!important}
[${MARK}="blur"] *{pointer-events:none!important}
html[data-gss-hard] [${MARK}="hide"]::before{content:"${label} hidden";cursor:default}
html[data-gss-hard] [${MARK}="blur"]{cursor:default!important}
`;

  let settings = { ...SS.settings.DEFAULTS };
  let matcher = null;
  let observer = null;
  let coverTimer = null;
  let running = false;

  const cardQueue = new Set(); // site cards waiting to be judged
  const signatures = new WeakMap(); // element -> text it was judged on
  const blurred = new WeakSet(); // elements marked by the generic path

  const cover = SS.createPageCover({
    isSpoiler: (text) => matcher.isSpoiler(text),
    isHard: () => settings.hard,
    label,
  });

  // ---------- reading text ----------

  function attributeText(el) {
    let out = '';
    for (const name of TEXT_ATTRS) {
      let value = el.getAttribute(name);
      if (!value) continue;
      if (name === 'href') {
        value = value.split(/[?#]/)[0]; // query strings are full of random ids
        try {
          value = decodeURIComponent(value);
        } catch {}
      }
      out += ' ' + value;
    }
    return out;
  }

  // Everything a card says: its text, its image descriptions, where its links
  // go. Cards nested inside it are left out, so a reply about GTA hides the
  // reply and not the comment it answers.
  function textOf(root, nestedSelector) {
    let out = attributeText(root);
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (node.nodeType !== Node.ELEMENT_NODE) return NodeFilter.FILTER_ACCEPT;
        if (SKIP_TAGS.has(node.tagName)) return NodeFilter.FILTER_REJECT;
        if (nestedSelector && node.matches(nestedSelector)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    let node;
    while ((node = walker.nextNode()) && out.length < 20000) {
      out += node.nodeType === Node.TEXT_NODE ? ' ' + node.nodeValue : attributeText(node);
    }
    return out;
  }

  // ---------- hiding ----------

  // Decide for one element, and undo an earlier decision if its text changed.
  // Sites like YouTube reuse the same element for a different video.
  function judge(el, mode, nestedSelector) {
    const text = textOf(el, nestedSelector);
    const current = el.getAttribute(MARK);

    if (!matcher.isSpoiler(text)) {
      if (current) {
        el.removeAttribute(MARK);
        signatures.delete(el);
        blurred.delete(el);
      }
      return;
    }

    const signature = text.length + ':' + text.slice(0, 200);
    if (current && signatures.get(el) === signature) return; // same text: keep it hidden, or revealed
    signatures.set(el, signature);
    el.setAttribute(MARK, mode);
    for (const video of el.querySelectorAll('video')) {
      try {
        video.pause();
      } catch {}
    }
  }

  // No adapter for this site, so guess how much to blur: start at the element
  // holding the text and grow to the smallest block that looks like one item.
  function pickBlock(el) {
    while (
      INLINE_TAGS.has(el.tagName.toUpperCase()) &&
      el.parentElement &&
      !PAGE_TAGS.has(el.parentElement.tagName) &&
      el.parentElement.textContent.length <= 3000
    ) {
      el = el.parentElement;
    }
    const natural = el.closest(NATURAL_BLOCKS);
    if (natural && natural.textContent.length <= 1500) return natural;
    // Climb while the parent is still small: this pulls in a card's thumbnail.
    while (el.parentElement && !PAGE_TAGS.has(el.parentElement.tagName) && el.parentElement.textContent.length <= 400) {
      el = el.parentElement;
    }
    return PAGE_TAGS.has(el.tagName) ? null : el;
  }

  function blurAround(el) {
    const block = pickBlock(el);
    if (!block) return;
    blurred.add(block);
    judge(block, 'blur', null);
  }

  function checkTextNode(node) {
    const text = node.nodeValue;
    if (text.length < 3 || !matcher.isSpoiler(text)) return;
    const parent = node.parentElement;
    if (parent && !parent.closest(`[${MARK}]`)) blurAround(parent);
  }

  function checkAttributes(el) {
    const text = attributeText(el);
    if (text.length > 4 && matcher.isSpoiler(text) && !el.closest(`[${MARK}]`)) blurAround(el);
  }

  function scanGeneric(root) {
    if (root.nodeType === Node.TEXT_NODE) return checkTextNode(root);
    if (SKIP_TAGS.has(root.tagName)) return;
    checkAttributes(root);
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (node.nodeType !== Node.ELEMENT_NODE) return NodeFilter.FILTER_ACCEPT;
        if (SKIP_TAGS.has(node.tagName) || node.id === SS.COVER_ID || node.isContentEditable || node.hasAttribute(MARK)) {
          return NodeFilter.FILTER_REJECT;
        }
        if (site && node.matches(site.selector)) return NodeFilter.FILTER_REJECT; // cards have their own path
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    let node;
    while ((node = walker.nextNode())) {
      if (node.nodeType === Node.TEXT_NODE) checkTextNode(node);
      else checkAttributes(node);
    }
  }

  // ---------- watching the page ----------

  // Entry point for anything new or changed: an element, or a text node.
  function scan(node) {
    const el = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
    if (!el || !el.isConnected || el.isContentEditable || el.closest('#' + SS.COVER_ID)) return;
    if (SKIP_TAGS.has(el.tagName)) return; // text inside <script>, <style>, <textarea>...

    if (site) {
      if (node.nodeType === Node.ELEMENT_NODE) for (const card of el.querySelectorAll(site.selector)) cardQueue.add(card);
      const card = el.closest(site.selector);
      if (card) {
        cardQueue.add(card);
        return;
      }
    }

    const marked = el.closest(`[${MARK}]`);
    if (marked) {
      if (blurred.has(marked)) judge(marked, 'blur', null); // its text changed: look again
      return;
    }
    scanGeneric(node);
  }

  function judgeQueuedCards() {
    for (const card of cardQueue) if (card.isConnected) judge(card, 'hide', site.selector);
    cardQueue.clear();
  }

  // Runs synchronously inside the MutationObserver callback, which the browser
  // calls before it paints. That is why hidden posts never flash on screen.
  function onMutations(records) {
    for (const record of records) {
      if (record.type === 'childList') {
        for (const node of record.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE || node.nodeType === Node.TEXT_NODE) scan(node);
        }
      } else {
        scan(record.target);
      }
    }
    if (cardQueue.size) judgeQueuedCards();
  }

  function onClick(event) {
    const el = event.target instanceof Element ? event.target.closest(`[${MARK}="hide"],[${MARK}="blur"]`) : null;
    if (!el) return;
    // The click must not open the hidden link, in either mode.
    event.preventDefault();
    event.stopImmediatePropagation();
    if (!settings.hard) el.setAttribute(MARK, 'shown');
  }

  // ---------- on / off ----------

  function start() {
    const root = document.documentElement;
    if (!root) {
      // Userscript managers can run before <html> exists.
      new MutationObserver((_records, self) => {
        if (!document.documentElement) return;
        self.disconnect();
        apply();
      }).observe(document, { childList: true });
      return;
    }
    running = true;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = CSS;
    (document.head || root).append(style);
    root.toggleAttribute('data-gss-hard', !!settings.hard);

    observer = new MutationObserver(onMutations);
    observer.observe(document, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: WATCHED_ATTRS,
    });
    document.addEventListener('click', onClick, true);

    scan(root);
    if (cardQueue.size) judgeQueuedCards();
    cover.check();
    coverTimer = setInterval(cover.check, 700);
  }

  function stop() {
    if (!running) return;
    running = false;
    observer.disconnect();
    clearInterval(coverTimer);
    document.removeEventListener('click', onClick, true);
    cardQueue.clear();
    for (const el of document.querySelectorAll(`[${MARK}]`)) el.removeAttribute(MARK);
    document.getElementById(STYLE_ID)?.remove();
    document.documentElement?.removeAttribute('data-gss-hard');
    cover.remove();
  }

  /** (Re)start with the given settings. Old marks are dropped so new words and modes take effect. */
  function apply(next) {
    if (next) settings = next;
    matcher = SS.createMatcher({ ...SS.keywords, extra: settings.extra });
    stop();
    if (settings.enabled && !settings.off.includes(host)) start();
  }

  function applyIfChanged(next) {
    if (JSON.stringify(next) !== JSON.stringify(settings)) apply(next);
  }

  SS.shield = {
    host,
    apply,
    get settings() {
      return settings;
    },
  };

  // Start on defaults straight away so nothing shows while settings load.
  apply();
  SS.settings.load().then(applyIfChanged);
  SS.settings.onChange(applyIfChanged);
})();
