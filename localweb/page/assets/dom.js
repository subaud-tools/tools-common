import { createSelection } from './selection.js';
import { MESSAGE_STATES } from './msgstate.js';
import { submitOnEnter } from './enter.js';
import { openGuide, badgeIfBeta } from './guide.js';
import { rowMenu } from './frontpage.js';

// DOM builders for the kit's components. Each returns plain elements styled by
// kit.css; the CSS classes are the contract and also work from static HTML.

// h creates an element. attrs: class → className, on<event> → listener,
// dataset → data-*, booleans set or remove the attribute; string children are
// text (never HTML). null, undefined and false children are skipped.
export function h(tag, attrs, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === undefined || v === null) continue;
    if (k === 'class') el.className = v;
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (typeof v === 'boolean') {
      if (k in el) el[k] = v;
      else el.toggleAttribute(k, v);
    } else if (k in el && k !== 'list' && k !== 'form') el[k] = v;
    else el.setAttribute(k, v);
  }
  for (const c of children.flat()) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c instanceof Node ? c : String(c));
  }
  return el;
}

const count = n => (n === undefined || n === null || n === '' ? null : h('span', { class: 'kit-n' }, String(n)));

const LIVE_TEXT = { live: 'live', polling: 'polling', down: 'offline' };

// alsoOpen is the bar's "also open" area: other work a click away (diazo's
// other plans). It is one button of fixed width, so the bar never moves as
// the work changes: it counts the work and how much waits on the user, and opens
// a floating list with every item in full.
function alsoOpen() {
  const dot = h('i');
  const text = h('span', { class: 'kit-also-text' });
  const btn = h('button', { class: 'kit-also-btn', type: 'button', 'aria-haspopup': 'true', 'aria-expanded': 'false' }, dot, text);
  const el = h('span', { class: 'kit-also', hidden: true }, btn);
  let items = [];
  let menu = null;

  // The page you are on is listed in its place, so the list reads the same
  // on every page; its row says so and only closes the list.
  const row = it => h('button', {
    class: 'kit-also-row', type: 'button', role: 'menuitem', dataset: { tone: it.tone || 'idle' },
    'aria-current': it.current ? 'page' : null,
    onclick: () => { closeMenu(); if (!it.current) it.onClick(); },
  }, h('i'), h('span', { class: 'kit-also-name' }, it.label, it.current ? h('span', { class: 'kit-also-here' }, 'you are here') : null),
  it.detail ? h('span', { class: 'kit-also-detail' }, it.detail) : null);

  const onKey = e => { if (e.key === 'Escape' && !e.isComposing) closeMenu(); };
  const onDown = e => { if (!menu.contains(e.target) && !btn.contains(e.target)) closeMenu(); };
  function closeMenu() {
    if (!menu) return;
    menu.remove();
    menu = null;
    btn.setAttribute('aria-expanded', 'false');
    document.removeEventListener('keydown', onKey, true);
    document.removeEventListener('pointerdown', onDown, true);
  }
  function openMenu() {
    menu = h('div', { class: 'kit-float kit-also-menu', role: 'menu' }, items.map(row));
    document.body.append(menu);
    const r = btn.getBoundingClientRect();
    menu.style.top = `${r.bottom + 4}px`;
    menu.style.right = `${Math.max(8, document.documentElement.clientWidth - r.right)}px`;
    btn.setAttribute('aria-expanded', 'true');
    document.addEventListener('keydown', onKey, true);
    document.addEventListener('pointerdown', onDown, true);
  }
  btn.addEventListener('click', () => (menu ? closeMenu() : openMenu()));

  return {
    el,
    set(next) {
      closeMenu();
      items = next.slice();
      const you = items.filter(it => it.tone === 'you').length;
      btn.dataset.tone = you ? 'you' : 'idle';
      text.textContent = (you ? `${you} ${you === 1 ? 'needs' : 'need'} you · ` : '') + `${items.length} open`;
      el.hidden = !items.length;
    },
  };
}

