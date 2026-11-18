# Contributing

Fixes are welcome, small ones especially. Most of them are one line.

## The one rule

**No spoilers anywhere in this repository.** Not in issues, pull requests, commit messages, tests or comments. Say where something slipped through ("a video tile on the YouTube home page"), never what it said. Test data uses made-up titles like "GTA 6 ending explained".

## Setup

You need [Node.js](https://nodejs.org) 22 or newer and Chrome, Edge or Chromium. There is nothing to install: no `npm install`, no dependencies.

```
npm test
```

That runs the matcher tests, checks that `dist/` is up to date, and opens each page in `test/browser/fixtures/` in a headless browser. If your browser is somewhere unusual, set `BROWSER_PATH` to it.

`npm run test:extension` runs the same pages against `extension/` loaded as a real unpacked extension. It works with Edge and Chromium; branded Chrome no longer allows loading an extension from the command line.

To try your change for real, load the `extension` folder unpacked (see the README) and press the reload arrow on the extensions page after each edit.

## The three usual fixes

### Something slipped through on a site

1. Open DevTools on that page and find the element that wraps the whole post, tile or comment.
2. Add its selector to that site's `cards` in [`extension/src/sites.js`](extension/src/sites.js). For a site that is not listed yet, add a new entry.
3. Add a fixture so it stays fixed. Copy the element's tag and attributes, not its contents, into the matching file in `test/browser/fixtures/` and give it an id that starts with `hit-`:

   ```html
   <new-post-element id="hit-new-layout"><h3>GTA 6 ending explained</h3></new-post-element>
   ```

The test runner needs no code for this. Ids starting with `hit-` must end up hidden, ids starting with `miss-` must stay visible.

### A word is missing

Add it to `strong` in [`extension/src/keywords.js`](extension/src/keywords.js), or to `weak` if it is also an ordinary word. Then add a line to `HIDE` in [`test/unit/matcher.test.js`](test/unit/matcher.test.js), and a line to `KEEP` for the innocent phrase you were worried about.

Only add names that appear in official trailers and marketing. A word list that needs spoilers to be written is a spoiler.

### Something innocent is hidden

Add the innocent phrase to `KEEP` in the matcher test, watch it fail, then tighten the pattern in `keywords.js`. Hiding older GTA games is intended.

## Changing the engine

Read [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) first. Then keep to these:

- Plain JavaScript, no dependencies, no build step for the extension. A person should be able to read all of it before installing it.
- No network requests, ever.
- When unsure, hide. A false alarm costs a click; a miss cannot be undone.
- If you change anything under `extension/src/` or `userscript/`, run `npm run build` and commit the updated `dist/` file. CI checks this.
- New behaviour gets a fixture or a matcher test.

## Pull requests

Keep them to one fix. Say which site and which kind of item, and how you checked it. A screenshot is welcome if it shows the hidden bar and nothing else.
