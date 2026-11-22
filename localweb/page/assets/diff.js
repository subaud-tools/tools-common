// diff.js: what changed between two texts, line by line, and the box that
// draws it (from diazo's internal/record/diff.go LineDiff and web/docs.ts
// diffView; the numbers and marks from sift's file diff). The diff is
// computed in the browser, so a page can diff a version the server has not
// seen. Styled by kit.css (.kit-diff).
import { h } from './dom.js';

// cells caps the table the line diff fills (old by new lines, after the
// common start and end are cut); a bigger change is shown as every line
// removed and added.
const CELLS = 4_000_000;

// headingOf is a markdown heading's text, or null.
function headingOf(line) {
  const t = line.replace(/^#+/, '');
  if (t === line || !t.startsWith(' ')) return null;
  return t.trim();
}

// lines splits s into its lines, without a last empty one.
function lines(s) {
  if (!s) return [];
  return (s.endsWith('\n') ? s.slice(0, -1) : s).split('\n');
}

// middle is the ops of a and b that share no first or last line: the longest
// common subsequence kept, the rest removed then added.
function middle(a, b, out) {
  if (a.length * b.length > CELLS) {
    for (const l of a) out.push({ op: 'del', text: l });
    for (const l of b) out.push({ op: 'add', text: l });
    return;
  }
  // lcs[i*w+j] is the longest common subsequence of a[i:] and b[j:].
  const w = b.length + 1;
  const lcs = new Int32Array((a.length + 1) * w);
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      lcs[i * w + j] = a[i] === b[j]
        ? lcs[(i + 1) * w + j + 1] + 1
        : Math.max(lcs[(i + 1) * w + j], lcs[i * w + j + 1]);
    }
  }
  let i = 0;
  let j = 0;
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) {
      out.push({ op: 'same', text: a[i] });
      i++;
      j++;
    } else if (j === b.length || (i < a.length && lcs[(i + 1) * w + j] >= lcs[i * w + j + 1])) {
      out.push({ op: 'del', text: a[i] });
      i++;
    } else {
      out.push({ op: 'add', text: b[j] });
      j++;
    }
  }
}

// diffOps is b against a as one op per line, each with its old and new
// line numbers.
function diffOps(a, b) {
  let p = 0;
  while (p < a.length && p < b.length && a[p] === b[p]) p++;
  let q = 0;
  while (q < a.length - p && q < b.length - p && a[a.length - 1 - q] === b[b.length - 1 - q]) q++;
  const out = a.slice(0, p).map(text => ({ op: 'same', text }));
  middle(a.slice(p, a.length - q), b.slice(p, b.length - q), out);
  for (const text of a.slice(a.length - q)) out.push({ op: 'same', text });
  let o = 0;
  let n = 0;
  for (const l of out) {
    if (l.op !== 'add') l.old = ++o;
    if (l.op !== 'del') l.new = ++n;
  }
  return out;
}

// lineDiff is the line diff of b against a: each run of changes with context
// unchanged lines either side, and the unchanged lines folded before each
// run and after the last. A run's section is the nearest heading above it
// (markdown's by default; sections false names none, a function names one
// from a line, or returns null).
export function lineDiff(a, b, { context = 3, sections } = {}) {
  const head = sections === false ? () => null : typeof sections === 'function' ? sections : headingOf;
  const ops = diffOps(lines(a), lines(b));
  const d = { added: 0, removed: 0, hunks: [], after: 0 };
  let heading = '';
  let last = -1; // the index of the last op in a hunk
  for (let i = 0; i < ops.length;) {
    if (ops[i].op === 'same') {
      heading = head(ops[i].text) ?? heading;
      i++;
      continue;
    }
    const start = Math.max(i - context, last + 1);
    // The run goes on until more unchanged lines follow it than two hunks'
    // context would show.
    let end = i;
    for (let j = i; j < ops.length && j - end <= 2 * context; j++) {
      if (ops[j].op !== 'same') end = j;
    }
    const stop = Math.min(end + context, ops.length - 1);
    // The section is the last heading before the change, from the last
    // before start on.
    let section = heading;
    for (const o of ops.slice(start, i)) section = head(o.text) ?? section;
    const hunk = { section, before: start - (last + 1), lines: [] };
    for (const o of ops.slice(start, stop + 1)) {
      if (o.op === 'add') d.added++;
      if (o.op === 'del') d.removed++;
      if (o.op !== 'del') heading = head(o.text) ?? heading;
      hunk.lines.push(o);
    }
    d.hunks.push(hunk);
    last = stop;
    i = stop + 1;
  }
  d.after = ops.length - (last + 1);
  return d;
}

const SIGN = { same: '', del: '−', add: '+' };

const fold = n => (n ? h('div', { class: 'kit-fold' }, `${n} line${n === 1 ? '' : 's'} unchanged`) : null);

// sectionLine is a hunk's heading: with numbers, the lines it spans (the old
// file's, or the new one's for a hunk of only added lines) and its section.
function sectionLine(hk, numbers) {
  let label = hk.section || '';
  if (numbers) {
    const olds = hk.lines.filter(l => l.old !== undefined);
    const ns = olds.length ? olds.map(l => l.old) : hk.lines.map(l => l.new);
    const [from, to] = [ns[0], ns.at(-1)];
    label = `@@ ${from === to ? `line ${from}` : `lines ${from}–${to}`}${label ? ` · ${label}` : ''}`;
  }
  return label ? h('div', { class: 'kit-diff-section' }, label) : null;
}

// diffBox is the diff drawn: the tool's head and why, then each hunk under
// its section with the folds counted. With no change it is the tool's none
// words, or null without them.
export function diffBox({ head, why, diff, a, b, numbers = false, marks, none } = {}) {
  const d = diff ?? lineDiff(a ?? '', b ?? '');
  const hunks = d.hunks ?? [];
  if (!hunks.length && !none) return null;
  const row = l => {
    const mark = l.op === 'del' && !!marks?.has(l.old);
    return h(
      'div',
      { class: `kit-dl ${l.op}${mark ? ' mark' : ''}` },
      numbers ? h('span', { class: 'kit-n', 'aria-hidden': 'true' }, l.old ? String(l.old) : '') : null,
      numbers ? h('span', { class: 'kit-n', 'aria-hidden': 'true' }, l.new ? String(l.new) : '') : null,
      h('span', { class: 'kit-sign', 'aria-hidden': 'true' }, mark ? '!' : SIGN[l.op]),
      h('span', { class: 'kit-t' }, l.text),
    );
  };
  return h(
    'section',
    { class: `kit-diff${numbers ? ' numbered' : ''}`, 'aria-label': typeof head === 'string' ? head : undefined },
    head ? h('div', { class: 'kit-diff-head' }, head) : null,
    why ? h('div', { class: 'kit-diff-why' }, why) : null,
    hunks.length
      ? h(
        'div',
        { class: 'kit-diff-lines' },
        hunks.flatMap(hk => [fold(hk.before), sectionLine(hk, numbers), ...(hk.lines ?? []).map(row)]),
        fold(d.after),
      )
      : h('div', { class: 'kit-diff-none' }, none),
  );
}