// bar is the top bar: brand, section controls with counts, status text, the
// "also open" button, the live pill, Guide, theme, and the one filled primary
// button.
export function bar(o) {
  const ctls = new Map();
  let sectionsShown = true;
  const sectionButton = s => h('button', { class: 'kit-ctl', type: 'button', hidden: !sectionsShown, dataset: { id: s.id }, onclick: () => o.onSection && o.onSection(s.id) }, s.label, count(s.count));
  for (const s of o.sections || []) ctls.set(s.id, sectionButton(s));
  // The section buttons sit between the brand and the status text; a
  // redraw (setSections) puts the new ones in the same place.
  const status = h('span', { class: 'kit-status' }, o.status || '');
  const also = alsoOpen();
  const pill = h('span', { class: 'kit-live', hidden: true, role: 'status' });
  const themeControl = o.theme || h('button', { class: 'kit-ctl', type: 'button' }, 'theme');
  // Guide is on every page, left of the theme control (guide.js).
  const guideControl = h('button', { class: 'kit-ctl kit-guide-btn', type: 'button', onclick: () => void openGuide() }, 'Guide');
  // Sign in again asks the server (localweb's POST /signin) to open a
  // signed-in tab of this page; the token never comes back to the page.
  // o.signIn swaps fetch, setTimeout, close and reload (tests).
  const env = o.signIn || {};
  const doFetch = env.fetch || ((...a) => fetch(...a));
  const setT = env.setTimeout || ((f, ms) => setTimeout(f, ms));
  const closeTab = env.close || (() => window.close());
  const reload = env.reload || (() => location.reload());
  function signInButton() {
    const btn = h('button', { class: 'kit-signin', type: 'button' }, 'Sign in again');
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      let line = 'Opened a signed-in tab.';
      let opened = false;
      try {
        const res = await doFetch('/signin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ page: location.pathname + location.search + location.hash }),
        });
        if (!res.ok) line = `Could not open a tab (HTTP ${res.status}). Ask your session for a link.`;
        else opened = true;
      } catch {
        line = 'Could not reach the server. Ask your session for a link.';
      }
      const note = h('span', { class: 'kit-signin-note' }, line);
      btn.replaceWith(note);
      if (opened) waitForSignIn(note);
    });
    return btn;
  }
  // The new tab's sign-in sets the cookie for the whole browser. localweb
  // checks the token before routing any /api/ path, so a probe of /api/poll
  // answers 401 while signed out and anything else once signed in (404 where
  // a tool has no /api/poll, as casebook). Then this tab closes when the
  // browser allows (one page of history, not in a frame), else reloads. It
  // checks once a second for a minute, then says to close it; a network
  // error just means check again.
  function waitForSignIn(note) {
    let checks = 0;
    const check = async () => {
      checks++;
      let ok = false; // signed in
      try {
        ok = (await doFetch('/api/poll', { credentials: 'same-origin' })).status !== 401;
      } catch {
        // the server is away for now: check again
      }
      if (ok) {
        closeTab();
        setT(reload, 300);
      } else if (checks >= 60) {
        note.textContent = 'Opened a signed-in tab. You can close this one.';
      } else {
        setT(check, 1000);
      }
    };
    setT(check, 1000);
  }
  const primary = h('button', { class: 'kit-primary', type: 'button', hidden: true });
  let run = null;
  primary.addEventListener('click', () => run && run());

  // A beta tool (its guide entry says so) carries " · beta" after its name.
  const brand = h(o.brand.href ? 'a' : 'span', { class: 'kit-brand', href: o.brand.href || null }, o.brand.mark || null, o.brand.name);
  const beta = badgeIfBeta(brand);
  const handle = {
    beta,
    el: h('header', { class: 'kit-bar' },
      brand,
      ...ctls.values(), status, h('span', { class: 'kit-sp' }), also.el, pill, guideControl, themeControl, primary),
    themeControl,
    guideControl,
    setSection(id) {
      for (const [k, el] of ctls) {
        el.classList.toggle('on', k === id);
        if (k === id) el.setAttribute('aria-current', 'page');
        else el.removeAttribute('aria-current');
      }
    },
    setSectionsShown(shown) {
      sectionsShown = !!shown;
      for (const el of ctls.values()) el.hidden = !shown;
    },
    // setSections redraws the section buttons where they were, with the
    // same look and onSection, for one bar kept across pages. They keep
    // setSectionsShown's state; active (or none) is the one on.
    setSections(sections, active) {
      for (const el of ctls.values()) el.remove();
      ctls.clear();
      for (const s of sections || []) ctls.set(s.id, sectionButton(s));
      status.before(...ctls.values());
      handle.setSection(active);
    },
    setCount(id, n) {
      const el = ctls.get(id);
      if (!el) return;
      el.querySelector('.kit-n')?.remove();
      const c = count(n);
      if (c) el.append(c);
    },
    setStatus(text, opts = {}) {
      status.textContent = text;
      if (opts.tone && opts.tone !== 'muted') status.dataset.tone = opts.tone;
      else status.removeAttribute('data-tone');
    },
    setLive(s, text) {
      pill.hidden = false;
      pill.dataset.state = s;
      // setLive('stale') with no text is what every tool's onStale (and
      // onStatus, on live()'s stale) calls on a 401: the page is signed out,
      // whatever the tool's staleText says.
      const signedOut = s === 'stale' && text == null;
      pill.classList.toggle('kit-signedout', signedOut);
      if (signedOut) {
        pill.replaceChildren(h('i'), h('span', { class: 'kit-live-text' }, 'signed out'), signInButton());
        return;
      }
      pill.replaceChildren(h('i'), text ?? (LIVE_TEXT[s] || s));
    },
    setPrimary(p) {
      run = p ? p.run : null;
      primary.hidden = !p;
      primary.textContent = p ? p.label : '';
    },
    setElsewhere(items) {
      also.set(items || []);
    },
  };
  handle.setSection(o.active);
  handle.setPrimary(o.primary || null);
  return handle;
}

// band is the strip under the bar with the page's title, one height (104px)
// at every width. Its places, the same on every page: on the title line, the
// title, beside (a state pill, a size, an email), fold (beside nodes that move
// into the band's ⋯ on a phone), then at the line's right end end (the page's
// actions), search (a field: { placeholder, value, onInput }) and the one ⋯;
// on the second line, under (a stage track, status pills, a back link), then
// at its right end underEnd (the needs-you pill) and sort (a list's switch,
// sortedList's band). fold is [{ node, item }]: node shows beside the title on
// a wide page, and on a phone it hides and item (a rowMenu item, optional)
// shows in the ⋯. menu is the tool's own ⋯ items, at every width. The band
// draws one ⋯ (rowMenu), only while there is something to put in it. Each
// setter changes its own part in place; an empty place draws nothing.
export function band(o) {
  const title = h('h1', { class: 'kit-band-title' }, o.title);
  const line = h('div', { class: 'kit-band-line' }, title);
  const el = h('header', { class: 'kit-band' }, line);
  const nodes = xs => [xs || []].flat().filter(x => x !== null && x !== undefined && x !== false);
  const s = { beside: [], fold: [], end: [], search: null, menu: [], under: [], underEnd: [], sort: null };
  let under = null;
  let field = null;
  // The title line's parts are kept and changed in place, never rebuilt: the
  // search field is never moved, so a setter called while the reader types in
  // it leaves it focused with its caret and selection.
  const foldEl = h('span', { class: 'kit-band-fold' });
  const endEl = h('div', { class: 'kit-band-end' });
  const drawLine = () => {
    for (const c of [...line.childNodes]) if (c !== title && c !== foldEl && c !== endEl) c.remove();
    const anchor = foldEl.parentNode === line ? foldEl : endEl.parentNode === line ? endEl : null;
    for (const n of s.beside) line.insertBefore(typeof n === 'string' ? document.createTextNode(n) : n, anchor);
    const folds = s.fold.map(f => f.node).filter(n => n !== null && n !== undefined && n !== false);
    if (folds.length) {
      foldEl.replaceChildren(...folds);
      if (foldEl.parentNode !== line) line.insertBefore(foldEl, endEl.parentNode === line ? endEl : null);
    } else foldEl.remove();
    const items = s.fold.filter(f => f.item);
    let more = null;
    if (items.length || s.menu.length) {
      const m = rowMenu({ label: 'More', buttonClass: 'kit-row-more', items: [...items.map(f => f.item), ...s.menu] });
      // the fold's items show only on a phone, where their nodes are hidden
      m.querySelectorAll('.kit-row-pop > *').forEach((it, i) => { if (i < items.length) it.classList.add('kit-band-fold-item'); });
      more = h('div', { class: `kit-band-more${s.menu.length ? '' : ' kit-band-phone'}` }, m);
    }
    for (const c of [...endEl.childNodes]) if (c !== field) c.remove();
    if (field && field.parentNode !== endEl) endEl.append(field);
    if (field) field.before(...s.end);
    else endEl.append(...s.end);
    if (more) endEl.append(more);
    if (!endEl.childNodes.length) endEl.remove();
    else if (endEl.parentNode !== line) line.append(endEl);
  };
  const drawUnder = () => {
    const tail = [...s.underEnd, s.sort].filter(Boolean);
    if (!s.under.length && !tail.length) {
      under?.remove();
      under = null;
      return;
    }
    if (!under) el.append(under = h('div', { class: 'kit-band-under' }));
    under.replaceChildren(...s.under, ...(tail.length ? [h('div', { class: 'kit-band-under-end' }, tail)] : []));
  };
  const handle = {
    el,
    get search() { return field; },
    setTitle(t) {
      title.replaceChildren(t);
    },
    setBeside(xs) { s.beside = nodes(xs); drawLine(); },
    setFold(fs) { s.fold = [fs || []].flat().filter(Boolean); drawLine(); },
    setEnd(xs) { s.end = nodes(xs); drawLine(); },
    setMenu(items) { s.menu = items || []; drawLine(); },
    setSearch(q) {
      field = q ? h('input', {
        class: 'kit-input kit-band-search', type: 'search', name: 'search',
        placeholder: q.placeholder || 'Search', 'aria-label': q.label || q.placeholder || 'Search',
        oninput: e => q.onInput && q.onInput(e.target.value),
      }) : null;
      if (field) field.value = q.value || '';
      drawLine();
    },
    setUnder(xs) { s.under = nodes(xs); drawUnder(); },
    setUnderEnd(xs) { s.underEnd = nodes(xs); drawUnder(); },
    setSort(node) { s.sort = node || null; drawUnder(); },
  };
  s.beside = nodes(o.beside);
  s.fold = [o.fold || []].flat().filter(Boolean);
  s.end = nodes(o.end);
  s.menu = o.menu || [];
  s.under = nodes(o.under);
  s.underEnd = nodes(o.underEnd);
  s.sort = o.sort || null;
  handle.setSearch(o.search || null);
  drawUnder();
  return handle;
}

