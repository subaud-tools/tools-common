// frame.js: the page's three columns, the index, the centre and the thread.
// Each side folds to a thin strip with its toggle, and the page remembers it
// per tool and panel. The columns go straight into a .kit-app grid, after its
// bar. narrowMode lays them out by the window's width on a page that turns it
// on: one column at a time, two, or all three.
import { h } from './dom.js';
import { remembered } from './remembered.js';

// What narrowMode needs of a column collapsible drew: its toggle and how to
// redraw it. A column in held is narrow mode's: its press and face are the state's.
const drawn = new WeakMap();
const held = new WeakMap();

// collapsible puts a toggle and body in col. side says which way it folds and
// name (the tool's) and panel make the key it is remembered under,
// <name>.collapsed.<panel>; folded starts it folded whatever the page remembers.
// onPress hears each press of the toggle. It returns a function that folds or
// opens the side without remembering it.
export function collapsible({ col, body, panel, side, name, folded, onPress }) {
  const key = `${name}.collapsed.${panel}`;
  const toggle = h('button', { class: 'kit-col-toggle', type: 'button', 'data-panel': panel });
  const face = () => {
    const narrow = held.get(col);
    const on = narrow ? !narrow.open() : col.classList.contains('kit-collapsed');
    toggle.textContent = on === (side === 'left') ? '›' : '‹';
    toggle.title = on ? `Show the ${panel}` : `Hide the ${panel}`;
    toggle.setAttribute('aria-expanded', String(!on));
  };
  const set = (on, keep = true) => {
    col.classList.toggle('kit-collapsed', on);
    face();
    if (keep) remembered.set(key, on ? '1' : '');
  };
  drawn.set(col, face);
  toggle.addEventListener('click', () => {
    const narrow = held.get(col);
    if (narrow) {
      narrow.press();
      return;
    }
    set(!col.classList.contains('kit-collapsed'));
    if (onPress) onPress();
  });
  col.append(toggle, body);
  if (folded) set(true, false);
  else set(remembered.get(key) === '1');
  return on => set(on, false);
}

function side(name, which, cls, o) {
  if (!o) return [null, null];
  const col = h('aside', { class: `${cls} kit-col kit-${which}-col`, 'aria-label': o.label });
  const body = h('div', { class: 'kit-col-body' });
  collapsible({ col, body, panel: o.panel, side: which, name, folded: o.folded });
  return [col, body];
}

// frame builds the columns. left and right are { panel, label, folded }, each
// optional; centre is { label }. The caller draws into leftBody, centre and
// rightBody, and appends left, centre and right to its grid. A side stays where
// the reader's toggle left it: nothing a card holds moves it. foot(node) locks
// node (a sendBar) to the centre's bottom edge, in a kit-sendfoot made its last
// child, so call it after drawing the centre; foot(null) takes it away.
// With no right, the centre runs to the window's edge. wide(on) runs the
// centre over the right column's space, the band and the left column unmoved.
export function frame({ name, left, centre, right }) {
  const [l, leftBody] = side(name, 'left', 'kit-list', left);
  const [r, rightBody] = side(name, 'right', 'kit-rail', right);
  const mid = h('main', { class: 'kit-read kit-col kit-mid', 'aria-label': centre.label });
  const sendfoot = h('div', { class: 'kit-sendfoot' });
  const foot = node => {
    if (!node) {
      sendfoot.replaceChildren();
      sendfoot.remove();
      return;
    }
    sendfoot.replaceChildren(node);
    mid.append(sendfoot);
  };
  // wide(on) runs the centre over the right column's space (a design's topic
  // chat), its cards uncapped; the band and the left column stay put. On a
  // page narrowMode shows in one or two columns it changes nothing, so it
  // never leaves it blank.
  const wide = on => mid.classList.toggle('kit-wide', !!on);
  return { left: l, leftBody, centre: mid, right: r, rightBody, foot, wide };
}

// KIT_WIDTHS are the kit's two width lines, the one place they are kept: at
// oneAtATime wide or less a page shows one column at a time, up to twoColumns
// it shows two, and wider all three. A tool with a width rule of its own
// builds it from these, as (width <= ${KIT_WIDTHS.oneAtATime}px).
export const KIT_WIDTHS = Object.freeze({ oneAtATime: 999, twoColumns: 1319 });

// narrowMode lays the frame out by the window's width, in three layouts. At
// KIT_WIDTHS.oneAtATime or less (kit-narrow) it shows one thing at a time: the
// centre, or a side (a column collapsible drew) in the centre's place, the
// other a strip; a page opens on the centre. Up to KIT_WIDTHS.twoColumns
// (kit-two) one side is open beside the centre at its usual width and the
// other is a strip; a page opens on its right side, or its left with no right,
// a press on a strip opens it and folds the other, and a press on the open
// side's toggle leaves two strips. Wider, it lets the frame be. The classes
// drive the layout, so the fold and what is remembered of it keep their
// meaning for the wide page: in the other two layouts they are ignored and
// never written. Nothing else is remembered: moving to another layout goes to
// its default. show(side) takes 'left', 'right' or null, setCount(side, n) puts
// a count under a strip's toggle (none at zero; at wide widths only a closed
// right strip shows it), onShow(side) hears each change, and stop lets go of
// the window.
export function narrowMode({ root, left, right, onShow }) {
  const cols = { left, right };
  const narrow = matchMedia(`(width <= ${KIT_WIDTHS.oneAtATime}px)`);
  const two = matchMedia(`(width <= ${KIT_WIDTHS.twoColumns}px)`);
  let mode = null;
  let shown = null;
  const redraw = () => {
    for (const col of [left, right]) if (col) drawn.get(col)();
  };
  const put = next => {
    shown = next;
    root.classList.toggle('kit-narrow-left', mode === 'narrow' && shown === 'left');
    root.classList.toggle('kit-narrow-right', mode === 'narrow' && shown === 'right');
    root.classList.toggle('kit-two-left', mode === 'two' && shown === 'left');
    root.classList.toggle('kit-two-right', mode === 'two' && shown === 'right');
    redraw();
  };
  const show = side => {
    const next = mode !== 'wide' && cols[side] ? side : null;
    if (next === shown) return;
    put(next);
    if (onShow) onShow(shown);
  };
  const hold = (side, on) => {
    const col = cols[side];
    if (!col) return;
    if (on) held.set(col, { open: () => shown === side, press: () => show(shown === side ? null : side) });
    else held.delete(col);
  };
  const follow = () => {
    const next = narrow.matches ? 'narrow' : two.matches ? 'two' : 'wide';
    if (next === mode) return;
    mode = next;
    root.classList.toggle('kit-narrow', mode === 'narrow');
    root.classList.toggle('kit-two', mode === 'two');
    hold('left', mode !== 'wide');
    hold('right', mode !== 'wide');
    const was = shown;
    put(mode === 'two' ? (right ? 'right' : left ? 'left' : null) : null);
    if (onShow && shown !== was) onShow(shown);
  };
  narrow.addEventListener('change', follow);
  two.addEventListener('change', follow);
  follow();
  const setCount = (side, n) => {
    const col = cols[side];
    if (!col) return;
    let badge = col.querySelector(':scope > .kit-col-count');
    if (!n) {
      if (badge) badge.remove();
      return;
    }
    if (!badge) {
      badge = h('span', { class: 'kit-col-count' });
      col.firstElementChild.after(badge);
    }
    badge.textContent = String(n);
  };
  const stop = () => {
    narrow.removeEventListener('change', follow);
    two.removeEventListener('change', follow);
  };
  return { show, setCount, stop };
}
