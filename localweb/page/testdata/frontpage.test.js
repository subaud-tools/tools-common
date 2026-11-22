import { test, eq, assert, fixture, focusEl } from './harness.js';
import { filterRow, statusPills, groupList, rowMenu, sortSwitch, sortedList } from '/_kit/frontpage.js';
import { indexRow } from '/_kit/index.js';
import { pickField, band } from '/_kit/dom.js';

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
  eq(pillsOf(el), ['All · 3', 'Needs you · 3']);
  assert(!el.querySelector('.kit-arrow'), 'no arrows');
  eq([...el.children].map(c => c.className), ['kit-stages-bar']);
});

test('statusPills: one joined bar, the count after a dot, the segments touching', () => {
  const fx = fixture();
  const el = statusPills({ pills: [{ value: '', label: 'All', count: 32 }, { value: 'open', label: 'Open', count: 8 }, { value: 'planned', label: 'Planned', count: 15 }], chosen: [], onToggle() {} });
  fx.append(el);
  const segs = [...el.querySelectorAll('.kit-stage')];
  eq(segs[1].textContent, 'Open · 8');
  const bs = segs.map(s => s.getBoundingClientRect());
  for (let i = 1; i < bs.length; i++) {
    eq(bs[i].top, bs[0].top);
    assert(Math.abs(bs[i].left - bs[i - 1].right) <= 1.01, `segment ${i} touches the one before`);
  }
});

