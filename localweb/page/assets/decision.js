// decision.js: a decision card (from diazo's web/card.ts): the question, the
// problem with its example, the options with what each needs and includes, the
// recommendation and why, what happens next, the agent's calls with Reverse,
// and the evidence folded last. The parts know nothing of a tool's states: the
// caller passes the pills, the notes above the options, the bar under them and
// every press. Text that is a string is markdown (renderMarkdown); a Node is
// drawn as it is, so a caller can keep plain text.
import { buttons, fold, h } from './dom.js';
import { renderMarkdown } from './prose.js';

// text is v as a block: markdown in a div.kit-md for a string, a Node in a
// <tag>. null for nothing.
function text(v, cls, tag = 'p') {
  if (v === undefined || v === null || v === '') return null;
  if (v instanceof Node) return h(tag, { class: cls || null }, v);
  const el = h('div', { class: cls ? `${cls} kit-md` : 'kit-md' });
  el.innerHTML = renderMarkdown(String(v), { headingIds: false });
  return el;
}

const label = s => h('div', { class: 'kit-label' }, s);

// led puts a bold lead-in before v's first words: inside its first paragraph
// when v is markdown, else in one paragraph with it.
function led(lead, v) {
  if (v === undefined || v === null || v === '') return h('p', null, lead);
  if (v instanceof Node) return h('p', null, lead, ' · ', v);
  const el = text(v);
  const first = el.firstElementChild;
  if (first?.tagName === 'P') {
    first.prepend(lead, ' · ');
    return el.childElementCount === 1 ? first : el;
  }
  el.prepend(h('p', null, lead));
  return el;
}

// A url an entry may link to: the web or a fragment, as renderMarkdown's links.
const safeHref = s => /^(https?:\/\/|#)/i.test(s);

// An address in a source: http(s):// and what follows up to a space, less any
// trailing , ; . ) ] (they stay words).
const ADDRESS = /https?:\/\/\S+/gi;
const TRAIL = /[,;.)\]]+$/;

// shortLabel is an address as its host, then · and its last non-empty path
// segment (no query or fragment); the host alone with no path past it.
function shortLabel(address) {
  let u;
  try { u = new URL(address); } catch { return address; }
  const last = u.pathname.split('/').filter(Boolean).pop();
  return last ? `${u.host} · ${last}` : u.host;
}

// sourcePieces cuts a source into addresses and runs of words, in order. A run
// is trimmed of the separators around it (, ; and spaces); an empty one goes.
function sourcePieces(source) {
  const s = String(source || '');
  const out = [];
  const words = w => {
    const t = w.replace(/^[\s,;]+|[\s,;]+$/g, '');
    if (t) out.push({ words: t });
  };
  let at = 0;
  for (const m of s.matchAll(ADDRESS)) {
    const address = m[0].replace(TRAIL, '');
    words(s.slice(at, m.index));
    out.push({ address });
    at = m.index + address.length;
  }
  words(s.slice(at));
  return out;
}

const link = (href, label) => h('a', { href, title: href, target: '_blank', rel: 'noreferrer' }, label);

// sourceLine is one source under the text it backs: o.tags ({text, tone ok or
// signal}) first, then each address as a short link (its full address the
// title, in a new tab) and each run of words as a span, or o.word(words)'s Node
// when it gives one. o.url, when it is the web or a fragment, makes the words
// one link there instead (evidenceList's entry url). null with neither a
// source nor a tag.
export function sourceLine(source, o = {}) {
  const tags = (o.tags || []).map(t => h('span', { class: `kit-tag ${t.tone}` }, t.text));
  let parts;
  if (o.url && safeHref(o.url)) {
    parts = source ? [link(o.url, source)] : [link(o.url, o.url.startsWith('#') ? o.url : shortLabel(o.url))];
  } else {
    parts = sourcePieces(source).map(p =>
      p.address ? link(p.address, shortLabel(p.address)) : (o.word && o.word(p.words)) || h('span', null, p.words));
  }
  if (!tags.length && !parts.length) return null;
  return h('div', { class: 'kit-source-line' }, ...tags, ...parts);
}

// evidenceList is a list of evidence entries ({text, source, url, output}):
// each entry's text, then its source line under it (sourceLine; an entry's url,
// when it is the web or a fragment, links the source's words there), then its
// output folded. o.source(words), when given, may draw a run of words as the
// caller's own Node (null to leave it). null for none.
export function evidenceList(entries, o = {}) {
  if (!entries?.length) return null;
  return h('ul', { class: 'kit-evidence' }, entries.map(e =>
    h('li', null,
      h('span', null, e.text),
      ' ',
      e.source || e.url ? sourceLine(e.source, { url: e.url, word: o.source }) : null,
      e.output ? fold('output', h('pre', { class: 'kit-output' }, e.output)) : null)));
}

// actionRow is a row of buttons, or a Node as it is.
const actionRow = a => (a instanceof Node ? a : a?.length ? buttons(a) : null);