function chipRow(group, chips, onChip) {
  return (chips || []).map(c =>
    h('button', { class: 'kit-chip' + (c.on ? ' on' : ''), type: 'button', dataset: { id: c.id }, onclick: () => onChip && onChip(group, c.id) }, c.label, count(c.count)));
}

// list is the list panel: a section label, view and filter chips, rows, and
// a footer. It satisfies the keyboard layer's ListNav. The cursor (.cur) is
// where j/k are; the open row (.open) is the one in the reading column.
export function list(o) {
  let items = [];
  let keys = [];
  let rows = [];
  let cur = -1;
  let opened = -1;
  // Selection lives in a store (shared with other views when o.selection is
  // given), keyed by row identity: the row's id, else a private key + title
  // identity that only this list uses. It covers rows not rendered and
  // survives setItems.
  const store = o.selection || createSelection();
  const views = h('div', { class: 'kit-chips', dataset: { group: 'view' } });
  const filters = h('div', { class: 'kit-chips', dataset: { group: 'filter' } });
  const body = h('div', { class: 'kit-rows', role: 'list' });
  // The optional search field: onInput on every input event (no debounce;
  // debounce in the page if the query is costly). Esc in it clears the text
  // first, then leaves the field (the keyboard layer's field rule).
  const search = o.search
    ? h('input', { class: 'kit-search', type: 'search', placeholder: o.search.placeholder || 'search', value: o.search.value || '', 'aria-label': o.search.placeholder || 'search' })
    : null;
  if (search) {
    search.addEventListener('input', () => o.search.onInput(search.value));
    search.addEventListener('keydown', e => {
      if (e.key !== 'Escape' || e.isComposing || !search.value) return;
      e.preventDefault(); // handled: the keyboard layer won't also blur
      search.value = '';
      o.search.onInput('');
    });
  }
  const el = h('aside', { class: 'kit-list' },
    h('div', { class: 'kit-lh' }, h('div', { class: 'kit-eyebrow' }, o.label), views, filters, search),
    body,
    o.foot ? h('div', { class: 'kit-foot' }, o.foot) : null);

  const PRIVATE = '\u0000';
  const keyOf = (item, i) => {
    const r = o.row(item);
    if (r.id !== undefined) return String(r.id);
    return PRIVATE + (r.key !== undefined ? r.key + PRIVATE + r.title : 'i' + i);
  };
  const clamp = i => Math.max(0, Math.min(items.length - 1, i));
  const isSel = i => store.has(keys[i]);
  const selectable = i => !!o.row(items[i]).selectable;
  // What onSelect reports on: the id set and which rendered rows are selected.
  const snapshot = () => store.ids().join('\n') + '\u0001' + keys.filter(k => store.has(k)).join('\n');
  let last = snapshot();

  function paint() {
    rows.forEach((r, i) => {
      r.classList.toggle('cur', i === cur);
      r.classList.toggle('open', i === opened);
      r.classList.toggle('sel', isSel(i));
      if (i === opened) r.setAttribute('aria-current', 'true');
      else r.removeAttribute('aria-current');
      const box = r.querySelector('.kit-box');
      if (box) box.setAttribute('aria-checked', String(isSel(i)));
    });
  }

  // Every change to the store, from this list or another view, repaints and
  // reports once.
  let quiet = false; // setItems' own store changes: it reports once itself
  function changed() {
    if (quiet) return;
    paint();
    const now = snapshot();
    if (now === last) return;
    last = now;
    if (o.onSelect) o.onSelect(handle.selected());
  }
  const unsubscribe = store.onChange(changed);

  function render() {
    rows = items.map((item, i) => {
      const r = o.row(item);
      const box = r.selectable
        ? h('span', { class: 'kit-box', role: 'checkbox', 'aria-checked': 'false', onclick: e => { e.stopPropagation(); e.shiftKey ? handle.toggleRange(i) : handle.toggle(i); } })
        : null;
      return h('div', { class: 'kit-row' + (box ? ' has-box' : ''), role: 'listitem', onclick: e => (e.shiftKey && box ? handle.toggleRange(i) : handle.open(i)) },
        box,
        h('div', { class: 'kit-row-main' },
          r.key !== undefined ? h('div', { class: 'kit-kicker' }, r.key) : null,
          h('div', { class: 'kit-title' }, r.title),
          r.sub ? h('div', { class: 'kit-sub' }, r.sub) : null),
        r.meta !== undefined ? h('span', { class: 'kit-meta' }, r.meta) : null);
    });
    body.replaceChildren(...rows);
  }

  const handle = {
    el,
    selection: store,
    setItems(next) {
      const openKey = opened >= 0 ? keys[opened] : null;
      const curKey = cur >= 0 ? keys[cur] : null;
      items = next.slice();
      keys = items.map(keyOf);
      opened = openKey === null ? -1 : keys.indexOf(openKey);
      const was = cur;
      cur = curKey === null ? -1 : keys.indexOf(curKey);
      if (cur < 0 && items.length) cur = was >= 0 ? clamp(was) : opened >= 0 ? opened : 0;
      render();
      // Rows without an id belong to this page only: drop their stale identities.
      const gone = store.ids().filter(k => k.startsWith(PRIVATE) && !keys.includes(k));
      if (gone.length) {
        quiet = true;
        try {
          store.deselect(gone);
        } finally {
          quiet = false;
        }
      }
      changed(); // the one paint and report
    },
    setChips(group, chips) {
      (group === 'view' ? views : filters).replaceChildren(...chipRow(group, chips, o.onChip));
    },
    move(d) {
      if (!items.length) return;
      cur = clamp((cur < 0 ? 0 : cur) + d);
      paint();
      rows[cur].scrollIntoView?.({ block: 'nearest' });
      if (o.openOnMove) handle.open(cur);
    },
    open(i = cur) {
      if (i < 0 || i >= items.length) return;
      cur = opened = i;
      paint();
      if (o.onOpen) o.onOpen(items[i], i);
    },
    toggle(i = cur) {
      if (i < 0 || i >= items.length || !selectable(i)) return;
      store.toggle(keys[i]);
    },
    toggleRange(i = cur) {
      if (i < 0 || i >= items.length) return;
      const order = keys.filter((_, j) => selectable(j));
      const anchor = store.anchor();
      if (anchor === null || !order.includes(anchor)) return handle.toggle(i);
      if (selectable(i)) store.range(anchor, keys[i], order);
    },
    selected: () => items.filter((_, i) => isSel(i)),
    selectedIds: () => store.ids().filter(k => !k.startsWith(PRIVATE)),
    selectAll: ids => store.all(ids.map(String)),
    deselect: ids => store.deselect(ids.map(String)),
    clearSelection: () => store.clear(),
    current: () => cur,
    setSearch(text) {
      if (search) search.value = text;
    },
    destroy() {
      unsubscribe();
    },
  };
  if (search) handle.focusSearch = () => search.focus();
  handle.setChips('view', o.views);
  handle.setChips('filter', o.filters);
  return handle;
}

