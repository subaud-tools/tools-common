// frontpage.js: a front page's list, moved from diazo's. The parts take plain
// values: a tool works out its own rows, counts and groups, keeps what is
// chosen and redraws on a press.
import { h, popOut, placePop, pickField } from './dom.js';
import { remembered } from './remembered.js';

// filterRow is a section of the left column: All with the total, then one row
// per item. Several can be chosen; All is on when none is. onToggle hears the
// value pressed, '' for All. An item's subs are rows of their own, indented
// right after it, drawn only while it or one of them is chosen; All counts the
// top items alone.
export function filterRow({ label, items, chosen, onToggle }) {
  const row = ({ value, label: text, count }, sub) => {
    const on = value ? chosen.includes(value) : !chosen.length;
    return h('li', { class: `kit-index-row${sub ? ' kit-sub' : ''}${on ? ' on' : ''}` },
      h('button', {
        class: 'kit-index-main kit-filter',
        type: 'button',
        'data-value': value,
        'aria-pressed': String(on),
        onclick: () => onToggle(value),
      },
      h('span', { class: 'kit-index-title' }, text),
      h('span', { class: 'kit-meta' }, String(count))));
  };
  const total = items.reduce((n, it) => n + it.count, 0);
  return h('section', { class: 'kit-index-section kit-filter-row' },
    h('div', { class: 'kit-label' }, label),
    h('ul', { class: 'kit-index-rows' }, row({ value: '', label: 'All', count: total }), items.flatMap(it => {
      const subs = it.subs || [];
      const open = chosen.includes(it.value) || subs.some(s => chosen.includes(s.value));
      return [row(it), ...(open ? subs.map(s => row(s, true)) : [])];
    })));
}

// statusPills draws the pills in the stage track's joined bar, each count
// after a dot (Open · 8). A pill with no count is hidden unless chosen. The
// value '' is the tool's All, on when none is chosen.
export function statusPills({ pills, chosen, onToggle, label = 'Filter by status' }) {
  const on = value => (value ? chosen.includes(value) : !chosen.length);
  return h('nav', { class: 'kit-stages', 'aria-label': label },
    h('span', { class: 'kit-stages-bar' },
      pills.filter(p => on(p.value) || p.count).map(p =>
        h('button', {
          class: `kit-stage${on(p.value) ? ' now' : ''}`,
          type: 'button',
          'data-value': p.value,
          'aria-pressed': String(on(p.value)),
          onclick: () => onToggle(p.value),
        }, p.label, p.count == null || p.count === '' ? null : h('span', { class: 'kit-pill-n' }, ` · ${p.count}`)))));
}

// The press being handled: a switch drawn during it, with the order pressed
// chosen, is the redraw, and its chosen chip takes the focus back.
let picking = null;

// sortSwitch is the line over a list that orders it: the muted label (sort),
// then one chip per order, the chosen one on. onPick hears the order pressed;
// the caller keeps it (with remembered) and redraws. When the press had the
// focus in the switch, the redrawn switch's chosen chip gets it back.
export function sortSwitch({ orders, chosen, onPick, label = 'sort' }) {
  const el = h('div', { class: 'kit-sort' },
    h('span', { class: 'kit-sort-label' }, label),
    orders.map(o => h('button', {
      class: `kit-chip${o.value === chosen ? ' on' : ''}`,
      type: 'button',
      'data-value': o.value,
      'aria-pressed': String(o.value === chosen),
      onclick: () => pick(o.value),
    }, o.label)));
  if (picking && !picking.made && picking.value === chosen) picking.made = el.querySelector('.kit-chip.on');
  function pick(value) {
    const had = el.contains(document.activeElement);
    const p = picking = { value, made: null };
    try {
      onPick(value);
    } finally {
      picking = null;
    }
    if (had && p.made?.isConnected) p.made.focus();
  }
  return el;
}

