// The toolbar popup, also used as the options page. It only reads and writes
// settings; every open tab picks the change up through settings.onChange.
(async () => {
  'use strict';
  const { load, save } = globalThis.SpoilerShield.settings;
  const ext = globalThis.browser ?? globalThis.chrome;
  const $ = (id) => document.getElementById(id);

  const settings = await load();
  $('enabled').checked = settings.enabled;
  $('hard').checked = settings.hard;
  $('extra').value = settings.extra;

  // "Pause on this site" only makes sense when the popup sits over a web page.
  let host = '';
  try {
    const [tab] = await ext.tabs.query({ active: true, currentWindow: true });
    const url = new URL(tab.url);
    if (url.protocol === 'http:' || url.protocol === 'https:') host = url.hostname;
  } catch {}
  if (host) {
    $('siteRow').hidden = false;
    $('siteLabel').textContent = 'Pause on ' + host;
    $('siteOff').checked = settings.off.includes(host);
  }

  $('enabled').addEventListener('change', (e) => save({ enabled: e.target.checked }));
  $('hard').addEventListener('change', (e) => save({ hard: e.target.checked }));
  $('siteOff').addEventListener('change', (e) => {
    const off = settings.off.filter((h) => h !== host);
    if (e.target.checked) off.push(host);
    settings.off = off;
    save({ off });
  });

  let timer;
  $('extra').addEventListener('input', (e) => {
    clearTimeout(timer);
    timer = setTimeout(() => save({ extra: e.target.value }), 400);
  });
})();
