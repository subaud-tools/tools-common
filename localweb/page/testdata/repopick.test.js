import { test, eq, assert, fixture, focusEl } from './harness.js';
import { repoPick } from '/_kit/repopick.js';

const HOUR = 3600e3, DAY = 24 * HOUR;
const now = Date.now();
// Thirty repos over three owners, a (12), b (12) and c (6), shuffled, each an
// hour older than the one before in the order made: a-0 newest, c-5 oldest.
function repos() {
  const out = [];
  let age = 1;
  for (const [owner, n] of [['a', 12], ['b', 12], ['c', 6]]) {
    for (let i = 0; i < n; i++) out.push({ name: `${owner}/r${i}`, private: i % 2 === 0, updated: new Date(now - age++ * HOUR).toISOString() });
  }
  return out.sort((x, y) => x.name.length - y.name.length || (x.name < y.name ? 1 : -1));
}

function make(o = {}) {
  const p = repoPick({ repos: repos(), ...o });
  fixture().append(p.el);
  return p;
}
const rows = p => [...p.scroll.querySelectorAll('.kit-repo-row')];
const names = p => rows(p).map(r => r.dataset.name);
const row = (p, name) => rows(p).find(r => r.dataset.name === name);
const box = (p, name) => row(p, name).querySelector('input[type=checkbox]');
const press = (p, name) => box(p, name).click();
const all = p => p.el.querySelector('.kit-repo-all input');
const allText = p => p.el.querySelector('.kit-repo-all .kit-tick').textContent;
const search = (p, q) => {
  const s = p.el.querySelector('.kit-repo-search');
  s.value = q;
  s.dispatchEvent(new Event('input', { bubbles: true }));
};
const chip = (p, owner) => [...p.el.querySelectorAll('.kit-repo-owners .kit-chip')].find(c => c.dataset.owner === owner);
const btn = (p, label) => [...p.el.querySelectorAll('.kit-repo-pager button')].find(b => b.textContent === label);
const typed = p => p.el.querySelector('.kit-repo-typed input');
const typedError = p => p.el.querySelector('.kit-repo-typed-error');
const type = (p, text, commit = false) => {
  const t = typed(p);
  t.value = text;
  t.dispatchEvent(new Event('input', { bubbles: true }));
  if (commit) t.dispatchEvent(new Event('change', { bubbles: true }));
};

test('repoPick: the list is newest first, ten to a page, each row its name and "private · 2 days ago"', () => {
  const p = make();
  eq(names(p), ['a/r0', 'a/r1', 'a/r2', 'a/r3', 'a/r4', 'a/r5', 'a/r6', 'a/r7', 'a/r8', 'a/r9']);
  eq(row(p, 'a/r0').querySelector('.kit-repo-meta').textContent, 'private · 1 hour ago');
  eq(row(p, 'a/r1').querySelector('.kit-repo-meta').textContent, '2 hours ago');
  const q = repoPick({ repos: [{ name: 'x/y', private: true, updated: new Date(now - 2 * DAY - HOUR).toISOString() }] });
  eq(q.scroll.querySelector('.kit-repo-meta').textContent, 'private · 2 days ago');
  eq(allText(p), 'Tick all 30');
  eq(p.el.querySelector('.kit-repo-count').textContent, '0 chosen');
});

test('repoPick: the search filters by any part of owner/name', () => {
  const p = make();
  search(p, 'r1');
  eq(names(p), ['a/r1', 'a/r10', 'a/r11', 'b/r1', 'b/r10', 'b/r11', 'c/r1']);
  eq(allText(p), 'Tick all 7 matches');
  search(p, 'C/');
  eq(names(p), ['c/r0', 'c/r1', 'c/r2', 'c/r3', 'c/r4', 'c/r5']);
  search(p, 'b/r11');
  eq(allText(p), 'Tick all 1 match');
  search(p, 'zzz');
  eq(names(p), []);
  assert(p.scroll.textContent.includes('No repo matches “zzz”.'), p.scroll.textContent);
});

