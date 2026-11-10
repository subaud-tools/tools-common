// record.js: a Record, every card of a piece of work read-only in one page
// (from diazo's web/record.ts). The frame: a band with the tabs and their
// counts and a search over every tab, the index on the left, the tabs in the
// centre, the thread on the right. Every tab is drawn at once: one not open is
// laid out out of sight rather than not at all, so a diagram can be measured
// and search and print reach every tab. A link to a card (#F2) or a tab opens
// it there. What each tab holds, and which thread goes with what, are the
// tool's. The same page opens from disk as one file (build/record-bundle.mjs),
// reading the data the file carries with embeddedData.
import { h } from './dom.js';
import { collapsible, narrowMode } from './frame.js';
import { stageTrack } from './track.js';
import { threadMessage } from './thread.js';

// idPieces is text split into plain runs and the ids in known, each its own
// piece ({id}).
export function idPieces(text, known) {
  const out = [];
  let last = 0;
  for (const m of text.matchAll(/\b[A-Z]{1,5}-?\d+\b/g)) {
    if (!known.has(m[0])) continue;
    if (m.index > last) out.push(text.slice(last, m.index));
    out.push({ id: m[0] });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

const ref = id => h('a', { href: `#${id}`, class: 'kit-ref' }, id);

// linkIds makes each id in known a link, in root's text outside code, pre,
// links and a card's header (its own id): link(id) draws it, by default
// <a class="kit-ref" href="#id">.
export function linkIds(root, known, link = ref) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const texts = [];
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (!n.parentElement?.closest('a, code, pre, .kit-diagram, .kit-card-head')) texts.push(n);
  }
  for (const t of texts) {
    const pieces = idPieces(t.data, known);
    if (pieces.length === 1 && typeof pieces[0] === 'string') continue;
    t.replaceWith(...pieces.map(p => (typeof p === 'string' ? p : link(p.id))));
  }
}

// searchHits is the entries ({tab, id, label, text}) holding q, any case, each
// with the words around its first match; nothing for an empty q.
export function searchHits(entries, q, max = 50) {
  const needle = q.trim().toLowerCase();
  if (!needle) return [];
  const hits = [];
  for (const e of entries) {
    const text = e.text.replace(/\s+/g, ' ');
    const at = text.toLowerCase().indexOf(needle);
    if (at < 0) continue;
    const from = Math.max(0, at - 40);
    const to = Math.min(text.length, at + needle.length + 40);
    hits.push({
      tab: e.tab,
      id: e.id,
      label: e.label,
      snippet: `${from ? '…' : ''}${text.slice(from, to).trim()}${to < text.length ? '…' : ''}`,
    });
    if (hits.length >= max) break;
  }
  return hits;
}

// The kit's controls a record leaves out.
const CONTROLS = '.kit-btns, .kit-note-line, .kit-sendbar, textarea';

// readOnly takes every control out of el (buttons, note lines and boxes, the
// send bar) and whatever more (a selector) names; it returns el.
export function readOnly(el, more = '') {
  for (const x of el.querySelectorAll(more ? `${CONTROLS}, ${more}` : CONTROLS)) x.remove();
  return el;
}

// recordCard is a card as a record shows it: read-only (readOnly, with more),
// named label for search, with edge (signal or agent) as its only edge, and its
// messages under its body as its thread, each drawn by message (default the
// kit's threadMessage).
export function recordCard(el, o) {
  readOnly(el, o.more);
  el.classList.remove('edge-signal', 'edge-agent', 'edge-wait');
  if (o.edge) el.classList.add(`edge-${o.edge}`);
  el.dataset.sec = o.label;
  if (o.messages?.length) {
    const draw = o.message ?? (m => threadMessage(m, o.attachments, o.render));
    (el.querySelector('.kit-card-body') ?? el).append(h('div', { class: 'kit-rec-thread' },
      h('div', { class: 'kit-label' }, 'Thread'),
      h('ul', { class: 'kit-thread-msgs' }, o.messages.map(draw))));
  }
  return el;
}