test('statusPills: an empty one shows while it is chosen, and the chosen are on', () => {
  const el = statusPills({ pills, chosen: ['needs', 'built'], onToggle() {} });
  eq(pillsOf(el), ['All · 3', 'Needs you · 3', 'Built · 0']);
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

const mutedOf = el => {
  const fx = document.createElement('span');
  fx.style.color = 'var(--kit-muted)';
  el.append(fx);
  return getComputedStyle(fx).color;
};

test('rowMenu: an item with detail shows its label and the muted detail line, and a press still runs it', () => {
  const got = [];
  const line = 'Save it as an idea for later, to come back to once the work it waits on has landed.';
  const el = rowMenu({ label: 'More', items: [{ label: 'Move to planned', detail: line, run: () => got.push('planned'), action: 'planned' }] });
  fixture().append(el);
  const { btn, pop } = parts(el);
  btn.click();
  const item = pop.querySelector('button');
  eq([item.getAttribute('role'), item.dataset.action, item.firstChild.textContent, item.querySelector('.kit-row-detail').textContent], ['menuitem', 'planned', 'Move to planned', line]);
  const d = getComputedStyle(item.querySelector('.kit-row-detail'));
  eq([d.display, d.fontSize, d.color, d.whiteSpace], ['block', '12px', mutedOf(el), 'normal']);
  eq(pop.getBoundingClientRect().width, 340, 'a menu with details takes its lines\' width, capped');
  assert(item.querySelector('.kit-row-detail').getBoundingClientRect().height > 20, 'the detail wraps');
  item.querySelector('.kit-row-detail').click();
  assert(pop.hidden, 'closed');
  eq(got, ['planned']);
});

test('rowMenu: a link item with detail shows its label and the detail line, and a press still runs it', () => {
  const got = [];
  const el = rowMenu({ label: 'More', items: [{ label: 'Record', href: '#r', detail: 'Open its record.', run: () => got.push('record') }] });
  fixture().append(el);
  const { btn, pop } = parts(el);
  btn.click();
  const a = pop.querySelector('a');
  eq([a.getAttribute('role'), a.firstChild.textContent, a.querySelector('.kit-row-detail').textContent], ['menuitem', 'Record', 'Open its record.']);
  a.click();
  assert(pop.hidden, 'closed');
  eq(got, ['record']);
});

test('rowMenu: a heading is a muted label, not a menuitem, never focused, and a press on it leaves the menu open', () => {
  const got = [];
  const el = rowMenu({ label: 'More', items: [{ heading: 'Start fresh as' }, { label: 'System', run: () => got.push('system') }] });
  fixture().append(el);
  const { btn, pop } = parts(el);
  btn.click();
  const head = pop.querySelector('.kit-row-head');
  eq([head.tagName, head.getAttribute('role'), head.textContent, head.tabIndex], ['DIV', 'presentation', 'Start fresh as', -1]);
  eq([...pop.querySelectorAll('[role="menuitem"]')].map(m => m.textContent), ['System']);
  head.focus();
  assert(document.activeElement !== head, 'not focusable');
  const s = getComputedStyle(head), b = getComputedStyle(pop.querySelector('button'));
  eq([s.color, s.paddingLeft], [mutedOf(el), b.paddingLeft]);
  head.click();
  assert(!pop.hidden, 'still open');
  eq(got, []);
  btn.click();
});

test('rowMenu: an item with no detail draws exactly as before', () => {
  const el = rowMenu({ label: 'More', items: [{ label: 'Rename', run() {} }, { label: 'Record', href: '#r' }] });
  const { pop } = parts(el);
  eq([...pop.children].map(c => c.innerHTML), ['Rename', 'Record']);
  eq(pop.querySelector('.kit-row-detail'), null);
});

// A window w by ht with the kit's styles, for a menu's place in it.
async function menuWindow(w, ht = 600) {
  const win = document.createElement('iframe');
  win.style.cssText = `width:${w}px; height:${ht}px; border:0; display:block`;
  win.srcdoc = '<!doctype html><link rel="stylesheet" href="/_kit/kit.css"><style>html,body{margin:0}'
    + '.r{display:flex;justify-content:space-between;align-items:center;height:40px;padding:0 12px}</style><body>';
  const loaded = new Promise(r => win.addEventListener('load', r, { once: true }));
  fixture().append(win);
  await loaded;
  await new Promise(r => setTimeout(r, 50));
  return { win, doc: win.contentDocument, view: win.contentWindow };
}
const DETAILS = [
  { label: 'Move to planned', detail: 'Save it as an idea for later, to come back to once the work it waits on has landed.', run() {} },
  { label: 'Rename', run() {} },
  { separator: true },
  { label: 'Delete', danger: true, run() {} },
];
const line = (text, ...kids) => {
  const d = document.createElement('div');
  d.className = 'r';
  d.append(text, ...kids);
  return d;
};
const box = el => { const r = el.getBoundingClientRect(); return [r.left, r.top, r.width, r.height]; };
const inside = (m, view, doc) => m.left >= -0.5 && m.top >= -0.5 && m.right <= doc.documentElement.clientWidth + 0.5 && m.bottom <= view.innerHeight + 0.5;

for (const w of [1280, 390]) {
  test(`rowMenu at ${w}px: opening at the foot of a tall page moves nothing, and the menu opens above its button inside the window`, async () => {
    const { doc, view } = await menuWindow(w);
    const el = rowMenu({ label: 'More', items: DETAILS });
    const tall = document.createElement('div');
    tall.style.height = '1500px';
    const a = line('Pane one'), b = line('Pane two'), last = line('Pane three', el);
    doc.body.append(tall, a, b, last);
    view.scrollTo(0, 99999);
    const root = doc.documentElement;
    const before = [root.scrollHeight, view.scrollY, box(tall), box(a), box(b), box(last), box(el)];
    assert(view.scrollY > 0, 'scrolled to the foot');
    const { btn, pop } = parts(el);
    btn.click();
    await new Promise(r => setTimeout(r, 30));
    eq([root.scrollHeight, view.scrollY, box(tall), box(a), box(b), box(last), box(el)], before, 'nothing moved on open');
    assert(pop.matches(':popover-open'), 'in the top layer');
    const r = btn.getBoundingClientRect(), m = pop.getBoundingClientRect();
    assert(inside(m, view, doc), `inside the window (${[m.left, m.top, m.right, m.bottom]})`);
    eq(Math.round(r.top - m.bottom), 4, '4px above the button: no room below');
    eq(Math.round(m.right), Math.round(r.right), 'on the button\'s right edge');
    eq(m.width, 340, 'a menu with details keeps its width');
    btn.click();
    await new Promise(r2 => setTimeout(r2, 30));
    eq([root.scrollHeight, view.scrollY, box(tall), box(a), box(b), box(last), box(el)], before, 'nothing moved on close');
    fixture().replaceChildren();
  });
}

test('rowMenu: with room below, the menu hangs 4px below its button on its right edge', async () => {
  const { doc, view } = await menuWindow(1280);
  const el = menu();
  doc.body.append(line('Pane', el));
  const { btn, pop } = parts(el);
  btn.click();
  const r = btn.getBoundingClientRect(), m = pop.getBoundingClientRect();
  eq([Math.round(m.top - r.bottom), Math.round(m.right)], [4, Math.round(r.right)]);
  eq(m.width, 140, 'a menu with no details keeps its 140px');
  assert(inside(m, view, doc), 'inside the window');
  btn.click();
  fixture().replaceChildren();
});

test('rowMenu at 390px: a menu whose button is at the window\'s left opens on the button\'s left edge, inside the window', async () => {
  const { doc, view } = await menuWindow(390);
  const el = rowMenu({ label: 'More', items: DETAILS });
  const row = line('', el);
  row.style.justifyContent = 'flex-start';
  doc.body.append(row);
  const { btn, pop } = parts(el);
  btn.click();
  const r = btn.getBoundingClientRect(), m = pop.getBoundingClientRect();
  assert(inside(m, view, doc), `inside the window (${[m.left, m.right]})`);
  eq(Math.round(m.left), Math.round(r.left), 'on the left edge');
  btn.click();
  fixture().replaceChildren();
});

test('rowMenu: a menu of many items is never taller than the window and scrolls inside itself', async () => {
  const { doc, view } = await menuWindow(400, 300);
  const el = rowMenu({ label: 'More', items: Array.from({ length: 30 }, (_, i) => ({ label: `Item ${i}`, run() {} })) });
  doc.body.append(line('Pane', el));
  const { btn, pop } = parts(el);
  const high = doc.documentElement.scrollHeight;
  btn.click();
  const m = pop.getBoundingClientRect();
  assert(inside(m, view, doc), `inside the window (${m.top}-${m.bottom})`);
  assert(m.height <= view.innerHeight, 'no taller than the window');
  assert(pop.scrollHeight > pop.clientHeight, 'it scrolls inside itself');
  eq(doc.documentElement.scrollHeight, high, 'the page is no longer');
  pop.scrollTop = 40;
  pop.dispatchEvent(new Event('scroll'));
  eq(pop.scrollTop, 40, 'scrolling the menu keeps its place');
  btn.click();
  fixture().replaceChildren();
});

test('rowMenu: a menu in a scrolling container opens at its button, and follows it when the container scrolls', async () => {
  const { doc } = await menuWindow(800);
  const el = menu();
  const pane = document.createElement('div');
  pane.style.cssText = 'height:200px;overflow:auto;margin:20px;width:400px';
  const pad = document.createElement('div');
  pad.style.height = '300px';
  const foot = document.createElement('div');
  foot.style.height = '300px';
  pane.append(pad, line('Row', el), foot);
  doc.body.append(pane);
  pane.scrollTop = 250;
  const { btn, pop } = parts(el);
  btn.click();
  eq(pane.scrollTop, 250, 'the container did not scroll');
  const at = () => {
    const r = btn.getBoundingClientRect(), m = pop.getBoundingClientRect();
    return [Math.round(m.top - r.bottom), Math.round(m.right - r.right)];
  };
  eq(at(), [4, 0], 'at its button');
  pane.scrollTop = 290;
  pane.dispatchEvent(new Event('scroll'));
  eq(at(), [4, 0], 'still at its button after a scroll');
  assert(!pop.hidden, 'and still open');
  btn.click();
  fixture().replaceChildren();
});

test('rowMenu: hidden while closed, in the top layer while open, and the keyboard as before', () => {
  const got = [];
  const el = menu(got);
  fixture().append(el);
  const { btn, pop } = parts(el);
  eq([...el.children], [btn, pop], 'the button, then the menu, inside the wrapper');
  assert(pop.hidden && el.querySelector('.kit-row-pop[hidden]') === pop && !pop.matches(':popover-open'), 'hidden while closed');
  btn.focus();
  btn.click();
  assert(!pop.hidden && pop.matches(':popover-open'), 'open in the top layer');
  assert(document.activeElement === btn, 'opening leaves the focus on the button');
  const items = [...pop.querySelectorAll('[role="menuitem"]')];
  items[0].focus();
  assert(document.activeElement === items[0], 'an item takes the focus');
  const r = items[0].getBoundingClientRect();
  assert(items[0].contains(document.elementFromPoint(r.left + 4, r.top + 4)), 'the item is on top');
  btn.focus();
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  assert(pop.hidden && !pop.matches(':popover-open'), 'Esc closes it');
  eq(getComputedStyle(pop).display, 'none');
  assert(document.activeElement === btn, 'the focus stays on the button');
  eq(got, []);
});

test('rowMenu: opening a pickField closes an open row menu, and the other way round', () => {
  const el = menu();
  const p = pickField({ label: 'Kind', choices: [{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }], value: 'a' });
  fixture().append(el, p.el);
  const { btn, pop } = parts(el);
  const pb = p.el.querySelector('.kit-pick-btn'), pp = p.el.querySelector('.kit-pick-pop');
  btn.click();
  pb.click();
  assert(pop.hidden && !pop.matches(':popover-open'), 'the row menu closed');
  assert(!pp.hidden, 'the dropdown open');
  btn.click();
  assert(pp.hidden && !pp.matches(':popover-open'), 'the dropdown closed');
  assert(!pop.hidden, 'the row menu open');
  btn.click();
});

test('rowMenu: open, drawn before it is in the page, shows at its button once it is', async () => {
  const el = rowMenu({ label: 'More', open: true, items: [{ label: 'A', run() {} }] });
  const { btn, pop } = parts(el);
  assert(!pop.hidden, 'open before it is in the page');
  const row = line('Row', el);
  row.style.cssText = 'display:flex;justify-content:space-between';
  fixture().append(row);
  await new Promise(r => setTimeout(r, 0));
  assert(pop.matches(':popover-open'), 'in the top layer');
  const r = btn.getBoundingClientRect(), m = pop.getBoundingClientRect();
  eq([Math.round(m.top - r.bottom), Math.round(m.right - r.right)], [4, 0], 'at its button');
  btn.click();
  assert(pop.hidden, 'closed');
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

const docs = [{ name: 'b.md', at: 1 }, { name: 'c.md', at: 3 }, { name: 'a.md', at: 2 }];
const docOrders = [
  { value: 'recent', label: 'recent', compare: (a, b) => b.at - a.at },
  { value: 'name', label: 'name', compare: (a, b) => a.name.localeCompare(b.name) },
];
const docRow = d => indexRow({ id: d.name, title: d.name });
const sorted = (o = {}) => sortedList({ name: 'kittest', orders: docOrders, items: docs, row: docRow, empty: 'No documents.', ...o });
const namesOf = el => [...el.querySelectorAll('.kit-group-rows > li .kit-index-title')].map(t => t.textContent);
const fresh = () => localStorage.removeItem('kittest.sort');

test('sortedList: the sort switch, then one card of rows in the first order by default', () => {
  fresh();
  const { el } = sorted();
  eq(el.className, 'kit-sorted');
  eq([...el.children].map(c => c.className), ['kit-sort', 'kit-card']);
  eq(el.children[1].tagName, 'SECTION');
  eq(namesOf(el), ['c.md', 'a.md', 'b.md']);
  eq(el.querySelector('.kit-chip.on').dataset.value, 'recent');
});

test('sortedList: a press on another order re-sorts in place and is remembered', () => {
  fresh();
  const { el } = sorted();
  el.querySelector('[data-value="name"]').click();
  eq(namesOf(el), ['a.md', 'b.md', 'c.md']);
  eq(el.querySelector('.kit-chip.on').dataset.value, 'name');
  eq(localStorage.getItem('kittest.sort'), 'name');
  eq(namesOf(sorted().el), ['a.md', 'b.md', 'c.md'], 'a new list with the same name');
  fresh();
});

test('sortedList: an unknown remembered order falls back to the first', () => {
  localStorage.setItem('kittest.sort', 'gone');
  const { el } = sorted();
  eq(namesOf(el), ['c.md', 'a.md', 'b.md']);
  eq(el.querySelector('.kit-chip.on').dataset.value, 'recent');
  fresh();
});

test('sortedList: set redraws with new items and keeps the order', () => {
  fresh();
  const list = sorted();
  list.el.querySelector('[data-value="name"]').click();
  list.set([...docs, { name: '0.md', at: 9 }]);
  eq(namesOf(list.el), ['0.md', 'a.md', 'b.md', 'c.md']);
  eq(list.el.querySelector('.kit-chip.on').dataset.value, 'name');
  list.set([]);
  eq(list.el.querySelector('.kit-card .kit-empty').textContent, 'No documents.');
  fresh();
});

test('sortedList: no items shows the empty line in the card, label names the switch', () => {
  fresh();
  const { el } = sorted({ items: [], label: 'order' });
  eq(el.querySelector('.kit-card > .kit-empty').textContent, 'No documents.');
  assert(!el.querySelector('.kit-group-rows'), 'no list');
  eq(el.querySelector('.kit-sort-label').textContent, 'order');
});

test('sortedList: the items given are not reordered', () => {
  fresh();
  const items = [...docs];
  sorted({ items });
  eq(items.map(d => d.name), ['b.md', 'c.md', 'a.md']);
});

test('sortedList: a list with no groups draws no group heading, grip or menu', () => {
  fresh();
  const { el } = sorted();
  assert(!el.querySelector('.kit-group-line, .kit-group-grip, .kit-row-menu'), 'none');
  eq(el.querySelectorAll('section').length, 1);
});

const plans = [
  { name: 'b', at: 2, status: 'agent', project: 'tools · diazo' },
  { name: 'a', at: 1, status: 'agent', project: 'tools · galley' },
  { name: 'c', at: 3, status: 'needs', project: 'tools · diazo' },
  { name: 'd', at: 4, status: 'done', project: 'tools' },
  { name: 'e', at: 5, status: 'parked', project: 'tools · galley' },
];
const statusLabels = { needs: 'Needs you', agent: 'With the agent', waiting: 'Waiting', parked: 'Parked', done: 'Completed' };
const byStatus = (o = {}) => ({ name: 'status', key: p => ({ key: p.status, label: statusLabels[p.status] }), order: ['needs', 'agent', 'waiting', 'parked', 'done'], uncounted: ['done'], folded: ['done'], ...o });
const byProject = { name: 'project', key: p => ({ key: p.project, label: p.project }), order: [] };
const planRow = p => indexRow({ id: p.name, title: p.name });
const gfresh = () => { for (const k of Object.keys(localStorage)) if (k.startsWith('kitgroups.')) localStorage.removeItem(k); };
const grouped = (o = {}) => sortedList({ name: 'kitgroups', orders: docOrders, items: plans, row: planRow, empty: 'No plans.', groups: byStatus(), ...o });
const groupKeys = el => [...el.querySelectorAll('section.kit-group')].map(s => s.dataset.group);
const headsOf = el => [...el.querySelectorAll('.kit-group-head')].map(b => b.textContent);
const rowsIn = (el, key) => [...el.querySelector(`[data-group="${key}"]`).querySelectorAll('.kit-group-rows .kit-index-title')].map(t => t.textContent);
const menuOf = (el, key) => el.querySelector(`[data-group="${key}"] .kit-row-menu`);
const press = (el, key, action) => {
  menuOf(el, key).querySelector('.kit-row-more').click();
  document.querySelector(`.kit-row-pop:not([hidden]) [data-action="${action}"]`).click();
};

test('sortedList groups: the switch, then one folding card per group with rows, in the order given', () => {
  gfresh();
  const { el } = grouped();
  fixture().append(el);
  eq(el.children[0].className, 'kit-sort');
  eq(groupKeys(el), ['needs', 'agent', 'parked', 'done']);
  eq(el.querySelector('section').className.split(' ').slice(0, 2), ['kit-card', 'kit-group']);
  eq(headsOf(el), ['Needs you · 1', 'With the agent · 2', 'Parked · 1', 'Completed']);
  const line = el.querySelector('[data-group="agent"] .kit-group-line');
  eq([...line.children].map(c => c.className), ['kit-group-grip', 'kit-label kit-group-head', 'kit-row-menu']);
  const grip = line.children[0];
  eq([grip.textContent, grip.getAttribute('draggable')], ['⠿', 'true']);
  gfresh();
});

test('sortedList groups: an empty group is hidden, and a key no order names goes after the rest, A to Z', () => {
  gfresh();
  const { el } = grouped({ items: [...plans, { name: 'z', at: 0, status: 'zeta' }, { name: 'y', at: 0, status: 'alpha' }], groups: byStatus({ key: p => ({ key: p.status, label: statusLabels[p.status] ?? p.status }) }) });
  eq(groupKeys(el), ['needs', 'agent', 'parked', 'done', 'alpha', 'zeta']);
  assert(!el.querySelector('[data-group="waiting"]'), 'waiting has none');
  gfresh();
});

test('sortedList groups: rows inside each group are sorted by the chosen order', () => {
  gfresh();
  localStorage.removeItem('kitgroups.sort');
  const { el } = grouped();
  eq(rowsIn(el, 'agent'), ['b', 'a']);
  el.querySelector('.kit-sort [data-value="name"]').click();
  eq(rowsIn(el, 'agent'), ['a', 'b']);
  eq(groupKeys(el), ['needs', 'agent', 'parked', 'done']);
  localStorage.removeItem('kitgroups.sort');
  gfresh();
});

test('sortedList groups: the ⋯ holds Move up, Move down, Move to top and Reset order, each saying where it goes', () => {
  gfresh();
  const { el } = grouped();
  fixture().append(el);
  menuOf(el, 'agent').querySelector('.kit-row-more').click();
  const items = [...document.querySelectorAll('.kit-row-pop:not([hidden]) [role="menuitem"]')];
  eq(items.map(i => [i.dataset.action, i.firstChild.textContent, i.querySelector('.kit-row-detail').textContent]), [
    ['up', 'Move up', 'Puts With the agent above Needs you'],
    ['down', 'Move down', 'Puts it below Parked'],
    ['top', 'Move to top', 'Makes it the first group'],
    ['reset', 'Reset order', 'Back to Needs you first'],
  ]);
  document.body.click();
  gfresh();
});

test('sortedList groups: Move up, Move down and Move to top change the order and keep it across set', () => {
  gfresh();
  const list = grouped();
  fixture().append(list.el);
  press(list.el, 'agent', 'up');
  eq(groupKeys(list.el), ['agent', 'needs', 'parked', 'done']);
  press(list.el, 'agent', 'down');
  eq(groupKeys(list.el), ['needs', 'agent', 'parked', 'done']);
  press(list.el, 'parked', 'down');
  eq(groupKeys(list.el), ['needs', 'agent', 'done', 'parked']);
  press(list.el, 'done', 'top');
  eq(groupKeys(list.el), ['done', 'needs', 'agent', 'parked']);
  list.set(plans);
  eq(groupKeys(list.el), ['done', 'needs', 'agent', 'parked']);
  eq(groupKeys(grouped().el), ['done', 'needs', 'agent', 'parked'], 'a new list with the same name');
  eq(JSON.parse(localStorage.getItem('kitgroups.order.status')).slice(0, 3), ['done', 'needs', 'agent']);
  gfresh();
});

test('sortedList groups: a move skips a hidden group, which keeps its place', () => {
  gfresh();
  const list = grouped();
  fixture().append(list.el);
  press(list.el, 'parked', 'up');
  eq(groupKeys(list.el), ['needs', 'parked', 'agent', 'done']);
  list.set([...plans, { name: 'w', at: 0, status: 'waiting' }]);
  eq(groupKeys(list.el), ['needs', 'parked', 'agent', 'waiting', 'done']);
  gfresh();
});

test('sortedList groups: Reset order goes back to the order given and forgets the kept one', () => {
  gfresh();
  const list = grouped();
  fixture().append(list.el);
  press(list.el, 'done', 'top');
  press(list.el, 'done', 'reset');
  eq(groupKeys(list.el), ['needs', 'agent', 'parked', 'done']);
  eq(localStorage.getItem('kitgroups.order.status'), null);
  gfresh();
});

test('sortedList groups: a drag by the grip moves a group before or after the one it is dropped on', () => {
  gfresh();
  const list = grouped();
  fixture().append(list.el);
  const drag = (from, to, half) => {
    const dt = new DataTransfer();
    list.el.querySelector(`[data-group="${from}"] .kit-group-grip`).dispatchEvent(new DragEvent('dragstart', { bubbles: true, dataTransfer: dt }));
    const target = list.el.querySelector(`[data-group="${to}"]`);
    const r = target.getBoundingClientRect();
    const y = half === 'top' ? r.top + 2 : r.bottom - 2;
    target.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt, clientY: y }));
    target.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt, clientY: y }));
  };
  drag('parked', 'needs', 'top');
  eq(groupKeys(list.el), ['parked', 'needs', 'agent', 'done']);
  drag('parked', 'agent', 'bottom');
  eq(groupKeys(list.el), ['needs', 'agent', 'parked', 'done']);
  drag('needs', 'done', 'bottom');
  eq(groupKeys(list.el), ['agent', 'parked', 'done', 'needs']);
  list.set(plans);
  eq(groupKeys(list.el), ['agent', 'parked', 'done', 'needs']);
  gfresh();
});