test('repoPick: an owner chip filters to its owner, and its tick-all ticks only that owner on every page', () => {
  const p = make();
  eq([...p.el.querySelectorAll('.kit-repo-owners .kit-chip')].map(c => c.textContent), ['all30', 'a12', 'b12', 'c6']);
  assert(chip(p, '').classList.contains('on'), 'all is on at first');
  chip(p, 'b').click();
  assert(chip(p, 'b').classList.contains('on') && !chip(p, '').classList.contains('on'), 'b is on');
  assert(names(p).every(n => n.startsWith('b/')) && names(p).length === 10, names(p).join());
  eq(allText(p), 'Tick all 12 in b');
  all(p).click();
  eq(p.chosen().sort(), Array.from({ length: 12 }, (_, i) => `b/r${i}`).sort());
  search(p, 'r1');
  eq(allText(p), 'Tick all 3 matches in b');
  search(p, '');
  chip(p, '').click();
  eq(allText(p), 'Tick all 30');
  assert(all(p).indeterminate, 'half-ticked over all owners');
});

test('repoPick: tick-all is half-ticked when only some are, and a press then unticks them all', () => {
  const p = make();
  press(p, 'a/r3');
  assert(all(p).indeterminate && !all(p).checked, 'half-ticked');
  all(p).click();
  eq(p.chosen(), []);
  assert(!all(p).indeterminate && !all(p).checked, 'none ticked');
  all(p).click();
  eq(p.chosen().length, 30);
  assert(all(p).checked && !all(p).indeterminate, 'all ticked');
  eq(p.el.querySelector('.kit-repo-count').textContent, '30 chosen');
  all(p).click();
  eq(p.chosen(), []);
});

test('repoPick: repos already chosen are ticked, greyed and labelled, never in chosen(), and tick-all skips them', () => {
  const p = make({ have: { names: ['a/r0', 'b/r2'], label: 'already on the workspace' } });
  const had = row(p, 'a/r0');
  assert(had.classList.contains('kit-repo-had'), 'greyed');
  const b = box(p, 'a/r0');
  assert(b.checked && b.disabled, 'ticked and disabled');
  eq(had.querySelector('.kit-repo-meta').textContent, 'already on the workspace');
  eq(allText(p), 'Tick all 30');
  all(p).click();
  eq(p.chosen().length, 28);
  assert(!p.chosen().includes('a/r0') && !p.chosen().includes('b/r2'), 'have repos are not chosen');
  assert(all(p).checked && !all(p).indeterminate, 'all that can be ticked are');
  eq(p.el.querySelector('.kit-repo-count').textContent, '28 chosen');
});

test('repoPick: paging shows ten and keeps ticks across pages', () => {
  const p = make();
  const range = () => p.el.querySelector('.kit-repo-pager .kit-repo-page').textContent;
  eq(range(), 'page 1 of 3');
  assert(btn(p, 'Previous').disabled && !btn(p, 'Next').disabled);
  press(p, 'a/r2');
  btn(p, 'Next').click();
  eq(range(), 'page 2 of 3');
  eq(names(p)[0], 'a/r10');
  press(p, 'b/r0');
  btn(p, 'Next').click();
  eq(names(p).length, 10);
  assert(btn(p, 'Next').disabled, 'Next off on the last page');
  btn(p, 'Previous').click();
  btn(p, 'Previous').click();
  assert(box(p, 'a/r2').checked, 'the tick on page 1 is kept');
  eq(p.chosen(), ['a/r2', 'b/r0']);
  search(p, 'c/');
  assert(!p.el.querySelector('.kit-repo-pager').hidden, 'one page still shows the pager');
  eq(range(), 'page 1 of 1');
  assert(btn(p, 'Previous').disabled && btn(p, 'Next').disabled, 'both off on the one page');
});

