import { test, eq, assert, fixture } from './harness.js';
import { filterRow, statusPills, groupList, rowMenu, sortSwitch } from '/_kit/frontpage.js';

const projects = [{ value: 'diazo', label: 'diazo', count: 3 }, { value: 'sift', label: 'sift', count: 2 }];
const rowsOf = el => [...el.querySelectorAll('.kit-filter')].map(b => [b.dataset.value, b.querySelector('.kit-index-title').textContent, b.querySelector('.kit-meta').textContent]);
const onOf = el => [...el.querySelectorAll('[aria-pressed="true"]')].map(b => b.dataset.value);
const row = text => {
  const li = document.createElement('li');
  li.textContent = text;
  return li;
};

test('filterRow: its label, All with the total, then one row per value with its count', () => {
  const el = filterRow({ label: 'Projects', items: projects, chosen: [], onToggle() {} });
  eq(el.querySelector('.kit-label').textContent, 'Projects');
  eq(rowsOf(el), [['', 'All', '5'], ['diazo', 'diazo', '3'], ['sift', 'sift', '2']]);
});

test('filterRow: All is on when none is chosen, and several can be chosen at once', () => {
  eq(onOf(filterRow({ label: 'P', items: projects, chosen: [], onToggle() {} })), ['']);
  const el = filterRow({ label: 'P', items: projects, chosen: ['diazo', 'sift'], onToggle() {} });
  eq(onOf(el), ['diazo', 'sift']);
  eq(el.querySelectorAll('.kit-index-row.on').length, 2);
});

test('filterRow: a press says which value, and All says the empty one', () => {
  const got = [];
  const el = filterRow({ label: 'P', items: projects, chosen: [], onToggle: v => got.push(v) });
  el.querySelector('[data-value="sift"]').click();
  el.querySelector('[data-value=""]').click();
  eq(got, ['sift', '']);
});

const repos = [
  { value: 'tools-ops', label: 'tools-ops', count: 4, subs: [{ value: 'tools-ops/docs', label: 'docs', count: 3 }, { value: 'tools-ops/plans', label: 'plans', count: 1 }] },
  { value: 'galley', label: 'galley', count: 2 },
];

test('filterRow: sub-items are hidden while nothing is chosen, and All counts the top items only', () => {
  const el = filterRow({ label: 'Repos', items: repos, chosen: [], onToggle() {} });
  eq(rowsOf(el), [['', 'All', '6'], ['tools-ops', 'tools-ops', '4'], ['galley', 'galley', '2']]);
  eq(el.querySelectorAll('.kit-sub').length, 0);
});

test('filterRow: a chosen item shows its sub-items right after it, indented', () => {
  const el = filterRow({ label: 'Repos', items: repos, chosen: ['tools-ops'], onToggle() {} });
  fixture().append(el);
  eq(rowsOf(el), [['', 'All', '6'], ['tools-ops', 'tools-ops', '4'], ['tools-ops/docs', 'docs', '3'], ['tools-ops/plans', 'plans', '1'], ['galley', 'galley', '2']]);
  const subs = [...el.querySelectorAll('li.kit-index-row.kit-sub')];
  eq(subs.map(li => li.querySelector('.kit-filter').dataset.value), ['tools-ops/docs', 'tools-ops/plans']);
  const pad = b => parseFloat(getComputedStyle(b.querySelector('.kit-index-main')).paddingLeft);
  const top = el.querySelector('[data-value="galley"]').closest('li');
  assert(pad(subs[0]) > pad(top), `indented: ${pad(subs[0])} > ${pad(top)}`);
  eq(getComputedStyle(subs[0]).fontSize, getComputedStyle(top).fontSize);
});

test('filterRow: sub-items show while only a sub-item is chosen, and it is on', () => {
  const el = filterRow({ label: 'Repos', items: repos, chosen: ['tools-ops/plans'], onToggle() {} });
  eq(el.querySelectorAll('.kit-sub').length, 2);
  eq(onOf(el), ['tools-ops/plans']);
});

test('filterRow: a press on a sub-item says its value', () => {
  const got = [];
  const el = filterRow({ label: 'Repos', items: repos, chosen: ['tools-ops'], onToggle: v => got.push(v) });
  el.querySelector('[data-value="tools-ops/docs"]').click();
  eq(got, ['tools-ops/docs']);
});

const pills = [{ value: '', label: 'All', count: 3 }, { value: 'needs', label: 'Needs you', count: 3 }, { value: 'built', label: 'Built', count: 0 }];
const pillsOf = el => [...el.querySelectorAll('.kit-stage')].map(b => b.textContent);