// sortedList is one list in the order chosen on its sort switch: the switch,
// then one card of row(item) for each item, or the empty line with none. Each
// order compares two items. The choice is remembered under <name>.sort, the
// first order when none is or the one remembered is gone. A press re-sorts in
// place; set(items) redraws with new items in the same order. title, when
// given, heads the card with title(n) for the n rows shown.
//
// With groups, the switch is followed by one folding card per group that has
// rows, each with its rows in the chosen order: see sortedGroups below.
// set(items, groups) redraws with new items and, when given, another grouping.
//
// band, a band's handle, puts the switch in the band's sort place instead of
// over the cards: a div.kit-band-sort holding the switch, and a compact
// picker (pickField) that takes its place on a phone.
export function sortedList({ name, orders, items, row, empty, label, title, groups, band }) {
  const key = `${name}.sort`;
  const known = v => orders.some(o => o.value === v);
  let chosen = known(remembered.get(key)) ? remembered.get(key) : orders[0].value;
  let now = items;
  let by = groups;
  const el = h('div', { class: 'kit-sorted' });
  const choose = v => { chosen = v; remembered.set(key, v); draw(); };
  const picker = band ? pickField({ label: label || 'sort', labelHidden: true, size: 'compact', choices: orders.map(o => ({ value: o.value, label: o.label })), value: chosen, onPick: choose }) : null;
  const place = band ? h('div', { class: 'kit-band-sort' }) : null;
  if (band) band.setSort(place);
  const draw = () => {
    const { compare } = orders.find(o => o.value === chosen);
    const made = sortSwitch({ orders, chosen, label, onPick: choose });
    let sw = made;
    if (band) {
      picker.set(chosen);
      // only the chips are redrawn: the picker stays, and keeps the focus
      if (place.firstChild) place.firstChild.replaceWith(made);
      else place.append(made, picker.el);
      sw = null;
    }
    if (by && now.length) {
      el.replaceChildren(...[sw].filter(Boolean), ...sortedGroups({ name, groups: by, items: now, compare, row, redraw: draw }));
      return;
    }
    const rows = [...now].sort(compare).map(row);
    el.replaceChildren(...[sw].filter(Boolean),
      h('section', { class: 'kit-card' },
        title && !by ? h('div', { class: 'kit-label kit-group-head' }, title(rows.length)) : null,
        rows.length ? h('ul', { class: 'kit-group-rows' }, rows) : h('p', { class: 'kit-empty' }, empty)));
  };
  draw();
  return {
    el,
    set(next, nextGroups) {
      now = next;
      if (nextGroups) by = nextGroups;
      draw();
    },
  };
}

// The groups' order as drawn: the one kept under <name>.order.<groups.name>
// with the keys that no longer exist left out (only here: what is kept keeps them) (a key exists while groups.order names it
// or an item has it), then each missing key of groups.order right after the
// one before it there, then the rest A to Z by label.
function arrange(kept, order, labels) {
  const exists = k => order.includes(k) || labels.has(k);
  const out = (kept || []).filter((k, i, a) => typeof k === 'string' && exists(k) && a.indexOf(k) === i);
  order.forEach((k, i) => {
    if (out.includes(k)) return;
    const before = order.slice(0, i).reverse().find(p => out.includes(p));
    out.splice(before === undefined ? 0 : out.indexOf(before) + 1, 0, k);
  });
  const rest = [...labels.keys()].filter(k => !out.includes(k)).sort((a, b) => labels.get(a).localeCompare(labels.get(b)));
  return [...out, ...rest];
}

// The order to keep after a move: next (the groups known now, in their new
// order) with each kept key it lacks (a group a filter hides, or one no item
// has now) put back by its kept place: right after the kept key before it
// that is in, else right before the kept key after it, else at the end.
// Keys are dropped only when drawing, never from what is kept.
function keepHidden(next, kept) {
  const out = [...next];
  const saved = (kept || []).filter((k, i, a) => typeof k === 'string' && a.indexOf(k) === i);
  saved.forEach((k, i) => {
    if (out.includes(k)) return;
    const before = saved.slice(0, i).reverse().find(p => out.includes(p));
    if (before !== undefined) {
      out.splice(out.indexOf(before) + 1, 0, k);
      return;
    }
    const after = saved.slice(i + 1).find(p => out.includes(p));
    out.splice(after === undefined ? out.length : out.indexOf(after), 0, k);
  });
  return out;
}

function readKept(k) {
  try {
    const v = JSON.parse(remembered.get(k));
    return Array.isArray(v) ? v : null;
  } catch {
    return null;
  }
}

// The key being dragged by its grip, across redraws of the same list.
let dragging = null;

