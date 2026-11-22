import { test, eq, assert, fixture, blurEl } from './harness.js';
import { h, bar, band, list, facts, card, buttons, codeBlock, fold, noteField, messagePill, cardLine, settingLine, textField, confirmBox, emptyCard, keyedRows, pickField, chipPick } from '/_kit/dom.js';
import { createKeys } from '/_kit/keys.js';
import { sheet } from '/_kit/sheet.js';
import { fakeFetch, fakeTimers, flush } from './fakes.js';
import { initTheme } from '/_kit/theme.js';

const cs = el => getComputedStyle(el);

test('dom: h escapes text and wires attributes', () => {
  let clicked = 0;
  const p = h('p', { class: 'a b', onclick: () => clicked++, dataset: { id: '7' }, hidden: false, title: 't' }, '<b>', null, false, h('i', null, 'x'));
  eq(p.innerHTML, '&lt;b&gt;<i>x</i>');
  eq([p.className, p.dataset.id, p.title, p.hasAttribute('hidden')], ['a b', '7', 't', false]);
  p.click();
  eq(clicked, 1);
  eq(h('input', { disabled: true }).disabled, true);
});

test('dom: bar', () => {
  let section = '', pressed = 0;
  const b = bar({
    brand: { name: 'cull' },
    sections: [{ id: 'label', label: 'label', count: '37/150' }, { id: 'eval', label: 'eval' }],
    active: 'label',
    onSection: id => (section = id),
    status: 'synced',
    primary: { label: 'Next unlabeled', run: () => pressed++ },
  });
  fixture().append(b.el);
  const el = b.el;
  assert(el.classList.contains('kit-bar'));
  eq(el.querySelector('.kit-brand').textContent, 'cull');
  const ctl = el.querySelector('.kit-ctl[data-id="label"]');
  eq(ctl.textContent, 'label37/150');
  assert(ctl.classList.contains('on'), 'active section on');
  b.setCount('label', '38/150');
  eq(ctl.querySelector('.kit-n').textContent, '38/150');
  el.querySelector('.kit-ctl[data-id="eval"]').click();
  eq(section, 'eval');
  b.setSection('eval');
  assert(!ctl.classList.contains('on') && el.querySelector('[data-id="eval"]').classList.contains('on'), 'setSection moves on');
  b.setSectionsShown(false);
  assert(ctl.hidden && el.querySelector('[data-id="eval"]').hidden, 'sections hidden');
  assert(!el.querySelector('.kit-brand').hidden, 'only the sections hide');
  b.setSectionsShown(true);
  assert(!ctl.hidden && !el.querySelector('[data-id="eval"]').hidden, 'sections shown');
  eq(el.querySelectorAll('.kit-primary').length, 1);
  el.querySelector('.kit-primary').click();
  eq(pressed, 1);
  b.setPrimary(null);
  assert(el.querySelector('.kit-primary').hidden, 'primary hidden');
  b.setPrimary({ label: 'Activate', run() {} });
  const prim = el.querySelector('.kit-primary');
  eq([prim.hidden, prim.textContent], [false, 'Activate']);
  const pill = el.querySelector('.kit-live');
  assert(pill.hidden, 'pill hidden until a live client reports');
  b.setLive('polling');
  eq([pill.hidden, pill.dataset.state, pill.textContent], [false, 'polling', 'polling']);
  b.setLive('down');
  eq(pill.textContent, 'offline');
  b.setStatus('offline · 2 queued');
  eq(el.querySelector('.kit-status').textContent, 'offline · 2 queued');
  assert(b.themeControl && b.themeControl.textContent === 'theme', 'theme control');
});

test('dom: bar setSections redraws the sections in place', () => {
  let section = '';
  const b = bar({
    brand: { name: 'diazo' },
    sections: [{ id: 'plans', label: 'Plans', count: 3 }, { id: 'later', label: 'Later' }],
    active: 'plans',
    onSection: id => (section = id),
    status: 'synced',
    primary: { label: 'Go', run() {} },
  });
  fixture().append(b.el);
  const el = b.el;
  const brand = el.querySelector('.kit-brand');
  const right = [el.querySelector('.kit-status'), el.querySelector('.kit-sp'), b.guideControl, b.themeControl, el.querySelector('.kit-primary')];
  const before = [brand, ...right].map(n => n.getBoundingClientRect().left);
  const look = cs(el.querySelector('.kit-ctl[data-id="plans"]'));
  const lookOf = s => [s.height, s.fontSize, s.paddingLeft, s.borderTopWidth];
  const oldLook = lookOf(look);
  const plans = el.querySelector('[data-id="plans"]');

  b.setSections([{ id: 'plan', label: 'Plan' }, { id: 'record', label: 'Record', count: 2 }], 'record');
  eq(plans.isConnected, false);
  eq(el.querySelectorAll('.kit-ctl[data-id]').length, 2);
  const ids = [...el.children].map(n => n.dataset.id || n.className);
  eq(ids.slice(0, 4), ['kit-brand', 'plan', 'record', 'kit-status']);
  const rec = el.querySelector('.kit-ctl[data-id="record"]');
  eq(rec.textContent, 'Record2');
  assert(rec.classList.contains('on') && rec.getAttribute('aria-current') === 'page', 'active given is on');
  eq(lookOf(cs(rec)), oldLook);
  eq([brand, ...right.slice(2)].map(n => n.getBoundingClientRect().left), [before[0], ...before.slice(3)], 'the brand and the controls right of the spacer stay put');
  el.querySelector('.kit-ctl[data-id="plan"]').click();
  eq(section, 'plan');
  b.setSection('plan');
  assert(el.querySelector('[data-id="plan"]').classList.contains('on') && !rec.classList.contains('on'), 'setSection on the new buttons');
  b.setCount('plan', 5);
  eq(el.querySelector('[data-id="plan"] .kit-n').textContent, '5');
  b.setSectionsShown(false);
  assert(rec.hidden, 'setSectionsShown hides the new buttons');
  b.setSections([{ id: 'plans', label: 'Plans' }, { id: 'later', label: 'Later' }]);
  assert(el.querySelector('[data-id="plans"]').hidden, 'the hidden state carries to redrawn buttons');
  b.setSectionsShown(true);
  b.setSections([{ id: 'plan', label: 'Plan' }, { id: 'record', label: 'Record', count: 2 }]);
  assert(!el.querySelector('.kit-ctl.on[data-id]'), 'no active: none on');
  // Same labels as at first: nothing outside the sections moved.
  b.setSections([{ id: 'plans', label: 'Plans', count: 3 }, { id: 'later', label: 'Later' }], 'plans');
  eq([brand, ...right].map(n => n.getBoundingClientRect().left), before);
  eq(brand.isConnected && right.every(n => n.isConnected), true);
});

test('dom: bar brand links home only with an href', () => {
  const plain = bar({ brand: { name: 'cull' } }).el.querySelector('.kit-brand');
  eq([plain.tagName, plain.hasAttribute('href')], ['SPAN', false]);
  const b = bar({ brand: { name: 'diazo', href: '/?t=x' } });
  fixture().append(b.el);
  const a = b.el.querySelector('.kit-brand');
  eq([a.tagName, a.getAttribute('href'), a.textContent], ['A', '/?t=x', 'diazo']);
  eq(cs(a).textDecorationLine, 'none');
  eq(cs(a).color, cs(b.el).color);
});

function makeList(extra = {}) {
  const opened = [], sels = [];
  const items = ['a', 'b', 'c', 'd', 'e'].map(k => ({ k }));
  const l = list({
    label: 'label',
    views: [{ id: 'unlabeled', label: 'unlabeled', count: 5, on: true }, { id: 'keep', label: 'keep' }],
    row: it => ({ key: `go · ${it.k}_test.go`, title: `Test${it.k}`, meta: '1d', selectable: true }),
    onOpen: (it, i) => opened.push([it.k, i]),
    onSelect: s => sels.push(s.map(x => x.k)),
    foot: h('span', null, 'foot'),
    ...extra,
  });
  l.setItems(items);
  fixture().append(l.el);
  return { l, opened, sels, items };
}

test('dom: list selection and open', () => {
  const { l, opened, sels } = makeList();
  const rows = () => [...l.el.querySelectorAll('.kit-row')];
  eq(rows().length, 5);
  eq(l.current(), 0);
  l.move(1); l.move(1);
  eq(l.current(), 2);
  assert(rows()[2].classList.contains('cur'), 'cursor row marked');
  eq(opened.length, 0, 'moving does not open by default');
  l.open();
  assert(rows()[2].classList.contains('open') && rows()[2].getAttribute('aria-current') === 'true', 'open row');
  eq(opened, [['c', 2]]);
  l.move(10);
  eq(l.current(), 4, 'clamped');
  l.move(-10);
  eq(l.current(), 0, 'clamped low');
  l.toggle(2);
  l.toggleRange(4);
  eq(l.selected().map(x => x.k), ['c', 'd', 'e']);
  assert(rows()[3].classList.contains('sel') && rows()[3].querySelector('.kit-box'), 'selected row and box');
  eq(sels.at(-1), ['c', 'd', 'e']);
  rows()[1].click();
  eq(opened.at(-1), ['b', 1], 'row click opens');
  rows()[0].querySelector('.kit-box').click();
  eq(l.selected().map(x => x.k), ['a', 'c', 'd', 'e'], 'box click toggles, does not open');
  eq(opened.length, 2);
  eq(l.el.querySelector('.kit-kicker').textContent, 'go · a_test.go');
  eq(l.el.querySelector('.kit-title').textContent, 'Testa');
  eq(l.el.querySelector('.kit-foot').textContent, 'foot');
});

test('dom: list keeps open and selection across setItems by key', () => {
  const { l, items } = makeList();
  l.open(3);
  l.toggle(1);
  l.setItems([{ k: 'z' }, ...items]);
  eq(l.el.querySelector('.kit-row.open .kit-title').textContent, 'Testd');
  eq(l.selected().map(x => x.k), ['b']);
});

test('dom: list openOnMove and chips', () => {
  let chip = null;
  const { l, opened } = makeList({ openOnMove: true, onChip: (g, id) => (chip = [g, id]) });
  l.move(1);
  eq(opened, [['b', 1]]);
  const chips = l.el.querySelectorAll('.kit-chip');
  eq(chips.length, 2);
  assert(chips[0].classList.contains('on'));
  chips[1].click();
  eq(chip, ['view', 'keep']);
  l.setChips('view', [{ id: 'keep', label: 'keep', count: 3, on: true }]);
  eq(l.el.querySelector('.kit-chip.on').textContent, 'keep3');
});

test('dom: list drives the keyboard layer', () => {
  const { l, opened } = makeList();
  const keys = createKeys({ list: l });
  try {
    for (const k of ['j', 'j', 'o']) document.body.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
    eq(opened, [['c', 2]]);
  } finally { keys.destroy(); }
});

test('dom: reading column pieces', () => {
  const f = facts([['status', 'new'], ['age', h('b', null, '39d')]]);
  assert(f.classList.contains('kit-facts'));
  eq(f.querySelectorAll('b').length, 2);
  let accepted = 0;
  const c = card({ edge: 'agent', head: 'pi proposes · keep', body: 'Still valid.', actions: [{ label: 'accept', run: () => accepted++, fill: true }, { label: 'reject' }] });
  assert(c.classList.contains('kit-card') && c.classList.contains('edge-agent'));
  eq(c.querySelector('.kit-card-head').textContent, 'pi proposes · keep');
  c.querySelector('.kit-btn.fill').click();
  eq(accepted, 1);
  const bs = buttons([{ label: 'close', danger: true, run() {} }, { label: 'keep', disabled: true, run() {} }]);
  assert(bs.classList.contains('kit-btns') && bs.firstChild.classList.contains('danger') && bs.lastChild.disabled);
});

test('dom: the card header is one line at a fixed height', () => {
  const fx = fixture();
  const crumb = t => h('span', { class: 'kit-card-crumb' }, t);
  const key = () => h('span', { class: 'kit-card-key' }, 'schuettc/tools-workspace/DCSN12');
  const pill = () => h('span', { class: 'kit-pill', dataset: { state: 'with_agent' } }, 'with agent');
  const withPill = card({ edge: 'agent', head: [crumb('plan · task 3'), pill(), key()], body: 'b' });
  const plain = card({ edge: 'signal', head: [crumb('plan · task 3'), key()], body: 'b' });
  const tight = card({ head: [crumb('plan · task 3'), pill(), key()], body: 'b' });
  const long = card({ head: [crumb('plan · ' + 'a very long breadcrumb that cannot fit '.repeat(6)), pill(), key()], body: 'b' });
  const text = card({ head: 'a plain string head '.repeat(8), body: 'b' });
  for (const c of [tight, long, text]) c.style.width = '260px';
  fx.append(withPill, plain, tight, long, text);
  const hd = c => c.querySelector('.kit-card-head');
  const box = (c, sel) => c.querySelector(sel).getBoundingClientRect();
  const cut = el => el.scrollWidth > el.clientWidth;
  eq([withPill, plain, tight, long, text].map(c => hd(c).getBoundingClientRect().height), [18, 18, 18, 18, 18], 'every header is one 18px line');
  const hr = hd(withPill).getBoundingClientRect(), pr = box(withPill, '.kit-pill');
  assert(pr.top >= hr.top && pr.bottom <= hr.bottom, `the pill fits the line (${pr.height}px)`);
  // Crumb and pill fit, the key doesn't: only the key gives way.
  assert(cut(tight.querySelector('.kit-card-key')), 'the key gives way');
  assert(!cut(tight.querySelector('.kit-card-crumb')), 'the crumb stays whole while the key gives way');
  // Nothing fits: the crumb gives way too, and the pill stays inside the header.
  assert(cut(long.querySelector('.kit-card-crumb')), 'the long crumb is cut off');
  assert(box(long, '.kit-pill').right <= hd(long).getBoundingClientRect().right, 'the pill stays in view');
  eq(cs(long.querySelector('.kit-card-crumb')).textOverflow, 'ellipsis', 'the crumb ends in an ellipsis');
  // A string head is its crumb.
  const tc = text.querySelector('.kit-card-head > .kit-card-crumb');
  assert(tc && cut(tc), 'a string head is a crumb, cut off with an ellipsis');
});

test('dom: codeBlock line counts', () => {
  const lines = el => el.querySelector('.kit-gutter').textContent.split('\n').length;
  eq(lines(codeBlock('a\r\nb\n')), 2, 'CRLF and trailing newline');
  eq(lines(codeBlock('a\n\nb')), 3, 'blank line kept');
  eq(lines(codeBlock('')), 1, 'empty source is one empty line');
  const src = Array.from({ length: 600 }, (_, i) => `\tfunc line${i}() { return "${'x'.repeat(20)}" }`).join('\n') + '\n';
  assert(src.length > 21000, `size ${src.length}`);
  const big = codeBlock(src, { start: 10 });
  eq(lines(big), 600);
  eq(big.querySelectorAll('pre').length, 2);
  eq(big.querySelector('.kit-gutter').textContent.split('\n')[0], '10');
  eq(big.querySelector('.kit-src').textContent, src.replace(/\n$/, ''));
  const hl = codeBlock('x := 1', { highlight: s => h('span', { class: 'kw' }, s) });
  assert(hl.querySelector('.kit-src .kw'), 'highlight hook used');
  fixture().append(big);
  const pre = big.querySelector('.kit-src');
  eq(cs(pre).whiteSpace, 'pre');
  eq(cs(big).overflowX, 'auto');
});

