// The repo picker: choose many of a list of GitHub repos the page hands it
// (it never calls GitHub). It draws, top to bottom: a search, owner chips
// with counts, the tick-all line with the count chosen, the list newest first
// ten to a page with Previous and Next, and an optional "Not in the list?"
// field. The page reads back chosen() (and marked(), with o.mark) and hears
// every change through o.onChange.
//
// o.repos is the list, each { name: 'owner/name', private, updated }; null
// (or left out with no typed field) while it is being listed, until
// setRepos(list); left out with o.typed, only the typed field draws.
// failed(text) puts text in the list's place, the typed field still working.
// o.have is { names, label }: repos already chosen elsewhere, drawn ticked,
// greyed and labelled, which tick-all skips and chosen() leaves out.
// o.typed (true, or { label, placeholder }) adds the typed field: owner/name,
// a repo's GitHub link, or an org's link, which ticks every listed repo of
// that owner. A repo not in the list joins chosen() as typed; one in o.have
// (in any case, listed or not) is never chosen and says so once committed.
// o.mark is { on, off, title } for one mark on a ticked repo (the setup
// page's ★): on the first ticked unless pressed elsewhere, and following the
// first ticked when its repo is unticked. title is a string or name => string.
// scroll is the list's element: a wide sheet marks it kit-sheet-scroll.

import { h } from './dom.js';

const PER_PAGE = 10;

// ago says how long ago an RFC 3339 time was, in the largest whole unit.
function ago(iso) {
  const s = Math.max(0, (Date.now() - Date.parse(iso)) / 1000);
  const units = [['year', 31536000], ['month', 2592000], ['week', 604800], ['day', 86400], ['hour', 3600], ['minute', 60]];
  for (const [unit, size] of units) {
    const n = Math.floor(s / size);
    if (n >= 1) return `${n} ${unit}${n === 1 ? '' : 's'} ago`;
  }
  return 'just now';
}

const OWNER = '[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?';
const NAME = '[A-Za-z0-9._-]+';
const PLAIN = new RegExp(`^(${OWNER})/(${NAME})$`);
const LINK = new RegExp(`^(?:https?://)?(?:www\\.)?github\\.com/(${OWNER})(?:/(${NAME}))?(?:[/?#].*)?$`, 'i');

// parseRepo reads what was typed: { repo: 'owner/name' }, { org: 'owner' },
// or null when it is neither.
function parseRepo(text) {
  const t = text.trim();
  let m = t.match(PLAIN);
  if (m) return { repo: `${m[1]}/${m[2].replace(/\.git$/, '')}` };
  m = t.match(LINK);
  if (!m) return null;
  if (!m[2]) return { org: m[1] };
  const name = m[2].replace(/\.git$/, '');
  return name ? { repo: `${m[1]}/${name}` } : null;
}

const ownerOf = name => name.slice(0, name.indexOf('/'));

