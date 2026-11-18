import { test, eq, assert, fixture } from './harness.js';
import { filterRow, statusPills, groupList, rowMenu } from '/_kit/frontpage.js';

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