// facts is the reading column's facts line: muted labels, bold values.
export function facts(pairs) {
  return h('div', { class: 'kit-facts' }, pairs.map(([label, value]) =>
    h('span', null, label, ' ', value instanceof Node && value.tagName === 'B' ? value : h('b', null, value))));
}

// buttons is a row of lowercase mono buttons: fill marks the one primary,
// danger is a destructive verb (red text).
export function buttons(bs) {
  return h('div', { class: 'kit-btns' }, bs.map(b =>
    h('button', {
      class: 'kit-btn' + (b.fill ? ' fill' : '') + (b.danger ? ' danger' : ''),
      type: 'button',
      disabled: !!b.disabled,
      onclick: () => b.run && b.run(),
    }, b.label)));
}

// card is a colour-edged card that holds its own actions. edge: signal (needs
// you), agent (the agent's), wait (queued / draft). A head that is a string is
// its crumb, so it gets the header's ellipsis when it doesn't fit.
export function card(o) {
  const head = typeof o.head === 'string' ? h('span', { class: 'kit-card-crumb' }, o.head) : o.head;
  return h('div', { class: 'kit-card' + (o.edge ? ' edge-' + o.edge : '') },
    head ? h('div', { class: 'kit-card-head' }, head) : null,
    o.body !== undefined ? h('div', { class: 'kit-card-body' }, o.body) : null,
    o.actions && o.actions.length ? buttons(o.actions) : null);
}

// lineSide is the right side of a card's line (cardLine, settingLine): its
// small mono meta, or null, and its actions as link-buttons. An action is
// { label, run, danger, disabled, title, data }: title is its aria-label and
// data its data-* attributes.
function lineSide(o) {
  const meta = o.meta !== undefined && o.meta !== null && o.meta !== '' ? h('small', { class: 'kit-card-line-meta' }, o.meta) : null;
  const acts = (o.actions || []).map(a => h('button', {
    class: 'kit-label-link kit-card-line-act' + (a.danger ? ' danger' : ''),
    type: 'button',
    disabled: !!a.disabled,
    'aria-label': a.title || null,
    dataset: a.data,
    onclick: () => a.run && a.run(),
  }, a.label));
  return { meta, acts };
}
const dotted = xs => xs.flatMap((x, i) => (i ? [' · ', x] : [x]));

// cardLine is one line in a card: its words on the left, and on the right its
// small mono meta and link-buttons, a dot between each. Lines in a card have a
// rule between them.
export function cardLine(o) {
  const { meta, acts } = lineSide(o);
  const side = meta ? [meta, ...acts] : acts;
  return h('div', { class: 'kit-card-line' },
    h('span', { class: 'kit-card-line-main' }, o.main),
    side.length ? h('span', { class: 'kit-card-line-side' }, dotted(side)) : null);
}

let fieldIds = 0;

