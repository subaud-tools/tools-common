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

async function clip(text) {
  await navigator.clipboard.writeText(text);
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

  function pickButton(id, label) {
    const b = h('button', { class: 'kit-guide-pick', type: 'button', dataset: { pick: id }, onclick: () => show(id) }, label);
    picks.set(id, b);
    return b;
  }

  function askRow(text) {
    const btn = h('button', { class: 'kit-btn', type: 'button' }, 'Copy');
    btn.onclick = () => void Promise.resolve(copy(text)).then(() => {
      btn.textContent = 'Copied';
      setTimeout(() => (btn.textContent = 'Copy'), 1500);
    });
    return h('li', { class: 'kit-guide-ask' }, h('span', { class: 'kit-guide-ask-text' }, text), btn);
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
      h('h2', {}, t.name),
      h('p', { class: 'kit-guide-summary' }, t.summary),
      h('h3', {}, 'When to reach for it'), md(t.when),
      t.skip ? h('h3', {}, 'When to skip it') : null, t.skip ? md(t.skip) : null,
      h('h3', {}, 'Ask your agent'),
      h('ul', { class: 'kit-guide-asks' }, (t.asks || []).map(askRow)),
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
    h('ul', { class: 'kit-guide-core' }, core.map(t => h('li', {}, pickButton(t.name, t.name)))),
    light.length
      ? h('details', { class: 'kit-guide-also' },
        h('summary', { class: 'kit-label' }, 'Also installed'),
        h('ul', {}, light.map(t => h('li', {}, pickButton(t.name, t.name)))))
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

// guidePage draws the guide as the whole page, in root (/_kit/guide/).
export async function guidePage(root, o = {}) {
  const data = await load(o.url);
  root.replaceChildren(h('div', { class: 'kit-guide-page' }, guideView(data, { copy: o.copy })));
}