// sortedGroups draws one folding card per group with rows. Its heading holds
// the drag grip, the fold with the label and its count (none for a key in
// uncounted), and a ⋯ that moves it; the folds are kept under
// <name>.folded.<key> ('1' folded, '' open), groups.folded starting folded
// while none is kept. Every group is drawn alike.
function sortedGroups({ name, groups, items, compare, row, redraw }) {
  const orderKey = `${name}.order.${groups.name}`;
  const byKey = new Map();
  const labels = new Map();
  for (const it of items) {
    const g = groups.key(it);
    if (!byKey.has(g.key)) byKey.set(g.key, []);
    byKey.get(g.key).push(it);
    labels.set(g.key, g.label);
  }
  const fallback = arrange(null, groups.order, labels);
  const saved = readKept(orderKey);
  const full = arrange(saved, groups.order, labels);
  const shown = full.filter(k => byKey.has(k));
  const labelOf = k => labels.get(k) ?? k;
  const keep = moved => {
    const next = keepHidden(moved, saved);
    if (next.length === fallback.length && next.every((k, i) => k === fallback[i])) remembered.remove(orderKey);
    else remembered.set(orderKey, JSON.stringify(next));
    redraw();
  };
  // place puts k before or after another key in the full order.
  const place = (k, other, after) => {
    const next = full.filter(x => x !== k);
    next.splice(next.indexOf(other) + (after ? 1 : 0), 0, k);
    keep(next);
  };
  const uncounted = groups.uncounted || [];
  const startFolded = groups.folded || [];
  return shown.map((k, i) => {
    const rows = [...byKey.get(k)].sort(compare).map(row);
    const label = labelOf(k);
    const prev = shown[i - 1];
    const next = shown[i + 1];
    const head = h('button', { class: 'kit-label kit-group-head', type: 'button' },
      uncounted.includes(k) ? label : `${label} · ${rows.length}`);
    const grip = h('span', { class: 'kit-group-grip', draggable: 'true', title: 'Drag to move', 'aria-hidden': 'true' }, '⠿');
    const menu = rowMenu({
      label: `Move ${label}`,
      buttonClass: 'kit-row-more kit-group-more',
      items: [
        { label: 'Move up', action: 'up', disabled: !prev, detail: prev ? `Puts ${label} above ${labelOf(prev)}` : 'It is the first group', run: () => place(k, prev, false) },
        { label: 'Move down', action: 'down', disabled: !next, detail: next ? `Puts it below ${labelOf(next)}` : 'It is the last group', run: () => place(k, next, true) },
        { label: 'Move to top', action: 'top', disabled: !prev, detail: 'Makes it the first group', run: () => keep([k, ...full.filter(x => x !== k)]) },
        { label: 'Reset order', action: 'reset', detail: `Back to ${labelOf(fallback.find(x => byKey.has(x)))} first`, run: () => { remembered.remove(orderKey); redraw(); } },
      ],
    });
    const sec = h('section', { class: 'kit-card kit-group', 'data-group': k },
      h('div', { class: 'kit-group-line' }, grip, head, menu),
      h('ul', { class: 'kit-group-rows' }, rows));
    const foldKey = `${name}.folded.${k}`;
    const set = on => {
      sec.classList.toggle('kit-folded', on);
      head.setAttribute('aria-expanded', String(!on));
    };
    const kept = remembered.get(foldKey);
    set(kept === null ? startFolded.includes(k) : kept === '1');
    head.addEventListener('click', () => {
      const on = !sec.classList.contains('kit-folded');
      set(on);
      remembered.set(foldKey, on ? '1' : '');
    });
    grip.addEventListener('dragstart', e => {
      dragging = { key: k, list: orderKey };
      if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', label);
      }
    });
    grip.addEventListener('dragend', () => { dragging = null; });
    const half = e => {
      const r = sec.getBoundingClientRect();
      return e.clientY > r.top + r.height / 2;
    };
    const mine = () => dragging && dragging.list === orderKey && dragging.key !== k;
    sec.addEventListener('dragover', e => {
      if (!mine()) return;
      e.preventDefault();
      const after = half(e);
      sec.classList.toggle('kit-drop-before', !after);
      sec.classList.toggle('kit-drop-after', after);
    });
    sec.addEventListener('dragleave', () => sec.classList.remove('kit-drop-before', 'kit-drop-after'));
    sec.addEventListener('drop', e => {
      if (!mine()) return;
      e.preventDefault();
      const from = dragging.key;
      dragging = null;
      place(from, k, half(e));
    });
    return sec;
  });
}

function group({ key, title, rows, empty, edge }, startFolded, onFold) {
  const head = h('button', { class: 'kit-label kit-group-head', type: 'button' }, `${title} · ${rows.length}`);
  const sec = h('section', { class: `kit-card kit-group${edge ? ` edge-${edge}` : ''}`, 'data-group': key },
    head,
    rows.length ? h('ul', { class: 'kit-group-rows' }, rows) : h('p', { class: 'kit-empty' }, empty));
  const set = on => {
    sec.classList.toggle('kit-folded', on);
    head.setAttribute('aria-expanded', String(!on));
  };
  head.addEventListener('click', () => {
    const on = !sec.classList.contains('kit-folded');
    set(on);
    onFold(key, on);
  });
  set(startFolded);
  return sec;
}

