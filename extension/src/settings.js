// Settings, stored wherever the script happens to be running:
//   - as a browser extension: extension storage
//   - as a userscript: the userscript manager's storage (GM_getValue / GM_setValue)
//   - loaded with a plain <script> tag (tests, demo): defaults only
(() => {
  'use strict';
  const SS = (globalThis.SpoilerShield ??= {});

  const DEFAULTS = Object.freeze({
    enabled: true, // master switch
    hard: false, // hard mode: no click-to-show
    extra: '', // the user's own words, one per line or comma separated
    off: [], // hostnames where the shield is paused
  });

  const ext = globalThis.browser ?? globalThis.chrome;
  const extStore = ext?.storage?.local;
  const hasGM = typeof GM_getValue === 'function' && typeof GM_setValue === 'function';
  const GM_KEY = 'settings';

  async function load() {
    try {
      if (extStore) return { ...DEFAULTS, ...(await extStore.get({ ...DEFAULTS })) };
      if (hasGM) return { ...DEFAULTS, ...JSON.parse(GM_getValue(GM_KEY, '{}')) };
    } catch {
      // Unreadable settings must never leave spoilers visible: fall back to defaults.
    }
    return { ...DEFAULTS };
  }

  async function save(patch) {
    if (extStore) return extStore.set(patch);
    if (hasGM) GM_setValue(GM_KEY, JSON.stringify({ ...(await load()), ...patch }));
  }

  /** Calls back with the full settings whenever they change, also from another tab. */
  function onChange(callback) {
    if (extStore) {
      ext.storage.onChanged.addListener((_changes, area) => {
        if (area === 'local') load().then(callback);
      });
    } else if (hasGM && typeof GM_addValueChangeListener === 'function') {
      GM_addValueChangeListener(GM_KEY, () => load().then(callback));
    }
  }

  SS.settings = { DEFAULTS, load, save, onChange };
})();