test('dom: fold', () => {
  const f = fold('setup', h('p', null, 'body'));
  eq(f.tagName, 'DETAILS');
  assert(f.classList.contains('kit-fold') && !f.open);
  eq(f.querySelector('summary.kit-label').textContent, 'setup');
  f.open = true;
  eq(f.querySelector('p').textContent, 'body');
  assert(fold('x', 'y', { open: true }).open);
});

test('dom: noteField', () => {
  const commits = [];
  const n = noteField({ value: 'old', placeholder: 'note', onCommit: v => commits.push(v) });
  let ran = 0;
  const keys = createKeys();
  keys.register({ keys: '1', label: 'keep', run: () => ran++ });
  try {
    fixture().append(n);
    assert(n.classList.contains('kit-note'));
    n.focus();
    n.value = 'flaky on CI';
    n.dispatchEvent(new KeyboardEvent('keydown', { key: '1', bubbles: true, cancelable: true }));
    eq(ran, 0, 'page key does not fire in the note');
    n.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    eq(commits, ['flaky on CI']);
    blurEl(n);
    eq(commits.length, 1, 'unchanged blur does not recommit');
    n.focus();
    n.value = 'scratch';
    n.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    eq(n.value, 'flaky on CI', 'Esc reverts');
    assert(document.activeElement !== n, 'and blurs');
    n.focus();
    n.value = 'by blur';
    blurEl(n);
    eq(commits, ['flaky on CI', 'by blur']);
  } finally { keys.destroy(); }
});

test('dom: styles apply', () => {
  initTheme('dom').set('light');
  const fx = fixture();
  const b = bar({ brand: { name: 'x' }, sections: [{ id: 's', label: 's' }], primary: { label: 'Go', run() {} } });
  const c = card({ head: 'h', body: 'b' });
  const btn = buttons([{ label: 'b', run() {} }]).firstChild;
  const l = list({ label: 'l', row: i => ({ title: i }) });
  l.setItems(['one']);
  fx.append(b.el, c, btn, l.el);
  eq(cs(b.el.querySelector('.kit-primary')).backgroundColor, 'rgb(164, 81, 42)');
  eq(cs(c).borderRadius, '8px');
  eq(cs(btn).borderRadius, '6px');
  assert(!/Mono|monospace/.test(cs(l.el.querySelector('.kit-title')).fontFamily), 'titles are sans');
  assert(/Mono|monospace/.test(cs(b.el.querySelector('.kit-ctl')).fontFamily), 'controls are mono');
  eq(cs(l.el.querySelector('.kit-title')).fontSize, '14.5px');
  initTheme('dom').set('system');
});

test('dom: setItems reports a selection it changed', () => {
  const sels = [];
  const l = list({ label: 'l', row: it => ({ id: it.id, key: it.id, title: it.title, selectable: true }), onSelect: s => sels.push(s.map(x => x.id)) });
  l.setItems([{ id: 'a', title: 'A' }, { id: 'b', title: 'B' }, { id: 'c', title: 'C' }]);
  l.toggle(0); l.toggle(1); l.open(2);
  sels.length = 0;
  l.setItems([{ id: 'a', title: 'A retitled' }, { id: 'c', title: 'C' }]);
  eq(l.selected().map(x => x.id), ['a'], 'id keeps a through a title edit; b is not rendered');
  eq(l.selectedIds(), ['a', 'b'], 'b stays selected by id (paging), until deselected');
  eq(sels, [['a']], 'onSelect told about the change');
  eq(l.el.querySelector('.kit-row.open .kit-title').textContent, 'C', 'open row kept by id');
  sels.length = 0;
  l.setItems([{ id: 'a', title: 'A retitled' }, { id: 'c', title: 'C' }]);
  eq(sels, [], 'no call when nothing changed');
});

test('dom: a lost cursor stays near where it was', () => {
  const l = list({ label: 'l', row: it => ({ key: it, title: it }) });
  l.setItems(['a', 'b', 'c', 'd']);
  l.move(2);
  l.setItems(['a', 'b', 'd']);
  eq(l.current(), 2, 'cursor keeps its index when its row vanished');
});

// A 401 means this page's cookie no longer matches the token (it is kept
// across restarts): the pill says signed out in the kit's words, whatever the
// tool's staleText, and offers Sign in again.
test('dom: bar signed-out pill and status tone', () => {
  const b = bar({ brand: { name: 'x' }, staleText: 'restarted · continued in a new tab' });
  fixture().append(b.el);
  const pill = b.el.querySelector('.kit-live');
  for (const text of [undefined, null]) {
    const s = 'stale';
    b.setLive('live');
    b.setLive(s, text);
    eq([pill.dataset.state, pill.querySelector('.kit-live-text')?.textContent], ['stale', 'signed out'], `setLive(${s}, ${text})`);
    assert(pill.classList.contains('kit-signedout'), 'signed-out look');
    const btn = pill.querySelector('button.kit-signin');
    assert(btn && btn.textContent === 'Sign in again', `Sign in again after setLive(${s}, ${text})`);
    assert(b.el.contains(btn), 'the button is in the bar');
  }
  b.setLive('down', 'offline · 3 queued');
  eq(pill.textContent, 'offline · 3 queued', 'text override');
  assert(!pill.classList.contains('kit-signedout'), 'signed-out look cleared');
  eq(bar({ brand: { name: 'y' } }).el.querySelector('.kit-live').hidden, true);

  initTheme('dom').set('light');
  b.setStatus('offline · 3 queued', { tone: 'danger' });
  const st = b.el.querySelector('.kit-status');
  eq(st.dataset.tone, 'danger');
  eq(cs(st).color, 'rgb(194, 42, 42)');
  b.setStatus('synced', { tone: 'signal' });
  eq(cs(st).color, 'rgb(164, 81, 42)');
  b.setStatus('synced');
  assert(!st.hasAttribute('data-tone'), 'no tone = muted default');
  eq(cs(st).color, 'rgb(89, 96, 111)');
  initTheme('dom').set('system');
});

test('dom: selection by id beyond the rendered page', () => {
  const sels = [];
  const l = list({ label: 'l', row: it => ({ id: it, title: it, selectable: true }), onSelect: s => sels.push(s.length) });
  const page1 = Array.from({ length: 200 }, (_, i) => 'a' + i);
  const page2 = Array.from({ length: 200 }, (_, i) => 'b' + i);
  const all = [...page1, ...page2, 'c0'];
  l.setItems(page1);
  l.selectAll(all);
  eq(l.selectedIds().length, all.length, 'ids beyond the page count');
  eq(l.selected().length, 200, 'selected() is the rendered ones');
  eq(l.el.querySelectorAll('.kit-row.sel').length, 200);
  l.setItems(page2);
  eq(l.selectedIds().length, all.length, 'survives paging');
  eq(l.el.querySelectorAll('.kit-row.sel').length, 200);
  l.toggle(0);
  assert(!l.selectedIds().includes('b0'), 'toggle off by id');
  eq(l.selectedIds().length, all.length - 1);
  l.deselect(['a0', 'a1']);
  eq(l.selectedIds().length, all.length - 3, 'deselect drops ids off-page');
  l.clearSelection();
  eq([l.selectedIds().length, l.el.querySelectorAll('.kit-row.sel').length], [0, 0]);
  eq(sels.at(-1), 0, 'onSelect on clear');
});

test('dom: 500 rows render and move', () => {
  const l = list({ label: 'l', row: it => ({ id: it, key: 'k', title: it, selectable: true }) });
  fixture().append(l.el);
  const items = Array.from({ length: 500 }, (_, i) => 'r' + i);
  const t0 = performance.now();
  l.setItems(items);
  l.move(499); l.toggle(); l.toggleRange(0);
  const ms = performance.now() - t0;
  eq(l.el.querySelectorAll('.kit-row').length, 500);
  eq(l.selectedIds().length, 500);
  assert(ms < 1000, `500 rows took ${ms} ms`);
});

test('dom: app layout with a rail', () => {
  const fx = fixture();
  const app = h('div', { class: 'kit-app', style: 'width:1440px;height:900px' },
    bar({ brand: { name: 'x' } }).el,
    list({ label: 'l', row: i => ({ title: i }) }).el,
    h('main', { class: 'kit-read' }, 'read'),
    h('aside', { class: 'kit-rail' }, 'rail'));
  fx.append(app);
  const w = sel => Math.round(app.querySelector(sel).getBoundingClientRect().width);
  eq([w('.kit-bar'), w('.kit-list'), w('.kit-read'), w('.kit-rail')], [1440, 400, 680, 360]);
  const top = sel => Math.round(app.querySelector(sel).getBoundingClientRect().top - app.getBoundingClientRect().top);
  eq([top('.kit-list'), top('.kit-rail')], [52, 52], 'panes sit under the bar');
  const noRail = h('div', { class: 'kit-app', style: 'width:1000px;height:600px' },
    bar({ brand: { name: 'y' } }).el, list({ label: 'l', row: i => ({ title: i }) }).el, h('main', { class: 'kit-read' }));
  fx.append(noRail);
  eq(Math.round(noRail.querySelector('.kit-read').getBoundingClientRect().width), 600, 'rail is optional');
});

test('dom: setLive labels without a staleText', () => {
  const b = bar({ brand: { name: 'x' } });
  const pill = b.el.querySelector('.kit-live');
  for (const [s, want] of [['live', 'live'], ['polling', 'polling'], ['down', 'offline']]) {
    b.setLive(s);
    eq(pill.textContent, want, s);
  }
  const t = bar({ brand: { name: 'y' }, staleText: 'restarted' });
  t.setLive('live');
  eq(t.el.querySelector('.kit-live').textContent, 'live', 'staleText only for stale');
});

// The newer-build notice keeps the tool's text and offers no sign-in.
test('dom: setLive stale with text is the newer-build notice', () => {
  const b = bar({ brand: { name: 'x' }, staleText: 'restarted' });
  b.setLive('stale', 'a newer x is installed');
  const pill = b.el.querySelector('.kit-live');
  eq([pill.dataset.state, pill.textContent], ['stale', 'a newer x is installed']);
  eq(pill.querySelector('button'), null, 'no Sign in again');
  assert(!pill.classList.contains('kit-signedout'), 'not the signed-out look');
});

// Sign in again asks the server for a signed-in tab of this page; the token
// never comes back to the page.
test('dom: Sign in again posts /signin with the page and says a tab opened', async () => {
  const f = fakeFetch();
  f.queue.push(f.text(null, 204));
  const b = bar({ brand: { name: 'x' }, signIn: { fetch: f.fetch, ...fakeTimers() } });
  fixture().append(b.el);
  b.setLive('stale');
  b.el.querySelector('button.kit-signin').click();
  await flush();
  eq(f.calls.length, 1, 'one request');
  const { url, init } = f.calls[0];
  eq([url, init.method, init.headers['Content-Type']], ['/signin', 'POST', 'application/json']);
  eq(JSON.parse(init.body), { page: location.pathname + location.search + location.hash });
  const pill = b.el.querySelector('.kit-live');
  eq(pill.querySelector('button'), null, 'the button is gone');
  eq(pill.querySelector('.kit-signin-note')?.textContent, 'Opened a signed-in tab.');
  eq(pill.querySelector('.kit-live-text').textContent, 'signed out', 'still signed out');
});

// After the press the old tab checks /api/poll once a second; the new tab's
// sign-in sets the cookie for the whole browser.
function pressed(answers) {
  const f = fakeFetch();
  answers = answers(f);
  const timers = fakeTimers();
  const seen = { closes: 0, reloads: 0 };
  f.queue.push(...answers);
  const b = bar({ brand: { name: 'x' }, signIn: {
    fetch: f.fetch, setTimeout: timers.setTimeout,
    close: () => seen.closes++, reload: () => seen.reloads++,
  } });
  fixture().append(b.el);
  b.setLive('stale');
  b.el.querySelector('button.kit-signin').click();
  const note = () => b.el.querySelector('.kit-signin-note')?.textContent;
  return { f, timers, seen, note };
}

test('dom: Sign in again closes the tab once a check answers 200', async () => {
  const p = pressed(f => [f.text(null, 204), f.json({ cursor: '1', events: [] })]);
  await flush();
  eq([...p.timers.pending.values()].map(t => t.ms), [1000], 'a check in a second');
  p.timers.tick();
  await flush();
  eq(p.f.calls[1].url, '/api/poll');
  eq(p.f.calls[1].init.credentials, 'same-origin');
  eq([p.seen.closes, p.seen.reloads], [1, 0], 'closed');
});

// localweb checks the token before routing, so any /api/ answer but 401
// means signed in: casebook has no /api/poll and answers 404.
test('dom: Sign in again counts a 404 check as signed in and closes', async () => {
  const p = pressed(f => [f.text(null, 204), f.text('not found', 404)]);
  await flush();
  p.timers.tick();
  await flush();
  eq([p.seen.closes, p.seen.reloads], [1, 0], 'closed');
});

test('dom: Sign in again reloads when close leaves the page open', async () => {
  const p = pressed(f => [f.text(null, 204), f.json({ cursor: '1', events: [] })]);
  await flush();
  p.timers.tick();
  await flush();
  const after = [...p.timers.pending.values()].map(t => t.ms);
  assert(after.length === 1 && after[0] <= 500, `one short wait after close (${after})`);
  p.timers.tick();
  eq([p.seen.closes, p.seen.reloads], [1, 1], 'reloaded');
});

test('dom: Sign in again stops after a minute of 401s and says to close this tab', async () => {
  const p = pressed(f => [f.text(null, 204), ...Array.from({ length: 60 }, () => f.text('token required', 401))]);
  await flush();
  for (let i = 0; i < 60; i++) {
    eq(p.note(), 'Opened a signed-in tab.', `still checking at ${i}s`);
    p.timers.tick();
    await flush();
  }
  eq(p.f.calls.length, 61, 'sixty checks');
  eq(p.note(), 'Opened a signed-in tab. You can close this one.');
  eq(p.timers.pending.size, 0, 'no more checks');
  eq([p.seen.closes, p.seen.reloads], [0, 0]);
});

test('dom: a failed Sign in again shows the failure and starts no checks', async () => {
  const p = pressed(f => [f.text('', 500)]);
  await flush();
  eq(p.note(), 'Could not open a tab (HTTP 500). Ask your session for a link.');
  eq(p.timers.pending.size, 0, 'no checks');
  eq(p.f.calls.length, 1);
});

test('dom: the app grid scrolls below its minimum width', () => {
  const app = h('div', { class: 'kit-app', style: 'width:600px;height:400px' },
    bar({ brand: { name: 'x' } }).el, list({ label: 'l', row: i => ({ title: i }) }).el,
    h('main', { class: 'kit-read' }), h('aside', { class: 'kit-rail' }));
  fixture().append(app);
  eq(cs(app).overflowX, 'auto');
  assert(app.scrollWidth > 600, `content keeps its width (${app.scrollWidth})`);
  assert(app.querySelector('.kit-read').getBoundingClientRect().width >= 320, 'reading column keeps a minimum');
});

