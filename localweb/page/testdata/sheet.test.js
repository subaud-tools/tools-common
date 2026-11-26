import { test, eq, assert, fixture, focusEl } from './harness.js';
import { sheet, confirm } from '/_kit/sheet.js';
import { createKeys } from '/_kit/keys.js';
import { h } from '/_kit/dom.js';

const press = (key, opts = {}, el = document.activeElement || document.body) => {
  const e = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...opts });
  el.dispatchEvent(e);
  return e;
};

test('sheet: builds a dialog with a backdrop, title, body and actions', () => {
  let ran = 0;
  const s = sheet({ title: 'decide 4', body: h('p', null, 'close 4 items'), actions: [{ label: 'decide', fill: true, run: () => ran++ }, { label: 'cancel' }] });
  try {
    assert(s.el.classList.contains('kit-float') && s.el.classList.contains('kit-sheet'));
    eq([s.el.getAttribute('role'), s.el.getAttribute('aria-modal')], ['dialog', 'true']);
    assert(document.querySelector('.kit-backdrop'), 'backdrop');
    eq(s.el.querySelector('.kit-label').textContent, 'decide 4');
    s.el.querySelector('.kit-btn.fill').click();
    eq(ran, 1);
    eq(getComputedStyle(s.el).boxShadow.includes('rgba(0, 0, 0, 0.16)'), true, 'uses --kit-lift');
  } finally { s.close(); }
  assert(!document.querySelector('.kit-sheet') && !document.querySelector('.kit-backdrop'), 'close removes both');
});

test('sheet: Esc closes it and focus returns', () => {
  const opener = h('button', null, 'decide');
  fixture().append(opener);
  opener.focus();
  let closed = 0;
  const input = h('input');
  const s = sheet({ title: 't', body: input, onClose: () => closed++ });
  assert(s.el.contains(document.activeElement), 'focus moves inside');
  press('Escape');
  eq(closed, 1);
  assert(!s.el.isConnected, 'removed');
  assert(document.activeElement === opener, 'focus returned');
  s.close();
  eq(closed, 1, 'close is idempotent');
});

test('sheet: backdrop click closes', () => {
  const s = sheet({ title: 't' });
  document.querySelector('.kit-backdrop').click();
  assert(!s.el.isConnected);
});

test('sheet: focus stays inside', () => {
  const outside = h('button', null, 'outside');
  fixture().append(outside);
  const a = h('button', null, 'a'), b = h('button', null, 'b');
  const s = sheet({ title: 't', body: h('div', null, a, b) });
  try {
    b.focus();
    const e = press('Tab');
    assert(e.defaultPrevented, 'tab is trapped at the end');
    assert(document.activeElement === a, 'wraps to the first');
    press('Tab', { shiftKey: true });
    assert(document.activeElement === b, 'shift-tab wraps to the last');
    focusEl(outside);
    assert(s.el.contains(document.activeElement), 'focus pulled back in');
  } finally { s.close(); }
});

test('sheet: page keys do not fire while it is open', () => {
  const calls = [];
  const keys = createKeys({ list: { move: d => calls.push(d), open() {}, toggle() {}, toggleRange() {} } });
  let ran = 0;
  keys.register({ keys: '1', label: 'keep', run: () => ran++ });
  const s = sheet({ title: 't', body: h('button', null, 'x') });
  try {
    press('j', {}, document.body); press('1', {}, document.body); press('?', {}, document.body);
    eq([calls.length, ran], [0, 0]);
    assert(!document.querySelector('.kit-keys'), 'no help over a sheet');
  } finally { s.close(); }
  press('1', {}, document.body);
  eq(ran, 1, 'keys resume after close');
  keys.destroy();
});

test('sheet: only the top sheet takes Esc', () => {
  const s1 = sheet({ title: 'one' });
  const s2 = sheet({ title: 'two' });
  press('Escape');
  assert(!s2.el.isConnected && s1.el.isConnected);
  press('Escape');
  assert(!s1.el.isConnected);
});

test('sheet: the ? overlay is a sheet', () => {
  const keys = createKeys();
  try {
    press('?', {}, document.body);
    const ov = document.querySelector('.kit-keys');
    assert(ov && ov.classList.contains('kit-sheet'), 'help uses the sheet');
    assert(document.querySelector('.kit-backdrop'));
    press('?');
    assert(!document.querySelector('.kit-keys') && !document.querySelector('.kit-backdrop'), '? closes it');
  } finally { keys.destroy(); }
});

