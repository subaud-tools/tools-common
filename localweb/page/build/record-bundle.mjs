// The record bundle's build, shared by every family page tool whose Record
// downloads as one file (from diazo's web/build-record.mjs): copied from
// tools-common (localweb/page/build/) by the tool's build and checked against
// the version it pins, so edit it there.
//
// A served page loads the kit from /_kit/; a file opened from disk has no
// server. So the tool's record entry is bundled with the kit inlined (each
// /_kit/<file> resolved to the kit in the tools-common module the tool's
// go.mod pins), and its stylesheet after the kit's. The tool then writes one
// HTML file with both inlined and its data in
// <script type="application/json" id="<id>">, which the entry reads back with
// the kit's embeddedData(id). What the file carries is the tool's.
//
//   import { recordBundle } from './build/record-bundle.mjs';
//   await recordBundle({ entry: 'record-entry.ts', css: 'diazo.css',
//     outdir: '../internal/serve/assets' });
//
// writes <outdir>/record.js and <outdir>/record.css. esbuild is the tool's own
// devDependency.

import { execFileSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { build } from 'esbuild';

/** The kit's assets in the tools-common module the tool's go.mod pins. */
export function kitAssets(cwd = process.cwd()) {
  const dir = execFileSync(
    'go',
    ['list', '-m', '-f', '{{.Dir}}', 'github.com/subaud-tools/tools-common'],
    { cwd, encoding: 'utf8' },
  ).trim();
  if (!dir) throw new Error('record-bundle.mjs: go list found no tools-common module');
  return join(dir, 'localweb', 'page', 'assets');
}

/** /_kit/<file> is the kit's own file, in kitDir. */
function kitPlugin(kitDir) {
  return {
    name: 'kit',
    setup(b) {
      b.onResolve({ filter: /^\/_kit\// }, (a) => ({
        path: join(kitDir, a.path.slice('/_kit/'.length)),
      }));
    },
  };
}

/**
 * Bundle a tool's record: its entry with the kit inlined, and its stylesheet
 * after the kit's.
 *
 * @param {object} o
 * @param {string} o.entry the record page's entry (it imports /_kit/kit.js).
 * @param {string} [o.css] the tool's stylesheet; the kit's comes first. A
 *   /_kit/ import in it resolves to the kit too.
 * @param {string} o.outdir where record.js and record.css go.
 * @param {string} [o.js] the script's file name. Default record.js.
 * @param {string} [o.cssFile] the stylesheet's file name. Default record.css.
 * @param {string} [o.kitDir] the kit's assets; default kitAssets().
 * @param {boolean} [o.minify] default true.
 * @returns {Promise<{js: string, css: string}>} the paths written.
 */
export async function recordBundle({
  entry,
  css,
  outdir,
  js = 'record.js',
  cssFile = 'record.css',
  kitDir = kitAssets(),
  minify = true,
}) {
  if (!entry || !outdir) throw new Error('record-bundle.mjs: pass entry and outdir');
  const plugins = [kitPlugin(kitDir)];
  const out = { js: join(outdir, js), css: join(outdir, cssFile) };
  await build({
    entryPoints: [entry],
    bundle: true,
    minify,
    format: 'esm',
    charset: 'utf8',
    plugins,
    outfile: out.js,
  });
  const sheets = ['/_kit/kit.css', ...(css ? [resolve(css)] : [])];
  await build({
    stdin: {
      contents: sheets.map((s) => `@import ${JSON.stringify(s)};`).join('\n'),
      resolveDir: process.cwd(),
      loader: 'css',
    },
    bundle: true,
    minify,
    charset: 'utf8',
    plugins,
    outfile: out.css,
  });
  return out;
}
