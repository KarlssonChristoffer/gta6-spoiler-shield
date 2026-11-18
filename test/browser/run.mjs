// Browser tests. Run with: npm run test:browser
//
// Every .html file in fixtures/ is opened in headless Chrome or Edge with the
// shield loaded. The fixture itself says what should happen:
//
//   an element whose id starts with "hit-"   must end up hidden
//   an element whose id starts with "miss-"  must stay visible
//   <meta name="expect-cover" content="yes"> the full-page cover must appear
//   <meta name="test-query" content="q=...">  open the page with this query string
//
// So adding a test is adding a line of HTML.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { EXTENSION, ROOT } from '../../scripts/lib/sources.mjs';
import { findBrowser, runHeadless, serveRepo } from '../../scripts/lib/browser.mjs';

const FIXTURES = join(ROOT, 'test', 'browser', 'fixtures');
const COVER_ID = 'gta6-shield-cover';

const browser = findBrowser();
if (!browser) {
  console.error('No Chrome, Edge or Chromium found. Set BROWSER_PATH to run the browser tests.');
  process.exit(process.env.CI ? 1 : 0);
}

const meta = (html, name) => html.match(new RegExp(`<meta name="${name}" content="([^"]*)"`))?.[1];

const server = await serveRepo();
let failures = 0;
let checks = 0;

// --extension: load extension/ as a real unpacked extension instead of a script
// tag. This checks the manifest wiring. Fixtures that fake a hostname or a
// userscript manager are skipped, because an extension cannot see page variables.
// Works in Edge and Chromium; branded Chrome no longer accepts --load-extension.
const asExtension = process.argv.includes('--extension');
const extensionFlags = asExtension ? [`--load-extension=${EXTENSION}`] : [];

for (const file of readdirSync(FIXTURES).filter((f) => f.endsWith('.html')).sort()) {
  const source = readFileSync(join(FIXTURES, file), 'utf8');
  if (asExtension && /__spoilerShieldTestHost|GM_getValue/.test(source)) continue;
  const query = [meta(source, 'test-query'), asExtension ? 'bare=1' : ''].filter(Boolean).join('&');
  const url = `${server.url}/test/browser/fixtures/${file}${query ? '?' + query : ''}`;
  const dump = await runHeadless(browser, [...extensionFlags, '--virtual-time-budget=4000', '--dump-dom', url]);
  // Inline scripts can contain HTML in strings; that is not the page.
  const dom = dump.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
  const problems = [];

  let seen = 0;
  for (const [tag, id] of dom.matchAll(/<[a-z][^>]*\sid="((?:hit|miss)-[^"]+)"[^>]*>/gi)) {
    seen++;
    const hidden = /data-gss="(?:hide|blur)"/.test(tag);
    if (id.startsWith('hit-') && !hidden) problems.push(`${id} should be hidden but is visible`);
    if (id.startsWith('miss-') && hidden) problems.push(`${id} should be visible but is hidden`);
  }

  const expectCover = meta(source, 'expect-cover');
  if (expectCover) {
    seen++;
    const covered = dom.includes(`id="${COVER_ID}"`);
    if ((expectCover === 'yes') !== covered) problems.push(`page cover should be ${expectCover === 'yes' ? 'shown' : 'absent'}`);
  }

  if (!seen) problems.push('nothing to check: no hit-/miss- ids and no expect-cover (did the page load?)');

  checks += seen;
  failures += problems.length;
  console.log(`${problems.length ? 'FAIL' : 'ok  '} ${file} (${seen} checks)`);
  for (const problem of problems) console.log('       ' + problem);
}

server.close();
console.log(failures ? `\n${failures} of ${checks} checks failed` : `\nall ${checks} checks passed`);
process.exit(failures ? 1 : 0);