test('sheet: focus has a place when the opener is gone', () => {
  const fx = fixture();
  const main = h('main', { class: 'kit-read' }, 'read');
  const opener = h('button', null, 'decide');
  fx.append(main, opener);
  opener.focus();
  const s = sheet({ title: 't', body: h('button', null, 'x') });
  opener.remove();
  s.close();
  assert(document.activeElement === main, 'falls back to the main region');
  const target = h('button', null, 'here');
  fx.append(target);
  const opener2 = h('button', null, 'o');
  fx.append(opener2);
  opener2.focus();
  const s2 = sheet({ title: 't', returnFocus: target });
  opener2.remove();
  s2.close();
  assert(document.activeElement === target, 'returnFocus wins');
});

test('sheet: the ? overlay closes on a click anywhere in it', () => {
  const keys = createKeys();
  try {
    keys.showHelp(true);
    document.querySelector('.kit-keys .kit-sheet-head').click();
    assert(!document.querySelector('.kit-keys'), 'a click on the title closes it');
  } finally { keys.destroy(); }
});

test('sheet: canDismiss false keeps it open on Esc and a backdrop click; close() still closes', () => {
  const s = sheet({ title: 't', body: h('input'), canDismiss: () => false });
  try {
    press('Escape');
    assert(s.el.isConnected, 'Esc leaves it open');
    document.querySelector('.kit-backdrop').click();
    assert(s.el.isConnected, 'a backdrop click leaves it open');
  } finally { s.close(); }
  assert(!document.querySelector('.kit-sheet') && !document.querySelector('.kit-backdrop'), 'close removes both');
  const s2 = sheet({ title: 't', canDismiss: () => true });
  try {
    press('Escape');
    assert(!s2.el.isConnected, 'canDismiss true lets Esc close it');
  } finally { s2.close(); }
});

test('sheet: the button row ends with an error spot that error() fills and clears', () => {
  const s = sheet({ title: 't', actions: [{ label: 'park', fill: true }, { label: 'cancel' }] });
  try {
    const spot = s.el.querySelector('.kit-btns > .kit-sheet-error');
    assert(spot, 'error spot in the button row');
    assert(spot === s.el.querySelector('.kit-btns').lastElementChild, 'it ends the row');
    eq([spot.tagName, spot.getAttribute('role'), spot.textContent], ['P', 'alert', '']);
    s.error('x');
    eq(spot.textContent, 'x');
    s.error();
    eq(spot.textContent, '');
  } finally { s.close(); }
});

test('sheet: showing an error does not change its height', () => {
  const s = sheet({ title: 'new plan', body: h('p', null, 'a title'), actions: [{ label: 'park', fill: true }, { label: 'cancel' }] });
  try {
    eq(Math.round(s.el.getBoundingClientRect().width), 480, 'the default sheet width');
    const before = s.el.getBoundingClientRect().height;
    s.error('could not park: the plan changed');
    eq(Math.round(s.el.getBoundingClientRect().height), Math.round(before));
  } finally { s.close(); }
});

test('sheet: on a narrow sheet the error takes a line of its own rather than a sliver', () => {
  const s = sheet({ title: 'new plan', actions: [{ label: 'Start now', fill: true }, { label: 'Save as planned' }, { label: 'Cancel' }] });
  try {
    s.el.style.width = '240px';
    const empty = s.el.getBoundingClientRect().height;
    s.error('x');
    s.error();
    eq(s.el.getBoundingClientRect().height, empty, 'an empty spot takes no space');
    s.error('could not start the session: pi is not running');
    const spot = s.el.querySelector('.kit-sheet-error');
    for (let px = 240; px <= 480; px += 4) {
      s.el.style.width = `${px}px`;
      const w = spot.getBoundingClientRect().width;
      assert(w >= 120, `at ${px}px the error spot is ${Math.round(w)}px wide`);
    }
  } finally { s.close(); }
});

test('sheet: wide is 720px, its list scrolls and its button row stays in the window', () => {
  // run at --window-size=1280,900; headless Chrome keeps some of the height for itself
  assert(innerWidth === 1280 && innerHeight >= 800, `a 1280×900 window, got ${innerWidth}×${innerHeight}`);
  const rows = h('div', { class: 'kit-sheet-scroll' }, Array.from({ length: 30 }, (_, i) => h('p', null, `owner/repo-${i}`)));
  const s = sheet({ wide: true, title: 'Add repos', body: h('div', null, h('input', { class: 'kit-input' }), rows), actions: [{ label: 'Add', fill: true }, { label: 'Cancel' }] });
  try {
    assert(s.el.classList.contains('kit-sheet-wide'), 'kit-sheet-wide');
    eq(Math.round(s.el.getBoundingClientRect().width), 720, 'the wide width');
    const btns = s.el.querySelector('.kit-btns').getBoundingClientRect();
    assert(btns.bottom <= innerHeight && btns.height > 0, `the button row ends at ${Math.round(btns.bottom)}, inside ${innerHeight}`);
    eq(s.el.scrollHeight <= s.el.clientHeight + 1, true, 'the sheet itself does not scroll');
    assert(rows.scrollHeight > rows.clientHeight, 'the scroll region overflows');
    rows.scrollTop = 100;
    assert(rows.scrollTop > 0, 'and scrolls');
  } finally { s.close(); }
  const plain = sheet({ title: 'plain', body: h('div', { class: 'kit-sheet-scroll' }, 'x') });
  try {
    assert(!plain.el.classList.contains('kit-sheet-wide'), 'not wide');
    eq(Math.round(plain.el.getBoundingClientRect().width), 480, 'a plain sheet is still 480px');
  } finally { plain.close(); }
});