// ---- the bar's "also open" area


function alsoBar(width, sections = []) {
  const fx = fixture();
  fx.style.width = width + 'px';
  const b = bar({ brand: { name: 'diazo' }, sections });
  fx.append(b.el);
  b.setLive('live');
  return { fx, b, area: b.el.querySelector('.kit-also') };
}

const plans = (n, clicked = []) => Array.from({ length: n }, (_, i) => ({
  label: `plan number ${i + 1} with a longish title`,
  detail: i === 0 ? 'Decisions · needs you' : 'Plan · idle',
  tone: i === 0 ? 'you' : i === 1 ? 'working' : 'idle',
  onClick: () => clicked.push(i + 1),
}));

const norm = t => t.replace(/\s+/g, ' ').trim();
const button = area => area.querySelector('.kit-also-btn');
const openList = area => { button(area).click(); return document.querySelector('.kit-also-menu'); };

test('dom: bar also-open area sits before the live pill, hidden until filled', () => {
  const { fx, b, area } = alsoBar(1600);
  try {
    assert(area, 'the area exists');
    assert(area.nextElementSibling === b.el.querySelector('.kit-live'), 'just before the live pill');
    assert(area.hidden, 'hidden with nothing to show');
    b.setElsewhere(plans(1));
    assert(!area.hidden, 'shown once filled');
    b.setElsewhere([]);
    assert(area.hidden, 'an empty list hides it');
  } finally { fx.style.width = ''; }
});

test('dom: bar also-open is one button that counts the work and who it waits on', () => {
  const { fx, b, area } = alsoBar(1600);
  try {
    b.setElsewhere(plans(3));
    const btn = button(area);
    assert(btn, 'one button');
    eq(norm(btn.textContent), '1 needs you · 3 open');
    eq(btn.dataset.tone, 'you', 'its dot is the signal when any needs you');
    b.setElsewhere(plans(12).map((p, i) => ({ ...p, tone: i < 2 ? 'you' : 'idle' })));
    eq(norm(btn.textContent), '2 need you · 12 open');
    b.setElsewhere(plans(4).map(p => ({ ...p, tone: 'idle' })));
    eq(norm(btn.textContent), '4 open');
    eq(btn.dataset.tone, 'idle');
    b.setElsewhere([{ label: 'bare', onClick() {} }]);
    eq(norm(btn.textContent), '1 open', 'tone defaults to idle');
  } finally { fx.style.width = ''; }
});

test('dom: bar also-open button keeps one width, so the bar never moves', () => {
  const { fx, b, area } = alsoBar(1600);
  try {
    const widths = [1, 3, 12, 120].map(n => {
      b.setElsewhere(plans(n).map((p, i) => ({ ...p, tone: i < n / 2 ? 'you' : 'idle' })));
      return button(area).getBoundingClientRect().width;
    });
    eq(new Set(widths).size, 1, `widths ${widths}`);
    const t = button(area).querySelector('.kit-also-text');
    assert(t.scrollWidth <= t.clientWidth, `the widest count is not cut off: ${t.textContent}`);
    const pill = b.el.querySelector('.kit-live').getBoundingClientRect().left;
    b.setElsewhere(plans(2));
    eq(b.el.querySelector('.kit-live').getBoundingClientRect().left, pill, 'the live pill stays put');
  } finally { fx.style.width = ''; }
});

test('dom: bar also-open marks the page you are on, counts it, and its row only closes the list', () => {
  const clicked = [];
  const { fx, b, area } = alsoBar(1600);
  try {
    const items = plans(3, clicked);
    items[1].current = true;
    b.setElsewhere(items);
    eq(norm(button(area).textContent), '1 needs you · 3 open', 'the page you are on counts');
    const menu = openList(area);
    const rows = [...menu.querySelectorAll('.kit-also-row')];
    eq(rows.length, 3, 'it is listed in its place');
    eq(rows.map(r => r.getAttribute('aria-current')), [null, 'page', null]);
    assert(norm(rows[1].textContent).includes('you are here'), 'it says so');
    rows[1].click();
    eq(clicked, [], 'its click does not navigate');
    assert(!document.querySelector('.kit-also-menu'), 'it closes the list');
  } finally { fx.style.width = ''; }
});

test('dom: bar also-open list shows every item in full, and a row click runs it', () => {
  const clicked = [];
  const { fx, b, area } = alsoBar(1100);
  try {
    b.setElsewhere(plans(5, clicked));
    const menu = openList(area);
    assert(menu && menu.classList.contains('kit-float'), 'a floating list');
    eq(button(area).getAttribute('aria-expanded'), 'true');
    const rows = [...menu.querySelectorAll('.kit-also-row')];
    eq(rows.map(r => r.querySelector('.kit-also-name').textContent), plans(5).map(p => p.label), 'every item, in order');
    eq(rows[0].querySelector('.kit-also-detail').textContent, 'Decisions · needs you');
    eq(rows.map(r => r.dataset.tone), ['you', 'working', 'idle', 'idle', 'idle']);
    const token = name => { const p = h('span', { style: `color: var(${name})` }); fx.append(p); const c = cs(p).color; p.remove(); return c; };
    eq(rows.slice(0, 3).map(r => cs(r.querySelector('i')).backgroundColor), [token('--kit-signal'), token('--kit-agent'), token('--kit-muted')], 'you is signal, working is agent, idle is muted');
    const name = rows[0].querySelector('.kit-also-name');
    assert(name.scrollWidth <= name.clientWidth + 0.5, 'a name is not cut off');
    rows[2].click();
    eq(clicked, [3]);
    assert(!document.querySelector('.kit-also-menu'), 'a row click closes it');
    eq(button(area).getAttribute('aria-expanded'), 'false');

    openList(area);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    assert(!document.querySelector('.kit-also-menu'), 'Esc closes it');
    openList(area);
    document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    assert(!document.querySelector('.kit-also-menu'), 'a click elsewhere closes it');
    openList(area);
    button(area).click();
    assert(!document.querySelector('.kit-also-menu'), 'the button toggles it');
    openList(area);
    b.setElsewhere([]);
    assert(!document.querySelector('.kit-also-menu'), 'emptying the area closes it');
  } finally { fx.style.width = ''; }
});

test('dom: messagePill shows each state\'s label with the line under it', () => {
  const labels = {
    sent: 'sent', with_agent: 'with the agent', working: 'working', answered: 'answered',
    declined: 'declined', failed: 'failed', no_reply: 'no reply',
  };
  for (const [state, label] of Object.entries(labels)) {
    const el = messagePill(state, `line for ${state}`);
    const pill = el.querySelector('.kit-pill');
    eq([pill.dataset.state, pill.textContent], [state, label], state);
    eq(el.querySelector('.kit-msg-line').textContent, `line for ${state}`, state);
  }
  eq(messagePill('answered').querySelector('.kit-msg-line'), null, 'no line, no line element');
});

test('dom: band draws the title, what is beside it and the row under it', () => {
  const pill = h('span', { class: 'kit-pill' }, 'running');
  const size = h('span', null, 'm7i.large');
  const back = h('a', { href: '/' }, '← Workspaces');
  const b = band({ title: 'alpha', beside: [pill, size], under: [back] });
  eq([b.el.tagName, b.el.className], ['HEADER', 'kit-band']);
  const line = b.el.firstChild;
  eq(line.className, 'kit-band-line');
  const title = line.firstChild;
  eq([title.tagName, title.className, title.textContent], ['H1', 'kit-band-title', 'alpha']);
  assert(line.children[1] === pill && line.children[2] === size, 'beside follows the title on its line');
  const under = b.el.children[1];
  eq([b.el.children.length, under.className], [2, 'kit-band-under']);
  assert(under.firstChild === back, 'under holds its nodes');
});

test('dom: band with no beside or under draws no empty containers', () => {
  const b = band({ title: 'Account' });
  eq(b.el.outerHTML, '<header class="kit-band"><div class="kit-band-line"><h1 class="kit-band-title">Account</h1></div></header>');
  b.setUnder([]);
  b.setBeside([]);
  eq(b.el.querySelectorAll('.kit-band-under').length, 0);
  eq(b.el.firstChild.children.length, 1);
});

test('dom: band setters change one part in place', () => {
  const back = h('a', null, 'back');
  const b = band({ title: 'alpha', beside: [h('span', null, 'stopped')], under: [back] });
  const title = b.el.querySelector('.kit-band-title');
  const under = b.el.querySelector('.kit-band-under');
  const next = h('span', null, 'running');
  b.setBeside([next]);
  assert(b.el.querySelector('.kit-band-title') === title, 'the title is the same element');
  assert(b.el.querySelector('.kit-band-under') === under && under.firstChild === back, 'the row under is the same');
  eq([...b.el.firstChild.children].map(c => c.textContent), ['alpha', 'running']);
  b.setTitle('beta');
  assert(b.el.querySelector('.kit-band-title') === title, 'setTitle keeps the element');
  eq(title.textContent, 'beta');
  assert(b.el.firstChild.children[1] === next, 'setTitle leaves beside');
  const track = h('nav', { class: 'kit-stages' });
  b.setUnder([track]);
  eq(b.el.querySelectorAll('.kit-band-under').length, 1);
  assert(b.el.querySelector('.kit-band-under').firstChild === track, 'setUnder replaces the row under');
  b.setUnder(null);
  eq(b.el.querySelector('.kit-band-under'), null, 'an empty under takes the row away');
  b.setUnder([back]);
  assert(b.el.lastChild.className === 'kit-band-under' && b.el.lastChild.firstChild === back, 'and brings it back below the line');
});

test('dom: band measures as diazo\'s does', () => {
  const fx = fixture();
  fx.style.width = '1440px';
  try {
    const b = band({ title: 'Plans', under: [h('nav', { class: 'kit-stages' }, h('button', { class: 'kit-stage now', type: 'button' }, 'All'))] });
    fx.append(b.el);
    const s = cs(b.el), t = cs(b.el.querySelector('.kit-band-title'));
    eq([s.paddingTop, s.paddingRight, s.paddingBottom, s.paddingLeft], ['16px', '24px', '16px', '24px']);
    eq([s.borderBottomWidth, s.borderBottomStyle], ['1px', 'solid']);
    const token = name => { const p = h('span', { style: `color: var(${name})` }); fx.append(p); const c = cs(p).color; p.remove(); return c; };
    eq([s.borderBottomColor, s.backgroundColor], [token('--kit-line'), token('--kit-panel')]);
    eq([t.fontSize, t.fontWeight, t.lineHeight, t.letterSpacing, t.marginTop], ['18px', '700', '23.4px', '-0.18px', '0px']);
    eq(b.el.getBoundingClientRect().height, 104, 'with a row under, diazo\'s 104px');
    const line = b.el.querySelector('.kit-band-line').getBoundingClientRect();
    const under = b.el.querySelector('.kit-band-under').getBoundingClientRect();
    eq([line.height, under.top - line.bottom, under.height], [28, 12, 28]);
    eq(b.el.querySelector('.kit-stage').getBoundingClientRect().height, 24, 'a pill in the band is 24px');
    const pill = h('span', { class: 'kit-pill ok' }, 'running');
    b.setBeside([pill]);
    const pr = pill.getBoundingClientRect(), tr = document.createRange();
    tr.selectNodeContents(pill);
    const words = tr.getBoundingClientRect();
    eq(pr.height, 24, 'a borderless pill too');
    assert(Math.abs((words.top + words.bottom) / 2 - (pr.top + pr.bottom) / 2) < 1, 'its words centred');
    b.setUnder(null);
    eq(b.el.getBoundingClientRect().height, 104, 'the title line alone: still 104px');
  } finally { fx.style.width = ''; }
});

// A window w wide with the kit's stylesheet, so the band's phone rules (640 or
// less) answer to it.
async function bandWindow(w) {
  const win = document.createElement('iframe');
  win.style.cssText = `width:${w}px; height:400px; border:0; display:block`;
  win.srcdoc = '<!doctype html><link rel="stylesheet" href="/_kit/kit.css"><style>html,body{margin:0}</style><body>';
  const loaded = new Promise(r => win.addEventListener('load', r, { once: true }));
  fixture().append(win);
  await loaded;
  await new Promise(r => setTimeout(r, 50));
  return win.contentDocument;
}

const lastEl = node => [...node.querySelectorAll('*')].at(-1);
const contentRight = b => b.el.getBoundingClientRect().right - parseFloat(cs(b.el).paddingRight);
const stages = n => h('nav', { class: 'kit-stages' }, h('span', { class: 'kit-stages-bar' },
  Array.from({ length: n }, (_, i) => h('button', { class: `kit-stage${i ? '' : ' now'}`, type: 'button' }, `Stage ${i} · ${i * 3}`))));

test('dom: band is 104px with or without a row under the title', () => {
  const fx = fixture();
  fx.style.width = '1440px';
  try {
    for (const o of [{}, { under: [stages(3)] }, { search: { placeholder: 'Search plans' } }, { sort: h('span', null, 'sort') }]) {
      const b = band({ title: 'Plans', ...o });
      fx.replaceChildren(b.el);
      eq(b.el.getBoundingClientRect().height, 104, JSON.stringify(Object.keys(o)));
    }
  } finally { fx.style.width = ''; fx.replaceChildren(); }
});

test('dom: band search is a field at the title line\'s right end, and hears every input', () => {
  const fx = fixture();
  fx.style.width = '1440px';
  try {
    const heard = [];
    const act = h('button', { class: 'kit-ctl', type: 'button' }, 'Open');
    const b = band({ title: 'Plans', beside: [h('span', null, '290')], end: [act], search: { placeholder: 'Search plans', value: 'dz', onInput: v => heard.push(v) } });
    fx.append(b.el);
    const line = b.el.querySelector('.kit-band-line');
    const field = lastEl(line);
    eq([field.tagName, field.type, field.placeholder, field.value, field.getAttribute('aria-label')], ['INPUT', 'search', 'Search plans', 'dz', 'Search plans']);
    assert(b.search === field, 'the handle names the field');
    assert(Math.abs(field.getBoundingClientRect().right - contentRight(b)) < 1, 'it ends at the band\'s right edge');
    eq(field.getBoundingClientRect().height, 28, 'one line high');
    assert(act.compareDocumentPosition(field) & Node.DOCUMENT_POSITION_FOLLOWING, 'end nodes come before the search');
    assert(act.getBoundingClientRect().left > line.querySelector('span').getBoundingClientRect().right + 100, 'the end sits at the right, apart from beside');
    field.value = 'dza';
    field.dispatchEvent(new Event('input'));
    eq(heard, ['dza']);
  } finally { fx.style.width = ''; fx.replaceChildren(); }
});

