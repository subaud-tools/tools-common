// frontpage.js: a front page's list, moved from diazo's. The parts take plain
// values: a tool works out its own rows, counts and groups, keeps what is
// chosen and redraws on a press.
import { h } from './dom.js';

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

// statusPills draws the pills as a stage track with no arrows, since statuses
// aren't a sequence. A pill with no count is hidden unless chosen. The value ''
// is the tool's All, on when none is chosen.
export function statusPills({ pills, chosen, onToggle, label = 'Filter by status' }) {
  const on = value => (value ? chosen.includes(value) : !chosen.length);
  return h('nav', { class: 'kit-stages', 'aria-label': label },
    pills.filter(p => on(p.value) || p.count).map(p =>
      h('button', {
        class: `kit-stage${on(p.value) ? ' now' : ''}`,
        type: 'button',
        'data-value': p.value,
        'aria-pressed': String(on(p.value)),
        onclick: () => onToggle(p.value),
      }, p.label, h('span', { class: 'kit-pill-n' }, String(p.count)))));
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

// The one row menu open on the page: opening another closes it.
let menuOpen = null;

// rowMenu is a row's ⋯ button and its menu, as diazo's front page rows have:
// a press opens it, and a press on an item, outside it or Esc closes it. Each
// item is a menuitem button: action and walk become data-action and data-walk,
// so a caller keeps its hooks, and danger marks a destructive one. An item
// with href is a menuitem link instead, { separator: true } a line between
// items, and a disabled item never runs. A press on an item closes the menu,
// then runs it. onMenu hears it open and close. open draws it already open,
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
  const pop = h('div', { class: 'kit-row-pop', role: 'menu' }, items.map(menuItem));
  pop.hidden = true;
  const wrap = h('div', { class: 'kit-row-menu' }, btn, pop);
  const outside = e => {
    if (!wrap.contains(e.target)) close();
  };
  const esc = e => {
    if (e.key === 'Escape') close();
  };
  function close(quiet) {
    if (pop.hidden) return;
    pop.hidden = true;
    btn.setAttribute('aria-expanded', 'false');
    document.removeEventListener('click', outside, true);
    document.removeEventListener('keydown', esc);
    if (menuOpen === close) menuOpen = null;
    if (!quiet) onMenu?.(false);
  }
  function show(quiet) {
    menuOpen?.(quiet);
    pop.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
    document.addEventListener('click', outside, true);
    document.addEventListener('keydown', esc);
    menuOpen = close;
  }
  btn.addEventListener('click', () => {
    if (!pop.hidden) {
      close();
      return;
    }
    show();
    onMenu?.(true);
    // ⋯ sits at a row's foot on a phone: a menu opening past the window's
    // edge scrolls into it.
    pop.scrollIntoView({ block: 'nearest' });
  });
  // A press on an item closes the menu, then does what the item does; a press
  // on a disabled one leaves it open.
  pop.addEventListener('click', e => {
    if (!e.target.closest?.(':disabled')) close();
  }, true);
  if (open) show(true);
  return wrap;
}

function menuItem(it) {
  if (it.separator) return h('hr', { role: 'separator' });
  const hooks = { role: 'menuitem', class: it.danger ? 'danger' : undefined, 'data-action': it.action, 'data-walk': it.walk };
  if (it.href !== undefined) return h('a', { ...hooks, href: it.href, onclick: () => it.run?.() }, it.label);
  // A script's click reaches a disabled button's listener too: it still never runs.
  return h('button', { ...hooks, type: 'button', disabled: it.disabled || undefined, onclick: e => e.currentTarget.disabled || it.run() }, it.label);
}