test('repoPick: an org link ticks every listed repo of that owner', () => {
  const p = make({ typed: true });
  type(p, 'https://github.com/c', true);
  eq(p.chosen().sort(), ['c/r0', 'c/r1', 'c/r2', 'c/r3', 'c/r4', 'c/r5']);
  eq(typed(p).value, '', 'the field clears');
  eq(typedError(p).textContent, '');
});

test('repoPick: a typed repo outside the list is chosen as typed, in each form', () => {
  const p = make({ typed: true });
  assert(p.el.querySelector('.kit-repo-typed').textContent.includes('Not in the list?'), 'its label');
  for (const [text, want] of [
    ['someone/thing', 'someone/thing'],
    ['https://github.com/someone/thing', 'someone/thing'],
    ['https://github.com/someone/thing.git', 'someone/thing'],
    ['https://github.com/someone/thing/tree/main/x', 'someone/thing'],
  ]) {
    type(p, text);
    eq(p.chosen(), [want], text);
    eq(typedError(p).textContent, '', text);
  }
  press(p, 'a/r0');
  eq(p.chosen(), ['a/r0', 'someone/thing']);
  eq(p.el.querySelector('.kit-repo-count').textContent, '2 chosen');
  type(p, 'a/r1', true);
  assert(box(p, 'a/r1').checked, 'a typed listed repo is ticked in the list');
  eq(typed(p).value, '');
  eq(p.chosen(), ['a/r0', 'a/r1']);
});

test('repoPick: a bad typed value shows a one-line error under the field', () => {
  const p = make({ typed: true });
  type(p, 'not a repo', true);
  assert(typedError(p).textContent.length > 0, 'an error');
  eq(p.chosen(), []);
  type(p, 'https://gitlab.com/a/b', true);
  assert(typedError(p).textContent.length > 0, 'not GitHub');
  type(p, 'a/b');
  eq(typedError(p).textContent, '', 'typing clears it');
  type(p, 'https://github.com/nobody', true);
  assert(typedError(p).textContent.includes('nobody'), typedError(p).textContent);
});

test('repoPick: the mark sits on the first ticked, moves on a press and follows when its repo is unticked', () => {
  const p = make({ mark: { on: '★ plans saved here', off: '☆', title: n => `Save the plans to ${n}` } });
  eq(p.marked(), '');
  assert(!row(p, 'a/r0').querySelector('.kit-repo-mark'), 'no mark on an unticked repo');
  press(p, 'a/r4');
  press(p, 'a/r1');
  eq(p.marked(), 'a/r4');
  const m4 = row(p, 'a/r4').querySelector('.kit-repo-mark');
  eq([m4.textContent, m4.getAttribute('aria-pressed'), m4.title], ['★ plans saved here', 'true', 'Save the plans to a/r4']);
  const m1 = row(p, 'a/r1').querySelector('.kit-repo-mark');
  eq([m1.textContent, m1.getAttribute('aria-pressed')], ['☆', 'false']);
  m1.click();
  eq(p.marked(), 'a/r1');
  assert(box(p, 'a/r1').checked, 'pressing the mark leaves the tick');
  press(p, 'a/r1');
  eq(p.marked(), 'a/r4', 'follows the first ticked');
  press(p, 'a/r4');
  eq(p.marked(), '');
});

test('repoPick: onChange hears every change', () => {
  const heard = [];
  const p = make({ typed: true, onChange: s => heard.push(s.chosen.length) });
  press(p, 'a/r0');
  all(p).click();
  type(p, 'x/y');
  eq(heard, [1, 0, 1]);
});

test('repoPick: listing shows "Listing your repos…" with the search off, then setRepos draws the list', () => {
  const p = repoPick({ typed: true, repos: null });
  fixture().append(p.el);
  assert(p.el.querySelector('.kit-repo-search').disabled, 'search off');
  assert(p.scroll.textContent.includes('Listing your repos…'), p.scroll.textContent);
  assert(typed(p), 'the typed field is there while listing');
  const q = repoPick({});
  assert(q.scroll.textContent.includes('Listing your repos…'), 'no repos and no typed field: listing');
  p.setRepos(repos());
  assert(!p.el.querySelector('.kit-repo-search').disabled, 'search on');
  eq(names(p).length, 10);
});