// nameless finds what in a setting's control the setting's name should name:
// the control itself when it is a form control or has a role, else the one
// input, select or textarea inside it; and only when that has no name of its
// own (an aria-label, an aria-labelledby, a label for it or around it).
function nameless(control) {
  if (!(control instanceof Element)) return null;
  const FIELD = 'input, select, textarea';
  let el = control;
  if (!control.matches(FIELD + ', button, [role]')) {
    const inside = control.querySelectorAll(FIELD);
    if (inside.length !== 1) return null;
    [el] = inside;
  }
  if (el.hasAttribute('aria-label') || el.hasAttribute('aria-labelledby') || el.closest('label')) return null;
  if (el.id && [...control.querySelectorAll('label')].some(l => l.htmlFor === el.id)) return null;
  return el;
}

// settingLine is one setting in a card, a card line whose height never
// depends on its right side: the name (and a muted hint after it) in a fixed
// first column, its control next, and the side (meta, then actions, as
// cardLine's) at the right end. On a phone the name and the side share the
// first row and the control is under them at full width. The side never goes
// under the control: a meta too long for its row is cut with an ellipsis (its
// title says it whole) and the actions keep their width. The name is one line,
// cut with an ellipsis when it doesn't fit (its title says it whole). With no
// control it is the name and the side on one row; actions that don't fit
// beside the name go under it. A control with no name of its own (nameless)
// is named by the setting's name: id, or one the kit makes, ties them.
export function settingLine(o) {
  const { meta, acts } = lineSide(o);
  const has = o.control !== undefined && o.control !== null && o.control !== false && o.control !== '';
  const label = h('span', { class: 'kit-setting-line-label', id: o.id || null }, o.name);
  const target = has ? nameless(o.control) : null;
  if (target) {
    if (!label.id) label.id = `kit-setting-${++fieldIds}`;
    target.setAttribute('aria-labelledby', label.id);
  }
  if (meta) meta.title = meta.textContent;
  return h('div', { class: 'kit-card-line kit-setting-line' + (has ? ' with-control' : '') },
    h('span', { class: 'kit-setting-line-name', title: o.name + (o.hint ? ' ' + o.hint : '') }, label,
      o.hint ? h('small', { class: 'kit-setting-line-hint' }, ' ' + o.hint) : null),
    has ? h('span', { class: 'kit-setting-line-control' }, o.control) : null,
    meta || acts.length ? h('span', { class: 'kit-card-line-side kit-setting-line-side' }, meta,
      acts.length ? h('span', { class: 'kit-setting-line-acts' }, meta ? ' · ' : null, dotted(acts)) : null) : null);
}

// textField is a label over a text input, with an optional hint line under it;
// onInput gets the value on every input. mono sets the input in the mono face
// (a repo, a code). It returns { el, input }.
export function textField(o) {
  const input = h('input', {
    class: 'kit-input' + (o.mono ? ' mono' : ''), type: 'text', id: o.id || `kit-field-${++fieldIds}`,
    value: o.value || '', placeholder: o.placeholder || '',
  });
  if (o.onInput) input.addEventListener('input', () => o.onInput(input.value));
  const el = h('div', { class: 'kit-field' },
    h('label', { class: 'kit-field-label', for: input.id }, o.label),
    input,
    o.hint ? h('p', { class: 'kit-field-hint' }, o.hint) : null);
  return { el, input };
}

// The one pop-out open on the page (a row's ⋯ menu, a dropdown): opening
// another closes it.
let popOpen = null;

// popOut is the open and close of a button's pop-out, shared by rowMenu and
// pickField: show opens pop and closes whichever was open; a press outside
// wrap, or Esc, closes it. onToggle hears it open and close unless the call
// was quiet. It listens on the document wrap lives in. A pop with the popover
// attribute shows in the top layer, over any card or sheet that would clip it,
// so it adds nothing to the page's size. place, when given, puts the pop where
// it belongs (placePop): called once it shows, and again when the window is
// resized or anything but the pop itself scrolls, so it stays at its button.
// A pop opened before it is in the page, or taken out of the top layer by the
// browser when its row is moved, shows there once it is in the page.
export function popOut({ wrap, btn, pop, onToggle, place }) {
  let doc = null, win = null, watch = null, was = false, kind = null;
  const moved = e => {
    if (e.target !== pop) place(e);
  };
  // Into the top layer, and to its place: at once when the pop is in the
  // page, else when the page next changes with it in. The browser takes a
  // pop out of the top layer when its row leaves the page or moves in it; one
  // that has left the page and is not back by the end of that change is
  // closed, quietly: nothing of it listens on.
  const top = () => {
    if (pop.hidden) return;
    if (!pop.isConnected) {
      if (was) close(true);
      return;
    }
    was = true;
    if (kind !== null) {
      // Drawn before it was in the page (wait): a top-layer pop again, with
      // the focus the caller gave one of its lines meanwhile.
      const had = doc.activeElement;
      pop.setAttribute('popover', kind);
      kind = null;
      Object.assign(pop.style, { position: '', opacity: '' });
      pop.showPopover();
      if (pop.contains(had) && doc.activeElement !== had) had.focus({ preventScroll: true });
    } else if (pop.hasAttribute('popover')) {
      if (pop.matches(':popover-open')) return;
      pop.showPopover();
    }
    raise(doc);
    place?.();
  };
  // A top-layer pop shown before it is in the page cannot show, and nothing
  // in it could take the focus until it does. A caller that redraws a row
  // with its menu open gives a line the focus as soon as the row is in (a
  // microtask queued while building it, which runs before the watch below
  // hears of the row). So until then the pop is an ordinary element, fixed
  // (it adds nothing to the page's size and a focus scrolls nothing) and not
  // drawn; top makes it the top-layer pop before the page is next drawn.
  const wait = () => {
    kind = pop.getAttribute('popover');
    pop.removeAttribute('popover');
    Object.assign(pop.style, { position: 'fixed', opacity: '0' });
  };
  const outside = e => {
    if (!wrap.contains(e.target)) close();
  };
  const esc = e => {
    if (e.key === 'Escape') close();
  };
  function close(quiet) {
    if (pop.hidden) return;
    pop.hidden = true;
    // A pop whose document went away (a removed frame) refuses to hide; it is
    // gone with it.
    try {
      if (pop.matches(':popover-open')) pop.hidePopover();
    } catch { /* its document is gone */ }
    watch?.disconnect();
    watch = null;
    if (kind !== null) {
      pop.setAttribute('popover', kind);
      kind = null;
      Object.assign(pop.style, { position: '', opacity: '' });
    }
    win?.removeEventListener('scroll', moved, true);
    win?.removeEventListener('resize', moved);
    win = null;
    btn.setAttribute('aria-expanded', 'false');
    doc?.removeEventListener('click', outside, true);
    doc?.removeEventListener('keydown', esc);
    if (popOpen === close) popOpen = null;
    if (!quiet) onToggle?.(false);
  }
  function show(quiet) {
    popOpen?.(quiet);
    doc = wrap.ownerDocument;
    pop.hidden = false;
    was = false;
    const layer = pop.hasAttribute('popover');
    if (layer && !pop.isConnected) wait();
    top();
    if (layer) {
      watch = new MutationObserver(top);
      watch.observe(doc, { childList: true, subtree: true });
    }
    if (place) {
      win = doc.defaultView;
      win?.addEventListener('scroll', moved, true);
      win?.addEventListener('resize', moved);
    }
    btn.setAttribute('aria-expanded', 'true');
    doc.addEventListener('click', outside, true);
    doc.addEventListener('keydown', esc);
    popOpen = close;
    if (!quiet) onToggle?.(true);
  }
  return { show, close, get open() { return !pop.hidden; } };
}