test('statusPills: each with its count, an empty one hidden', () => {
  const el = statusPills({ pills, chosen: [], onToggle() {} });
  eq(el.className, 'kit-stages');
  eq(pillsOf(el), ['All3', 'Needs you3']);
  eq(el.querySelector('.kit-pill-n').textContent, '3');
});

test('statusPills: an empty one shows while it is chosen, and the chosen are on', () => {
  const el = statusPills({ pills, chosen: ['needs', 'built'], onToggle() {} });
  eq(pillsOf(el), ['All3', 'Needs you3', 'Built0']);
  eq(onOf(el), ['needs', 'built']);
  eq(onOf(statusPills({ pills, chosen: [], onToggle() {} })), ['']);
});

test('statusPills: a press says which value', () => {
  const got = [];
  const el = statusPills({ pills, chosen: [], onToggle: v => got.push(v) });
  el.querySelector('[data-value="needs"]').click();
  eq(got, ['needs']);
});

const groups = () => [
  { key: 'needs', title: 'Needs you', rows: [row('a'), row('b')], empty: 'Nothing waits.', edge: 'signal' },
  { key: 'built', title: 'Built', rows: [], empty: 'Nothing built.' },
];

test('groupList: named groups of rows, with their count', () => {
  const el = groupList({ groups: groups(), folded: [], onFold() {} });
  const [needs] = el.children;
  eq(needs.dataset.group, 'needs');
  eq(needs.querySelector('.kit-group-head').textContent, 'Needs you · 2');
  eq([...needs.querySelectorAll('.kit-group-rows > li')].map(l => l.textContent), ['a', 'b']);
});

test('groupList: a group with no rows shows its empty line', () => {
  const built = groupList({ groups: groups(), folded: [], onFold() {} }).children[1];
  eq(built.querySelector('.kit-empty').textContent, 'Nothing built.');
  assert(!built.querySelector('.kit-group-rows'), 'no list');
});

test('groupList: the edge goes on the groups given one', () => {
  const [needs, built] = groupList({ groups: groups(), folded: [], onFold() {} }).children;
  assert(needs.classList.contains('edge-signal'), 'the edge');
  eq(built.className, 'kit-card kit-group');
});

test('groupList: folded hides a group but its head, and a press folds and opens it in place', () => {
  const got = [];
  const el = groupList({ groups: groups(), folded: ['needs'], onFold: (k, on) => got.push([k, on]) });
  fixture().append(el);
  const needs = el.children[0];
  const head = needs.querySelector('.kit-group-head');
  eq(head.getAttribute('aria-expanded'), 'false');
  eq(getComputedStyle(needs.querySelector('.kit-group-rows')).display, 'none');
  head.click();
  eq(head.getAttribute('aria-expanded'), 'true');
  eq(getComputedStyle(needs.querySelector('.kit-group-rows')).display, 'block');
  head.click();
  eq(got, [['needs', false], ['needs', true]]);
});

const menu = (got = [], heard = []) => rowMenu({
  label: 'More for PLAN1',
  items: [
    { label: 'Rename', run: () => got.push('rename'), action: 'rename' },
    { label: 'Walk it', run: () => got.push('walk'), walk: 'w1' },
    { label: 'Delete', run: () => got.push('delete'), danger: true },
  ],
  onMenu: open => heard.push(open),
});
const parts = el => ({ btn: el.querySelector('.kit-row-more'), pop: el.querySelector('.kit-row-pop') });

test('rowMenu: a ⋯ button that names its menu, and the menu hidden until pressed', () => {
  const el = menu();
  fixture().append(el);
  const { btn, pop } = parts(el);
  eq(el.className, 'kit-row-menu');
  eq([btn.textContent, btn.getAttribute('aria-label'), btn.getAttribute('aria-haspopup'), btn.getAttribute('aria-expanded')], ['⋯', 'More for PLAN1', 'menu', 'false']);
  eq(pop.getAttribute('role'), 'menu');
  assert(pop.hidden, 'hidden');
  eq(getComputedStyle(pop).display, 'none');
});

test('rowMenu: the items are menuitems that keep their hooks, a danger one marked', () => {
  const { pop } = parts(menu());
  const items = [...pop.querySelectorAll('button')];
  eq(items.map(b => [b.textContent, b.getAttribute('role'), b.dataset.action || '', b.dataset.walk || '']), [['Rename', 'menuitem', 'rename', ''], ['Walk it', 'menuitem', '', 'w1'], ['Delete', 'menuitem', '', '']]);
  eq(items.map(b => b.classList.contains('danger')), [false, false, true]);
});