test('repoPick: failed shows its text in the list\'s place and the typed field still works', () => {
  const p = make({ typed: true, repos: null });
  p.failed('Your repos couldn\'t be listed. Type the repo below.');
  assert(p.scroll.textContent.includes('Your repos couldn\'t be listed. Type the repo below.'), p.scroll.textContent);
  assert(p.el.querySelector('.kit-repo-search').hidden, 'no search');
  assert(p.el.querySelector('.kit-repo-all').hidden, 'no tick-all');
  type(p, 'subaud-tools/hail');
  eq(p.chosen(), ['subaud-tools/hail']);
});

test('repoPick: with no repos and the typed field, only the typed field draws', () => {
  const p = repoPick({ typed: { label: 'The repo to add' } });
  fixture().append(p.el);
  for (const sel of ['.kit-repo-search', '.kit-repo-owners', '.kit-repo-all', '.kit-repo-rows', '.kit-repo-pager']) {
    const n = p.el.querySelector(sel);
    assert(!n || n.hidden, `${sel} not drawn`);
  }
  assert(p.el.querySelector('.kit-repo-typed').textContent.includes('The repo to add'), 'its label');
  type(p, 'https://github.com/o/n');
  eq(p.chosen(), ['o/n']);
  type(p, 'https://github.com/o', true);
  assert(typedError(p).textContent.length > 0, 'an org link with nothing listed is an error');
});

test('repoPick: a row is on one line in a 720px sheet', () => {
  const p = make({ mark: { on: '★ plans saved here', off: '☆' } });
  p.el.style.width = '680px';
  press(p, 'a/r0');
  const r = row(p, 'a/r0').getBoundingClientRect();
  assert(r.height < 40, `row is ${Math.round(r.height)}px tall`);
});

test('repoPick: focus stays on the pressed row, chip and mark', () => {
  const p = make({ mark: { on: '★', off: '☆' } });
  focusEl(box(p, 'a/r2'));
  press(p, 'a/r2');
  assert(document.activeElement === box(p, 'a/r2'), `focus on the row's box, got ${document.activeElement.outerHTML.slice(0, 80)}`);
  press(p, 'a/r5');
  const m5 = row(p, 'a/r5').querySelector('.kit-repo-mark');
  focusEl(m5);
  m5.click();
  eq(p.marked(), 'a/r5');
  assert(document.activeElement === row(p, 'a/r5').querySelector('.kit-repo-mark'), 'focus on the mark');
  focusEl(chip(p, 'b'));
  chip(p, 'b').click();
  assert(document.activeElement === chip(p, 'b'), 'focus on the chip');
});

test('repoPick: a typed repo already chosen elsewhere errors and is not chosen, listed or not', () => {
  const have = { names: ['Org/Kept', 'a/r0'], label: 'already on the workspace' };
  const f = make({ typed: true, repos: null, have });
  f.failed('nope');
  type(f, 'org/kept');
  eq(f.chosen(), [], 'not chosen while typing');
  type(f, 'https://github.com/org/kept', true);
  eq(typedError(f).textContent, 'Org/Kept: already on the workspace');
  eq(f.chosen(), []);
  const t = repoPick({ typed: true, have });
  fixture().append(t.el);
  type(t, 'A/R0', true);
  eq(t.chosen(), []);
  eq(typedError(t).textContent, 'a/r0: already on the workspace');
  const l = make({ typed: true, have });
  type(l, 'org/kept', true);
  eq(l.chosen(), [], 'a have name the list does not hold');
  eq(typedError(l).textContent, 'Org/Kept: already on the workspace');
});