test('dom: band sort is the second line\'s last element, after underEnd, at its right end', () => {
  const fx = fixture();
  fx.style.width = '1440px';
  try {
    const sort = h('div', { class: 'my-sort' }, 'recent');
    const need = h('span', { class: 'kit-pill' }, '1 needs you');
    const b = band({ title: 'Plans', under: [stages(3)], underEnd: [need], sort });
    fx.append(b.el);
    const under = b.el.querySelector('.kit-band-under');
    assert(under.lastElementChild.lastElementChild === sort, 'the sort is the line\'s last element');
    assert(need.compareDocumentPosition(sort) & Node.DOCUMENT_POSITION_FOLLOWING, 'underEnd before it');
    assert(Math.abs(sort.getBoundingClientRect().right - contentRight(b)) < 1, 'at the right edge');
    eq(b.el.getBoundingClientRect().height, 104);
  } finally { fx.style.width = ''; fx.replaceChildren(); }
});

test('dom: band with only a sort or underEnd draws the row under the title for them', () => {
  const b = band({ title: 'Plans', underEnd: [h('span', null, 'x')] });
  eq(b.el.querySelectorAll('.kit-band-under').length, 1);
  b.setUnderEnd(null);
  eq(b.el.querySelectorAll('.kit-band-under').length, 0, 'gone with nothing in it');
  b.setSort(h('span', null, 's'));
  eq(b.el.querySelectorAll('.kit-band-under').length, 1);
  b.setSort(null);
  eq(b.el.outerHTML, '<header class="kit-band"><div class="kit-band-line"><h1 class="kit-band-title">Plans</h1></div></header>');
});

test('dom: band setters for its places change them in place and leave the rest', () => {
  const back = h('a', null, 'back');
  const b = band({ title: 'alpha', beside: [h('span', null, 'stopped')], under: [back] });
  const under = b.el.querySelector('.kit-band-under');
  const sort = h('span', null, 'sort');
  b.setSort(sort);
  b.setUnderEnd([h('span', null, 'needs')]);
  assert(b.el.querySelector('.kit-band-under') === under && under.firstChild === back, 'the row under is the same, its start kept');
  eq(under.lastElementChild.textContent, 'needssort');
  b.setUnder([h('i', null, 'track')]);
  eq(under.textContent, 'trackneedssort', 'setUnder keeps the end');
  b.setEnd([h('button', null, 'Open')]);
  b.setSearch({ placeholder: 'Find' });
  b.setBeside([h('span', null, 'running')]);
  eq(b.el.firstChild.textContent, 'alpharunningOpen', 'setBeside keeps the end');
  eq(b.search.placeholder, 'Find');
  b.setSearch(null);
  eq(b.search, null);
  b.setEnd(null);
  eq(b.el.firstChild.children.length, 2, 'an empty end draws nothing');
});

test('dom: band fold nodes show beside the title, and a ⋯ holds only the tool\'s menu on a wide page', async () => {
  const doc = await bandWindow(1280);
  const ran = [];
  const model = h('span', { class: 'kit-pill' }, 'opus');
  const b = band({ title: 'A plan', fold: [{ node: model, item: { label: 'Model: opus', action: 'model', run: () => ran.push('model') } }] });
  doc.body.append(b.el);
  assert(model.getBoundingClientRect().width > 0, 'the fold node shows');
  const more = b.el.querySelector('.kit-band-more');
  assert(!more || more.getBoundingClientRect().width === 0, 'no ⋯ with no menu of its own');
  b.setMenu([{ label: 'Delete', action: 'delete', run: () => ran.push('delete') }]);
  const btn = b.el.querySelector('.kit-band-more .kit-row-more');
  assert(btn && btn.getBoundingClientRect().width > 0, 'its ⋯ shows');
  eq(b.el.querySelectorAll('.kit-row-more').length, 1, 'one ⋯');
  const shown = [...b.el.querySelectorAll('[role="menuitem"]')].filter(i => doc.defaultView.getComputedStyle(i).display !== 'none').map(i => i.dataset.action);
  eq(shown, ['delete'], 'the fold\'s items are hidden while their nodes show');
  assert(lastEl(b.el.querySelector('.kit-band-line')).closest('.kit-band-more'), 'the ⋯ ends the title line');
});

test('dom: band on a phone stays 104px, its second line one line, the fold in the one ⋯', async () => {
  const doc = await bandWindow(390);
  const model = h('span', { class: 'kit-pill' }, 'opus');
  const term = h('button', { class: 'kit-ctl', type: 'button' }, 'Open in Terminal');
  const sort = h('span', { class: 'my-sort' }, 'recent ▾');
  const b = band({
    title: 'System design: check again', beside: [h('span', { class: 'kit-pill' }, 'building')],
    fold: [{ node: model, item: { label: 'Model', action: 'model', run() {} } }, { node: term, item: { label: 'Open in Terminal', action: 'term', run() {} } }],
    menu: [{ label: 'Delete', action: 'delete', run() {} }],
    under: [stages(9)], sort,
  });
  doc.body.append(b.el);
  const win = doc.defaultView;
  eq(b.el.getBoundingClientRect().height, 104, 'still 104px');
  eq([model.getBoundingClientRect().width, term.getBoundingClientRect().width], [0, 0], 'the fold nodes are hidden');
  eq(b.el.querySelectorAll('.kit-row-more').length, 1, 'one ⋯');
  const btn = b.el.querySelector('.kit-band-more .kit-row-more');
  assert(btn.getBoundingClientRect().width > 0, 'the ⋯ shows');
  assert(btn.getBoundingClientRect().right <= contentRight(b) + 0.5, 'inside the band');
  const shown = [...b.el.querySelectorAll('[role="menuitem"]')].filter(i => win.getComputedStyle(i).display !== 'none').map(i => i.dataset.action);
  eq(shown, ['model', 'term', 'delete'], 'the fold\'s items, then the tool\'s');
  const under = b.el.querySelector('.kit-band-under');
  eq(under.getBoundingClientRect().height, 28, 'the second line is one line');
  const segs = [...under.querySelectorAll('.kit-stage')];
  eq(new Set(segs.map(s => Math.round(s.getBoundingClientRect().top))).size, 1, 'the track does not wrap');
  const track = under.querySelector('.kit-stages');
  assert(track.scrollWidth > track.clientWidth, 'it scrolls sideways');
  assert(Math.abs(sort.getBoundingClientRect().right - contentRight(b)) < 1, 'the sort stays at the end');
  assert(Math.abs(sort.getBoundingClientRect().top - segs[0].getBoundingClientRect().top) < 4, 'on the track\'s line');
});

test('dom: band setters leave the search field connected, focused and its selection kept', async () => {
  const doc = await bandWindow(1280);
  const b = band({ title: 'Plans', beside: [h('span', null, '290')], end: [h('button', { type: 'button' }, 'Open')], search: { placeholder: 'Search plans', onInput() {} } });
  doc.body.append(b.el);
  const field = b.search;
  field.focus();
  field.value = 'diazo plans';
  field.setSelectionRange(2, 5);
  eq(doc.activeElement === field, true, 'focused to start with');
  const calls = [
    ['setBeside', () => b.setBeside([h('span', null, '291')])],
    ['setEnd', () => b.setEnd([h('button', { type: 'button' }, 'Close')])],
    ['setMenu', () => b.setMenu([{ label: 'Delete', run() {} }])],
    ['setFold', () => b.setFold([{ node: h('span', null, 'opus'), item: { label: 'Model', run() {} } }])],
    ['setMenu again', () => b.setMenu(null)],
    ['setFold again', () => b.setFold(null)],
    ['setEnd again', () => b.setEnd(null)],
  ];
  for (const [name, call] of calls) {
    call();
    assert(b.search === field && field.isConnected, `${name}: the same field, still in the band`);
    assert(doc.activeElement === field, `${name}: it keeps the focus`);
    eq([field.value, field.selectionStart, field.selectionEnd], ['diazo plans', 2, 5], `${name}: its words and selection`);
  }
  eq([...b.el.querySelector('.kit-band-line').children].map(c => c.className || c.textContent), ['kit-band-title', '291', 'kit-band-end'], 'the line as drawn afresh');
});

test('dom: band setters on a band not yet on the page keep the title line in order', () => {
  const b = band({ title: 'A plan', end: [h('button', { type: 'button' }, 'Open')] });
  b.setFold([{ node: h('span', null, 'opus') }]);
  b.setBeside([h('span', null, 'building')]);
  b.setSearch({ placeholder: 'Find' });
  b.setMenu([{ label: 'Delete', run() {} }]);
  eq([...b.el.querySelector('.kit-band-line').children].map(c => c.className || c.tagName), ['kit-band-title', 'SPAN', 'kit-band-fold', 'kit-band-end']);
  eq([...b.el.querySelector('.kit-band-end').children].map(c => c.className || c.tagName), ['BUTTON', 'kit-input kit-band-search', 'kit-band-more']);
});

test('dom: band search on a phone stays a field at the title line\'s end', async () => {
  const doc = await bandWindow(390);
  const b = band({ title: 'Plans', search: { placeholder: 'Search plans' }, under: [stages(6)], sort: h('span', null, 'recent ▾') });
  doc.body.append(b.el);
  const f = b.search.getBoundingClientRect();
  assert(f.width >= 120, `a usable field (${f.width})`);
  assert(Math.abs(f.right - contentRight(b)) < 1, 'at the end');
  eq(b.el.querySelector('.kit-band-title').scrollWidth <= b.el.querySelector('.kit-band-title').clientWidth, true, 'the title whole');
  eq(b.el.getBoundingClientRect().height, 104);
});

test('dom: band spans every column of the app grid', () => {
  const fx = fixture();
  const app = h('div', { class: 'kit-app', style: 'height:400px' },
    bar({ brand: { name: 't' } }).el, band({ title: 'x' }).el,
    h('aside', { class: 'kit-list' }), h('main', { class: 'kit-read' }), h('aside', { class: 'kit-rail' }));
  fx.append(app);
  const el = app.querySelector('.kit-band');
  const cols = ['.kit-list', '.kit-read', '.kit-rail'].map(s => app.querySelector(s).getBoundingClientRect());
  eq([el.getBoundingClientRect().left, el.getBoundingClientRect().right].map(Math.round), [cols[0].left, cols[2].right].map(Math.round), 'from the first column to the last');
  const bandBottom = el.getBoundingClientRect().bottom;
  assert(Math.abs(app.querySelector('.kit-read').getBoundingClientRect().top - bandBottom) < 1, 'the columns start under the band');
  fx.replaceChildren();
});

test('dom: a band appended after the columns still sits under the bar', () => {
  const fx = fixture();
  const app = h('div', { class: 'kit-app', style: 'height:400px' },
    bar({ brand: { name: 't' } }).el, h('aside', { class: 'kit-list' }), h('main', { class: 'kit-read' }));
  fx.append(app);
  app.append(band({ title: 'late' }).el);
  const barBottom = app.querySelector('.kit-bar').getBoundingClientRect().bottom;
  const b = app.querySelector('.kit-band').getBoundingClientRect();
  assert(Math.abs(b.top - barBottom) < 1, `the band starts at the bar's bottom (${b.top} vs ${barBottom})`);
  for (const s of ['.kit-list', '.kit-read']) {
    assert(Math.abs(app.querySelector(s).getBoundingClientRect().top - b.bottom) < 1, `${s} starts under the band`);
  }
  fx.replaceChildren();
});

test('dom: a centre with no left column fills the app grid under the band', () => {
  const fx = fixture();
  const mid = h('main', { class: 'kit-read kit-col kit-mid' }, 'cards');
  const app = h('div', { class: 'kit-app', style: 'height:400px;width:1200px' },
    bar({ brand: { name: 't' } }).el, band({ title: 'Workspaces' }).el, mid);
  fx.append(app);
  const a = app.getBoundingClientRect(), m = mid.getBoundingClientRect();
  eq([Math.round(m.left), Math.round(m.right)], [Math.round(a.left), Math.round(a.right)], 'from edge to edge');
  fx.replaceChildren();
});

test('dom: the bar fits a phone: brand, Guide, theme, a menu and the primary on one line', async () => {
  const win = document.createElement('iframe');
  win.style.cssText = 'width:390px; height:300px; border:0; display:block';
  win.srcdoc = '<!doctype html><link rel="stylesheet" href="/_kit/kit.css"><style>html,body{margin:0}</style><body>';
  const loaded = new Promise(r => win.addEventListener('load', r, { once: true }));
  fixture().append(win);
  await loaded;
  const doc = win.contentDocument;
  await new Promise(r => setTimeout(r, 50));
  const b = bar({ brand: { name: 'billet', href: '/' }, primary: { label: 'New', run() {} } });
  b.el.insertBefore(h('button', { class: 'kit-ctl', type: 'button' }, 'you ▾'), b.el.querySelector('.kit-primary'));
  doc.body.append(b.el);
  const r = b.el.getBoundingClientRect();
  eq(r.height, 52, 'the bar stays 52px');
  for (const c of b.el.children) {
    const cr = c.getBoundingClientRect();
    if (!cr.width) continue;
    assert(cr.right <= r.right + 0.5, `${c.className} ends inside the bar (${cr.right} > ${r.right})`);
    assert(cr.height <= 40, `${c.className} is one line (${cr.height}px)`);
  }
  fixture().replaceChildren();
});

test('dom: a long email beside the title shrinks on a phone and the title stays', () => {
  const fx = fixture();
  fx.style.width = '390px';
  try {
    const email = 'a-very-long-address-for-a-phone-check@someone-example.org.uk';
    eq(email.length, 60);
    const b = band({ title: 'Account', beside: [h('span', { class: 'kit-band-sub' }, email)] });
    fx.append(b.el);
    const edge = b.el.getBoundingClientRect().right - parseFloat(cs(b.el).paddingRight);
    const title = b.el.querySelector('.kit-band-title');
    const beside = b.el.querySelector('.kit-band-sub');
    eq(title.scrollWidth <= title.clientWidth, true, 'the title is shown whole');
    assert(beside.getBoundingClientRect().right <= edge + 0.5, `the email ends inside the band (${beside.getBoundingClientRect().right} > ${edge})`);
    eq(cs(beside).textOverflow, 'ellipsis', 'with an ellipsis');
  } finally { fx.style.width = ''; fx.replaceChildren(); }
});

test('dom: cardLine draws its words, its meta and its actions', () => {
  const ran = [];
  const l = cardLine({
    main: 'iCloud Keychain',
    meta: 'added 4 Nov',
    actions: [{ label: 'Rename', run: () => ran.push('rename') }, { label: 'Remove', danger: true, title: 'Remove iCloud Keychain', run: () => ran.push('remove') }],
  });
  eq([l.tagName, l.className], ['DIV', 'kit-card-line']);
  eq([...l.children].map(c => c.className), ['kit-card-line-main', 'kit-card-line-side']);
  eq(l.firstChild.textContent, 'iCloud Keychain');
  const side = l.lastChild;
  eq(side.textContent, 'added 4 Nov · Rename · Remove');
  eq(side.querySelector('.kit-card-line-meta').textContent, 'added 4 Nov');
  const acts = [...side.querySelectorAll('button')];
  eq(acts.map(b => [b.className, b.type, b.textContent]), [['kit-label-link kit-card-line-act', 'button', 'Rename'], ['kit-label-link kit-card-line-act danger', 'button', 'Remove']]);
  eq(acts[1].getAttribute('aria-label'), 'Remove iCloud Keychain');
  acts[1].click();
  eq(ran, ['remove']);
});

