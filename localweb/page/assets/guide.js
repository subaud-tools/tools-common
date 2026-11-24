// guide.js: the Guide tab every page's bar opens. It draws the family guide
// (tools-common's guide package, served by every serve at /api/kit/guide):
// the tool you're in first, with when to reach for it, when to skip it and
// its asks, each with Copy; where it sits and pointers behind More, so a
// first look fits one screen. Down the side, the installed tools, core first
// and the rest folded under Also installed, then How they fit together and
// one link to the whole family. When the page registered a tour (tour.js),
// its own section offers Show me around. /_kit/guide/ shows it as a page.
import { h } from './dom.js';
import { sheet } from './sheet.js';
import { renderMarkdown } from './prose.js';
import { registeredTour } from './tour.js';

const GUIDE_URL = '/api/kit/guide';

const md = (src, cls) => {
  const d = h('div', { class: 'kit-md' + (cls ? ' ' + cls : '') });
  d.innerHTML = renderMarkdown(src || '', { headingIds: false });
  return d;
};

// betaMark is the mark after a beta tool's name (guide data's beta): the
// kit's muted meta text, " · beta". The space and the dot keep it apart from
// the name for a screen reader.
export function betaMark() {
  return h('span', { class: 'kit-meta' }, ' · beta');
}

// guideForBar loads the guide once for the bar, which draws both the beta
// mark and the hosted machine's place (pageserve's place) from it: the
// answer, or null when it doesn't load. A page not served over http(s) (a
// downloaded Record opened from disk) has no guide and asks for none: the
// browser would log the failed fetch as a console error. o.url and
// o.protocol (location.protocol by default) are for tests.
export async function guideForBar(o = {}) {
  if (!/^https?:$/.test(o.protocol || location.protocol)) return null;
  try {
    return await load(o.url);
  } catch {
    return null; // no guide here
  }
}

// markIfBeta puts the beta mark at the end of el (the bar's brand) when data
// (a guide answer, or null) says the page's tool is beta. A tool with no
// guide entry draws nothing.
export function markIfBeta(el, data) {
  const t = data && (data.tools || []).find(x => x.name === data.tool);
  if (t && t.beta) el.append(betaMark());
}

// badgeIfBeta loads the guide and, when the page's tool is beta, puts the
// mark at the end of el. A guide that doesn't load, or a page not served over
// http(s), draws nothing (guideForBar). o.url and o.protocol are for tests.
export async function badgeIfBeta(el, o = {}) {
  markIfBeta(el, await guideForBar(o));
}

async function clip(text) {
  await navigator.clipboard.writeText(text);
}

// askRow is one ask with its Copy button, which says Copied for a moment.
function askRow(text, copy) {
  const btn = h('button', { class: 'kit-btn', type: 'button' }, 'Copy');
  btn.onclick = () => void Promise.resolve(copy(text)).then(() => {
    btn.textContent = 'Copied';
    setTimeout(() => (btn.textContent = 'Copy'), 1500);
  });
  return h('li', { class: 'kit-guide-ask' }, h('span', { class: 'kit-guide-ask-text' }, text), btn);
}