test('sortedList groups: a fold is kept across set, and groups.folded starts folded until one is kept', () => {
  gfresh();
  const list = grouped();
  fixture().append(list.el);
  const sec = key => list.el.querySelector(`[data-group="${key}"]`);
  assert(sec('done').classList.contains('kit-folded'), 'done starts folded');
  eq(sec('done').querySelector('.kit-group-head').getAttribute('aria-expanded'), 'false');
  eq(getComputedStyle(sec('done').querySelector('.kit-group-rows')).display, 'none');
  eq(getComputedStyle(sec('done').querySelector('.kit-group-line')).display, 'flex');
  assert(!sec('agent').classList.contains('kit-folded'), 'agent starts open');
  sec('agent').querySelector('.kit-group-head').click();
  sec('done').querySelector('.kit-group-head').click();
  eq([localStorage.getItem('kitgroups.folded.agent'), localStorage.getItem('kitgroups.folded.done')], ['1', '']);
  list.set(plans);
  assert(sec('agent').classList.contains('kit-folded'), 'agent kept folded');
  assert(!sec('done').classList.contains('kit-folded'), 'done kept open');
  gfresh();
});

test('sortedList groups: set with another grouping draws its own kept order, and the sort stays', () => {
  gfresh();
  const list = grouped();
  fixture().append(list.el);
  list.el.querySelector('.kit-sort [data-value="name"]').click();
  press(list.el, 'done', 'top');
  list.set(plans, byProject);
  eq(groupKeys(list.el), ['tools', 'tools · diazo', 'tools · galley']);
  eq(headsOf(list.el), ['tools · 1', 'tools · diazo · 2', 'tools · galley · 2']);
  eq(rowsIn(list.el, 'tools · diazo'), ['b', 'c']);
  press(list.el, 'tools · galley', 'top');
  eq(groupKeys(list.el), ['tools · galley', 'tools', 'tools · diazo']);
  list.set(plans, byStatus());
  eq(groupKeys(list.el), ['done', 'needs', 'agent', 'parked']);
  list.set(plans, byProject);
  eq(groupKeys(list.el), ['tools · galley', 'tools', 'tools · diazo']);
  eq(list.el.querySelector('.kit-chip.on').dataset.value, 'name');
  localStorage.removeItem('kitgroups.sort');
  gfresh();
});