test('rowMenu: a danger item reads in the danger colour', () => {
  const el = menu();
  fixture().append(el);
  const fx = document.createElement('span');
  fx.style.color = 'var(--kit-danger)';
  el.append(fx);
  eq(getComputedStyle(el.querySelector('.danger')).color, getComputedStyle(fx).color);
  assert(getComputedStyle(el.querySelector('[data-action="rename"]')).color !== getComputedStyle(fx).color, 'a plain item is not danger');
});

test('rowMenu: a press opens it, and a second press on ⋯ closes it', () => {
  const heard = [];
  const el = menu([], heard);
  fixture().append(el);
  const { btn, pop } = parts(el);
  btn.click();
  assert(!pop.hidden, 'open');
  eq(btn.getAttribute('aria-expanded'), 'true');
  btn.click();
  assert(pop.hidden, 'closed');
  eq(btn.getAttribute('aria-expanded'), 'false');
  eq(heard, [true, false]);
});

test('rowMenu: a press outside closes it', () => {
  const el = menu();
  const fx = fixture();
  const out = document.createElement('button');
  fx.append(el, out);
  const { btn, pop } = parts(el);
  btn.click();
  out.click();
  assert(pop.hidden, 'closed');
  eq(btn.getAttribute('aria-expanded'), 'false');
});

test('rowMenu: Esc closes it', () => {
  const el = menu();
  fixture().append(el);
  const { btn, pop } = parts(el);
  btn.click();
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  assert(pop.hidden, 'closed');
});

test('rowMenu: a press on an item closes the menu, then runs it', () => {
  const got = [];
  const el = menu(got);
  fixture().append(el);
  const { btn, pop } = parts(el);
  const items = pop.querySelectorAll('button');
  items[0].addEventListener('click', () => got.push(pop.hidden ? 'closed' : 'open'));
  btn.click();
  items[2].click();
  assert(pop.hidden, 'closed');
  eq(got, ['delete']);
  btn.click();
  items[0].click();
  eq(got, ['delete', 'rename', 'closed']);
});

test('rowMenu: opening a second menu closes the first', () => {
  const a = menu(), b = menu();
  fixture().append(a, b);
  parts(a).btn.click();
  parts(b).btn.click();
  assert(parts(a).pop.hidden, 'the first closed');
  eq(parts(a).btn.getAttribute('aria-expanded'), 'false');
  assert(!parts(b).pop.hidden, 'the second open');
  parts(b).btn.click();
});

test('rowMenu: an item with href is a menuitem link that keeps its hooks', () => {
  const el = rowMenu({ label: 'More', items: [{ label: 'Record', href: '/p/1/record', action: 'record', walk: 'w2' }] });
  const a = parts(el).pop.querySelector('a');
  eq([a.textContent, a.getAttribute('role'), a.getAttribute('href'), a.dataset.action, a.dataset.walk], ['Record', 'menuitem', '/p/1/record', 'record', 'w2']);
});

test('rowMenu: a link reads like the buttons, with no underline', () => {
  const el = rowMenu({ label: 'More', items: [{ label: 'Record', href: '#r' }, { label: 'Rename', run() {} }] });
  fixture().append(el);
  const { btn, pop } = parts(el);
  btn.click();
  const a = getComputedStyle(pop.querySelector('a')), b = getComputedStyle(pop.querySelector('button'));
  eq([a.display, a.textDecorationLine, a.color, a.fontSize, a.paddingLeft], ['block', 'none', b.color, b.fontSize, b.paddingLeft]);
  btn.click();
});

test('rowMenu: a separator is a line between the items', () => {
  const el = rowMenu({ label: 'More', items: [{ label: 'A', run() {} }, { separator: true }, { label: 'B', run() {} }] });
  fixture().append(el);
  const { btn, pop } = parts(el);
  eq([...pop.children].map(c => [c.tagName, c.getAttribute('role')]), [['BUTTON', 'menuitem'], ['HR', 'separator'], ['BUTTON', 'menuitem']]);
  btn.click();
  const hr = getComputedStyle(pop.querySelector('hr'));
  eq([hr.borderTopWidth, hr.borderBottomWidth, hr.marginTop], ['1px', '0px', '4px']);
  btn.click();
});

test('rowMenu: a disabled item is greyed out and never runs', () => {
  const got = [];
  const el = rowMenu({ label: 'More', items: [{ label: 'Remove all', run: () => got.push('remove'), disabled: true }] });
  fixture().append(el);
  const { btn, pop } = parts(el);
  btn.click();
  const item = pop.querySelector('button');
  assert(item.disabled, 'disabled');
  item.click();
  item.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  eq(got, []);
  const fx = document.createElement('span');
  fx.style.color = 'var(--kit-muted)';
  el.append(fx);
  eq(getComputedStyle(item).color, getComputedStyle(fx).color);
  eq(getComputedStyle(item).cursor, 'default');
  btn.click();
});

