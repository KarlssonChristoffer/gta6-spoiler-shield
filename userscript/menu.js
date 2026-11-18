// Userscript only: a userscript has no popup, so the same four settings go in
// the userscript manager's menu (click the Violentmonkey / Tampermonkey icon).
(() => {
  'use strict';
  const SS = globalThis.SpoilerShield;
  if (typeof GM_registerMenuCommand !== 'function' || !SS?.shield || window.top !== window) return;

  const { shield, settings: store } = SS;

  function toast(message) {
    const el = document.createElement('div');
    el.textContent = 'Spoiler Shield: ' + message;
    el.style.cssText =
      'position:fixed;right:16px;bottom:16px;z-index:2147483647;background:#16171a;color:#e8e9ec;border:1px solid #33363d;border-radius:8px;padding:10px 14px;font:600 13px system-ui,sans-serif;';
    document.documentElement.append(el);
    setTimeout(() => el.remove(), 2200);
  }

  async function change(patch, message) {
    await store.save(patch);
    shield.apply({ ...shield.settings, ...patch });
    toast(message);
  }

  GM_registerMenuCommand('Shield on / off', () => {
    const enabled = !shield.settings.enabled;
    change({ enabled }, enabled ? 'on' : 'off everywhere');
  });

  GM_registerMenuCommand('Pause / resume on this site', () => {
    const paused = shield.settings.off.includes(shield.host);
    const off = shield.settings.off.filter((h) => h !== shield.host);
    if (!paused) off.push(shield.host);
    change({ off }, paused ? 'back on for ' + shield.host : 'paused on ' + shield.host);
  });

  GM_registerMenuCommand('Hard mode on / off', () => {
    const hard = !shield.settings.hard;
    change({ hard }, hard ? 'hard mode on, no click-to-show' : 'hard mode off');
  });

  GM_registerMenuCommand('Extra words to hide…', () => {
    const current = shield.settings.extra.replace(/\n+/g, ', ');
    const answer = prompt('Extra words to hide, separated by commas:', current);
    if (answer !== null) change({ extra: answer }, 'words saved');
  });
})();