// A walk's ring and note (spotlight.js) and the tour's overlay (tour.js) are
// in the top layer too, and stay above any pop-out: the top layer draws in
// the order things entered it, so a pop-out shown after them puts them in
// again, keeping the focus and the scroll they had.
const ABOVE = '.kit-spot-ring, .kit-spot-card, .kit-tour';
function raise(doc) {
  for (const el of doc.querySelectorAll(ABOVE)) {
    if (!el.matches(':popover-open')) continue;
    const had = doc.activeElement, y = el.scrollTop;
    el.hidePopover();
    el.showPopover();
    el.scrollTop = y;
    if (had && had.isConnected && doc.activeElement !== had) had.focus({ preventScroll: true });
  }
}

// placePop puts a top-layer pop (position fixed) at its button, for pickField
// and rowMenu alike: 4px below the button when it fits there or there is more
// room below than above, else 4px above it; either way never taller than the
// room, scrolling inside itself. Across, pickField's menu (the default) goes
// on the button's left edge when it fits from there within the nearest card
// or sheet and the window, else on its right edge when it fits from that,
// else on the left edge wrapped to the room it has, and is never narrower
// than the button. right is a row menu's: on the button's right edge when it
// fits from there within the window, else its left edge when it fits from
// that, else the edge with more room, wrapped to it.
export function placePop(btn, pop, { right = false } = {}) {
  const doc = btn.ownerDocument;
  const b = btn.getBoundingClientRect();
  const c = right ? null : btn.closest('.kit-card, .kit-float')?.getBoundingClientRect();
  const fromLeft = Math.min(doc.documentElement.clientWidth, c ? c.right : Infinity) - b.left;
  const fromRight = b.right - Math.max(0, c ? c.left : 0);
  Object.assign(pop.style, { top: `${b.bottom + 4}px`, left: `${b.left}px`, right: 'auto', bottom: 'auto', minWidth: right ? '' : `${b.width}px`, maxWidth: '', maxHeight: '' });
  const w = pop.offsetWidth;
  const onRight = right ? w <= fromRight || (w > fromLeft && fromRight >= fromLeft) : w > fromLeft && w <= fromRight;
  const room = onRight ? fromRight : fromLeft;
  if (w > room) pop.style.maxWidth = `${Math.max(room, b.width)}px`;
  if (onRight) pop.style.left = `${b.right - pop.offsetWidth}px`;
  // Below the button when it fits there or there is more room below than
  // above; else above it. Either way capped to the room, scrolling inside.
  const winH = doc.defaultView.innerHeight;
  const below = winH - b.bottom - 4 - 8, above = b.top - 4 - 8;
  const tall = pop.offsetHeight;
  if (tall > below && above > below) {
    const ht = Math.min(tall, above);
    Object.assign(pop.style, { top: `${b.top - 4 - ht}px`, maxHeight: `${ht}px` });
  } else {
    pop.style.maxHeight = `${Math.max(0, below)}px`;
  }
}