test('dom: cardLine omits what it is not given', () => {
  eq(cardLine({ main: 'Code by email' }).outerHTML, '<div class="kit-card-line"><span class="kit-card-line-main">Code by email</span></div>');
  const metaOnly = cardLine({ main: 'Code by email', meta: 'always on' });
  eq(metaOnly.lastChild.innerHTML, '<small class="kit-card-line-meta">always on</small>');
  const actsOnly = cardLine({ main: 'x', actions: [{ label: 'Remove', disabled: true }] });
  eq(actsOnly.lastChild.textContent, 'Remove');
  assert(actsOnly.querySelector('button').disabled, 'a disabled action');
});

test('dom: cardLines in a card: a rule between them, its words and meta in the kit\'s type', () => {
  const c = card({ head: 'How you sign in', body: [cardLine({ main: 'iCloud Keychain', meta: 'added 4 Nov' }), cardLine({ main: 'Code by email', meta: 'always on', actions: [{ label: 'Remove', danger: true }] })] });
  fixture().append(c);
  const [a, b] = c.querySelectorAll('.kit-card-line');
  eq([cs(a).borderTopStyle, cs(a).paddingTop, cs(b).borderTopStyle, cs(b).borderTopWidth, cs(b).paddingTop, cs(b).paddingBottom], ['none', '0px', 'solid', '1px', '9px', '0px']);
  eq([cs(a).fontSize, cs(a.querySelector('.kit-card-line-meta')).fontSize], ['14.5px', '12px']);
  const ar = a.firstChild.getBoundingClientRect(), mr = a.lastChild.getBoundingClientRect();
  assert(ar.left < mr.left && Math.abs(mr.right - a.getBoundingClientRect().right) < 1, 'words left, meta right');
  const token = name => { const p = h('span', { style: `color: var(${name})` }); c.append(p); const col = cs(p).color; p.remove(); return col; };
  eq(cs(b.querySelector('.danger')).color, token('--kit-danger'));
});

test('dom: cardLine is as it was, and an action\'s data lands as data-* on its button', () => {
  const l = cardLine({ main: 'iCloud Keychain', meta: 'added 4 Nov', actions: [{ label: 'Rename' }, { label: 'Remove', danger: true, disabled: true, title: 'Remove iCloud Keychain' }] });
  eq(l.outerHTML, '<div class="kit-card-line"><span class="kit-card-line-main">iCloud Keychain</span><span class="kit-card-line-side">'
    + '<small class="kit-card-line-meta">added 4 Nov</small> · <button class="kit-label-link kit-card-line-act" type="button">Rename</button>'
    + ' · <button class="kit-label-link kit-card-line-act danger" type="button" disabled="" aria-label="Remove iCloud Keychain">Remove</button></span></div>');
  const d = cardLine({ main: 'x', actions: [{ label: 'Reset', data: { action: 'clear-setting', settingPath: 'a.b' } }] }).querySelector('button');
  eq([d.dataset.action, d.getAttribute('data-setting-path')], ['clear-setting', 'a.b']);
});

test('dom: settingLine draws its name, hint, control, meta and actions', () => {
  const ran = [];
  const input = h('input', { class: 'kit-input', type: 'text' });
  const l = settingLine({
    name: 'An older version', hint: '· by its full name', control: h('div', null, input, h('button', { type: 'button' }, 'Add')),
    meta: 'changed here', actions: [{ label: 'Reset', title: 'Reset an older version', data: { action: 'clear-setting' }, run: () => ran.push('reset') }],
  });
  eq([l.tagName, l.className], ['DIV', 'kit-card-line kit-setting-line with-control']);
  eq([...l.children].map(c => [c.tagName, c.className]), [['SPAN', 'kit-setting-line-name'], ['SPAN', 'kit-setting-line-control'], ['SPAN', 'kit-card-line-side kit-setting-line-side']]);
  const name = l.firstChild;
  eq([...name.children].map(c => [c.tagName, c.className, c.textContent]), [['SPAN', 'kit-setting-line-label', 'An older version'], ['SMALL', 'kit-setting-line-hint', ' · by its full name']]);
  eq(name.title, 'An older version · by its full name');
  const side = l.lastChild;
  eq([...side.children].map(c => [c.tagName, c.className]), [['SMALL', 'kit-card-line-meta'], ['SPAN', 'kit-setting-line-acts']]);
  eq([side.textContent, side.firstChild.title], ['changed here · Reset', 'changed here']);
  const act = side.querySelector('button');
  eq([act.className, act.type, act.getAttribute('aria-label'), act.dataset.action], ['kit-label-link kit-card-line-act', 'button', 'Reset an older version', 'clear-setting']);
  act.click();
  eq(ran, ['reset']);
  const bare = settingLine({ name: 'scratch' });
  eq(bare.outerHTML, '<div class="kit-card-line kit-setting-line"><span class="kit-setting-line-name" title="scratch"><span class="kit-setting-line-label">scratch</span></span></div>');
  eq(settingLine({ name: 'x', actions: [{ label: 'All' }, { label: 'None' }] }).lastChild.textContent, 'All · None');
  eq(settingLine({ name: 'x', meta: h('b', null, 'in your settings file') }).querySelector('.kit-card-line-meta').title, 'in your settings file');
});

test('dom: settingLine names a control that has no label of its own, and leaves one that has', () => {
  const named = el => (el.getAttribute('aria-labelledby') || '').split(' ').filter(Boolean).map(id => el.ownerDocument.getElementById(id)?.textContent).join(' ');
  const input = h('input', { class: 'kit-input', type: 'text' });
  const add = h('button', { type: 'button' }, 'Add');
  const a = settingLine({ name: 'An older version', hint: '· full name', control: h('div', null, input, add) });
  const lone = h('input', { type: 'text' });
  const b = settingLine({ name: 'Height', id: 'pane-height', control: lone });
  const pick = pickField({ label: 'Agent', labelHidden: true, choices: [{ value: 'pi', label: 'pi' }] });
  const c = settingLine({ name: 'Agent', control: pick.el });
  const chips = chipPick({ label: 'Sidebar', labelHidden: true, chips: [{ value: 'on', label: 'on' }], chosen: ['on'], onToggle() {} });
  const d = settingLine({ name: 'Sidebar', control: chips });
  const group = h('div', { role: 'group' }, h('button', { type: 'button' }, 'on'), h('button', { type: 'button' }, 'off'));
  const e = settingLine({ name: 'Open in', control: group });
  const said = h('input', { type: 'text', 'aria-label': 'Its own' });
  const f = settingLine({ name: 'Other', control: said });
  const g = settingLine({ name: 'Words', control: 'none saved' });
  fixture().append(a, b, c, d, e, f, g);
  eq([named(input), add.hasAttribute('aria-labelledby')], ['An older version', false], 'the one input, by the name without its hint');
  eq([named(lone), b.querySelector('.kit-setting-line-label').id], ['Height', 'pane-height'], 'the given id ties them');
  eq([pick.button.hasAttribute('aria-labelledby'), pick.el.hasAttribute('aria-labelledby'), pick.button.labels[0].textContent], [false, false, 'Agent'], 'a dropdown keeps its own label');
  eq(named(chips), 'Sidebar', 'chips keep their own label');
  eq(chips.getAttribute('aria-labelledby'), chips.querySelector('.kit-field-label').id);
  eq(named(group), 'Open in', 'a group with no name takes the setting\'s');
  eq(said.hasAttribute('aria-labelledby'), false, 'a control that names itself is left');
  eq(g.querySelector('.kit-setting-line-label').id, '', 'no id when nothing is tied');
  fixture().replaceChildren();
});

// settingWindow is a window w wide with a card of lines in it, as a tool's page
// draws them: the kit's narrow layout follows the window's width.
async function settingWindow(w) {
  const win = document.createElement('iframe');
  win.style.cssText = `width:${w}px; height:900px; border:0; display:block`;
  win.srcdoc = '<!doctype html><link rel="stylesheet" href="/_kit/kit.css"><style>html,body{margin:0;height:auto}.add{display:flex;gap:8px;align-items:center}.add>input{flex:1 1 0;min-width:0}</style><body>';
  const loaded = new Promise(r => win.addEventListener('load', r, { once: true }));
  fixture().append(win);
  await loaded;
  await new Promise(r => setTimeout(r, 50));
  const doc = win.contentDocument;
  const put = lines => {
    const c = card({ head: 'New sessions', body: h('div', null, lines) });
    c.style.margin = '16px';
    doc.body.replaceChildren(c);
    return c;
  };
  return { doc, put };
}

const SETTING_CONTROLS = {
  dropdown: () => pickField({ label: 'Agent', labelHidden: true, choices: [{ value: 'cc', label: 'Claude Code' }, { value: 'pi', label: 'pi' }] }).el,
  chips: () => chipPick({ label: 'Sidebar', labelHidden: true, chips: [{ value: 'on', label: 'on' }, { value: 'off', label: 'off' }], chosen: ['off'], onToggle() {} }),
  input: () => h('div', { class: 'add' }, h('input', { class: 'kit-input mono', type: 'text', placeholder: 'e.g. claude-opus-4-8' }), h('button', { class: 'kit-btn', type: 'button' }, 'Add')),
  none: () => undefined,
};
// Longer than a card at 1280: about 1500px in the side's 12px mono.
const LONG_META = 'claude-gone-2 is saved but no longer available on this machine or on any other machine that you have ever signed in to with this account; '.repeat(2).trim();
const box = el => el.getBoundingClientRect();
const near = (a, b) => Math.abs(a - b) < 0.6;

for (const w of [1280, 390]) {
  test(`dom: settingLine at ${w}px: a meta and an action appearing change no height and move nothing below`, async () => {
    const { put } = await settingWindow(w);
    for (const [kind, control] of Object.entries(SETTING_CONTROLS)) {
      const measure = side => {
        const c = put([settingLine({ name: 'Agent', control: control(), ...side }), settingLine({ name: 'Model for pi', control: control() })]);
        const [a, b] = c.querySelectorAll('.kit-setting-line');
        return [box(a).height, box(b).top, box(c).height];
      };
      const bare = measure({});
      eq(measure({ meta: 'changed here', actions: [{ label: 'Reset' }] }), bare, `${kind}: changed here · Reset`);
      eq(measure({ meta: LONG_META, actions: [{ label: 'Reset' }] }), bare, `${kind}: a very long meta`);
      eq(measure({ meta: LONG_META }), bare, `${kind}: a very long meta alone`);
    }
    fixture().replaceChildren();
  });

  test(`dom: settingLine at ${w}px: a very long meta is cut with an ellipsis inside the card, and its action is whole`, async () => {
    const { put } = await settingWindow(w);
    for (const [kind, control] of Object.entries(SETTING_CONTROLS)) {
      const c = put([settingLine({ name: 'Model for Claude Code', control: control(), meta: LONG_META, actions: [{ label: 'Reset' }] })]);
      const l = c.querySelector('.kit-setting-line'), meta = l.querySelector('.kit-card-line-meta'), act = l.querySelector('button.kit-card-line-act');
      const edge = box(c).right - parseFloat(cs(c).paddingRight);
      eq([cs(meta).textOverflow, cs(meta).whiteSpace, meta.title], ['ellipsis', 'nowrap', LONG_META], kind);
      assert(meta.scrollWidth > meta.clientWidth && meta.clientWidth > 0, `${kind}: the meta is cut, and some of it shows (${meta.clientWidth} of ${meta.scrollWidth})`);
      assert(box(l.querySelector('.kit-setting-line-side')).right <= edge + 0.5 && box(act).right <= edge + 0.5, `${kind}: the side ends inside the card`);
      const alone = h('button', { class: 'kit-label-link kit-card-line-act', type: 'button' }, 'Reset');
      c.append(alone);
      assert(near(box(act).width, box(alone).width), `${kind}: Reset keeps its width (${box(act).width} of ${box(alone).width})`);
      assert(box(meta).right <= box(act).left, `${kind}: the meta stops before Reset`);
      assert(c.ownerDocument.documentElement.scrollWidth <= w, `${kind}: nothing runs past the window`);
    }
    fixture().replaceChildren();
  });
}

test('dom: settingLine at 1280px: one row, the name in a 200px column, the controls of consecutive lines on one left edge', async () => {
  const { put } = await settingWindow(1280);
  const c = put([
    settingLine({ name: 'Agent', control: SETTING_CONTROLS.dropdown(), meta: 'changed here', actions: [{ label: 'Reset' }] }),
    settingLine({ name: 'Claude Code permissions', control: SETTING_CONTROLS.dropdown() }),
    settingLine({ name: 'Sidebar', hint: '· for new sessions', control: SETTING_CONTROLS.chips(), actions: [{ label: 'Reset' }] }),
    settingLine({ name: 'An older version', control: SETTING_CONTROLS.input() }),
  ]);
  const lines = [...c.querySelectorAll('.kit-setting-line')];
  const ctl = lines.map(l => box(l.querySelector('.kit-setting-line-control')));
  eq(ctl.map(r => Math.round(r.left - box(lines[0]).left)), [212, 212, 212, 212], 'a 200px name column and a 12px gap');
  eq(ctl.slice(0, 2).map(r => Math.round(r.width)), [320, 320], 'a dropdown is 320px wide, with a side or without');
  const [a] = lines, name = box(a.firstChild), side = box(a.lastChild), mid = r => r.top + r.height / 2;
  assert(Math.abs(mid(name) - mid(ctl[0])) < 1 && Math.abs(mid(side) - mid(ctl[0])) < 1, 'name, control and side on one row, centred');
  assert(near(side.right, box(a).right), 'the side at the right end');
  fixture().replaceChildren();
});

test('dom: settingLine at 390px: the side is on the name\'s row and the control is under them at full width', async () => {
  const { put } = await settingWindow(390);
  for (const kind of ['dropdown', 'chips', 'input']) {
    const c = put([settingLine({ name: 'Agent', control: SETTING_CONTROLS[kind](), meta: 'changed here', actions: [{ label: 'Reset' }] })]);
    const l = c.querySelector('.kit-setting-line'), name = box(l.firstChild), ctl = box(l.children[1]), side = box(l.lastChild);
    const mid = r => r.top + r.height / 2;
    assert(Math.abs(mid(name) - mid(side)) < 1 && side.top >= name.top - 0.5 && side.bottom <= name.bottom + 0.5, `${kind}: the side is on the name's row (${side.top}-${side.bottom} in ${name.top}-${name.bottom})`);
    assert(near(side.right, box(l).right) && name.right <= side.left, `${kind}: name left, side right`);
    assert(ctl.top >= name.bottom, `${kind}: the control is under the name`);
    assert(near(ctl.left, box(l).left) && near(ctl.width, box(l).width), `${kind}: the control is as wide as the line (${ctl.width} of ${box(l).width})`);
  }
  fixture().replaceChildren();
});