test('sortedList groups: a kept key that no longer exists is dropped, and a new one goes where order puts it', () => {
  gfresh();
  localStorage.setItem('kitgroups.order.status', JSON.stringify(['gone', 'done', 'agent', 'needs']));
  const { el } = grouped();
  eq(groupKeys(el), ['done', 'agent', 'parked', 'needs'], 'parked follows agent, as order has it');
  gfresh();
});

test('sortedList groups: a move keeps the kept place of every group a filter is hiding', () => {
  gfresh();
  const proj = { name: 'project', key: p => ({ key: p.project, label: p.project }), order: [] };
  const four = ['a', 'b', 'c', 'd'].map((k, i) => ({ name: `p${k}`, at: i, project: k }));
  localStorage.setItem('kitgroups.order.project', JSON.stringify(['a', 'b', 'c', 'd']));
  const list = grouped({ items: four.filter(p => p.project === 'b' || p.project === 'd'), groups: proj });
  fixture().append(list.el);
  eq(groupKeys(list.el), ['b', 'd']);
  press(list.el, 'd', 'top');
  eq(groupKeys(list.el), ['d', 'b']);
  list.set(four);
  eq(groupKeys(list.el), ['d', 'a', 'b', 'c']);
  eq(JSON.parse(localStorage.getItem('kitgroups.order.project')), ['d', 'a', 'b', 'c']);
  gfresh();
});