// embeddedData is what a record file carries in <script type="application/json"
// id=id>, and the file itself as it was parsed (without the theme the page
// set), for a Download of it; null on a served page. Read it before drawing.
export function embeddedData(id) {
  const block = document.getElementById(id);
  if (!block) return null;
  // The parser keeps the newline after </html> inside <body>: it goes back to
  // the end.
  const doc = document.documentElement.cloneNode(true);
  delete doc.dataset.theme;
  const self = '<!doctype html>\n' + doc.outerHTML.replace(/\n<\/body><\/html>$/, '</body></html>\n');
  return { data: JSON.parse(block.textContent ?? ''), self };
}

// recordPage draws the frame into root (the page's .kit-app, after its bar):
// the band, the index, the tabs and the thread. tabs are {id, label, count} in
// order; draw(tab) gives each tab's {el, secs}, its sections ({id, label}) for
// the index. Every [data-sec] element in a tab is a part search reads. known
// ids in the tabs' text become links (link draws one). The caller may draw the
// band (band({tabs, open, find, select})), the index (index(open, selected))
// and the thread (thread(open, selected)); target(hash) may say where a link
// goes ({tab, id}). route(), when given, says whether a hashchange is the
// page's to follow (false: ignore it, the address has moved on); go(hash)
// writes the address for a hit or a tab pressed, by default
// history.pushState. search is the search box's words, false for none. onShow
// hears each tab shown, and the element shown in it. name is the tool's, for
// the columns' fold.
export function recordPage(o) {
  const root = o.root;
  const stopping = new AbortController();
  const signal = stopping.signal;
  const go = o.go ?? (hash => history.pushState(null, '', hash));
  const band = h('div', { class: 'kit-rec-band' });
  const left = h('aside', { class: 'kit-list kit-col kit-left-col', 'aria-label': 'Index' });
  const main = h('main', { class: 'kit-read kit-col kit-mid kit-rec-main', 'aria-label': 'The record' });
  const right = h('aside', { class: 'kit-rail kit-col kit-right-col', 'aria-label': 'Thread' });
  const index = h('div', { class: 'kit-col-body' });
  const thread = h('div', { class: 'kit-col-body' });
  collapsible({ col: left, body: index, panel: 'index', side: 'left', name: o.name });
  collapsible({ col: right, body: thread, panel: 'thread', side: 'right', name: o.name });
  const narrow = narrowMode({ root, left, right });
  root.classList.add('kit-app', 'kit-record');
  root.append(band, left, main, right);

  const drawn = new Map();
  const panes = new Map();
  for (const t of o.tabs) {
    const d = o.draw(t);
    drawn.set(t.id, d);
    const pane = h('section', { class: 'kit-rec-tab off', id: `tab-${t.id}`, 'data-tab': t.id, 'aria-label': t.label }, d.el);
    if (o.known?.size) linkIds(pane, o.known, o.link);
    panes.set(t.id, pane);
  }
  main.replaceChildren(...panes.values());

  let open = '';
  let selected = null;

  // Search: every part a tab names, its text.
  let find = null;
  const hitsEl = h('ul', { class: 'kit-rec-hits', 'aria-live': 'polite' });
  if (o.search !== false) {
    const words = o.search || 'Search the record';
    const box = h('input', { class: 'kit-rec-search', type: 'search', placeholder: words, 'aria-label': words });
    find = h('div', { class: 'kit-rec-find' }, box, hitsEl);
    const entries = [];
    for (const [tab, pane] of panes) {
      for (const el of pane.querySelectorAll('[data-sec]')) {
        entries.push({ tab, id: el.id || el.querySelector('[id]')?.id || `tab-${tab}`, label: el.dataset.sec ?? '', text: el.textContent ?? '' });
      }
    }
    const tabLabel = id => o.tabs.find(t => t.id === id)?.label ?? id;
    box.addEventListener('input', () => {
      const hits = searchHits(entries, box.value);
      hitsEl.replaceChildren(
        ...hits.map(x => h('li', null, h('a', { href: `#${x.id}`, 'data-tab': x.tab },
          h('b', null, `${tabLabel(x.tab)} · ${x.label}`),
          h('span', null, x.snippet)))),
        ...(box.value.trim() && !hits.length ? [h('li', { class: 'kit-empty' }, 'Nothing found.')] : []));
    });
    // A hit opens its tab at its section, even when the address already says it.
    hitsEl.addEventListener('click', e => {
      const a = e.target.closest('a[data-tab]');
      if (!a) return;
      e.preventDefault();
      const id = a.getAttribute('href').slice(1);
      const card = id.startsWith('card-') ? id.slice('card-'.length) : null;
      go(`#${card ?? id}`);
      selected = card;
      narrow.show(null);
      show(a.dataset.tab, id);
      hitsEl.replaceChildren();
    });
    // The hits lie over the page: they close on Escape or a press elsewhere.
    box.addEventListener('keydown', e => {
      if (e.key === 'Escape') hitsEl.replaceChildren();
    });
    document.addEventListener('click', e => {
      if (!find.contains(e.target)) hitsEl.replaceChildren();
    }, { signal });
  }

  // A tab pressed: its address written, and the tab shown.
  const select = tab => {
    if (!o.tabs.some(t => t.id === tab)) return;
    if (decodeURIComponent(location.hash.slice(1)) !== tab) go(`#${tab}`);
    selected = null;
    show(tab, null);
  };

  function frame() {
    band.replaceChildren(o.band
      ? o.band({ tabs: o.tabs, open, find, select })
      : h('div', { class: 'kit-rec-band-line' },
        stageTrack({
          label: 'The record',
          stages: o.tabs.map(t => ({ key: t.id, label: t.label, count: t.count, state: t.id === open ? 'now' : '', opens: t.id })),
          open: select,
        }),
        find));
    index.replaceChildren(o.index
      ? (o.index(open, selected) ?? '')
      : h('nav', { class: 'kit-rec-index', 'aria-label': 'On this tab' },
        h('div', { class: 'kit-label' }, 'On this tab'),
        h('ul', null, (drawn.get(open)?.secs ?? []).map(s =>
          h('li', { class: `depth-${s.depth ?? 2}` }, h('a', { href: `#${s.id.replace(/^card-/, '')}` }, s.label))))));
    thread.replaceChildren(o.thread ? (o.thread(open, selected) ?? '') : '');
  }

  function show(tab, at) {
    if (tab !== open) {
      open = tab;
      for (const [id, p] of panes) p.classList.toggle('off', id !== tab);
    }
    frame();
    const el = at ? document.getElementById(at) : null;
    if (el && main.contains(el)) el.scrollIntoView({ block: 'start' });
    else main.scrollTo({ top: 0 });
    if (o.onShow) o.onShow(tab, at);
  }

  // Where a link goes: a tab by its id; a card (#F2) by its card-F2; anything
  // else by its element's id; the tab that holds it.
  const target = hash => {
    if (o.target) return o.target(hash);
    const id = decodeURIComponent(hash.replace(/^#/, ''));
    if (!id) return null;
    if (panes.has(id)) return { tab: id, id: `tab-${id}` };
    for (const [tab, pane] of panes) {
      const el = pane.querySelector(`[id="${CSS.escape(`card-${id}`)}"]`) ?? pane.querySelector(`[id="${CSS.escape(id)}"]`);
      if (el) return { tab, id: el.id };
    }
    return null;
  };

  function route() {
    narrow.show(null);
    const t = target(location.hash);
    selected = t?.id.startsWith('card-') ? t.id.slice('card-'.length) : null;
    if (t) show(t.tab, t.id.startsWith('tab-') ? null : t.id);
    else show(open || o.tabs[0]?.id, null);
  }
  addEventListener('hashchange', () => {
    if (!o.route || o.route()) route();
  }, { signal });
  route();

  return {
    band, index, main, thread, find, panes,
    show(tab, at = null) {
      selected = at?.startsWith('card-') ? at.slice('card-'.length) : null;
      show(tab, at);
    },
    open: () => open,
    selected: () => selected,
    redraw: frame,
    stop() {
      stopping.abort();
      narrow.stop();
    },
  };
}