test('dom: settingLine at 390px: the name has all of its row that the side does not take', async () => {
  const { put } = await settingWindow(390);
  const NAME = 'Claude Code permissions';
  eq(NAME.length, 23);
  const whole = el => el.scrollWidth <= el.clientWidth;
  // proj's line: a dropdown whose current choice is long, so its least width is wide.
  const controls = { ...SETTING_CONTROLS, 'long dropdown': () => pickField({ label: 'Permissions', labelHidden: true, choices: [{ value: '', label: 'Claude Code\'s own setting, whatever it is' }] }).el };
  for (const kind of ['long dropdown', 'dropdown', 'chips', 'input']) {
    // A line before and one after: a card's first and last lines have less padding.
    const c = put([
      cardLine({ main: 'before' }),
      settingLine({ name: NAME, control: controls[kind]() }),
      settingLine({ name: NAME, control: controls[kind](), meta: 'changed here', actions: [{ label: 'Reset' }] }),
      settingLine({ name: NAME + ' for every new session that this machine starts', control: controls[kind]() }),
      settingLine({ name: NAME + ' for every new session that this machine starts', control: controls[kind](), meta: 'changed here', actions: [{ label: 'Reset' }] }),
      cardLine({ main: 'after' }),
    ]);
    const [bare, marked, long, both] = c.querySelectorAll('.kit-setting-line');
    assert(whole(bare.firstChild), `${kind}: with no side the name is whole (${bare.firstChild.clientWidth} of ${bare.firstChild.scrollWidth})`);
    assert(whole(marked.firstChild), `${kind}: beside a meta and an action the name is whole (${marked.firstChild.clientWidth} of ${marked.firstChild.scrollWidth})`);
    const name = box(marked.firstChild), side = box(marked.lastChild), meta = box(marked.querySelector('.kit-card-line-meta')), act = box(marked.querySelector('.kit-setting-line-acts'));
    assert(near(side.left, name.right + 12) && near(side.right, box(marked).right), `the side has the rest of the row (${side.left} after ${name.right})`);
    assert(near(meta.left, side.left) && near(meta.right, act.left), 'and the meta what the actions leave of it');
    assert(near(box(long.firstChild).width, box(long).width), `${kind}: a name longer than the row has the whole row with no side (${box(long.firstChild).width} of ${box(long).width})`);
    assert(near(box(both.firstChild).right + 12, box(both.querySelector('.kit-setting-line-acts')).left), `${kind}: and with a side all of it but the actions`);
    eq([box(bare).height, box(long).height, box(both).height], [box(marked).height, box(marked).height, box(marked).height], `${kind}: one height`);
  }
  fixture().replaceChildren();
});

test('dom: settingLine with no control: name and side on one row; four actions that do not fit a phone go under the name, with a meta or without', async () => {
  const acts = ['Move up', 'Move down', 'Height', 'Turn off'].map(label => ({ label }));
  const mid = r => r.top + r.height / 2;
  const wide = await settingWindow(1280);
  let l = wide.put([settingLine({ name: 'scratch', hint: '· 12 rows', meta: 'changed here', actions: acts })]).querySelector('.kit-setting-line');
  assert(Math.abs(mid(box(l.firstChild)) - mid(box(l.lastChild))) < 1 && near(box(l.lastChild).right, box(l).right), 'one row at 1280, the side at the right end');
  fixture().replaceChildren();
  const { put } = await settingWindow(390);
  const measure = meta => {
    const c = put([settingLine({ name: 'a pane with a long name', hint: '· 12 rows', meta, actions: acts }), settingLine({ name: 'shell' })]);
    const [a, b] = c.querySelectorAll('.kit-setting-line');
    return [box(a).height, box(b).top, Math.round(box(a.querySelector('.kit-setting-line-acts')).top - box(a.firstChild).top) > 4];
  };
  const bare = measure(undefined);
  eq(bare[2], true, 'the actions are under the name');
  eq(measure('changed here'), bare, 'changed here');
  eq(measure(LONG_META), bare, 'a very long meta');
  l = put([settingLine({ name: 'yazi', meta: 'changed here', actions: acts.slice(1) })]).querySelector('.kit-setting-line');
  assert(Math.abs(mid(box(l.firstChild)) - mid(box(l.lastChild))) < 1, 'three actions share the name\'s row at 390');
  // A card too narrow for the four on one row: they wrap inside it, the same with a meta.
  const tight = meta => {
    const c = put([settingLine({ name: 'scratch', meta, actions: acts }), settingLine({ name: 'shell' })]);
    c.style.width = '220px';
    const [a, b] = c.querySelectorAll('.kit-setting-line');
    const edge = box(c).right - parseFloat(cs(c).paddingRight);
    assert([...a.querySelectorAll('button')].every(x => box(x).right <= edge + 0.5), 'every action ends inside the card');
    return [box(a).height, box(b).top];
  };
  eq(tight(LONG_META), tight(undefined), 'the actions wrap the same with a meta');
  fixture().replaceChildren();
});

test('dom: textField is a label over an input, with a hint', () => {
  const got = [];
  const f = textField({ label: 'Name', value: 'alpha', placeholder: 'a name', hint: 'Lower case.', onInput: v => got.push(v) });
  fixture().append(f.el);
  eq(f.el.className, 'kit-field');
  const [label, input, hint] = f.el.children;
  eq([label.tagName, label.className, label.textContent], ['LABEL', 'kit-field-label', 'Name']);
  assert(input === f.input && label.htmlFor === input.id && input.id, 'the label names the input');
  eq([input.tagName, input.type, input.className, input.value, input.placeholder], ['INPUT', 'text', 'kit-input', 'alpha', 'a name']);
  eq([hint.tagName, hint.className, hint.textContent], ['P', 'kit-field-hint', 'Lower case.']);
  input.value = 'beta';
  input.dispatchEvent(new Event('input'));
  eq(got, ['beta']);
  eq([cs(label).fontSize, cs(input).fontSize, cs(input).paddingTop, cs(input).paddingLeft, cs(input).borderRadius], ['12px', '14.5px', '6px', '10px', '6px']);
  assert(Math.abs(input.getBoundingClientRect().width - f.el.getBoundingClientRect().width) < 1, 'the input takes the width');
});

test('dom: textField omits its hint and takes mono', () => {
  const f = textField({ label: 'Repo', mono: true });
  fixture().append(f.el);
  eq(f.el.children.length, 2);
  eq([f.input.className, f.input.value, f.input.placeholder], ['kit-input mono', '', '']);
  assert(cs(f.input).fontFamily.includes('Mono'), 'mono');
  assert(textField({ label: 'a' }).input.id !== textField({ label: 'b' }).input.id, 'each its own id');
});

test('dom: confirmBox holds its words and its buttons in its tone', () => {
  let ran = 0;
  const box = confirmBox({ tone: 'danger', body: [h('p', null, 'Remove alice?')], buttons: [{ label: 'Remove', danger: true, run: () => ran++ }, { label: 'Cancel' }] });
  fixture().append(box);
  eq([box.className, box.getAttribute('role')], ['kit-confirm danger', 'group']);
  eq([...box.children].map(c => c.className), ['kit-confirm-body', 'kit-btns']);
  eq(box.firstChild.textContent, 'Remove alice?');
  const [rm] = box.querySelectorAll('.kit-btn');
  eq(rm.className, 'kit-btn danger');
  rm.click();
  eq(ran, 1);
  eq([cs(box).paddingTop, cs(box).paddingLeft, cs(box).borderRadius, cs(box).fontSize, cs(box.lastChild).marginTop], ['12px', '14px', '6px', '14.5px', '10px']);
  const plain = confirmBox({ body: 'Replace the machine?' });
  fixture().append(plain);
  eq(plain.className, 'kit-confirm signal', 'signal by default');
  eq(plain.children.length, 1, 'no buttons, no row');
  eq(plain.firstChild.textContent, 'Replace the machine?');
  assert(cs(plain).backgroundColor !== cs(box).backgroundColor, 'the tones differ');
});

test('dom: emptyCard is a centred line and one button', () => {
  let ran = 0;
  const c = emptyCard({ text: 'No workspaces yet.', action: { label: 'New workspace', run: () => ran++ } });
  fixture().append(c);
  eq(c.className, 'kit-card kit-empty-card');
  eq([...c.children].map(x => [x.tagName, x.className, x.textContent]), [['P', 'kit-empty-card-text', 'No workspaces yet.'], ['BUTTON', 'kit-btn', 'New workspace']]);
  c.lastChild.click();
  eq(ran, 1);
  eq([cs(c).textAlign, cs(c).paddingTop, cs(c.firstChild).marginBottom], ['center', '26px', '14px']);
  eq(emptyCard({ text: 'Nothing here.' }).children.length, 1, 'no action, no button');
});

function keyed() {
  const box = h('ul');
  const calls = { draw: [], update: [] };
  const rows = keyedRows(box, {
    key: it => it.id,
    draw: it => { calls.draw.push(it.id); return h('li', { dataset: { id: it.id } }, it.state); },
    update: (row, it) => { calls.update.push(it.id); row.textContent = it.state; },
  });
  return { box, calls, rows, els: () => [...box.children] };
}

test('dom: keyedRows draws each row once, and the same items change nothing', () => {
  const k = keyed();
  const items = [{ id: 'a', state: 'ready' }, { id: 'b', state: 'stopped' }];
  k.rows.set(items);
  eq(k.els().map(e => e.textContent), ['ready', 'stopped']);
  eq(k.calls, { draw: ['a', 'b'], update: [] });
  const before = k.els();
  k.rows.set([{ id: 'a', state: 'ready' }, { id: 'b', state: 'stopped' }]);
  assert(k.els().every((e, i) => e === before[i]), 'every row the same element');
  eq(k.calls, { draw: ['a', 'b'], update: [] }, 'neither draw nor update');
});

test('dom: keyedRows updates only the row whose data changed', () => {
  const k = keyed();
  k.rows.set([{ id: 'a', state: 'ready' }, { id: 'b', state: 'stopped' }, { id: 'c', state: 'ready' }]);
  const before = k.els();
  k.rows.set([{ id: 'a', state: 'ready' }, { id: 'b', state: 'starting' }, { id: 'c', state: 'ready' }]);
  eq(k.calls.update, ['b']);
  assert(k.els().every((e, i) => e === before[i]), 'updated in place');
  eq(k.els()[1].textContent, 'starting');
});

test('dom: keyedRows keeps what is open in a row while another changes', () => {
  const k = keyed();
  fixture().append(k.box);
  k.rows.set([{ id: 'a', state: 'ready' }, { id: 'b', state: 'stopped' }]);
  const menu = h('div', { class: 'kit-row-pop' }, 'Open · Stop');
  k.els()[0].append(menu);
  k.rows.set([{ id: 'a', state: 'ready' }, { id: 'b', state: 'starting' }]);
  assert(k.els()[0].lastChild === menu && menu.isConnected, 'the open menu survives');
});

test('dom: keyedRows adds, removes and reorders without redrawing', () => {
  const k = keyed();
  k.rows.set([{ id: 'a', state: '1' }, { id: 'b', state: '2' }, { id: 'c', state: '3' }]);
  const [a, b, c] = k.els();
  k.rows.set([{ id: 'c', state: '3' }, { id: 'a', state: '1' }, { id: 'b', state: '2' }]);
  assert(k.els()[0] === c && k.els()[1] === a && k.els()[2] === b, 'moved, not redrawn');
  eq(k.calls, { draw: ['a', 'b', 'c'], update: [] });
  k.rows.set([{ id: 'a', state: '1' }, { id: 'd', state: '4' }]);
  eq(k.els().map(e => e.dataset.id), ['a', 'd']);
  assert(k.els()[0] === a && !b.isConnected && !c.isConnected, 'gone rows removed');
  eq(k.calls.draw, ['a', 'b', 'c', 'd']);
  k.rows.set([{ id: 'b', state: '2' }, { id: 'a', state: '1' }]);
  assert(k.els()[1] === a && k.els()[0] !== b, 'a row that comes back is drawn anew');
  k.rows.set([]);
  eq(k.box.children.length, 0);
});

test('dom: keyedRows with no update draws a changed row anew in its place', () => {
  const box = h('ul');
  const rows = keyedRows(box, { key: it => it.id, draw: it => h('li', null, it.state) });
  rows.set([{ id: 'a', state: 'x' }, { id: 'b', state: 'y' }]);
  const [a, b] = box.children;
  rows.set([{ id: 'a', state: 'x' }, { id: 'b', state: 'z' }]);
  assert(box.children[0] === a && box.children[1] !== b, 'only b redrawn');
  eq([...box.children].map(e => e.textContent), ['x', 'z']);
});

const KINDS = [
  { value: '', label: 'Agent picks', detail: "From your opening; change it on the plan's page.", blank: true },
  { value: 'feature', label: 'Feature', detail: 'Build or change something, with decisions, a spec and plans.' },
  { value: 'investigation', label: 'Investigation', detail: 'Find out why something is broken before fixing it.' },
  { value: 'system', label: 'System', detail: 'Design a system of several parts, each planned on its own.' },
];
const key = (el, k) => el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
const pickParts = p => ({ btn: p.el.querySelector('.kit-pick-btn'), pop: p.el.querySelector('.kit-row-pop'), opts: [...p.el.querySelectorAll('[role="option"]')] });

test('dom: pickField is a labelled kit-input button naming the choice, its menu hidden', () => {
  const p = pickField({ label: 'Kind', choices: KINDS, value: '' });
  fixture().append(p.el);
  const { btn, pop, opts } = pickParts(p);
  assert(p.el.classList.contains('kit-field'), 'a kit-field');
  const lab = p.el.querySelector('.kit-field-label');
  eq([lab.textContent, lab.htmlFor === btn.id, btn.id !== ''], ['Kind', true, true]);
  assert(btn.classList.contains('kit-input'), 'drawn as kit-input');
  eq([btn.tagName, btn.type, btn.getAttribute('aria-haspopup'), btn.getAttribute('aria-expanded')], ['BUTTON', 'button', 'listbox', 'false']);
  eq(btn.querySelector('.kit-pick-label').textContent, 'Agent picks');
  assert(btn.classList.contains('blank'), 'a blank choice reads muted');
  assert(pop.hidden && pop.getAttribute('role') === 'listbox', 'listbox hidden');
  eq(opts.map(o => [o.querySelector('.kit-pick-name').textContent, o.querySelector('.kit-pick-detail').textContent.slice(0, 10)]),
    [['Agent picks', 'From your '], ['Feature', 'Build or c'], ['Investigation', 'Find out w'], ['System', 'Design a s']]);
  eq(opts.map(o => o.classList.contains('on')), [true, false, false, false]);
  eq(getComputedStyle(opts[0]).backgroundColor !== getComputedStyle(opts[1]).backgroundColor, true, 'the current choice has the soft fill');
  eq(p.value, '');
});

