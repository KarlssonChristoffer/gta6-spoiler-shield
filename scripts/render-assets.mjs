// Renders the images that are committed to the repo, using headless Chrome/Edge:
//
//   extension/icons/icon-{16,32,48,128}.png   from extension/icons/icon.svg
//   docs/demo.png                             from docs/demo/index.html
//
// Run with: npm run assets   (only needed after changing the icon or the demo)
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './lib/sources.mjs';
import { findBrowser, runHeadless, serveRepo } from './lib/browser.mjs';

const browser = findBrowser();
if (!browser) {
  console.error('No Chrome, Edge or Chromium found. Set BROWSER_PATH.');
  process.exit(1);
}

const server = await serveRepo();

// Headless windows have a minimum size, so each icon is drawn in the corner of
// a larger transparent page and cropped by the browser's own screenshot clip.
const svg = readFileSync(join(ROOT, 'extension', 'icons', 'icon.svg'), 'utf8');
for (const size of [16, 32, 48, 128]) {
  const page = join(ROOT, 'docs', 'demo', `.icon-${size}.html`);
  writeFileSync(page, `<!doctype html><style>html,body{margin:0;background:transparent}svg{display:block;width:${size}px;height:${size}px}</style>${svg}`);
  const out = join(ROOT, 'extension', 'icons', `icon-${size}.png`);
  await runHeadless(browser, [
    `--window-size=${size},${size}`,
    '--default-background-color=00000000',
    `--screenshot=${out}`,
    `${server.url}/docs/demo/.icon-${size}.html`,
  ]);
  (await import('node:fs')).rmSync(page);
  console.log(`rendered extension/icons/icon-${size}.png`);
}

await runHeadless(browser, [
  '--window-size=1100,560',
  '--virtual-time-budget=3000',
  `--screenshot=${join(ROOT, 'docs', 'demo.png')}`,
  `${server.url}/docs/demo/`.replace(/\/$/, '/index.html'),
]);
console.log('rendered docs/demo.png');

server.close();