// guideView is the guide for data (GuideData). o.copy copies an ask (the
// clipboard by default); o.tour is the page's tour, offered on its own tool's
// section; o.onTour runs as the tour starts (the sheet closes).
export function guideView(data, o = {}) {
  const copy = o.copy || clip;
  const tools = data.tools || [];
  const main = h('div', { class: 'kit-guide-main', tabindex: '-1' });
  const picks = new Map();
  let shown = null;

  function pickButton(id, label, beta) {
    const b = h('button', { class: 'kit-guide-pick', type: 'button', dataset: { pick: id }, onclick: () => show(id) }, label, beta ? betaMark() : null);
    picks.set(id, b);
    return b;
  }

  function toolSection(t) {
    const tr = o.tour && t.name === data.tool && o.tour.steps && o.tour.steps.length ? o.tour : null;
    const more = t.where || t.pointers
      ? h('details', { class: 'kit-fold kit-guide-more' },
        h('summary', { class: 'kit-label' }, 'More'),
        t.where ? h('h3', {}, 'Where it sits') : null, t.where ? md(t.where) : null,
        t.pointers ? h('h3', {}, 'Pointers') : null, t.pointers ? md(t.pointers) : null)
      : null;
    const tourBtn = tr
      ? h('button', { class: 'kit-btn fill kit-guide-tour', type: 'button', onclick: () => { if (o.onTour) o.onTour(); tr.start(); } }, 'Show me around')
      : null;
    const pub = t.guide ? h('a', { class: 'kit-guide-public', href: t.guide, target: '_blank', rel: 'noopener' }, `${t.name}'s guide on the web ›`) : null;
    return [
      h('h2', {}, t.name, t.beta ? betaMark() : null),
      h('p', { class: 'kit-guide-summary' }, t.summary),
      h('h3', {}, 'When to reach for it'), md(t.when),
      t.skip ? h('h3', {}, 'When to skip it') : null, t.skip ? md(t.skip) : null,
      h('h3', {}, 'Ask your agent'),
      h('ul', { class: 'kit-guide-asks' }, (t.asks || []).map(a => askRow(a, copy))),
      more,
      tourBtn || pub ? h('div', { class: 'kit-guide-links' }, tourBtn, pub) : null,
    ];
  }

  function show(id) {
    shown = id;
    for (const [k, b] of picks) {
      b.classList.toggle('on', k === id);
      if (k === id) b.setAttribute('aria-current', 'true');
      else b.removeAttribute('aria-current');
    }
    if (id === 'fit') {
      main.replaceChildren(h('h2', {}, 'How they fit together'), md((data.fit || '').replace(/^# .*\n/, '')));
    } else {
      const t = tools.find(x => x.name === id);
      main.replaceChildren(...(t ? toolSection(t) : [h('p', { class: 'kit-empty' }, 'No guide for this page.')]).filter(Boolean));
    }
  }

  const core = tools.filter(t => t.core);
  const light = tools.filter(t => !t.core);
  const side = h('nav', { class: 'kit-guide-side', 'aria-label': 'Tools' },
    h('div', { class: 'kit-label' }, 'Installed'),
    h('ul', { class: 'kit-guide-core' }, core.map(t => h('li', {}, pickButton(t.name, t.name, t.beta)))),
    light.length
      ? h('details', { class: 'kit-guide-also' },
        h('summary', { class: 'kit-label' }, 'Also installed'),
        h('ul', {}, light.map(t => h('li', {}, pickButton(t.name, t.name, t.beta)))))
      : null,
    h('ul', {}, h('li', {}, pickButton('fit', 'How they fit together'))),
    h('a', { class: 'kit-guide-family', href: data.family || 'https://subaud.tools', target: '_blank', rel: 'noopener' }, 'All the tools at subaud.tools ›'));

  const first = tools.find(t => t.name === data.tool) ? data.tool : (tools[0] ? tools[0].name : 'fit');
  show(first);
  const el = h('div', { class: 'kit-guide' }, side, main);
  el.show = show;
  el.shown = () => shown;
  return el;
}

async function load(url = GUIDE_URL) {
  const r = await fetch(url, { credentials: 'same-origin' });
  if (!r.ok) throw new Error(`guide: ${r.status}`);
  return r.json();
}

// openGuide loads the guide and opens it in a sheet over the page, offering
// the page's registered tour. Esc closes it.
export async function openGuide(o = {}) {
  let body;
  try {
    const data = await load(o.url);
    let s = null;
    body = guideView(data, { tour: o.tour === undefined ? registeredTour() : o.tour, copy: o.copy, onTour: () => s && s.close() });
    s = sheet({ title: 'Guide', body });
    s.el.classList.add('kit-guide-sheet');
    return s;
  } catch (e) {
    body = h('p', { class: 'kit-empty' }, `The guide didn't load: ${e && e.message ? e.message : e}`);
    const s = sheet({ title: 'Guide', body });
    s.el.classList.add('kit-guide-sheet');
    return s;
  }
}

// guideAsks draws, in el, what an empty front page says: the page tool's
// one-line summary, its asks each with Copy, and More in the Guide, which
// opens the Guide. It loads the same /api/kit/guide the Guide does, so the two
// say the same thing. When the guide has no section for the tool, or doesn't
// load, it leaves el as it was. It resolves to whether it drew.
export async function guideAsks(el, o = {}) {
  let t;
  try {
    const data = await load(o.url);
    t = (data.tools || []).find(x => x.name === data.tool);
  } catch {
    return false;
  }
  if (!t) return false;
  const copy = o.copy || clip;
  el.replaceChildren(h('div', { class: 'kit-guide-asks-box' },
    h('p', { class: 'kit-guide-summary' }, t.summary),
    h('div', { class: 'kit-label' }, 'Ask your agent'),
    h('ul', { class: 'kit-guide-asks' }, (t.asks || []).map(a => askRow(a, copy))),
    h('button', { class: 'kit-guide-asks-more', type: 'button', onclick: () => void openGuide({ url: o.url, copy: o.copy }) }, 'More in the Guide')));
  return true;
}

// guidePage draws the guide as the whole page, in root (/_kit/guide/).
export async function guidePage(root, o = {}) {
  const data = await load(o.url);
  root.replaceChildren(h('div', { class: 'kit-guide-page' }, guideView(data, { copy: o.copy })));
}
