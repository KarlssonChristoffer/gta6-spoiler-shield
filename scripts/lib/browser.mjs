// Finds a Chromium-family browser and runs it headless, plus a tiny static
// server. Used by the browser tests and by the asset renderer. No dependencies.
import { execFile, spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { extname, join, normalize, sep } from 'node:path';
import { ROOT, bundle } from './sources.mjs';

const WINDOWS = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
];
const MAC = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
];
const LINUX = ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser', 'microsoft-edge'];

/** Path to Chrome, Edge or Chromium, or null. Set BROWSER_PATH to choose one yourself. */
export function findBrowser() {
  if (process.env.BROWSER_PATH) return process.env.BROWSER_PATH;
  for (const path of [...WINDOWS, ...MAC]) if (existsSync(path)) return path;
  if (process.platform !== 'win32') {
    for (const name of LINUX) {
      const found = spawnSync('which', [name], { encoding: 'utf8' });
      if (found.status === 0 && found.stdout.trim()) return found.stdout.trim();
    }
  }
  return null;
}

/** Runs the browser headless with the given flags and resolves with its stdout. */
export function runHeadless(browser, flags) {
  const profile = mkdtempSync(join(tmpdir(), 'gss-profile-'));
  const args = [
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--hide-scrollbars',
    `--user-data-dir=${profile}`,
    ...(process.env.CI ? ['--no-sandbox'] : []),
    ...flags,
  ];
  return new Promise((resolve, reject) => {
    execFile(browser, args, { maxBuffer: 64 * 1024 * 1024, timeout: 60000 }, (error, stdout) => {
      try {
        rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
      } catch {}
      if (error && !stdout) reject(error);
      else resolve(stdout);
    });
  });
}

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
};

/**
 * Serves the repository on 127.0.0.1 at a free port. /shield.js is the bundled
 * content scripts, built fresh on every request.
 * @returns {Promise<{url: string, close: () => void}>}
 */
export function serveRepo() {
  const server = createServer((req, res) => {
    const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (path === '/shield.js') {
      res.writeHead(200, { 'content-type': TYPES['.js'] });
      return res.end(bundle());
    }
    const file = normalize(join(ROOT, path));
    if (!file.startsWith(ROOT + sep) || !existsSync(file) || !statSync(file).isFile()) {
      res.writeHead(404);
      return res.end('not found');
    }
    res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' });
    // ?bare=1 serves a page without its own copy of the shield, for testing the installed extension.
    if (new URL(req.url, 'http://x').searchParams.has('bare')) {
      return res.end(readFileSync(file, 'utf8').replace('<script src="/shield.js"></script>', ''));
    }
    res.end(readFileSync(file));
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      resolve({ url: `http://127.0.0.1:${server.address().port}`, close: () => server.close() });
    });
  });
}