test('dom: pickField from the keyboard: Enter opens, arrows move, Enter picks', () => {
  const got = [];
  const p = pickField({ label: 'Kind', choices: KINDS, value: '', onPick: v => got.push(v) });
  fixture().append(p.el);
  const { btn, pop, opts } = pickParts(p);
  btn.focus();
  key(btn, 'Enter');
  assert(!pop.hidden, 'open');
  eq(btn.getAttribute('aria-expanded'), 'true');
  assert(document.activeElement === opts[0], 'the current choice has the focus');
  key(document.activeElement, 'ArrowDown');
  key(document.activeElement, 'ArrowDown');
  assert(document.activeElement === opts[2], 'two down: Investigation');
  key(document.activeElement, 'ArrowUp');
  key(document.activeElement, 'ArrowDown');
  key(document.activeElement, 'Enter');
  eq(got, ['investigation']);
  eq([p.value, btn.querySelector('.kit-pick-label').textContent, btn.classList.contains('blank')], ['investigation', 'Investigation', false]);
  assert(pop.hidden, 'closed');
  assert(document.activeElement === btn, 'focus back on the button');
  key(btn, ' ');
  assert(!pop.hidden && document.activeElement === opts[2], 'Space opens on the current choice');
  key(document.activeElement, 'Escape');
  assert(pop.hidden && document.activeElement === btn, 'Escape closes and returns focus');
  eq(got, ['investigation'], 'Escape picks nothing');
});

test('dom: pickField by pointer: a press opens, a choice picks, outside closes; set picks quietly', () => {
  const got = [];
  const p = pickField({ label: 'Kind', choices: KINDS, value: 'feature', onPick: v => got.push(v) });
  const fx = fixture();
  const away = h('p', null, 'away');
  fx.append(p.el, away);
  const { btn, pop, opts } = pickParts(p);
  btn.click();
  assert(!pop.hidden, 'open');
  away.click();
  assert(pop.hidden, 'a press outside closes');
  btn.click();
  opts[3].click();
  eq([got, p.value, pop.hidden], [['system'], 'system', true]);
  p.set('feature');
  eq([got, p.value, btn.querySelector('.kit-pick-label').textContent], [['system'], 'feature', 'Feature']);
  eq(opts.map(o => o.getAttribute('aria-selected')), ['false', 'true', 'false', 'false']);
});

// A New plan-like card of three fields across, in a window w wide.
async function pickWindow(w) {
  const win = document.createElement('iframe');
  win.style.cssText = `width:${w}px; height:700px; border:0; display:block`;
  win.srcdoc = '<!doctype html><link rel="stylesheet" href="/_kit/kit.css"><style>html,body{margin:0}'
    + '.f{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.f>*{min-width:0;margin-top:0}'
    + '@media (max-width:600px){.f{grid-template-columns:1fr}}</style><body>';
  const loaded = new Promise(r => win.addEventListener('load', r, { once: true }));
  fixture().append(win);
  await loaded;
  await new Promise(r => setTimeout(r, 50));
  const doc = win.contentDocument;
  const fields = [pickField({ label: 'Project', choices: [{ value: 'a', label: 'tools-workspace' }], value: 'a' }),
    pickField({ label: 'Session', choices: [{ value: 'pi', label: 'pi' }], value: 'pi' }),
    pickField({ label: 'Kind', choices: KINDS, value: '' })];
  const card = h('div', { class: 'kit-card', style: 'max-width:640px;margin:16px;padding:16px' }, h('div', { class: 'f' }, fields.map(f => f.el)));
  doc.body.append(card);
  return { win, doc, card, fields };
}

const edges = (p) => {
  const { btn, pop } = pickParts(p);
  btn.click();
  const b = btn.getBoundingClientRect(), m = pop.getBoundingClientRect();
  return { b, m, round: [Math.round(b.left), Math.round(b.right), Math.round(m.left), Math.round(m.right)] };
};

test('dom: pickField at 1280px: the menu hangs 4px below, on the left edge, or the right edge near the card\'s', async () => {
  const { card, fields } = await pickWindow(1280);
  const first = edges(fields[0]);
  eq(Math.round(first.m.top - first.b.bottom), 4, '4px below');
  eq(first.round[2], first.round[0], 'the first field\'s menu lines up with its left edge');
  assert(first.m.width >= first.b.width - 0.5, 'never narrower than the button');
  const kind = edges(fields[2]);
  eq(kind.round[3], kind.round[1], 'the last field\'s menu lines up with its right edge');
  assert(kind.m.right <= card.getBoundingClientRect().right + 0.5, 'inside the card');
  assert(kind.m.width >= kind.b.width - 0.5, 'never narrower than the button');
  eq(fields.map(f => pickParts(f).pop.hidden), [true, true, false], 'one open at a time');
  fixture().replaceChildren();
});

test('dom: pickField at 390px: the fields stack and the menu lines up with the button', async () => {
  const { doc, card, fields } = await pickWindow(390);
  const kind = edges(fields[2]);
  eq(kind.round[2], kind.round[0], 'left edge');
  assert(kind.m.right <= card.getBoundingClientRect().right + 0.5, 'inside the card');
  assert(kind.m.width >= kind.b.width - 0.5, 'never narrower than the button');
  assert(kind.m.right <= doc.documentElement.clientWidth + 0.5, 'inside the window');
  eq(Math.round(kind.m.top - kind.b.bottom), 4, '4px below');
  key(pickParts(fields[2]).btn, 'Escape');
  fixture().replaceChildren();
});

test('dom: pickField in a sheet: the menu shows whole over the sheet, and Esc closes the menu, not the sheet', () => {
  let closed = 0;
  const p = pickField({ label: 'Kind', choices: KINDS, value: '' });
  const sh = sheet({ title: 'New plan', body: h('div', { style: 'display:flex;justify-content:center' }, h('div', { style: 'width:150px' }, p.el)), onClose: () => closed++ });
  try {
    const { btn, pop, opts } = pickParts(p);
    btn.focus();
    key(btn, 'Enter');
    const last = opts[opts.length - 1].getBoundingClientRect();
    const at = document.elementFromPoint(last.left + 4, last.bottom - 4);
    assert(opts[opts.length - 1].contains(at), `the last choice is on top, not clipped by the sheet (${at && at.className})`);
    const b = btn.getBoundingClientRect(), m = pop.getBoundingClientRect(), r = sh.el.getBoundingClientRect();
    assert(m.right <= r.right + 0.5, `the menu stays inside the sheet (${m.right} > ${r.right})`);
    assert(Math.round(m.left) === Math.round(b.left) || Math.round(m.right) === Math.round(b.right), 'on an edge of the button');
    key(document.activeElement, 'Escape');
    assert(pop.hidden, 'the menu closed');
    eq(closed, 0, 'the sheet stays open');
    assert(document.activeElement === btn, 'focus back on the button');
  } finally { sh.close(); }
});

const MANY = Array.from({ length: 14 }, (_, i) => ({ value: `v${i}`, label: `Choice ${i}`, detail: 'A muted line under it.' }));
async function shortWindow(top) {
  const win = document.createElement('iframe');
  win.style.cssText = 'width:400px; height:300px; border:0; display:block';
  win.srcdoc = '<!doctype html><link rel="stylesheet" href="/_kit/kit.css"><style>html,body{margin:0}</style><body>';
  const loaded = new Promise(r => win.addEventListener('load', r, { once: true }));
  fixture().append(win);
  await loaded;
  await new Promise(r => setTimeout(r, 50));
  const p = pickField({ label: 'Many', choices: MANY, value: 'v0' });
  win.contentDocument.body.append(h('div', { style: `position:absolute;top:${top}px;left:16px;width:200px` }, p.el));
  return { win, p };
}

test('dom: pickField with little room below caps the menu to the window and scrolls it, keeping the focus in view', async () => {
  const { win, p } = await shortWindow(10);
  const { btn, pop, opts } = pickParts(p);
  key(btn, 'Enter');
  const b = btn.getBoundingClientRect(), m = pop.getBoundingClientRect();
  eq(Math.round(m.top - b.bottom), 4, 'below the button');
  assert(m.bottom <= win.contentWindow.innerHeight - 8 + 0.5, `inside the window (${m.bottom})`);
  assert(pop.scrollHeight > pop.clientHeight, 'it scrolls');
  key(win.contentDocument.activeElement, 'ArrowUp');
  const last = opts[opts.length - 1];
  assert(win.contentDocument.activeElement === last, 'up from the first: the last');
  const l = last.getBoundingClientRect(), m2 = pop.getBoundingClientRect();
  assert(l.top >= m2.top - 0.5 && l.bottom <= m2.bottom + 0.5, `the focused choice is in view (${l.top}-${l.bottom} in ${m2.top}-${m2.bottom})`);
  pop.scrollTop = 40;
  const was = pop.scrollTop;
  pop.dispatchEvent(new Event('scroll'));
  eq(pop.scrollTop, was, 'scrolling the menu keeps its place');
  key(last, 'Escape');
  fixture().replaceChildren();
});

test('dom: pickField near the window\'s foot opens its menu above the button', async () => {
  const { win, p } = await shortWindow(230);
  const { btn, pop } = pickParts(p);
  key(btn, 'Enter');
  const b = btn.getBoundingClientRect(), m = pop.getBoundingClientRect();
  eq(Math.round(b.top - m.bottom), 4, '4px above');
  assert(m.top >= 8 - 0.5, `inside the window (${m.top})`);
  assert(m.bottom <= win.contentWindow.innerHeight, 'not below');
  key(win.contentDocument.activeElement, 'Escape');
  fixture().replaceChildren();
});

test('dom: pickField removed while open lets the next Escape through', () => {
  const p = pickField({ label: 'Kind', choices: KINDS, value: '' });
  fixture().append(p.el);
  const { btn, pop } = pickParts(p);
  key(btn, 'Enter');
  assert(!pop.hidden, 'open');
  p.el.remove();
  let heard = null;
  const listen = e => { heard = e.defaultPrevented; };
  document.addEventListener('keydown', listen);
  try {
    key(document.body, 'Escape');
    eq(heard, false, 'the Escape reached the page, not prevented');
    heard = null;
    key(document.body, 'Escape');
    eq(heard, false, 'and the next one too');
  } finally { document.removeEventListener('keydown', listen); }
});

// A model dropdown: the short list, then the rest behind All models…
const SHORT = [{ value: '', label: "The agent's own default", blank: true }, { value: 'fable', label: 'fable' }, { value: 'opus', label: 'opus' }];
const REST = [{ value: 'sonnet', label: 'sonnet' }, { value: 'haiku', label: 'haiku' }];
const moreParts = p => ({
  ...pickParts(p),
  more: p.el.querySelector('.kit-pick-more'),
  shown: [...p.el.querySelectorAll('.kit-pick-opt')].filter(b => !b.hidden).map(b => b.textContent),
});

test('dom: pickField more: a press on the last line keeps the menu open, adds the choices and focuses the first', () => {
  const got = [];
  const p = pickField({ label: 'Model', choices: SHORT, value: 'fable', more: { label: 'All models…', choices: REST }, onPick: v => got.push(v) });
  fixture().append(p.el);
  const { btn, pop, more } = moreParts(p);
  btn.click();
  assert(more && !more.hidden, 'the last line is drawn');
  eq(moreParts(p).shown, ["The agent's own default", 'fable', 'opus', 'All models…']);
  const rule = more.previousElementSibling;
  assert(rule.tagName === 'HR' && !rule.hidden, 'set off by a rule');
  more.click();
  assert(!pop.hidden, 'still open');
  eq([got, p.value], [[], 'fable'], 'nothing picked');
  eq(moreParts(p).shown, ["The agent's own default", 'fable', 'opus', 'sonnet', 'haiku'], 'the line is replaced by the rest');
  assert(rule.hidden, 'the rule goes with the line');
  eq(document.activeElement.textContent, 'sonnet', 'focus on the first added choice');
  key(document.activeElement, 'ArrowDown');
  key(document.activeElement, 'Enter');
  eq([got, p.value, btn.querySelector('.kit-pick-label').textContent, pop.hidden], [['haiku'], 'haiku', 'haiku', true]);
});

test('dom: pickField more: arrows reach the last line like a choice, and Enter or Space opens the rest', () => {
  for (const k of ['Enter', ' ']) {
    const got = [];
    const p = pickField({ label: 'Model', choices: SHORT, value: 'opus', more: { label: 'All models…', choices: REST }, onPick: v => got.push(v) });
    fixture().append(p.el);
    const { btn, pop, more } = moreParts(p);
    key(btn, 'Enter');
    key(document.activeElement, 'ArrowDown');
    assert(document.activeElement === more, 'one down from the last choice: the line');
    key(document.activeElement, 'ArrowDown');
    eq(document.activeElement.textContent, "The agent's own default", 'and round to the first');
    key(document.activeElement, 'ArrowUp');
    assert(document.activeElement === more, 'up from the first: the line');
    key(more, k);
    assert(!pop.hidden, 'still open');
    eq([got, document.activeElement.textContent], [[], 'sonnet']);
    key(document.activeElement, 'ArrowUp');
    eq(document.activeElement.textContent, 'opus', 'the rest follow the short list');
    key(document.activeElement, 'Escape');
  }
});

test('dom: pickField more: a value from more.choices reads on the button, at the start and by set', () => {
  const p = pickField({ label: 'Model', choices: SHORT, value: 'haiku', more: { label: 'All models…', choices: REST } });
  fixture().append(p.el);
  const { btn } = moreParts(p);
  eq([p.value, btn.querySelector('.kit-pick-label').textContent], ['haiku', 'haiku']);
  p.set('sonnet');
  eq([p.value, btn.querySelector('.kit-pick-label').textContent], ['sonnet', 'sonnet']);
  eq([...p.el.querySelectorAll('.kit-pick-opt[aria-selected="true"]')].map(b => b.textContent), ['sonnet']);
});

test('dom: pickField more: the menu is collapsed again when reopened', () => {
  const p = pickField({ label: 'Model', choices: SHORT, value: 'fable', more: { label: 'All models…', choices: REST } });
  fixture().append(p.el);
  const { btn, more } = moreParts(p);
  btn.click();
  more.click();
  key(document.activeElement, 'Escape');
  btn.click();
  eq(moreParts(p).shown, ["The agent's own default", 'fable', 'opus', 'All models…']);
  eq(document.activeElement.textContent, 'fable', 'open on the current choice');
});

test('dom: pickField more: with the current value only in more.choices the menu opens on the longer list', () => {
  const p = pickField({ label: 'Model', choices: SHORT, value: 'haiku', more: { label: 'All models…', choices: REST } });
  fixture().append(p.el);
  const { btn } = moreParts(p);
  btn.click();
  eq(moreParts(p).shown, ["The agent's own default", 'fable', 'opus', 'sonnet', 'haiku']);
  eq(document.activeElement.textContent, 'haiku', 'open on the current choice');
  key(document.activeElement, 'Escape');
  p.set('opus');
  btn.click();
  eq(moreParts(p).shown, ["The agent's own default", 'fable', 'opus', 'All models…'], 'and collapsed once the value is in the short list');
});

test('dom: pickField more: with no more.choices no line is drawn', () => {
  const p = pickField({ label: 'Model', choices: SHORT, value: 'fable', more: { label: 'All models…', choices: [] } });
  fixture().append(p.el);
  const { btn, pop } = moreParts(p);
  btn.click();
  eq([...pop.children].map(c => c.textContent), ["The agent's own default", 'fable', 'opus']);
  key(document.activeElement, 'ArrowDown');
  key(document.activeElement, 'ArrowDown');
  eq(document.activeElement.textContent, "The agent's own default", 'arrows go round the choices only');
});

// Not drawn, and still there for a screen reader: in the page, taking no room.
const undrawn = el => {
  const r = el.getBoundingClientRect(), s = getComputedStyle(el);
  return s.display !== 'none' && s.visibility !== 'hidden' && s.position === 'absolute' && r.width <= 1 && r.height <= 1;
};

