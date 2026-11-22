import { test, eq, assert, fixture } from './harness.js';
import { lineDiff, diffBox } from '/_kit/diff.js';
import { h } from '/_kit/dom.js';

const text = el => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
const ops = hk => hk.lines.map(l => l.op[0] + l.text).join('|');
const rows = box => [...box.querySelectorAll('.kit-diff-lines > *')].map(el =>
  el.classList.contains('kit-dl')
    ? `${el.className}:${[...el.children].map(c => c.textContent).join('/')}`
    : `${el.className}:${el.textContent}`);

// diazo's internal/record/diff_test.go TestLineDiffFoldsWhatDidntChange.
test('lineDiff folds what did not change, with each hunk under its section', () => {
  const a = ['# Title', '', '## One'];
  for (let i = 0; i < 20; i++) a.push(`line ${i}`);
  a.push('## Two');
  for (let i = 20; i < 40; i++) a.push(`line ${i}`);
  const b = [...a];
  b[5] = 'line 2, reworded'; // under One
  b.splice(30, 0, 'new'); // under Two
  const d = lineDiff(a.join('\n') + '\n', b.join('\n') + '\n');
  eq([d.added, d.removed, d.hunks.length], [2, 1, 2]);
  eq(d.hunks.map(x => x.section), ['One', 'Two']);
  let shown = d.after;
  for (const x of d.hunks) {
    shown += x.before + x.lines.length;
    assert(x.lines[0].op === 'same' && x.lines.at(-1).op === 'same', `a hunk without its context: ${ops(x)}`);
  }
  eq(shown, b.length + 1, 'folded and shown lines'); // every new line, and the one removed
});

test('lineDiff: a changed line is removed then added, with three lines of context and folds either side', () => {
  const a = 'a\nb\nc\nd\ne\nf\ng\nh\ni\n';
  const d = lineDiff(a, a.replace('e\n', 'E\n'));
  eq([d.added, d.removed, d.after], [1, 1, 1]);
  eq(d.hunks.length, 1);
  eq(d.hunks[0].before, 1);
  eq(ops(d.hunks[0]), 'sb|sc|sd|de|aE|sf|sg|sh');
});

test('lineDiff: added and removed lines alone', () => {
  const add = lineDiff('a\nb\n', 'a\nb\nc\n');
  eq([add.added, add.removed], [1, 0]);
  eq(ops(add.hunks[0]), 'sa|sb|ac');
  const del = lineDiff('a\nb\nc\n', 'b\nc\n');
  eq([del.added, del.removed], [0, 1]);
  eq(ops(del.hunks[0]), 'da|sb|sc');
  const fromNothing = lineDiff('', 'x\ny');
  eq([fromNothing.added, fromNothing.removed, fromNothing.after], [2, 0, 0]);
  eq(ops(fromNothing.hunks[0]), 'ax|ay');
});

test('lineDiff: changes close together share a hunk; far apart, the lines between are folded', () => {
  const a = Array.from({ length: 30 }, (_, i) => `l${i}`);
  const near = [...a];
  near[5] = 'X';
  near[11] = 'Y'; // 5 unchanged between: within two contexts
  eq(lineDiff(a.join('\n'), near.join('\n')).hunks.length, 1);
  const far = [...a];
  far[5] = 'X';
  far[20] = 'Y';
  const d = lineDiff(a.join('\n'), far.join('\n'));
  eq(d.hunks.length, 2);
  eq([d.hunks[0].before, d.hunks[1].before, d.after], [2, 8, 6]);
});

test('lineDiff: no change is no hunks, every line folded', () => {
  const d = lineDiff('a\nb\n', 'a\nb\n');
  eq([d.added, d.removed, d.hunks, d.after], [0, 0, [], 2]);
  eq(lineDiff('', '').hunks, []);
});

test('lineDiff: each line carries its old and new numbers', () => {
  const d = lineDiff('a\nb\nc\n', 'a\nB\nc\nd\n');
  eq(d.hunks[0].lines.map(l => [l.op, l.old ?? null, l.new ?? null]), [
    ['same', 1, 1], ['del', 2, null], ['add', null, 2], ['same', 3, 3], ['add', null, 4],
  ]);
});

