# Architecture

Read this before changing how the shield finds or hides things. To add a word or a site selector you only need [CONTRIBUTING.md](../CONTRIBUTING.md).

## Files

```
extension/                 the browser extension; load this folder unpacked, no build step
  manifest.json            lists the scripts below, in the order they run
  src/
    keywords.js            the word lists                         (data)
    sites.js               per-site "card" selectors              (data)
    matcher.js             text -> spoiler or not                 (no DOM, unit tested)
    settings.js            load / save / watch settings           (extension, userscript or none)
    page-cover.js          the full-page cover
    shield.js              watches the page and hides things      (the engine)
  popup/                   toolbar popup, also the options page
  icons/
userscript/menu.js         userscript-only settings menu
dist/                      the built userscript (committed, so it can be installed from GitHub)
scripts/build.mjs          builds dist/ from extension/src + userscript/menu.js
scripts/render-assets.mjs  renders the icons and docs/demo.png
test/unit/                 matcher tests, run in Node
test/browser/              fixture pages, run in headless Chrome or Edge
pihole/                    optional network-level deny list
```

The scripts share one object, `globalThis.SpoilerShield`. Each file adds its part to it. That is all the module system there is: content scripts cannot be ES modules, and this way the same files run unchanged as an extension, as a userscript, from a `<script>` tag in the tests, and in Node.

`extension/manifest.json` is the single list of which files make up the shield and in which order. The userscript build and the test server read it from there.

## What happens on a page

```
page loads or changes
        |
        v
MutationObserver ------> scan(node)
                            |
          inside a known card? (sites.js)
             |                         |
            yes                        no
             |                         |
      judge the card            scanGeneric: check each text node,
      as a whole                image description and link address
             |                         |
       spoiler?                  spoiler? -> pickBlock: grow to the
             |                              smallest block that looks
     data-gss="hide"                        like one item
     (collapses to a bar)                   |
                                    data-gss="blur"

every 700 ms: is the address or the title a spoiler? -> full-page cover
```

Hiding is only an attribute. `shield.js` sets `data-gss` on an element and one injected stylesheet does the rest. Nothing is removed from the page and nothing is inserted into it apart from that stylesheet and the page cover, so the site's own scripts keep working.

## Decisions worth knowing

**Checking happens inside the MutationObserver callback, with no delay.** Browsers run those callbacks before painting. Debouncing would be cheaper and would let spoilers flash on screen for a frame, which defeats the point.

**Cards exclude the cards nested inside them.** A comment thread nests replies inside the parent comment. When a card's text is collected, nested cards are skipped, so a reply about the game hides that reply and not the whole thread above it.

**Marks follow the text, not the element.** YouTube reuses the same element for a different video as you scroll and navigate. Every change inside a marked element re-runs the decision, and the mark is removed if the text is no longer a spoiler. A revealed item stays revealed only while its text is unchanged.

**Two ways of hiding.** A known card collapses into a bar because we know its edges. On unknown sites we can only guess the edges, and collapsing a wrong guess could take half a page away, so the guess is blurred in place instead. A wrong blur is ugly; a wrong collapse breaks the site.

**Link addresses count as text, without the query string.** A post titled "look at this" that links to `/r/GTA6/...` is a spoiler. Query strings are dropped because they are full of random ids that occasionally spell something.

**The word match is strict at both ends.** `gta` matches `gta6`, `#gta` and `gta_6`, and does not match `megtastic` or `gtag`. See the comment in `matcher.js` and the cases in `test/unit/matcher.test.js`.

**Failing closed.** If settings cannot be read, defaults apply and the shield is on. The shield starts on defaults before settings have loaded, then adjusts.

## Limits that are by design

- Open shadow roots are not scanned. The sites covered today keep post text in the regular DOM or in attributes.
- Images and audio are never analysed. That would need a model and network access, and the promise in the README is that this code talks to nobody.
- Canvas-rendered apps are invisible to it.
