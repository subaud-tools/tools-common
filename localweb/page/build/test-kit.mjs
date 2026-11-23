// test-kit.mjs — /_kit/ for node's tests: `node --import ./test-kit.mjs`
// resolves each /_kit/<file> import to the page kit's file in the
// tools-common module go.mod pins, as serve does for the page and
// build/record-bundle.mjs does for record.js. A test of a module that
// imports from the kit (renderMarkdown, slug) runs on the kit itself.

import { execFileSync } from 'node:child_process';
import { register } from 'node:module';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { isMainThread } from 'node:worker_threads';

const kit = pathToFileURL(
  join(
    execFileSync(
      'go',
      ['list', '-m', '-f', '{{.Dir}}', 'github.com/subaud-tools/tools-common'],
      { encoding: 'utf8' },
    ).trim(),
    'localweb',
    'page',
    'assets',
    '/',
  ),
).href;

export async function resolve(specifier, context, next) {
  if (specifier.startsWith('/_kit/'))
    return {
      url: new URL(specifier.slice('/_kit/'.length), kit).href,
      shortCircuit: true,
    };
  return next(specifier, context);
}

// The hooks run in a thread of their own, which loads this file again.
if (isMainThread) register(import.meta.url);