test('lineDiff: the section is the nearest heading above the change, a removed heading not counted', () => {
  const a = '## One\nx\n## Two\ny\nz\n';
  eq(lineDiff(a, a.replace('y\n', 'Y\n')).hunks[0].section, 'Two');
  eq(lineDiff('intro\nx\n', 'intro\nX\n').hunks[0].section, '');
  eq(lineDiff('#hashtag\nx\n', '#hashtag\nX\n').hunks[0].section, '', 'a # without a space is not a heading');
  // A heading removed in the first hunk is not the section of the second.
  const long = ['## A', ...Array.from({ length: 12 }, (_, i) => `p${i}`), 'q'];
  const b = ['## B', ...long.slice(1, -1), 'Q'];
  const d = lineDiff(long.join('\n'), b.join('\n'));
  eq(d.hunks.map(x => x.section), ['', 'B']);
});

test('lineDiff: sections false names none; a function names them from a line', () => {
  const a = '## One\nx\n';
  eq(lineDiff(a, '## One\nX\n', { sections: false }).hunks[0].section, '');
  const group = l => (l.startsWith('[') ? l.slice(1, -1) : null);
  eq(lineDiff('[What you said]\nx\n', '[What you said]\nX\n', { sections: group }).hunks[0].section, 'What you said');
});

test('lineDiff: context sets how many unchanged lines show', () => {
  const a = 'a\nb\nc\nd\ne\n';
  const d = lineDiff(a, a.replace('c\n', 'C\n'), { context: 1 });
  eq(ops(d.hunks[0]), 'sb|dc|aC|sd');
  eq([d.hunks[0].before, d.after], [1, 1]);
});

test('diffBox: head, why, then the lines with signs, struck removals and folds', () => {
  const box = diffBox({
    head: 'Changed since you confirmed it: 1 line',
    why: h('span', null, 'Why: ', h('a', { href: '#DCSN1' }, 'DCSN1')),
    a: 'a\nb\nc\nd\ne\nf\ng\nh\ni\n',
    b: 'a\nb\nc\nd\nE\nf\ng\nh\ni\n',
  });
  fixture().append(box);
  eq([box.tagName, box.className], ['SECTION', 'kit-diff']);
  eq(box.getAttribute('aria-label'), 'Changed since you confirmed it: 1 line');
  eq([...box.children].map(c => c.className), ['kit-diff-head', 'kit-diff-why', 'kit-diff-lines']);
  eq(text(box.querySelector('.kit-diff-why')), 'Why: DCSN1');
  assert(box.querySelector('.kit-diff-why a[href="#DCSN1"]'), 'the why keeps its link');
  eq(rows(box), [
    'kit-fold:1 line unchanged',
    'kit-dl same:/b', 'kit-dl same:/c', 'kit-dl same:/d',
    'kit-dl del:−/e', 'kit-dl add:+/E',
    'kit-dl same:/f', 'kit-dl same:/g', 'kit-dl same:/h',
    'kit-fold:1 line unchanged',
  ]);
  const del = box.querySelector('.kit-dl.del .kit-t');
  eq(getComputedStyle(del).textDecorationLine, 'line-through');
  assert(getComputedStyle(box.querySelector('.kit-dl.add')).backgroundColor !== getComputedStyle(box.querySelector('.kit-dl.same')).backgroundColor, 'an added line is tinted');
});

test('diffBox: a why string; no head or why when not given', () => {
  const withWhy = diffBox({ why: 'Why: your note', a: 'a\n', b: 'b\n' });
  eq([...withWhy.children].map(c => c.className), ['kit-diff-why', 'kit-diff-lines']);
  eq(text(withWhy.querySelector('.kit-diff-why')), 'Why: your note');
  eq([...diffBox({ a: 'a\n', b: 'b\n' }).children].map(c => c.className), ['kit-diff-lines']);
});