// groupList draws named groups of rows (each an <li>), each a card that folds
// in place. folded holds the keys that start folded; onFold hears each press
// with the key and whether it is now folded.
export function groupList({ groups, folded, onFold }) {
  return h('div', { class: 'kit-groups' }, groups.map(g => group(g, folded.includes(g.key), onFold)));
}

// rowMenu is a row's ⋯ button and its menu, as diazo's front page rows have:
// a press opens it, and a press on an item, outside it or Esc closes it. Each
// item is a menuitem button: action and walk become data-action and data-walk,
// so a caller keeps its hooks, and danger marks a destructive one. An item
// with href is a menuitem link instead, { separator: true } a line between
// items, and a disabled item never runs. An item's detail is a muted line
// under its label (kit-row-detail), and a menu holding any caps its width so
// the lines wrap. { heading: '…' } is a muted label over the items after it
// (kit-row-head): not a menuitem, never focused, and a press on it leaves the
// menu open. A press on an item closes the menu, then runs it. The menu shows
// in the top layer, placed from the ⋯ button as pickField's is (placePop): on
// the button's right edge, 4px below it, or above it near the window's foot,
// never taller than the room and scrolling inside itself, and it stays at the
// button while the page scrolls. Opening or closing it moves nothing on the
// page: the page grows no longer and does not scroll. onMenu hears it open and close. open draws it already open,
// as the one open menu on the page, for a caller that redraws its rows: it
// neither scrolls nor takes focus, and onMenu does not hear that opening (the
// caller asked for it), only the closing; the menu it replaces closes without
// telling onMenu, so a caller keeping open from onMenu keeps it through every
// redraw. buttonClass replaces kit-row-more
// on the ⋯ button.
export function rowMenu({ label, items, onMenu, open = false, buttonClass = 'kit-row-more' }) {
  const btn = h('button', {
    class: buttonClass,
    type: 'button',
    'aria-label': label,
    'aria-haspopup': 'menu',
    'aria-expanded': 'false',
  }, '⋯');
  const pop = h('div', { class: 'kit-row-pop', role: 'menu', popover: 'manual' }, items.map(menuItem));
  pop.hidden = true;
  const wrap = h('div', { class: 'kit-row-menu' }, btn, pop);
  // The menu's width is what it was when it hung inside the wrapper: its
  // widest line, but no wider than the wrapper unless a word needs it. A menu
  // with details has its own width (kit.css).
  const fit = () => {
    Object.assign(pop.style, { width: '', maxWidth: '' });
    if (pop.querySelector('.kit-row-detail')) return;
    const wide = () => pop.getBoundingClientRect().width;
    pop.style.width = 'min-content';
    const least = wide();
    pop.style.width = 'max-content';
    const most = wide();
    const edges = most - parseFloat(getComputedStyle(pop).width);
    pop.style.width = `${Math.min(most, Math.max(least, wrap.clientWidth)) - edges}px`;
  };
  const place = e => {
    if (e?.type !== 'scroll') fit();
    placePop(btn, pop, { right: true });
  };
  const { show, close } = popOut({ wrap, btn, pop, onToggle: onMenu, place });
  btn.addEventListener('click', () => {
    if (!pop.hidden) {
      close();
      return;
    }
    show();
  });
  // A press on an item closes the menu, then does what the item does; a press
  // on a disabled one or a heading leaves it open.
  pop.addEventListener('click', e => {
    if (!e.target.closest?.(':disabled, .kit-row-head')) close();
  }, true);
  if (open) show(true);
  return wrap;
}

function menuItem(it) {
  if (it.separator) return h('hr', { role: 'separator' });
  if (it.heading !== undefined) return h('div', { class: 'kit-row-head', role: 'presentation' }, it.heading);
  const hooks = { role: 'menuitem', class: it.danger ? 'danger' : undefined, 'data-action': it.action, 'data-walk': it.walk };
  const body = [it.label, it.detail ? h('span', { class: 'kit-row-detail' }, it.detail) : null];
  if (it.href !== undefined) return h('a', { ...hooks, href: it.href, onclick: () => it.run?.() }, body);
  // A script's click reaches a disabled button's listener too: it still never runs.
  return h('button', { ...hooks, type: 'button', disabled: it.disabled || undefined, onclick: e => e.currentTarget.disabled || it.run() }, body);
}