export function repoPick(o = {}) {
  // Until a list or a failure arrives, a typed-only picker draws just its field.
  let typedOnly = o.repos === undefined && !!o.typed;
  let all = Array.isArray(o.repos) ? sorted(o.repos) : null;
  let failure = '';
  let query = '';
  let owner = '';
  let page = 0;
  const have = new Set(o.have ? o.have.names : []);
  // haveName is the have entry a name matches, whatever its case, or ''.
  const haveName = name => [...have].find(n => n.toLowerCase() === name.toLowerCase()) || '';
  // The ticked repos in the order they were ticked; the mark is one of them.
  const order = [];
  let mark = '';
  let typedRepo = '';

  const search = h('input', { class: 'kit-input kit-repo-search', type: 'search', placeholder: 'Search your repos', 'aria-label': 'Search your repos' });
  const owners = h('div', { class: 'kit-chips kit-repo-owners' });
  const allBox = h('input', { type: 'checkbox' });
  const allWords = h('span');
  const count = h('span', { class: 'kit-repo-count' });
  const allLine = h('div', { class: 'kit-repo-all' }, h('label', { class: 'kit-tick' }, allBox, allWords), count);
  const scroll = h('div', { class: 'kit-repo-rows' });
  const prev = h('button', { class: 'kit-btn', type: 'button' }, 'Previous');
  const next = h('button', { class: 'kit-btn', type: 'button' }, 'Next');
  const range = h('span', { class: 'kit-repo-page' });
  const pager = h('div', { class: 'kit-repo-pager' }, prev, range, next);
  const listParts = [search, owners, allLine, scroll, pager];

  let typedInput = null, typedError = null, typedPart = null;
  if (o.typed) {
    const t = o.typed === true ? {} : o.typed;
    const label = t.label || (typedOnly ? 'The repo to add' : 'Not in the list?');
    typedInput = h('input', { class: 'kit-input', placeholder: t.placeholder || "owner/name, a repo's link, or an org's link", 'aria-label': label, autocomplete: 'off', spellcheck: false });
    typedError = h('p', { class: 'kit-repo-typed-error', role: 'alert' });
    typedPart = h('div', { class: 'kit-repo-typed' }, h('label', { class: 'kit-field-label' }, label, typedInput), typedError);
  }
  const el = h('div', { class: 'kit-repo-pick' }, typedOnly ? null : listParts, typedPart);

  function sorted(list) {
    return [...list].sort((a, b) => Date.parse(b.updated) - Date.parse(a.updated));
  }
  const listed = name => (all || []).find(r => r.name.toLowerCase() === name.toLowerCase());
  const chosen = () => (typedRepo && !order.some(n => n.toLowerCase() === typedRepo.toLowerCase()) ? [...order, typedRepo] : [...order]);
  const marked = () => (o.mark ? mark || chosen()[0] || '' : '');

  function tickRepo(name, on) {
    if (have.has(name)) return;
    const i = order.indexOf(name);
    if (on && i < 0) order.push(name);
    if (!on && i >= 0) order.splice(i, 1);
    if (!order.includes(mark)) mark = order[0] || '';
  }
  function changed() {
    draw();
    if (o.onChange) o.onChange({ chosen: chosen(), marked: marked() });
  }

  // The repos the search and the chip leave, over every page.
  function matches() {
    const q = query.toLowerCase();
    return all.filter(r => (!owner || ownerOf(r.name) === owner) && (!q || r.name.toLowerCase().includes(q)));
  }

  function drawOwners() {
    const counts = new Map();
    for (const r of all) counts.set(ownerOf(r.name), (counts.get(ownerOf(r.name)) || 0) + 1);
    const chip = (id, label, n) => h('button', {
      class: 'kit-chip' + (owner === id ? ' on' : ''), type: 'button', dataset: { owner: id }, 'aria-pressed': String(owner === id),
      onclick: () => { owner = id; page = 0; changed(); },
    }, label, h('span', { class: 'kit-n' }, String(n)));
    // One owner needs no chips.
    owners.replaceChildren(...(counts.size < 2 ? [] : [chip('', 'all', all.length), ...[...counts.keys()].sort().map(k => chip(k, k, counts.get(k)))]));
  }

  function rowOf(r) {
    const had = have.has(r.name);
    const on = had || order.includes(r.name);
    const input = h('input', { type: 'checkbox', checked: on, disabled: had, value: r.name, onchange: () => { tickRepo(r.name, input.checked); changed(); } });
    let markBtn = null;
    if (o.mark && on && !had) {
      const here = r.name === marked();
      const title = typeof o.mark.title === 'function' ? o.mark.title(r.name) : o.mark.title;
      markBtn = h('button', { class: 'kit-repo-mark' + (here ? ' on' : ''), type: 'button', title, 'aria-pressed': String(here), onclick: () => { mark = r.name; changed(); } }, here ? o.mark.on : o.mark.off);
    }
    const meta = had ? o.have.label : (r.private ? 'private · ' : '') + ago(r.updated);
    return h('div', { class: 'kit-repo-row' + (had ? ' kit-repo-had' : ''), dataset: { name: r.name } },
      h('label', { class: 'kit-tick kit-repo-name' }, input, h('span', null, r.name)), markBtn, h('span', { class: 'kit-repo-meta' }, meta));
  }

  // A redraw replaces the rows and chips, so the control the user pressed
  // leaves the page: focusKey names it first and refocus finds its
  // replacement (the same row's box or mark, the same owner's chip).
  function focusKey() {
    const a = document.activeElement;
    if (!a || !el.contains(a)) return null;
    const r = a.closest('.kit-repo-row');
    if (r) return `.kit-repo-row[data-name="${CSS.escape(r.dataset.name)}"] ${a.classList.contains('kit-repo-mark') ? '.kit-repo-mark' : 'input[type=checkbox]'}`;
    if (a.closest('.kit-repo-owners')) return `.kit-repo-owners .kit-chip[data-owner="${CSS.escape(a.dataset.owner)}"]`;
    return null;
  }
  function draw() {
    const key = focusKey();
    drawParts();
    if (key && !el.contains(document.activeElement)) {
      const n = el.querySelector(key);
      if (n) n.focus();
    }
  }
  function drawParts() {
    if (typedOnly && !all) return;
    const ready = !!all && !failure;
    search.disabled = !all;
    search.hidden = !!failure;
    owners.hidden = !ready;
    allLine.hidden = !ready;
    pager.hidden = true;
    count.textContent = `${chosen().length} chosen`;
    if (failure) {
      scroll.replaceChildren(h('p', { class: 'kit-repo-msg kit-repo-failed' }, failure));
      return;
    }
    if (!all) {
      scroll.replaceChildren(h('p', { class: 'kit-repo-msg' }, 'Listing your repos…'));
      return;
    }
    drawOwners();
    const m = matches();
    const pages = Math.max(1, Math.ceil(m.length / PER_PAGE));
    page = Math.min(page, pages - 1);
    const shown = m.slice(page * PER_PAGE, (page + 1) * PER_PAGE);
    // The line ticks every repo the search and the chip leave, on every
    // page: half-ticked while only some are, and a press then unticks them
    // all. Repos already chosen elsewhere are counted but never ticked.
    const free = m.filter(r => !have.has(r.name));
    const ticked = free.filter(r => order.includes(r.name)).length;
    const words = `Tick all ${m.length}${query ? (m.length === 1 ? ' match' : ' matches') : ''}${owner ? ` in ${owner}` : ''}`;
    allWords.textContent = words;
    allBox.setAttribute('aria-label', words);
    allBox.checked = free.length > 0 && ticked === free.length;
    allBox.indeterminate = ticked > 0 && ticked < free.length;
    allBox.disabled = free.length === 0;
    allBox.onchange = () => {
      for (const r of free) tickRepo(r.name, ticked === 0);
      changed();
    };
    allLine.hidden = m.length === 0;
    scroll.replaceChildren(...(shown.length
      ? shown.map(rowOf)
      : [h('p', { class: 'kit-repo-msg' }, query ? `No repo matches “${query}”.` : 'There are no repos to list.')]));
    range.textContent = `page ${page + 1} of ${pages}`;
    prev.disabled = page === 0;
    next.disabled = page >= pages - 1;
    pager.hidden = false;
  }

  search.addEventListener('input', () => { query = search.value.trim(); page = 0; draw(); });
  prev.addEventListener('click', () => { page--; draw(); });
  next.addEventListener('click', () => { page++; draw(); });

  if (typedInput) {
    const setError = text => { typedError.textContent = text || ''; };
    // While typing, a repo counts as chosen; an org link and a repo in the
    // list act once the value is committed (Enter or leaving the field), and
    // only then does a bad value say so.
    typedInput.addEventListener('input', () => {
      setError();
      const p = parseRepo(typedInput.value);
      const repo = p && p.repo && !haveName(p.repo) ? p.repo : '';
      if (repo !== typedRepo) {
        typedRepo = repo;
        changed();
      }
    });
    typedInput.addEventListener('change', () => {
      const text = typedInput.value.trim();
      if (!text) return;
      const p = parseRepo(text);
      if (!p) {
        setError(`${text} isn't owner/name or a GitHub link.`);
        return;
      }
      if (p.org) {
        const theirs = (all || []).filter(r => ownerOf(r.name).toLowerCase() === p.org.toLowerCase() && !haveName(r.name));
        if (!theirs.length) {
          setError(`No listed repo belongs to ${p.org}.`);
          return;
        }
        for (const r of theirs) tickRepo(r.name, true);
      } else {
        if (haveName(p.repo)) {
          setError(`${haveName(p.repo)}: ${o.have.label}`);
          return;
        }
        const r = listed(p.repo);
        if (!r) return;
        tickRepo(r.name, true);
      }
      typedInput.value = '';
      typedRepo = '';
      changed();
    });
  }

  draw();
  return {
    el,
    scroll,
    chosen,
    marked,
    setRepos(list) {
      all = sorted(list || []);
      failure = '';
      if (typedOnly) el.replaceChildren(...listParts, typedPart);
      typedOnly = false;
      draw();
    },
    failed(text) {
      failure = text || "Your repos couldn't be listed.";
      if (typedOnly) el.replaceChildren(...listParts, typedPart);
      typedOnly = false;
      draw();
    },
  };
}