const tick = () => new Promise(r => setTimeout(r, 0));
const actionBtn = c => c.el.querySelector('.kit-btns .kit-btn');
const cancelBtn = c => [...c.el.querySelectorAll('.kit-btns .kit-btn')].find(b => b.textContent === 'Cancel');

test('confirm: opens with the title, body, action and Cancel, focus on the action', () => {
  const c = confirm({ title: 'Delete "a"?', body: 'It leaves the lists.', action: { label: 'Delete', tone: 'danger' }, run: () => Promise.resolve() });
  try {
    eq(c.el.querySelector('.kit-sheet-head').textContent, 'Delete "a"?');
    eq(c.el.querySelector('.kit-sheet-body').textContent, 'It leaves the lists.');
    const btn = actionBtn(c);
    eq([btn.textContent, btn.classList.contains('danger'), btn.classList.contains('fill')], ['Delete', true, false]);
    assert(cancelBtn(c), 'a Cancel button');
    assert(document.activeElement === btn, 'focus on the action');
  } finally { c.close(); }
  const f = confirm({ title: 't', body: h('ul', null, h('li', null, 'x')), action: { label: 'Move', tone: 'fill' }, run: () => Promise.resolve() });
  try {
    assert(actionBtn(f).classList.contains('fill'), 'fill tone');
    assert(f.el.querySelector('.kit-sheet-body > ul'), 'a Node body');
  } finally { f.close(); }
});

test('confirm: Esc, Cancel and the backdrop close it with run not called', () => {
  let ran = 0;
  const open = () => confirm({ title: 't', body: 'b', action: { label: 'Go', tone: 'fill' }, run: () => { ran++; return Promise.resolve(); } });
  const a = open();
  press('Escape');
  assert(!a.el.isConnected, 'Esc closes');
  const b = open();
  cancelBtn(b).click();
  assert(!b.el.isConnected, 'Cancel closes');
  const c = open();
  document.querySelector('.kit-backdrop').click();
  assert(!c.el.isConnected, 'backdrop closes');
  eq(ran, 0);
});

test('confirm: the action disables while run runs and a resolved run closes it', async () => {
  let resolve;
  let ran = 0;
  const c = confirm({ title: 't', body: 'b', action: { label: 'Go', tone: 'fill' }, run: () => { ran++; return new Promise(r => { resolve = r; }); } });
  try {
    actionBtn(c).click();
    eq(ran, 1);
    assert(actionBtn(c).disabled, 'disabled while running');
    actionBtn(c).click();
    eq(ran, 1, 'a second press does not run again');
    assert(c.el.isConnected, 'still open while running');
    resolve();
    await tick();
    assert(!c.el.isConnected, 'closed once run resolves');
  } finally { c.close(); }
});

test('confirm: a rejected run stays open with its message and the action enabled again', async () => {
  let fail = true;
  let ran = 0;
  const c = confirm({ title: 't', body: 'b', action: { label: 'Go', tone: 'danger' }, run: () => { ran++; return fail ? Promise.reject(new Error('the plan changed')) : Promise.resolve(); } });
  try {
    actionBtn(c).click();
    await tick();
    assert(c.el.isConnected, 'stays open');
    eq(c.el.querySelector('.kit-sheet-error').textContent, 'the plan changed');
    assert(!actionBtn(c).disabled, 'enabled again');
    fail = false;
    actionBtn(c).click();
    eq(c.el.querySelector('.kit-sheet-error').textContent, '', 'a retry clears the error');
    await tick();
    eq(ran, 2);
    assert(!c.el.isConnected, 'the retry closes it');
  } finally { c.close(); }
});

test('confirm: setDisabled and disabled turn the action off and on', () => {
  let ran = 0;
  const c = confirm({ title: 't', body: 'b', action: { label: 'Move', tone: 'fill' }, disabled: true, run: () => { ran++; return Promise.resolve(); } });
  try {
    assert(actionBtn(c).disabled, 'starts disabled');
    actionBtn(c).click();
    eq(ran, 0);
    c.setDisabled(false);
    assert(!actionBtn(c).disabled, 'enabled');
    c.setDisabled(true);
    assert(actionBtn(c).disabled, 'disabled again');
  } finally { c.close(); }
});