test('dom: pickField labelHidden keeps the label for a screen reader and does not draw it', () => {
  const p = pickField({ label: 'Model', choices: SHORT, value: 'fable', labelHidden: true });
  const q = pickField({ label: 'Model', choices: SHORT, value: 'fable' });
  fixture().append(p.el, q.el);
  const lab = p.el.querySelector('label');
  eq([lab.textContent, lab.htmlFor === p.button.id], ['Model', true], 'the label still names the button');
  assert(undrawn(lab), 'not drawn');
  assert(!undrawn(q.el.querySelector('label')), 'drawn without the option');
  eq(p.el.getBoundingClientRect().height, p.button.getBoundingClientRect().height, 'the field is as tall as its button');
});

// A window w wide holding a compact dropdown and an ordinary one, in a band.
async function compactWindow(w) {
  const win = document.createElement('iframe');
  win.style.cssText = `width:${w}px; height:500px; border:0; display:block`;
  win.srcdoc = '<!doctype html><link rel="stylesheet" href="/_kit/kit.css"><style>html,body{margin:0}</style><body>';
  const loaded = new Promise(r => win.addEventListener('load', r, { once: true }));
  fixture().append(win);
  await loaded;
  await new Promise(r => setTimeout(r, 50));
  const small = pickField({ label: 'Model', choices: KINDS, value: 'feature', size: 'compact', labelHidden: true });
  const plain = pickField({ label: 'Model', choices: KINDS, value: 'feature', labelHidden: true });
  win.contentDocument.body.append(h('div', { style: 'margin:16px;max-width:260px' }, small.el, plain.el));
  return { small, plain };
}

for (const w of [1280, 390]) {
  test(`dom: pickField size compact at ${w}px: the button is 28px high with 12px text, the menu's rows as they were`, async () => {
    const { small, plain } = await compactWindow(w);
    assert(small.el.classList.contains('kit-pick-compact'), 'the field carries kit-pick-compact');
    assert(!plain.el.classList.contains('kit-pick-compact'), 'not without the option');
    const s = getComputedStyle(small.button);
    eq([small.button.getBoundingClientRect().height, s.fontSize, s.paddingTop, s.paddingBottom], [28, '12px', '0px', '0px']);
    eq(getComputedStyle(small.button.querySelector('.kit-pick-label')).fontSize, '12px', 'the words are 12px');
    const lab = small.button.querySelector('.kit-pick-label').getBoundingClientRect(), b = small.button.getBoundingClientRect();
    assert(Math.abs((lab.top + lab.bottom) / 2 - (b.top + b.bottom) / 2) <= 1, 'the words are centred in the button');
    assert(plain.button.getBoundingClientRect().height > 28 && getComputedStyle(plain.button).fontSize === '14.5px', 'the default is unchanged');
    const row = p => {
      p.button.click();
      const o = pickParts(p).opts[1], r = o.getBoundingClientRect(), c = getComputedStyle(o);
      const d = getComputedStyle(o.querySelector('.kit-pick-detail'));
      return [Math.round(r.height), c.fontSize, c.paddingTop, d.fontSize];
    };
    const a = row(small), z = row(plain);
    eq(a, z, 'a compact dropdown\'s rows are an ordinary one\'s');
    key(plain.button, 'Escape');
    fixture().replaceChildren();
  });
}

const HELD = 'claude-sonnet-5-5 → claude-opus-5-5';
const label = p => p.button.querySelector('.kit-pick-label').textContent;
const named = p => (p.button.getAttribute('aria-labelledby') || '').split(' ').filter(Boolean).map(id => p.el.ownerDocument.getElementById(id)?.textContent).join(' ');

test('dom: pickField reads as a string: the button shows it, whatever is picked, and the menu keeps each choice\'s label', () => {
  const p = pickField({ label: 'Model', choices: SHORT, value: 'fable', reads: HELD });
  fixture().append(p.el);
  const { btn, opts } = pickParts(p);
  eq(label(p), HELD, 'at the start');
  btn.click();
  eq(label(p), HELD, 'open');
  eq(opts.map(o => o.querySelector('.kit-pick-name').textContent), ["The agent's own default", 'fable', 'opus'], 'the menu reads the labels');
  opts[2].click();
  eq([p.value, label(p)], ['opus', HELD], 'after a pick by pointer');
  key(btn, 'Enter');
  key(document.activeElement, 'ArrowUp');
  key(document.activeElement, 'Enter');
  eq([p.value, label(p)], ['fable', HELD], 'after a pick from the keyboard');
  p.set('opus');
  eq([p.value, label(p)], ['opus', HELD], 'after set');
});

test('dom: pickField reads as a function: the button shows what it returns for the current choice, again on every pick and set', () => {
  const seen = [];
  let held = '';
  const p = pickField({
    label: 'Model', choices: SHORT, value: 'fable', more: { label: 'All models…', choices: REST },
    reads: c => { seen.push(c?.value); return held || (c ? `on ${c.label}` : 'none'); },
  });
  fixture().append(p.el);
  const { btn, opts } = pickParts(p);
  eq(label(p), 'on fable', 'at the start');
  btn.click();
  eq(label(p), 'on fable', 'open');
  eq(opts.map(o => o.textContent), ["The agent's own default", 'fable', 'opus', 'sonnet', 'haiku', 'All models…'], 'the menu reads the labels');
  opts[2].click();
  eq([p.value, label(p)], ['opus', 'on opus'], 'after a pick by pointer');
  key(btn, 'ArrowDown');
  key(document.activeElement, 'ArrowDown');
  eq(label(p), 'on opus', 'an arrow moves the focus, not the choice');
  key(document.activeElement, 'ArrowUp');
  key(document.activeElement, 'ArrowUp');
  key(document.activeElement, ' ');
  eq([p.value, label(p)], ['fable', 'on fable'], 'after a pick from the keyboard');
  p.set('haiku');
  eq([p.value, label(p)], ['haiku', 'on haiku'], 'after set, a choice from more');
  held = HELD;
  p.set(p.value);
  eq(label(p), HELD, 'set with the same value reads again');
  held = '';
  p.set('gone');
  eq(label(p), 'none', 'a value that is no choice: the function hears undefined');
  eq(seen[seen.length - 1], undefined);
  p.set('');
  eq([label(p), btn.classList.contains('blank')], ["on The agent's own default", true], 'a blank choice still reads muted');
});

test('dom: pickField reads: the button is named by its label and what it reads, and its title is what it reads', () => {
  const p = pickField({ label: 'Model', choices: SHORT, value: 'fable', reads: c => (c.value === 'fable' ? HELD : c.label), labelHidden: true });
  const q = pickField({ label: 'Model', choices: SHORT, value: 'fable' });
  fixture().append(p.el, q.el);
  eq(named(p), `Model ${HELD}`, 'label, then the words');
  eq(p.button.title, HELD, 'the title is the words in full');
  const lab = p.el.querySelector('label');
  eq([lab.textContent, lab.htmlFor === p.button.id], ['Model', true], 'the label is still the button\'s');
  p.button.click();
  pickParts(p).opts[2].click();
  eq([named(p), p.button.title], ['Model opus', 'opus'], 'after a pick');
  p.set('fable');
  eq([named(p), p.button.title], [`Model ${HELD}`, HELD], 'after set');
  eq([q.button.hasAttribute('aria-labelledby'), q.button.hasAttribute('title')], [false, false], 'without reads the button is as it was');
  eq(label(q), 'fable');
});

test('dom: pickField onCurrent hears a press on the current choice, once, after the menu closes, and onPick does not', () => {
  const got = [], cur = [];
  let openThen = null;
  const p = pickField({ label: 'Model', choices: SHORT, value: 'fable', onPick: v => got.push(v), onCurrent: v => { cur.push(v); openThen = !pickParts(p).pop.hidden; } });
  fixture().append(p.el);
  const { btn, pop, opts } = pickParts(p);
  btn.click();
  opts[1].click();
  eq([cur, got, pop.hidden, openThen, p.value], [['fable'], [], true, false, 'fable'], 'a click');
  assert(document.activeElement === btn, 'focus back on the button');
  key(btn, 'Enter');
  assert(document.activeElement === opts[1], 'open on the current choice');
  key(document.activeElement, 'Enter');
  eq([cur, got, pop.hidden], [['fable', 'fable'], [], true], 'Enter');
  key(btn, ' ');
  key(document.activeElement, ' ');
  eq([cur, got, pop.hidden], [['fable', 'fable', 'fable'], [], true], 'Space');
  btn.click();
  opts[2].click();
  eq([cur.length, got, p.value], [3, ['opus'], 'opus'], 'another choice goes to onPick alone');
  btn.click();
  key(btn, 'Escape');
  p.set('fable');
  eq([cur.length, got], [3, ['opus']], 'Esc and set call neither');
});

test('dom: pickField without onCurrent: a press on the current choice closes the menu and calls nothing', () => {
  const got = [];
  const p = pickField({ label: 'Model', choices: SHORT, value: 'fable', onPick: v => got.push(v) });
  fixture().append(p.el);
  const { btn, pop, opts } = pickParts(p);
  btn.click();
  opts[1].click();
  eq([got, pop.hidden, p.value, label(p)], [[], true, 'fable', 'fable']);
  key(btn, 'Enter');
  key(document.activeElement, 'Enter');
  eq([got, pop.hidden, document.activeElement === btn], [[], true, true]);
});

const SIDES = [{ value: 'on', label: 'on' }, { value: 'off', label: 'off' }];
const chipParts = el => ({ chips: [...el.querySelectorAll('button.kit-chip')], xs: [...el.querySelectorAll('button.kit-chip-x')] });

test('dom: chipPick is a named group of kit-chip buttons, the chosen ones pressed', () => {
  const el = chipPick({ label: 'Sidebar', chips: SIDES, chosen: ['off'], onToggle() {} });
  const hid = chipPick({ label: 'Open in', chips: SIDES, chosen: ['on'], labelHidden: true, onToggle() {} });
  fixture().append(el, hid);
  eq(el.getAttribute('role'), 'group');
  const lab = document.getElementById(el.getAttribute('aria-labelledby'));
  assert(lab && el.contains(lab), 'named by its label');
  eq([lab.textContent, lab.classList.contains('kit-field-label'), undrawn(lab)], ['Sidebar', true, false]);
  const { chips } = chipParts(el);
  eq(chips.map(c => [c.tagName, c.type, c.textContent, c.dataset.value, c.getAttribute('aria-pressed'), c.classList.contains('on')]),
    [['BUTTON', 'button', 'on', 'on', 'false', false], ['BUTTON', 'button', 'off', 'off', 'true', true]]);
  const hl = document.getElementById(hid.getAttribute('aria-labelledby'));
  eq([hl.textContent, undrawn(hl)], ['Open in', true], 'labelHidden: there and not drawn');
});

test('dom: chipPick one-of: a press on the chip that is on calls nothing, a press on another calls onToggle', () => {
  const got = [];
  const el = chipPick({ label: 'Sidebar', chips: SIDES, chosen: ['off'], onToggle: v => got.push(v) });
  fixture().append(el);
  const { chips } = chipParts(el);
  chips[1].click();
  eq(got, [], 'the chip that is on');
  chips[0].click();
  eq(got, ['on']);
  eq(chips.map(c => c.getAttribute('aria-pressed')), ['false', 'true'], 'the caller keeps the state');
});

test('dom: chipPick many-of: every press calls onToggle with the value', () => {
  const got = [];
  const el = chipPick({ label: 'Short list', many: true, chips: [{ value: 'fable', label: 'fable' }, { value: 'opus', label: 'opus' }, { value: 'haiku', label: 'haiku' }], chosen: ['fable', 'opus'], onToggle: v => got.push(v) });
  fixture().append(el);
  const { chips } = chipParts(el);
  eq(chips.map(c => c.getAttribute('aria-pressed')), ['true', 'true', 'false']);
  chips[0].click();
  chips[2].click();
  eq(got, ['fable', 'haiku']);
});

test('dom: chipPick remove: ✕ is a sibling button named by remove that calls onRemove and not onToggle', () => {
  const got = [];
  const el = chipPick({
    label: 'Short list', many: true, chosen: ['opus-4-8'],
    chips: [{ value: 'opus', label: 'opus' }, { value: 'opus-4-8', label: 'claude-opus-4-8 · pinned', remove: 'Unpin claude-opus-4-8' }],
    onToggle: v => got.push(['toggle', v]), onRemove: v => got.push(['remove', v]),
  });
  fixture().append(el);
  const { chips, xs } = chipParts(el);
  eq([chips.length, xs.length], [2, 1], 'only the chip with remove gets a ✕');
  const x = xs[0];
  eq([x.tagName, x.type, x.getAttribute('aria-label'), x.textContent], ['BUTTON', 'button', 'Unpin claude-opus-4-8', '✕']);
  assert(x.parentElement === chips[1].parentElement && x.previousElementSibling === chips[1], 'beside the chip, not in it');
  eq(chips[1].textContent, 'claude-opus-4-8 · pinned');
  x.click();
  eq(got, [['remove', 'opus-4-8']]);
  chips[1].click();
  eq(got, [['remove', 'opus-4-8'], ['toggle', 'opus-4-8']]);
});

test('dom: chipPick redrawn by its press gives the focus back to the chip pressed', () => {
  const fx = fixture();
  let chosen = ['fable'];
  let pins = [{ value: 'a', label: 'a', remove: 'Unpin a' }, { value: 'b', label: 'b', remove: 'Unpin b' }, { value: 'c', label: 'c', remove: 'Unpin c' }];
  const draw = () => fx.replaceChildren(
    chipPick({ label: 'Sidebar', chips: SIDES, chosen: ['on'], onToggle() {} }),
    chipPick({
      label: 'Short list', many: true, chosen, chips: [{ value: 'fable', label: 'fable' }, { value: 'on', label: 'on' }, ...pins],
      onToggle: v => { chosen = chosen.includes(v) ? chosen.filter(x => x !== v) : [...chosen, v]; draw(); },
      onRemove: v => { pins = pins.filter(p => p.value !== v); draw(); },
    }));
  draw();
  const group = () => fx.children[1];
  let c = chipParts(group()).chips[1];
  c.focus();
  c.click();
  let now = chipParts(group()).chips[1];
  assert(now !== c && document.activeElement === now, 'the redrawn chip of that group has the focus');
  eq(now.getAttribute('aria-pressed'), 'true');
  c = chipParts(group()).chips[0];
  c.click();
  assert(!fx.contains(document.activeElement) || document.activeElement === document.body, 'a press without the focus moves none in');
  let x = chipParts(group()).xs[1];
  x.focus();
  x.click();
  eq(chipParts(group()).xs.map(b => b.getAttribute('aria-label')), ['Unpin a', 'Unpin c']);
  eq(document.activeElement.getAttribute('aria-label'), 'Unpin c', 'after a remove: the ✕ that took its place');
  x = chipParts(group()).xs[1];
  x.click();
  eq(document.activeElement.getAttribute('aria-label'), 'Unpin a', 'the last one removed: the ✕ before it');
});
