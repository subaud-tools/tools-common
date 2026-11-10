import { test, eq, assert } from './harness.js';
import { renderMarkdown, slug } from '/_kit/prose.js';

// diazo's prose.test.ts cases, moved with the renderer.

test('raw HTML in markdown comes out as text', () => {
  const out = renderMarkdown('Hi\n\n<script>alert(1)</script>\n\nand <b>bold</b>');
  assert(/&lt;script&gt;/.test(out), out);
  assert(!/<script>/.test(out), out);
  assert(!/<b>/.test(out), out);
});

test('## and ### headings get ids from their text', () => {
  const out = renderMarkdown('## Goal\n\n### The page, in short');
  assert(/<h2 id="goal">Goal<\/h2>/.test(out), out);
  assert(/<h3 id="the-page-in-short">/.test(out), out);
});

test('headingIds false leaves the ids off', () => {
  const out = renderMarkdown('## Goal\n\n### The page', { headingIds: false });
  assert(/<h2>Goal<\/h2>/.test(out), out);
  assert(/<h3>The page<\/h3>/.test(out), out);
});

test('a mermaid fence is left for the diagram renderer', () => {
  const out = renderMarkdown('```mermaid\nflowchart LR\n  A --> B\n```');
  assert(/<pre class="mermaid">flowchart LR\n {2}A --&gt; B<\/pre>/.test(out), out);
});

test('a link to a script URL is not a link', () => {
  const out = renderMarkdown('[x](javascript:alert(1)) [y](https://a.b/c) [z](#DCSN1)');
  assert(!/href="javascript:/.test(out), out);
  assert(/href="https:\/\/a.b\/c"/.test(out), out);
  assert(/href="#DCSN1"/.test(out), out);
});

test("a header block is not rendered", () => {
  const out = renderMarkdown('---\ndiazo: x/y\nfile: spec\nstatus: printed\n---\n\n# T\n\n## Goal\n');
  assert(!/diazo: x\/y/.test(out), out);
  assert(!/<hr/.test(out), out);
  assert(/<h1>T<\/h1>/.test(out), out);
  assert(/<h2 id="goal">/.test(out), out);
});

test('GitHub-flavoured markdown: tables, lists, code', () => {
  const out = renderMarkdown('| a | b |\n|---|---|\n| 1 | 2 |\n\n- one\n- two\n\n`x < y`');
  assert(/<table>/.test(out) && /<td>2<\/td>/.test(out), out);
  assert(/<li>one<\/li>/.test(out), out);
  assert(/<code>x &lt; y<\/code>/.test(out), out);
});

test('slug: lower case, words joined by hyphens, markup and entities dropped', () => {
  eq(slug('The page, in <b>short</b> &amp; sweet'), 'the-page-in-short-sweet');
  eq(slug('  Ünïcode 42  '), 'ünïcode-42');
});
