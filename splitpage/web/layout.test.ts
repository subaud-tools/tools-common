import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Tab, TabList } from '../wire.d.ts';
import {
  afterTabs,
  afterTyped,
  arrow,
  firstView,
  released,
  show,
  type State,
  storedLayout,
  storedWidth,
  tabChange,
  termShows,
  widthKey,
} from './layout.ts';

const wide: State = { layout: 'split', narrow: false, view: 'terminal', dot: false, known: true };
const narrow: State = { ...wide, narrow: true };
const tab = (id: string): Tab => ({ id, address: `http://127.0.0.1:1/${id}`, title: id, pinned: false, types: false });
const list = (selected: string, ...ids: string[]): TabList => ({ session: 's', tabs: ids.map(tab), selected });
const none = { front: false, first: false, behind: false, last: false };

test('a stored layout is one of the three, else split', () => {
  for (const v of ['split', 'term-closed', 'tabs-closed'] as const) assert.equal(storedLayout(v), v);
  for (const v of [null, '', 'both-closed', 'narrow']) assert.equal(storedLayout(v), 'split', String(v));
});

test('each arrow closes its side, and from a closed side opens the split', () => {
  assert.equal(arrow('split', 'left'), 'term-closed');
  assert.equal(arrow('split', 'right'), 'tabs-closed');
  assert.equal(arrow('term-closed', 'right'), 'split');
  assert.equal(arrow('tabs-closed', 'left'), 'split');
  // Only one side is closed at a time.
  assert.equal(arrow('term-closed', 'left'), 'term-closed');
  assert.equal(arrow('tabs-closed', 'right'), 'tabs-closed');
});

test('a drag let go within 120px of an edge closes the side next to it', () => {
  const total = 1200;
  const divider = 6;
  assert.equal(released(60, total, divider), 'term-closed');
  assert.equal(released(200, total, divider), null);
  assert.equal(released(total - 60, total, divider), 'tabs-closed');
  assert.equal(released(total - 200, total, divider), null);
  assert.equal(released(120, total, divider), null);
});

test('the width is kept per page address', () => {
  assert.equal(widthKey('127.0.0.1:5000', '/'), 'splitpage.width 127.0.0.1:5000/');
  assert.notEqual(widthKey('127.0.0.1:5000', '/'), widthKey('127.0.0.1:5001', '/'));
});

test('a stored width is a whole number of pixels, at least the edge', () => {
  assert.equal(storedWidth('400'), 400);
  for (const v of [null, '', 'wide', '-5', '50', 'NaN', 'Infinity']) assert.equal(storedWidth(v), null, String(v));
});

test('the terminal shows unless it is closed, or Pages shows on a narrow screen', () => {
  assert.equal(termShows(wide), true);
  assert.equal(termShows({ ...wide, layout: 'tabs-closed' }), true);
  assert.equal(termShows({ ...wide, layout: 'term-closed' }), false);
  assert.equal(termShows({ ...narrow, view: 'terminal', layout: 'term-closed' }), true);
  assert.equal(termShows({ ...narrow, view: 'pages' }), false);
});

test('a narrow page shows no terminal until it has heard its tabs', () => {
  assert.equal(termShows({ ...narrow, view: 'terminal', known: false }), false);
  assert.equal(termShows({ ...wide, known: false }), true);
});

test('the server saying the same list again is a tab opened in front again', () => {
  assert.deepEqual(tabChange(list('a', 'a'), list('a', 'a'), true), { ...none, front: true });
  assert.deepEqual(tabChange(list(''), list(''), true), none);
  assert.deepEqual(tabChange(null, list('a', 'a'), true), none);
});

test('a new window on a narrow screen opens on Pages when there is a tab', () => {
  assert.equal(firstView(0), 'terminal');
  assert.equal(firstView(2), 'pages');
});

test('the first list the page hears says nothing changed', () => {
  assert.deepEqual(tabChange(null, list('a', 'a', 'b')), none);
});

test('a tab opened in front, behind, the first, and closing the last', () => {
  assert.deepEqual(tabChange(list('a', 'a'), list('b', 'a', 'b')), { ...none, front: true });
  assert.deepEqual(tabChange(list('a', 'a'), list('a', 'a', 'b')), { ...none, behind: true });
  assert.deepEqual(tabChange(list('', ), list('a', 'a')), { ...none, front: true, first: true });
  assert.deepEqual(tabChange(list('', ), list('', 'a')), { ...none, first: true });
  assert.deepEqual(tabChange(list('a', 'a'), list('')), { ...none, last: true });
  // An address already open, opened in front again, shows its tab.
  assert.deepEqual(tabChange(list('a', 'a', 'b'), list('b', 'a', 'b')), { ...none, front: true });
  // Closing the tab that shows shows a neighbour: nothing was opened.
  assert.deepEqual(tabChange(list('b', 'a', 'b'), list('a', 'a')), none);
  assert.deepEqual(tabChange(list('a', 'a'), list('a', 'a')), none);
});

test('wide: a tab in front or the first opens closed tabs; closing the last closes them', () => {
  const closed: State = { ...wide, layout: 'tabs-closed' };
  assert.equal(afterTabs(closed, { ...none, front: true }).layout, 'split');
  assert.equal(afterTabs(closed, { ...none, first: true }).layout, 'split');
  assert.equal(afterTabs(closed, { ...none, behind: true }).layout, 'tabs-closed');
  assert.equal(afterTabs(wide, { ...none, last: true }).layout, 'tabs-closed');
  assert.equal(afterTabs({ ...wide, layout: 'term-closed' }, { ...none, last: true }).layout, 'tabs-closed');
  assert.equal(afterTabs({ ...wide, layout: 'term-closed' }, { ...none, front: true }).layout, 'term-closed');
  assert.equal(afterTabs(wide, { ...none, behind: true }).dot, false);
});

test('wide: typed text opens a closed terminal', () => {
  assert.equal(afterTyped({ ...wide, layout: 'term-closed' }).layout, 'split');
  assert.equal(afterTyped({ ...wide, layout: 'tabs-closed' }).layout, 'tabs-closed');
});

test('narrow: the returns are switches, and never touch the wide layout', () => {
  const s: State = { ...narrow, layout: 'tabs-closed', view: 'terminal' };
  assert.deepEqual(afterTabs(s, { ...none, front: true }), { ...s, view: 'pages' });
  assert.deepEqual(afterTabs(s, { ...none, first: true }), { ...s, view: 'pages' });
  assert.deepEqual(afterTabs(s, { ...none, behind: true }), { ...s, dot: true });
  assert.deepEqual(afterTabs({ ...s, view: 'pages' }, { ...none, behind: true }), { ...s, view: 'pages' });
  assert.deepEqual(afterTabs({ ...s, view: 'pages' }, { ...none, last: true }), s);
  const t: State = { ...narrow, layout: 'term-closed', view: 'pages' };
  assert.deepEqual(afterTyped(t), { ...t, view: 'terminal' });
});

test('the dot on Pages goes when Pages shows', () => {
  const s: State = { ...narrow, view: 'terminal', dot: true };
  assert.deepEqual(show(s, 'pages'), { ...s, view: 'pages', dot: false });
  assert.deepEqual(show(s, 'terminal'), s);
  assert.deepEqual(afterTabs(s, { ...none, front: true }), { ...s, view: 'pages', dot: false });
});