test('sortedList groups: no items shows the empty line in one card', () => {
  gfresh();
  const { el } = grouped({ items: [] });
  eq(el.querySelector('.kit-card > .kit-empty').textContent, 'No plans.');
  eq(el.querySelectorAll('section').length, 1);
});

test('sortedList groups: every heading and row is drawn alike, with no edge of its own', () => {
  gfresh();
  const { el } = grouped();
  fixture().append(el);
  const secs = [...el.querySelectorAll('section.kit-group')];
  eq(new Set(secs.map(s => s.className.replace(' kit-folded', ''))).size, 1);
  eq(new Set(secs.map(s => getComputedStyle(s).borderLeftColor)).size, 1);
  gfresh();
});

test('indexRow: place is its own muted line between the title and the meta, only when given', () => {
  const el = indexRow({ id: 'r', title: 'spec.md', place: 'tools-ops · docs', meta: 'waiting on you', attention: true });
  fixture().append(el);
  const main = el.querySelector('.kit-index-main');
  eq([...main.children].map(c => c.className), ['kit-index-title', 'kit-meta kit-place', 'kit-meta']);
  eq(el.querySelector('.kit-place').textContent, 'tools-ops · docs');
  const [title, place, meta] = main.children;
  assert(place.getBoundingClientRect().top >= title.getBoundingClientRect().bottom - 1, 'below the title');
  assert(meta.getBoundingClientRect().top >= place.getBoundingClientRect().bottom - 1, 'above the meta');
  const fx = document.createElement('span');
  fx.style.color = 'var(--kit-muted)';
  el.append(fx);
  eq(getComputedStyle(place).color, getComputedStyle(fx).color, 'muted while the meta is in the signal colour');
  eq(indexRow({ id: 'r', title: 't', meta: 'm' }).querySelector('.kit-place'), null);
});