// pickField is the kit's dropdown: a label over a button drawn as kit-input
// with a chevron, naming the current choice, that opens the kit's menu surface
// (kit-row-pop) listing each choice ({ value, label, detail?, blank? }) with
// its muted detail line and the current one in the soft signal fill. A blank
// choice (one that stands for none picked yet) reads muted on the button. The
// menu shows in the top layer, placed by placePop: 4px below the button on its
// left edge, or its right edge when the left would run past the nearest card,
// sheet or the window (neither fitting, the left edge with its lines wrapped),
// and is never narrower than the button.
// Enter, Space or an arrow opens it on the current choice, arrows move, Enter,
// Space or a press picks, Esc closes and gives the button the focus back. onPick hears a value that differs from the current one. It
// returns { el, button, value, set(value) }; set picks without onPick.
// more ({ label, choices }) ends the menu with one line reading label, set off
// by a rule: a press, Enter or Space on it picks nothing and leaves the menu
// open, with the line replaced by more.choices and the focus on the first of
// them. The menu opens collapsed every time, unless the current value is only
// in more.choices: then it opens on the longer list, so the current choice is
// always in the menu. labelHidden keeps the label for a screen reader and
// does not draw it (a grid or a table cell that already names the dropdown).
// size 'compact' is the dropdown for a bar or a band (kit-pick-compact on the
// field): the button 28px high with 12px words, the menu's rows as ever.
// reads is what the button shows instead of the current choice's label: a
// string, or a function of the current choice (undefined when the value is no
// choice), asked again on every pick and every set, so set(value) with the
// value it has reads again. With reads the button's title is those words in
// full, and the button is named by its label then those words. The menu
// reads each choice's own label. onCurrent hears a press, Enter or Space on
// the choice that is already the current one, after the menu has closed;
// onPick does not hear it. Without onCurrent that press only closes the menu.
export function pickField(o) {
  const rest = o.more?.choices || [];
  const all = [...o.choices, ...rest];
  let value = o.value ?? o.choices[0]?.value;
  const name = h('span', { class: 'kit-pick-label' });
  const says = o.reads !== undefined && o.reads !== null;
  const btn = h('button', {
    class: 'kit-input kit-pick-btn', type: 'button', id: o.id || `kit-field-${++fieldIds}`,
    'aria-haspopup': 'listbox', 'aria-expanded': 'false',
  }, name);
  const opts = all.map(c => h('button', {
    class: 'kit-pick-opt', type: 'button', role: 'option', dataset: { value: c.value },
    onclick: () => pick(c.value),
  }, h('span', { class: 'kit-pick-name' }, c.label), c.detail ? h('span', { class: 'kit-pick-detail' }, c.detail) : null));
  // The line that opens the rest, and the rule over it: kept in the menu and
  // hidden once pressed, so the press's target stays in the page.
  const moreLine = rest.length
    ? h('button', { class: 'kit-pick-opt kit-pick-more', type: 'button', role: 'option', 'aria-selected': 'false', onclick: () => expand() }, o.more.label)
    : null;
  const rule = moreLine ? h('hr', { role: 'presentation' }) : null;
  const pop = h('div', { class: 'kit-row-pop kit-pick-pop', role: 'listbox', 'aria-labelledby': btn.id, popover: 'manual' }, opts, rule, moreLine);
  pop.hidden = true;
  const box = h('div', { class: 'kit-pick' }, btn, pop);
  const label = h('label', { class: 'kit-field-label' + (o.labelHidden ? ' kit-label-hidden' : ''), for: btn.id }, o.label);
  const el = h('div', { class: 'kit-field' + (o.size === 'compact' ? ' kit-pick-compact' : '') }, label, box);
  // With reads, the button is named by its label and then its words: ids of
  // the kit's own, since the caller's id may hold a space.
  if (says) {
    const n = ++fieldIds;
    label.id = `kit-pick-label-${n}`;
    name.id = `kit-pick-reads-${n}`;
    btn.setAttribute('aria-labelledby', `${label.id} ${name.id}`);
  }
  const p = popOut({ wrap: box, btn, pop, onToggle: on => on || closed(), place: () => placePop(btn, pop) });
  // Whether the rest shows: the lines the arrows walk are the choices shown,
  // then the more line while it is there.
  let wide = false;
  const walk = () => (moreLine && !wide ? [...opts.slice(0, o.choices.length), moreLine] : opts);
  const onlyInRest = () => !o.choices.some(c => c.value === value) && rest.some(c => c.value === value);
  function widen(on) {
    wide = on;
    if (!moreLine) return;
    opts.slice(o.choices.length).forEach(b => { b.hidden = !on; });
    moreLine.hidden = rule.hidden = on;
  }
  function expand() {
    widen(true);
    placePop(btn, pop);
    show(opts[o.choices.length]);
  }
  const at = () => Math.max(0, all.findIndex(c => c.value === value));

  function set(v) {
    value = v;
    const c = all.find(x => x.value === v);
    const words = !says ? (c ? c.label : '') : String(typeof o.reads === 'function' ? o.reads(c) : o.reads);
    name.textContent = words;
    if (says) btn.title = words;
    btn.classList.toggle('blank', !!c?.blank);
    opts.forEach((b, i) => {
      const on = all[i].value === v;
      b.classList.toggle('on', on);
      b.setAttribute('aria-selected', String(on));
    });
    if (p.open && !wide && onlyInRest()) widen(true);
  }
  // An option given the focus is scrolled into view inside the menu.
  const show = opt => {
    opt?.focus({ preventScroll: true });
    opt?.scrollIntoView({ block: 'nearest' });
  };
  // Esc is the menu's while it is open: taken at the window, before a sheet's
  // own Esc would close the sheet.
  const esc = e => {
    if (!p.open) return closed();
    // A field taken off the page while open: close quietly and let the key by.
    if (!pop.isConnected) {
      p.close(true);
      return closed();
    }
    if (e.key !== 'Escape' || e.isComposing) return;
    e.preventDefault();
    e.stopPropagation();
    close();
  };
  let win = null;
  function open() {
    widen(onlyInRest());
    p.show();
    win = box.ownerDocument.defaultView;
    win.addEventListener('keydown', esc, true);
    show(opts[at()]);
  }
  function closed() {
    win?.removeEventListener('keydown', esc, true);
    win = null;
  }
  function close() {
    p.close();
    btn.focus();
  }
  function pick(v) {
    const changed = v !== value;
    set(v);
    close();
    if (changed) o.onPick?.(v);
    else o.onCurrent?.(v);
  }
  btn.addEventListener('click', () => (p.open ? p.close() : open()));
  btn.addEventListener('keydown', e => {
    if (!['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(e.key)) return;
    e.preventDefault();
    if (p.open) p.close();
    else open();
  });
  pop.addEventListener('keydown', e => {
    const lines = walk();
    const i = lines.indexOf(e.target);
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const n = lines.length;
      show(lines[((i < 0 ? Math.max(0, lines.indexOf(opts[at()])) : i) + (e.key === 'ArrowDown' ? 1 : n - 1)) % n]);
    } else if ((e.key === 'Enter' || e.key === ' ') && i >= 0) {
      e.preventDefault();
      if (lines[i] === moreLine) expand();
      else pick(all[opts.indexOf(lines[i])].value);
    } else if (e.key === 'Tab') {
      p.close();
    }
  });
  widen(false);
  set(value);
  return { el, button: btn, get value() { return value; }, set };
}

// The chip press being handled: a chipPick of the same label drawn during it
// is the redraw, and takes the focus back.
let chipPress = null;

// chipPick is a group of chips to choose from, named by its label: one
// button.kit-chip per chip ({ value, label, remove? }), those in chosen on
// with aria-pressed. One-of (the default): a press on the chip that is on
// does nothing, a press on another calls onToggle(value). many: every press
// calls onToggle(value). A chip with remove gets a ✕ button beside it (a
// sibling, named by remove) that calls onRemove(value). The caller keeps the
// state and redraws, as with sortSwitch; when the press had the focus and the
// group is redrawn during it, the chip pressed gets the focus back (after a
// remove, the ✕ that took its place, else the one before it). labelHidden
// keeps the label for a screen reader and does not draw it.
export function chipPick(o) {
  const chosen = new Set(o.chosen || []);
  const id = `kit-chips-${++fieldIds}`;
  const chips = [], xs = [];
  const set = h('div', { class: 'kit-chip-set' }, o.chips.map(c => {
    const on = chosen.has(c.value);
    const chip = h('button', {
      class: 'kit-chip' + (on ? ' on' : ''), type: 'button', dataset: { value: c.value }, 'aria-pressed': String(on),
      onclick: () => {
        if (o.many || !on) press(chip, { label: o.label, value: c.value }, () => o.onToggle(c.value));
      },
    }, c.label);
    chips.push(chip);
    if (!c.remove) return chip;
    const x = h('button', {
      class: 'kit-chip-x', type: 'button', 'aria-label': c.remove, title: c.remove,
      onclick: () => press(x, { label: o.label, x: xs.indexOf(x) }, () => o.onRemove?.(c.value)),
    }, '✕');
    xs.push(x);
    return h('span', { class: 'kit-chip-rm' + (on ? ' on' : '') }, chip, x);
  }));
  const el = h('div', { class: 'kit-chip-pick', role: 'group', 'aria-labelledby': id },
    h('span', { class: 'kit-field-label' + (o.labelHidden ? ' kit-label-hidden' : ''), id }, o.label), set);
  if (chipPress && !chipPress.made && chipPress.label === o.label) {
    chipPress.made = chipPress.x === undefined
      ? chips[o.chips.findIndex(c => c.value === chipPress.value)]
      : xs[Math.min(chipPress.x, xs.length - 1)];
  }
  function press(from, what, run) {
    const had = from.ownerDocument.activeElement === from;
    const p = chipPress = { ...what, made: null };
    try {
      run();
    } finally {
      chipPress = null;
    }
    if (had && p.made?.isConnected) p.made.focus();
  }
  return el;
}

// confirmBox is a tinted box inside a card that asks before something happens:
// its words, then a row of buttons. tone signal (the default) or danger.
export function confirmBox(o) {
  const tone = o.tone === 'danger' ? 'danger' : 'signal';
  return h('div', { class: 'kit-confirm ' + tone, role: 'group' },
    h('div', { class: 'kit-confirm-body' }, o.body),
    o.buttons && o.buttons.length ? buttons(o.buttons) : null);
}

// emptyCard is the card a list shows with nothing in it: a centred line of
// muted words and one button, { label, run, fill }.
export function emptyCard(o) {
  const a = o.action;
  return h('div', { class: 'kit-card kit-empty-card' },
    h('p', { class: 'kit-empty-card-text' }, o.text),
    a ? h('button', { class: 'kit-btn' + (a.fill ? ' fill' : ''), type: 'button', onclick: () => a.run && a.run() }, a.label) : null);
}

// keyedRows keeps a list's rows by key, so a poll changes only what changed:
// set(items) draws a row for a new key, removes the row of a key gone, calls
// update(row, item) only for an item whose data (as JSON) differs from last
// time, and puts the rows in the items' order by moving them. An open menu,
// details or input inside an unchanged row is never replaced. Without update,
// a changed row is drawn anew in its place. The container holds only the rows.
export function keyedRows(container, o) {
  let rows = new Map(); // key → { el, data }
  const place = (el, ref) => {
    if (el === ref) return;
    // moveBefore keeps a moved row's focus and state where the browser has it.
    if (container.moveBefore && el.parentNode === container && container.isConnected) {
      try {
        container.moveBefore(el, ref);
        return;
      } catch {
        // fall through to the plain move
      }
    }
    container.insertBefore(el, ref);
  };
  return {
    set(items) {
      const next = new Map();
      for (const item of items) {
        const key = String(o.key(item));
        if (next.has(key)) continue;
        const data = JSON.stringify(item);
        const had = rows.get(key);
        let el;
        if (!had) el = o.draw(item);
        else if (had.data === data) el = had.el;
        else if (o.update) {
          el = had.el;
          o.update(el, item);
        } else {
          el = o.draw(item);
          had.el.replaceWith(el);
        }
        next.set(key, { el, data });
      }
      for (const [key, r] of rows) if (!next.has(key)) r.el.remove();
      let ref = container.firstChild;
      for (const { el } of next.values()) {
        place(el, ref);
        ref = el.nextSibling;
      }
      rows = next;
    },
    get: key => rows.get(String(key))?.el ?? null,
  };
}

// codeBlock shows source with line numbers: a gutter <pre> and a source <pre>,
// two text nodes however long the file. It scrolls sideways, never wraps.
export function codeBlock(src, o = {}) {
  const start = o.start ?? 1;
  const lines = src.split(/\r?\n/);
  if (lines.length > 1 && lines[lines.length - 1] === '') lines.pop();
  const text = lines.join('\n');
  const gutter = lines.map((_, i) => start + i).join('\n');
  return h('div', { class: 'kit-code' },
    h('pre', { class: 'kit-gutter', 'aria-hidden': 'true' }, gutter),
    h('pre', { class: 'kit-src' }, o.highlight ? o.highlight(text) : text));
}

// fold is a collapsible section: a small-caps label with a disclosure.
export function fold(label, content, o = {}) {
  return h('details', { class: 'kit-fold', open: !!o.open },
    h('summary', { class: 'kit-label' }, label),
    h('div', { class: 'kit-fold-body' }, content));
}

// noteField is an inline note: ↵ or blur commits a changed value, Esc
// reverts and leaves. While it has focus the keyboard layer ignores page keys.
export function noteField(o) {
  let committed = o.value || '';
  const input = h('input', { class: 'kit-note', type: 'text', value: committed, placeholder: o.placeholder || '' });
  const commit = () => {
    if (input.value === committed) return;
    committed = input.value;
    o.onCommit(committed);
  };
  submitOnEnter(input, commit);
  input.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      input.value = committed;
      input.blur();
    }
  });
  input.addEventListener('blur', commit);
  return input;
}

const stateLabel = new Map(MESSAGE_STATES.map(s => [s.state, s.label]));

// messagePill is where one message the user sent stands: the state's pill, its
// label from tools-common/msgstate's list (msgstate.js), and the line under it
// (who has it, or what the agent is doing). An unknown state shows as itself.
export function messagePill(state, line) {
  return h('span', { class: 'kit-msg' },
    h('span', { class: 'kit-pill', dataset: { state } }, stateLabel.get(state) ?? state),
    line ? h('span', { class: 'kit-msg-line' }, line) : null);
}
