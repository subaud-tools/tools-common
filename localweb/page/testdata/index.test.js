import { test, eq, assert, fixture } from './harness.js';
import { indexRow, indexSection, attentionDot } from '/_kit/index.js';

test('indexRow: a plain row is its card, title and meta', () => {
  const r = indexRow({ id: 'DCSN1', title: 'Offline sends', meta: 'decided · A' });
  eq([r.tagName, r.className, r.dataset.card], ['LI', 'kit-index-row', 'DCSN1']);
  const main = r.firstChild;
  eq([main.tagName, main.className, main.type], ['BUTTON', 'kit-index-main', 'button']);
  eq([...main.children].map(c => [c.className, c.textContent]), [['kit-index-title', 'Offline sends'], ['kit-meta', 'decided · A']]);
  eq(r.children.length, 1);
});

test('indexRow: no meta, no meta line', () => {
  assert(!indexRow({ id: 'a', title: 't', meta: '' }).querySelector('.kit-meta'), 'no line');
});

test('indexRow: the caller says what state it is in', () => {
  const r = indexRow({ id: 'a', title: 't', on: true, attention: true, waits: true, draft: true });
  eq(r.className, 'kit-index-row on attn waits draft');
});

test('indexRow: a press selects its id', () => {
  let got = null;
  indexRow({ id: 'PLAN1', title: 't', select: id => (got = id) }).firstChild.click();
  eq(got, 'PLAN1');
});

test('indexRow: attention adds the dot, after the extra the caller gave', () => {
  const extra = document.createElement('i');
  const r = indexRow({ id: 'a', title: 't', attention: true, extra: [extra] });
  assert(r.children[1] === extra, 'the extra follows the button');
  eq(r.children[2].className, 'kit-tip-at kit-attn-at');
});

test('attentionDot: says needs you, in its label and in a tip', () => {
  const d = attentionDot();
  fixture().append(d);
  const dot = d.querySelector('.kit-attn-dot');
  eq([dot.getAttribute('role'), dot.getAttribute('tabindex'), dot.getAttribute('aria-label')], ['button', '0', 'needs you']);
  eq(d.querySelector('.kit-tip').textContent, 'Needs you');
  dot.click();
  assert(d.classList.contains('show'), 'a press shows the tip');
  eq(getComputedStyle(dot).borderRadius, '50%');
});

test('indexSection: the name over its rows, as a list without bullets', () => {
  const s = indexSection({ name: 'Decisions', rows: [indexRow({ id: 'a', title: 't' })], empty: 'None yet.' });
  fixture().append(s);
  eq(s.className, 'kit-index-section');
  const label = s.firstChild;
  eq([label.tagName, label.className, label.textContent], ['DIV', 'kit-label', 'Decisions']);
  const ul = s.lastChild;
  eq([ul.tagName, ul.className, ul.children.length], ['UL', 'kit-index-rows', 1]);
  eq(getComputedStyle(ul).listStyleType, 'none');
});

test('indexSection: no rows shows its empty words', () => {
  const s = indexSection({ name: 'Later', rows: [], empty: 'Nothing for later.' });
  const p = s.lastChild;
  eq([p.tagName, p.className, p.textContent], ['P', 'kit-empty', 'Nothing for later.']);
});

test('indexSection: open turns the name into a link', () => {
  let opened = 0;
  const s = indexSection({ name: 'Decisions', rows: [], empty: '', open: () => opened++ });
  const b = s.firstChild;
  eq([b.tagName, b.className, b.type, b.textContent], ['BUTTON', 'kit-label kit-label-link', 'button', 'Decisions ›']);
  b.click();
  eq(opened, 1);
});

test('indexSection: an action sits beside the name in one heading row', () => {
  const action = document.createElement('button');
  action.textContent = '+ Add';
  const s = indexSection({ name: 'Artifacts', rows: [], empty: 'None yet.', open() {}, action });
  const box = fixture();
  box.style.width = '160px';
  box.append(s);
  const head = s.firstChild;
  eq([head.tagName, head.className, head.children.length], ['DIV', 'kit-index-head', 2]);
  eq([head.firstChild.className, head.firstChild.textContent], ['kit-label kit-label-link', 'Artifacts ›']);
  assert(head.lastChild === action, 'the action follows the name');
  eq(s.lastChild.className, 'kit-empty');
  const hr = head.getBoundingClientRect(), lr = head.firstChild.getBoundingClientRect(), ar = action.getBoundingClientRect();
  assert(lr.left < ar.left, 'the name on the left, the action on the right');
  assert(ar.right <= hr.right + 0.5 && head.scrollWidth <= head.clientWidth, 'nothing overflows the column');
  assert(Math.abs((lr.top + lr.bottom) / 2 - (ar.top + ar.bottom) / 2) < 2, 'the two sit on one line');
});

test('indexSection: a plain name with an action, and none without one', () => {
  const action = document.createElement('i');
  const head = indexSection({ name: 'Later', rows: [], empty: '', action }).firstChild;
  eq([head.className, head.firstChild.tagName, head.firstChild.className], ['kit-index-head', 'DIV', 'kit-label']);
  const plain = indexSection({ name: 'Later', rows: [], empty: 'x' });
  eq(plain.outerHTML, '<section class="kit-index-section"><div class="kit-label">Later</div><p class="kit-empty">x</p></section>');
});