test('sortedList: title opens the card with the count of rows shown, redrawn on a press and on set', () => {
  fresh();
  const list = sorted({ title: n => `${n} documents` });
  const head = () => list.el.querySelector('.kit-card > div.kit-label.kit-group-head');
  eq(head().textContent, '3 documents');
  assert(list.el.querySelector('.kit-card').firstChild === head(), 'first in the card');
  list.el.querySelector('[data-value="name"]').click();
  eq(head().textContent, '3 documents');
  list.set(docs.slice(0, 1));
  eq(head().textContent, '1 documents');
  list.set([]);
  eq(head().textContent, '0 documents');
  assert(!sorted().el.querySelector('.kit-group-head'), 'no title, no head');
  fresh();
});

test('sortedList: a press with focus in the switch puts focus on the chosen chip after the redraw', () => {
  fresh();
  const { el } = sorted();
  fixture().append(el);
  focusEl(el.querySelector('[data-value="name"]'));
  el.querySelector('[data-value="name"]').click();
  const now = el.querySelector('.kit-chip.on');
  eq(now.dataset.value, 'name');
  assert(document.activeElement === now, 'focus on the new chosen chip');
  fresh();
});

test('sortSwitch: a caller redrawing on a press gets focus back on the chosen chip', () => {
  const box = fixture();
  let chosen = 'needs';
  const draw = () => box.replaceChildren(sortSwitch({ orders, chosen, onPick: v => { chosen = v; draw(); } }));
  draw();
  focusEl(box.querySelector('[data-value="recent"]'));
  box.querySelector('[data-value="recent"]').click();
  assert(document.activeElement === box.querySelector('.kit-chip.on[data-value="recent"]'), 'focus on the new chip');
});

