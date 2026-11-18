// One source of truth for which files make up the shield and in what order:
// the content_scripts list in extension/manifest.json. The userscript build,
// the test server and the demo all read it from here.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const EXTENSION = join(ROOT, 'extension');

export const manifest = () => JSON.parse(readFileSync(join(EXTENSION, 'manifest.json'), 'utf8'));

const read = (path) => readFileSync(path, 'utf8').replace(/\r\n/g, '\n').trimEnd();

/** The content scripts joined into one script, as the browser would run them. */
export function bundle(extraFiles = []) {
  const files = manifest()
    .content_scripts[0].js.map((file) => join(EXTENSION, file))
    .concat(extraFiles);
  return files.map(read).join('\n\n') + '\n';
}
