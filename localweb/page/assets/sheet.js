// A floating sheet: a small modal dialog over a backdrop, for forms such as a
// decide or change sheet. Esc or a backdrop click closes it, focus stays
// inside while it is open and returns where it was on close, and the keyboard
// layer's page keys are suspended (keys.js asks sheetOpen()). o.returnFocus
// names where focus goes on close if the opener has left the page.
// o.canDismiss, when given, is asked before Esc or a backdrop click closes the
// sheet (a draft to keep); close() always closes. A sheet with actions ends
// its button row with an error spot that handle.error(msg) fills and clears.
// o.wide makes it a wide sheet (kit-sheet-wide, min(720px, 92vw)) for a sheet
// that holds a list: when its body holds an element marked kit-sheet-scroll,
// that element is the only part that scrolls, so the head, the rest of the
// body and the button row stay in view.

import { h, buttons } from './dom.js';

const stack = [];
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';

// sheetOpen reports whether any sheet is open (the keyboard layer's gate).
export function sheetOpen() {
  return stack.length > 0;
}

export function sheet(o = {}) {
  const returnTo = document.activeElement;
  const backdrop = h('div', { class: 'kit-backdrop' });
  const el = h('div', { class: 'kit-float kit-sheet' + (o.wide ? ' kit-sheet-wide' : ''), role: 'dialog', 'aria-modal': 'true', tabindex: '-1' },
    o.title ? h('div', { class: 'kit-label kit-sheet-head' }, o.title) : null,
    o.body !== undefined ? h('div', { class: 'kit-sheet-body' }, o.body) : null,
    o.actions && o.actions.length ? buttons(o.actions) : null);
  const errorSpot = o.actions && o.actions.length ? h('p', { class: 'kit-sheet-error', role: 'alert' }) : null;
  if (errorSpot) el.querySelector('.kit-btns').append(errorSpot);
  if (o.title) el.setAttribute('aria-label', o.title);
  let open = true;

  const focusables = () => [...el.querySelectorAll(FOCUSABLE)].filter(n => !n.closest('[hidden]'));
  const top = () => stack[stack.length - 1] === handle;

  function onKey(e) {
    if (!top()) return;
    if (e.key === 'Escape' && !e.isComposing) {
      e.preventDefault();
      e.stopPropagation();
      dismiss();
    } else if (e.key === 'Tab') {
      const f = focusables();
      if (!f.length) {
        e.preventDefault();
        el.focus();
        return;
      }
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && (document.activeElement === first || !el.contains(document.activeElement))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (document.activeElement === last || !el.contains(document.activeElement))) {
        e.preventDefault();
        first.focus();
      }
    }
  }
  function onFocus(e) {
    if (top() && !el.contains(e.target)) (focusables()[0] || el).focus();
  }

  function dismiss() {
    if (!o.canDismiss || o.canDismiss()) handle.close();
  }

  const handle = {
    el,
    error(msg) {
      if (errorSpot) errorSpot.textContent = msg || '';
    },
    close() {
      if (!open) return;
      open = false;
      const i = stack.indexOf(handle);
      if (i >= 0) stack.splice(i, 1);
      document.removeEventListener('keydown', onKey, true);
      document.removeEventListener('focusin', onFocus, true);
      el.remove();
      backdrop.remove();
      restoreFocus();
      if (o.onClose) o.onClose();
    },
  };

  // Focus goes back where it was; if that element left the page, to
  // o.returnFocus, else the page's main region, else body, so keyboard users
  // keep a place.
  function restoreFocus() {
    const main = document.querySelector('main, [role="main"], .kit-read');
    for (const t of [returnTo, o.returnFocus, main]) {
      if (!t || !t.isConnected || typeof t.focus !== 'function' || t === document.body) continue;
      if (t === main && !t.hasAttribute('tabindex') && t.tabIndex < 0) t.setAttribute('tabindex', '-1');
      t.focus();
      if (document.activeElement === t) return;
    }
    document.body.focus();
  }

  backdrop.addEventListener('click', dismiss);
  document.addEventListener('keydown', onKey, true);
  document.addEventListener('focusin', onFocus, true);
  stack.push(handle);
  document.body.append(backdrop, el);
  (focusables()[0] || el).focus();
  return handle;
}

// confirm asks one question in a sheet: o.title asks it, o.body (text or a
// node) says what it does, then the action (o.action.label, tone 'danger' or
// 'fill') and Cancel. Focus starts on the action. Esc, the backdrop or Cancel
// close it with nothing done. Pressing the action disables it and awaits
// o.run(): resolved closes the sheet; rejected shows the reason in the error
// spot and enables the action again. o.disabled and setDisabled(bool) turn
// the action off and on (it stays off while run runs).
export function confirm(o) {
  let off = !!o.disabled, busy = false;
  const tone = o.action.tone === 'danger' ? { danger: true } : { fill: true };
  const s = sheet({
    title: o.title,
    body: o.body,
    actions: [{ label: o.action.label, ...tone, disabled: off, run: go }, { label: 'Cancel', run: () => s.close() }],
  });
  const btn = s.el.querySelector('.kit-btns .kit-btn');
  if (!off) btn.focus();

  async function go() {
    if (off || busy) return;
    busy = true;
    btn.disabled = true;
    s.error();
    try {
      await o.run();
      s.close();
    } catch (e) {
      s.error((e && e.message) || String(e));
      busy = false;
      btn.disabled = off;
      if (!off && s.el.isConnected && !s.el.contains(document.activeElement)) btn.focus();
    }
  }

  return {
    el: s.el,
    close: () => s.close(),
    setDisabled(v) {
      off = !!v;
      if (!busy) btn.disabled = off;
    },
  };
}