test('sortSwitch: a press with focus elsewhere leaves focus alone', () => {
  const fx = fixture();
  const other = document.createElement('input');
  const box = document.createElement('div');
  fx.append(other, box);
  let chosen = 'needs';
  const draw = () => box.replaceChildren(sortSwitch({ orders, chosen, onPick: v => { chosen = v; draw(); } }));
  draw();
  focusEl(other);
  box.querySelector('[data-value="name"]').click();
  assert(document.activeElement === other, 'focus stays');
});

test('indexRow: found is its own line in the button after the meta, a mark in it on the signal-soft ground', () => {
  const m = document.createElement('span');
  m.append('in the text: …each ', Object.assign(document.createElement('mark'), { textContent: 'Lambda' }), ' function…');
  const el = indexRow({ id: 'r', title: 'spec.md', place: 'p', meta: 'm', found: m });
  fixture().append(el);
  const main = el.querySelector('.kit-index-main');
  eq([...main.children].map(c => c.className), ['kit-index-title', 'kit-meta kit-place', 'kit-meta', 'kit-found']);
  const found = main.querySelector('.kit-found');
  assert(found.contains(m), 'the node given');
  const meta = main.children[2];
  assert(found.getBoundingClientRect().top >= meta.getBoundingClientRect().bottom - 1, 'below the meta');
  const fx = document.createElement('span');
  fx.style.color = 'var(--kit-muted)';
  fx.style.backgroundColor = 'var(--kit-signal-soft)';
  el.append(fx);
  const st = getComputedStyle(found);
  eq([st.fontSize, st.color], ['12px', getComputedStyle(fx).color]);
  eq(getComputedStyle(found.querySelector('mark')).backgroundColor, getComputedStyle(fx).backgroundColor);
  eq(indexRow({ id: 'r', title: 't', found: 'in the name' }).querySelector('.kit-found').textContent, 'in the name');
  eq(indexRow({ id: 'r', title: 't' }).querySelector('.kit-found'), null);
});

test('rowMenu: an open menu whose row is moved in the page stays open at its button', async () => {
  const el = menu();
  const a = line('Row a', el), b = line('Row b');
  a.style.cssText = b.style.cssText = 'display:flex;justify-content:space-between';
  fixture().append(a, b);
  const { btn, pop } = parts(el);
  btn.click();
  b.after(a);
  await new Promise(r => setTimeout(r, 50));
  assert(!pop.hidden && pop.matches(':popover-open'), 'still showing');
  const r = btn.getBoundingClientRect(), m = pop.getBoundingClientRect();
  eq([Math.round(m.top - r.bottom), Math.round(m.right - r.right)], [4, 0], 'at its button');
  btn.click();
  assert(pop.hidden && !pop.matches(':popover-open'), 'closed');
});

test('rowMenu: open, with a focus on an item queued before the row is in the page, gives that item the focus', async () => {
  const before = document.createElement('button');
  fixture().append(before);
  before.focus();
  const high = document.documentElement.scrollHeight;
  const el = rowMenu({ label: 'More', open: true, items: [{ label: 'A', run() {} }, { label: 'B', run() {} }] });
  const item = parts(el).pop.querySelectorAll('[role="menuitem"]')[1];
  queueMicrotask(() => item.focus());
  const row = line('Row', el);
  row.style.cssText = 'display:flex;justify-content:space-between';
  fixture().append(row);
  await new Promise(r => setTimeout(r, 30));
  assert(document.activeElement === item, `the item has the focus (${document.activeElement && document.activeElement.tagName})`);
  const { btn, pop } = parts(el);
  assert(pop.matches(':popover-open') && pop.getAttribute('popover') === 'manual', 'in the top layer');
  const r = btn.getBoundingClientRect(), m = pop.getBoundingClientRect();
  eq([Math.round(m.top - r.bottom), Math.round(m.right - r.right)], [4, 0], 'at its button');
  eq([pop.style.opacity, document.documentElement.scrollHeight], ['', high], 'drawn, and the page no longer');
  btn.click();
});