test('diffBox: folds before, between and after hunks, each hunk under its section heading', () => {
  const a = ['# T', '## One', ...Array.from({ length: 12 }, (_, i) => `x${i}`), '## Two', ...Array.from({ length: 12 }, (_, i) => `y${i}`)];
  const b = [...a];
  b[7] = 'X5';
  b[20] = 'Y5';
  const box = diffBox({ a: a.join('\n'), b: b.join('\n') });
  const got = rows(box).filter(r => !r.startsWith('kit-dl'));
  eq(got, [
    'kit-fold:4 lines unchanged',
    'kit-diff-section:One',
    'kit-fold:6 lines unchanged',
    'kit-diff-section:Two',
    'kit-fold:3 lines unchanged',
  ]);
});

test('diffBox: a diff given whole is drawn as it is', () => {
  const d = lineDiff('a\n', 'b\n');
  eq(rows(diffBox({ diff: d })), ['kit-dl del:−/a', 'kit-dl add:+/b']);
});

test('diffBox: no change says so in the tool\'s words, and is nothing without them', () => {
  const box = diffBox({ a: 'same\n', b: 'same\n', numbers: true, none: 'No change: the file stays as it is.' });
  eq(box.className, 'kit-diff numbered');
  eq([...box.children].map(c => c.className), ['kit-diff-none']);
  eq(text(box), 'No change: the file stays as it is.');
  eq(diffBox({ a: 'same\n', b: 'same\n' }), null);
});

test('diffBox: numbers draw the old and new columns, and the section line gives the lines', () => {
  const a = '# Rules\n\n- Always run the suite.\n- Use worktrees.\n';
  const b = '# Rules\n\n- Run the suite for code.\n- Use worktrees.\n';
  const off = diffBox({ a, b });
  assert(!off.querySelector('.kit-n'), 'numbers are off by default');
  eq(off.querySelector('.kit-dl').children.length, 2);
  const on = diffBox({ a, b, numbers: true });
  eq(on.className, 'kit-diff numbered');
  eq(rows(on), [
    'kit-diff-section:@@ lines 1–4 · Rules',
    'kit-dl same:1/1//# Rules',
    'kit-dl same:2/2//',
    'kit-dl del:3//−/- Always run the suite.',
    'kit-dl add:/3/+/- Run the suite for code.',
    'kit-dl same:4/4//- Use worktrees.',
  ]);
  eq(rows(diffBox({ a: 'a\n', b: 'b\n', numbers: true }))[0], 'kit-diff-section:@@ line 1');
});

test('diffBox: a marked old line is drawn with ! and the mark class', () => {
  const box = diffBox({ a: 'a\nb\nc\n', b: 'a\nB\nc\n', numbers: true, marks: new Set([2, 3]) });
  eq(rows(box).slice(1), [
    'kit-dl same:1/1//a',
    'kit-dl del mark:2//!/b',
    'kit-dl add:/2/+/B',
    'kit-dl same:3/3//c',
  ]);
  const plain = diffBox({ a: 'a\n', b: 'b\n' });
  fixture().append(box, plain);
  const mark = getComputedStyle(box.querySelector('.kit-dl.mark')).backgroundColor;
  const del = getComputedStyle(plain.querySelector('.kit-dl.del')).backgroundColor;
  assert(mark !== del, `a marked line has its own tint: ${mark}`);
});

test('diffBox: removed and added text reach a screen reader as del and ins, and a node head still labels the box', () => {
  const head = document.createElement('span');
  head.append('Changed since you approved it: 2 lines');
  const box = diffBox({ head, a: 'a\nb\n', b: 'a\nB\n' });
  fixture().append(box);
  eq(box.querySelector('.kit-dl.del .kit-t').tagName, 'DEL');
  eq(box.querySelector('.kit-dl.add .kit-t').tagName, 'INS');
  eq(box.querySelector('.kit-dl.same .kit-t').tagName, 'SPAN');
  eq(getComputedStyle(box.querySelector('.kit-dl.add .kit-t')).textDecorationLine, 'none');
  eq(box.getAttribute('aria-label'), 'Changed since you approved it: 2 lines');
});
