// The full-page cover. When the address or the title of a page is itself a
// spoiler (a GTA 6 video, a GTA subreddit, a search for it), hiding single
// posts is pointless, so the whole page goes behind one opaque layer.
(() => {
  'use strict';
  const SS = (globalThis.SpoilerShield ??= {});

  const COVER_ID = 'gta6-shield-cover';

  /**
   * @param {{isSpoiler: (text: string) => boolean, isHard: () => boolean, label: string}} options
   */
  function createPageCover({ isSpoiler, isHard, label }) {
    const dismissed = new Set();

    const pageKey = () => location.pathname + location.search;

    function wasDismissed() {
      if (dismissed.has(pageKey())) return true;
      try {
        return sessionStorage.getItem('gss-ok:' + pageKey()) === '1';
      } catch {
        return false;
      }
    }

    function pageIsSpoiler() {
      let url = location.href.split('#')[0];
      try {
        url = decodeURIComponent(url);
      } catch {}
      return isSpoiler(url + ' ' + document.title);
    }

    function button(text, primary, onClick) {
      const b = document.createElement('button');
      b.textContent = text;
      b.style.cssText =
        'font:600 14px system-ui,sans-serif;padding:10px 18px;border-radius:8px;cursor:pointer;border:1px solid #3a3d45;' +
        (primary ? 'background:#e8e9ec;color:#0e0f11;' : 'background:transparent;color:#a9adb6;');
      b.addEventListener('click', onClick);
      return b;
    }

    // Built with createElement, not innerHTML: YouTube enforces Trusted Types.
    function show() {
      if (document.getElementById(COVER_ID) || !document.documentElement) return;
      const cover = document.createElement('div');
      cover.id = COVER_ID;
      cover.style.cssText =
        'position:fixed;inset:0;z-index:2147483647;background:#0e0f11;color:#e8e9ec;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;font:16px system-ui,sans-serif;text-align:center;padding:24px;';

      const heading = document.createElement('div');
      heading.textContent = `This page looks like ${label}`;
      heading.style.cssText = 'font:700 24px system-ui,sans-serif;';

      const note = document.createElement('div');
      note.textContent = 'Covered before you could read anything.';
      note.style.cssText = 'color:#8b8f98;max-width:420px;';

      const buttons = document.createElement('div');
      buttons.style.cssText = 'display:flex;gap:10px;margin-top:8px;';
      if (window.top === window) buttons.append(button('Go back', true, () => history.back()));
      if (!isHard()) {
        buttons.append(
          button('Show anyway', false, () => {
            dismissed.add(pageKey());
            try {
              sessionStorage.setItem('gss-ok:' + pageKey(), '1');
            } catch {}
            cover.remove();
          })
        );
      }

      cover.append(heading, note, buttons);
      document.documentElement.append(cover);
    }

    function remove() {
      document.getElementById(COVER_ID)?.remove();
    }

    /** Called on a timer: single-page apps change address and title without reloading. */
    function check() {
      if (!wasDismissed() && pageIsSpoiler()) {
        show();
        // The cover hides the picture, not the sound.
        for (const media of document.querySelectorAll('video, audio')) {
          try {
            if (!media.paused) media.pause();
          } catch {}
        }
      } else {
        remove();
      }
    }

    return { check, remove };
  }

  SS.COVER_ID = COVER_ID;
  SS.createPageCover = createPageCover;
})();