test('rowMenu: open draws it open, without onMenu, and Esc still closes it', () => {
  const heard = [];
  const el = rowMenu({ label: 'More', open: true, items: [{ label: 'A', run() {} }], onMenu: o => heard.push(o) });
  fixture().append(el);
  const { btn, pop } = parts(el);
  assert(!pop.hidden, 'open');
  eq(btn.getAttribute('aria-expanded'), 'true');
  assert(!el.contains(document.activeElement), 'takes no focus');
  eq(heard, []);
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  assert(pop.hidden, 'closed');
  eq(heard, [false]);
});

test('rowMenu: open closes the menu already open, and a second opening closes it', () => {
  const a = menu();
  fixture().append(a);
  parts(a).btn.click();
  const b = rowMenu({ label: 'More', open: true, items: [{ label: 'A', run() {} }] });
  fixture().append(b);
  assert(parts(a).pop.hidden, 'the open one closed');
  assert(!parts(b).pop.hidden, 'drawn open');
  const c = menu();
  fixture().append(c);
  parts(c).btn.click();
  assert(parts(b).pop.hidden, 'the drawn-open one closed');
  eq(parts(b).btn.getAttribute('aria-expanded'), 'false');
  parts(c).btn.click();
});

test('rowMenu: a caller keeping open from onMenu keeps it open through redraws', () => {
  let isOpen = false;
  const draw = () => {
    const el = rowMenu({ label: 'More', open: isOpen, items: [{ label: 'A', run() {} }], onMenu: o => { isOpen = o; } });
    fixture().replaceChildren(el);
    return el;
  };
  parts(draw()).btn.click();
  eq(isOpen, true);
  draw();
  draw();
  const el = draw();
  eq(isOpen, true);
  assert(!parts(el).pop.hidden, 'still open after three redraws');
  parts(el).btn.click();
  eq(isOpen, false);
});

test('rowMenu: open is closed by a press outside', () => {
  const el = rowMenu({ label: 'More', open: true, items: [{ label: 'A', run() {} }] });
  const out = document.createElement('button');
  fixture().append(el, out);
  assert(!el.querySelector('.kit-row-pop').hidden, 'drawn open');
  out.click();
  assert(el.querySelector('.kit-row-pop').hidden, 'closed');
});

test('rowMenu: buttonClass replaces the ⋯ button\'s class', () => {
  const el = rowMenu({ label: 'More', buttonClass: 'kit-ctl dz-band-more', items: [{ label: 'A', run() {} }] });
  const btn = el.querySelector('button[aria-haspopup="menu"]');
  eq(btn.className, 'kit-ctl dz-band-more');
  eq(el.querySelector('.kit-row-more'), null);
});

const orders = [{ value: 'needs', label: 'needs you' }, { value: 'recent', label: 'recent' }, { value: 'name', label: 'name' }];
const chipsOf = el => [...el.querySelectorAll('button.kit-chip')].map(b => [b.dataset.value, b.textContent, b.classList.contains('on'), b.getAttribute('aria-pressed')]);

test('sortSwitch: the muted label sort, then one chip per order, the chosen one on', () => {
  const el = sortSwitch({ orders, chosen: 'recent', onPick() {} });
  eq(el.className, 'kit-sort');
  eq(el.firstChild.className, 'kit-sort-label');
  eq(el.firstChild.textContent, 'sort');
  eq(chipsOf(el), [['needs', 'needs you', false, 'false'], ['recent', 'recent', true, 'true'], ['name', 'name', false, 'false']]);
});

test('sortSwitch: label replaces sort', () => {
  eq(sortSwitch({ orders, chosen: 'name', onPick() {}, label: 'order' }).querySelector('.kit-sort-label').textContent, 'order');
});

test('sortSwitch: a press says which order, and the caller keeps it', () => {
  const got = [];
  const el = sortSwitch({ orders, chosen: 'needs', onPick: v => got.push(v) });
  el.querySelector('[data-value="name"]').click();
  eq(got, ['name']);
  eq(chipsOf(el).map(c => c[2]), [true, false, false]);
});

test('sortSwitch: one line, its label muted beside the chips', () => {
  const el = sortSwitch({ orders, chosen: 'needs', onPick() {} });
  fixture().append(el);
  const s = getComputedStyle(el);
  eq([s.display, s.alignItems, s.flexWrap], ['flex', 'center', 'wrap']);
  const fx = document.createElement('span');
  fx.style.color = 'var(--kit-muted)';
  el.append(fx);
  eq(getComputedStyle(el.querySelector('.kit-sort-label')).color, getComputedStyle(fx).color);
  eq(getComputedStyle(el.querySelector('.kit-chip')).marginTop, '0px');
});