test('rowMenu: an open menu whose row is taken off the page closes and stops listening', async () => {
  const heard = [];
  const el = menu([], heard);
  const row = line('Row', el);
  fixture().append(row);
  const { btn, pop } = parts(el);
  btn.click();
  await new Promise(r => setTimeout(r, 0));
  let asked = 0;
  const real = btn.getBoundingClientRect.bind(btn);
  btn.getBoundingClientRect = () => { asked++; return real(); };
  row.remove();
  await new Promise(r => setTimeout(r, 0));
  assert(pop.hidden, 'closed');
  eq(btn.getAttribute('aria-expanded'), 'false');
  window.dispatchEvent(new Event('scroll'));
  window.dispatchEvent(new Event('resize'));
  eq(asked, 0, 'a scroll or a resize places nothing');
  fixture().append(row);
  await new Promise(r => setTimeout(r, 0));
  assert(pop.hidden && !pop.matches(':popover-open'), 'back in the page, it stays closed');
  eq(asked, 0, 'and is not placed');
  eq(heard, [true], 'onMenu is not told: a caller keeping open from it draws the next one open');
  const other = menu();
  fixture().append(other);
  parts(other).btn.click();
  assert(!parts(other).pop.hidden, 'another menu opens as usual');
  parts(other).btn.click();
});

test('rowMenu: a menu with no details keeps the width it had inside its wrapper: 140px in a row, its widest line in a wide wrapper', () => {
  const draw = () => rowMenu({ label: 'More', items: [{ label: 'Move this plan over to planned', run() {} }, { label: 'Rename', run() {} }] });
  const inRow = draw(), wide = draw();
  const row = line('Row', inRow);
  row.style.cssText = 'display:flex;justify-content:space-between';
  fixture().append(row, wide);
  parts(inRow).btn.click();
  eq(parts(inRow).pop.getBoundingClientRect().width, 140, 'in a row: 140px');
  assert(parts(inRow).pop.querySelector('button').getBoundingClientRect().height > 40, 'and the long label wraps');
  parts(wide).btn.click();
  const w = parts(wide).pop.getBoundingClientRect().width;
  assert(w > 200 && w < 240, `in a wrapper as wide as the page: its widest line (${w})`);
  assert(parts(wide).pop.querySelector('button').getBoundingClientRect().height < 40, 'on one line');
  parts(wide).btn.click();
});

// A window w wide with the kit's stylesheet: the band's phone rules answer to it.
async function sortWindow(w) {
  const win = document.createElement('iframe');
  win.style.cssText = `width:${w}px; height:400px; border:0; display:block`;
  win.srcdoc = '<!doctype html><link rel="stylesheet" href="/_kit/kit.css"><style>html,body{margin:0}</style><body>';
  const loaded = new Promise(r => win.addEventListener('load', r, { once: true }));
  fixture().append(win);
  await loaded;
  await new Promise(r => setTimeout(r, 50));
  return win.contentDocument;
}

test('sortedList: given a band, its switch goes in the band\'s sort place and none sits over its cards', () => {
  fresh();
  const b = band({ title: 'Documents' });
  const list = sorted({ band: b });
  eq(list.el.querySelectorAll('.kit-sort').length, 0, 'no switch in the list');
  eq([...list.el.children].map(c => c.className), ['kit-card']);
  const under = b.el.querySelector('.kit-band-under');
  const sw = under.lastElementChild.lastElementChild;
  assert(sw.querySelector('.kit-sort'), 'the band\'s last element holds the switch');
  sw.querySelector('.kit-chip[data-value="name"]').click();
  eq(namesOf(list.el), ['a.md', 'b.md', 'c.md'], 'a press re-sorts the list');
  eq(localStorage.getItem('kittest.sort'), 'name');
  assert(under.lastElementChild.lastElementChild === sw, 'the same place, redrawn in it');
  eq(sw.querySelector('.kit-chip.on').dataset.value, 'name');
  list.set(docs);
  eq(b.el.querySelectorAll('.kit-sort').length, 1, 'set keeps one switch');
  fresh();
});

test('sortedList: given a band, on a wide page the chips show and the picker is hidden', async () => {
  fresh();
  const doc = await sortWindow(1280);
  const b = band({ title: 'Documents' });
  sorted({ band: b });
  doc.body.append(b.el);
  assert(b.el.querySelector('.kit-sort').getBoundingClientRect().width > 0, 'the chips show');
  eq(b.el.querySelector('.kit-pick-compact').getBoundingClientRect().width, 0, 'the picker is hidden');
});

test('sortedList: given a band, on a phone the switch is a compact picker that re-sorts', async () => {
  fresh();
  const doc = await sortWindow(390);
  const b = band({ title: 'Documents' });
  const list = sorted({ band: b });
  doc.body.append(b.el);
  eq(b.el.querySelector('.kit-sort').getBoundingClientRect().width, 0, 'the chips are hidden');
  const pick = b.el.querySelector('.kit-pick-compact');
  const btn = pick.querySelector('.kit-pick-btn');
  assert(btn.getBoundingClientRect().width > 0, 'the picker shows');
  eq(btn.getBoundingClientRect().height, 28, 'a compact one');
  eq(btn.textContent, 'recent');
  btn.click();
  pick.querySelector('.kit-pick-opt[data-value="name"]').click();
  eq(namesOf(list.el), ['a.md', 'b.md', 'c.md']);
  eq(localStorage.getItem('kittest.sort'), 'name');
  eq(b.el.querySelector('.kit-pick-btn').textContent, 'name');
  assert(b.el.querySelector('.kit-pick-btn') === btn && btn.isConnected, 'the picker stays in place');
  assert(doc.activeElement === btn, `after the redraw the picker has the focus (${doc.activeElement && doc.activeElement.className})`);
  eq(b.el.querySelector('.kit-sort .kit-chip.on').dataset.value, 'name', 'the chips follow');
  fresh();
});