// optionBlock is one option: its id and title with recommended, chosen and was
// your choice, the caller's visual (a Node or several), what it also needs, what
// it includes (folded), then its actions (buttons, or a Node). picked marks the
// reader's pick before it is sent.
export function optionBlock(o) {
  const cls = ['kit-option', o.chosen && 'chosen', o.picked && 'picked'].filter(Boolean).join(' ');
  return h('div', { class: cls, 'data-option': o.id },
    h('div', { class: 'kit-option-head' },
      h('span', { class: 'kit-option-id' }, o.id),
      h('span', { class: 'kit-option-title' }, o.title),
      o.recommended ? h('span', { class: 'kit-pill' }, 'recommended') : null,
      o.chosen ? h('span', { class: 'kit-pill ok' }, 'chosen') : null,
      o.was ? h('span', { class: 'kit-pill kit-was' }, 'was your choice') : null),
    o.visual ?? null,
    h('div', { class: 'kit-option-facts' },
      label('Also needs'),
      text(o.pullsIn),
      o.includes ? fold('What it includes', text(o.includes)) : null),
    o.readOnly ? null : actionRow(o.actions));
}

// callRow is one of the agent's calls: what it took, what reversing gives you
// and why, then Reverse (onReverse; Reversed and off once reversed) and the
// caller's other buttons. name, when given, heads it; its evidence, unfolded,
// goes between the facts and the buttons (o.source as evidenceList's).
// readOnly has no buttons, so a reversed call with a name says so beside it.
export function callRow(o) {
  const bs = [];
  if (o.onReverse) bs.push({ label: o.reversed ? 'Reversed' : 'Reverse', disabled: !!o.reversed, run: () => { if (!o.reversed) o.onReverse(); } });
  bs.push(...(o.actions ?? []));
  return h('div', { class: `kit-call${o.reversed ? ' reversed' : ''}` },
    o.name
      ? h('b', { class: 'kit-call-name' }, o.name, o.reversed && o.readOnly ? [' ', h('span', { class: 'kit-pill kit-badge' }, 'reversed')] : null)
      : null,
    h('div', { class: 'kit-call-facts' },
      label('Took'), text(o.took),
      label('Instead of'), text(o.instead),
      label('Why'), text(o.why)),
    evidenceList(o.evidence, { source: o.source }),
    o.readOnly || !bs.length ? null : buttons(bs));
}

// The card's header: the crumb, the state (a string is a grey pill), what comes
// after it, and the card's key.
function header(hd = {}) {
  const crumb = Array.isArray(hd.crumb) ? hd.crumb : [hd.crumb ?? ''];
  const state = hd.state === undefined || hd.state === null || hd.state === ''
    ? null
    : typeof hd.state === 'string' ? h('span', { class: 'kit-pill kit-badge' }, hd.state) : hd.state;
  return h('div', { class: 'kit-card-head' },
    h('span', { class: 'kit-card-crumb' }, ...crumb),
    state,
    ...(hd.after ?? []),
    hd.key ? h('span', { class: 'kit-key kit-card-key', title: 'This card anywhere: its key' }, hd.key) : null);
}

function folded(title, content) {
  const el = fold(title, content);
  el.classList.add('kit-evidence-fold');
  return el;
}

const nodes = a => (a ?? []).filter(Boolean);

// decisionCard is the whole card, in this order: the header and the question;
// lead (above the example), the example, notes (testing, reopened, with the
// agent, waiting); the options and the caller's bar under them; Since then
// (dated lines, one per later post); the recommendation with its own evidence;
// what happens next; the calls; the card's evidence, folded with its count;
// then after, the questions row and foot. readOnly leaves out the bar, the
// questions, foot and every button. edge is signal, agent or wait.
export function decisionCard(o) {
  const ro = !!o.readOnly;
  const opts = o.options ?? [];
  const rec = o.recommendation;
  const cls = ['kit-card kit-decision', o.edge && `edge-${o.edge}`, o.class].filter(Boolean).join(' ');
  const evidence = evidenceList(o.evidence, { source: o.source });
  return h('section', { class: cls, id: o.id ? `card-${o.id}` : null, 'data-card': o.id ?? null },
    header(o.head),
    o.question instanceof Node || o.question
      ? h('h2', { class: 'kit-decision-title' }, o.question)
      : null,
    h('div', { class: 'kit-card-body' },
      ...nodes(o.lead),
      text(o.example, 'kit-decision-example'),
      ...nodes(o.notes),
      opts.length
        ? h('div', { class: 'kit-options', style: `--option-count: ${Math.max(1, opts.length)}` },
          opts.map(x => (x instanceof Node ? x : optionBlock({ ...x, readOnly: ro || x.readOnly }))))
        : null,
      ro ? null : (o.bar ?? null),
      o.since?.length
        ? h('div', { class: 'kit-since' },
          label('Since then'),
          h('ul', null, o.since.map(s => h('li', null, h('span', { class: 'kit-meta' }, s.at), ' ', s.text))))
        : null,
      rec
        ? h('div', { class: 'kit-rec' },
          label('Recommendation'),
          led(h('b', null, `Option ${rec.option}`), rec.why),
          evidenceList(rec.evidence, { source: o.source }))
        : null,
      o.next ? h('div', { class: 'kit-next-step' }, label('What happens next'), text(o.next)) : null,
      o.calls?.length
        ? h('div', { class: 'kit-calls' }, label("The agent's calls"), o.calls.map(c => callRow({ ...c, readOnly: ro || c.readOnly })))
        : null,
      evidence ? folded(`Evidence · ${o.evidence.length}`, evidence) : null,
      ...nodes(o.after),
      ro ? null : actionRow(o.questions),
      ...(ro ? [] : nodes(o.foot))));
}
