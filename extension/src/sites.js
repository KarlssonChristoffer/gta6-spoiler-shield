// Site adapters.
//
// An adapter is a hostname pattern plus a CSS selector for that site's
// "cards": one post, one video tile, one comment. When a card's text is a
// spoiler the whole card collapses into a bar, thumbnail included.
//
// Sites without an adapter still work: matching text is blurred (see
// shield.js). An adapter only makes the result tidier.
//
// Sites rename their elements a few times a year. If something slips through,
// open DevTools, find the element that wraps the whole post and add its
// selector here, with a fixture in test/browser/fixtures/.
(() => {
  'use strict';
  const SS = (globalThis.SpoilerShield ??= {});

  const SITES = [
    {
      name: 'reddit',
      host: /(^|\.)reddit\.com$/,
      cards: [
        'shreddit-post',
        'shreddit-comment',
        'shreddit-ad-post',
        'reddit-pdp-right-rail-post',
        'community-highlight-card',
        '[data-testid="search-post-unit"]',
        '[data-testid="search-community"]',
        '.thing', // old.reddit.com posts and comments
        '.search-result',
      ],
    },
    {
      name: 'youtube',
      host: /(^|\.)youtube\.com$/,
      cards: [
        'ytd-rich-item-renderer',
        'ytd-video-renderer',
        'ytd-compact-video-renderer',
        'ytd-grid-video-renderer',
        'ytd-playlist-renderer',
        'ytd-radio-renderer',
        'ytd-channel-renderer',
        'ytd-movie-renderer',
        'ytd-reel-item-renderer',
        'ytd-reel-video-renderer',
        'ytd-playlist-video-renderer',
        'ytd-playlist-panel-video-renderer',
        'ytd-comment-thread-renderer',
        'ytd-notification-renderer',
        'ytd-post-renderer',
        'ytd-backstage-post-thread-renderer',
        'yt-lockup-view-model',
        'ytm-shorts-lockup-view-model',
        'ytm-shorts-lockup-view-model-v2',
        '.ytp-videowall-still', // end-of-video suggestions
        '.ytp-ce-element',
        // m.youtube.com
        'ytm-rich-item-renderer',
        'ytm-video-with-context-renderer',
        'ytm-compact-video-renderer',
        'ytm-comment-thread-renderer',
        'ytm-reel-item-renderer',
      ],
    },
    {
      name: 'instagram',
      host: /(^|\.)instagram\.com$/,
      cards: ['article', 'main a[href*="/p/"]:not(article a)', 'main a[href*="/reel/"]:not(article a)'],
    },
    {
      name: 'x',
      host: /(^|\.)(x|twitter)\.com$/,
      cards: ['article[data-testid="tweet"]', '[data-testid="trend"]', '[data-testid="UserCell"]'],
    },
  ];

  SS.sites = {
    list: SITES,
    /** Returns { name, selector } for a hostname, or null when there is no adapter. */
    forHost(hostname) {
      const site = SITES.find((s) => s.host.test(hostname));
      return site ? { name: site.name, selector: site.cards.join(',') } : null;
    },
  };
})();
