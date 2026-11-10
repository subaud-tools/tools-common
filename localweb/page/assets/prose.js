// prose.js: markdown as HTML (from diazo's web/prose.ts). The text is the
// agent's, but nothing on the page runs markup from it: raw HTML comes out as
// text, a link goes only to the web or a fragment, and a mermaid fence is left
// as <pre class="mermaid"> for the page's renderer. `## ` and `### ` headings
// get ids from their text, so a section can be scrolled to. A header block
// (YAML front matter at the top of a printed file) is not drawn. marked is
// vendored beside the kit (vendor/marked.esm.js, with its licence), since the
// kit is loaded from /_kit/ and not bundled.
import { Marked } from './vendor/marked.esm.js';

const esc = s => s
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

// slug is a heading's id: its text, lower case, words joined by hyphens.
export function slug(text) {
  return text
    .toLowerCase()
    .replace(/<[^>]*>/g, '')
    .replace(/&[a-z#0-9]+;/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '');
}

const safeHref = href => /^(https?:\/\/|#)/i.test(href);

// One parser per heading rule: the renderer can't see parse options.
const parser = ids => new Marked({
  gfm: true,
  renderer: {
    html({ text }) {
      return esc(text);
    },
    heading({ tokens, depth }) {
      const inner = this.parser.parseInline(tokens);
      const id = ids && (depth === 2 || depth === 3) ? ` id="${slug(inner)}"` : '';
      return `<h${depth}${id}>${inner}</h${depth}>\n`;
    },
    code({ text, lang }) {
      if (lang === 'mermaid') return `<pre class="mermaid">${esc(text)}</pre>\n`;
      return false;
    },
    link({ href, title, tokens }) {
      const inner = this.parser.parseInline(tokens);
      if (!safeHref(href)) return inner;
      const t = title ? ` title="${esc(title)}"` : '';
      return `<a href="${esc(href)}"${t} rel="noreferrer">${inner}</a>`;
    },
  },
});
const withIds = parser(true);
const withoutIds = parser(false);

// A leading front-matter block (a rule, then `key:` lines up to a rule), and
// the blank line after it; text that opens with a rule is left be.
const frontMatter = /^---\r?\n[\w-]+:.*\r?\n(?:.*\r?\n)*?---(?:\r?\n|$)(?:\r?\n)?/;

// renderMarkdown is markdown as HTML, safe to set as innerHTML. headingIds
// false leaves the ids off, for text drawn more than once on a page (a card's).
export function renderMarkdown(src, o = {}) {
  const md = o.headingIds === false ? withoutIds : withIds;
  return md.parse(src.replace(frontMatter, ''), { async: false });
}
