import { test, eq, assert, fixture } from './harness.js';
import { h } from '/_kit/dom.js';
import { stagePill, stageTrack, workingLine, waitBadges } from '/_kit/track.js';

test('stagePill: its label with its count, as a plain step when it opens nothing', () => {
  const p = stagePill({ key: 'findings', label: 'Findings', count: '3 of 5', state: 'flagged' });
  eq([p.tagName, p.className, p.dataset.stage, p.textContent], ['SPAN', 'kit-stage flagged plain', 'findings', 'Findings · 3 of 5']);
});

test('stagePill: done reads with a tick', () => {
  eq(stagePill({ key: 'a', label: 'Baseline', state: 'done' }).textContent, '✓ Baseline');
});

test('stagePill: the stage you are at says so', () => {
  eq(stagePill({ key: 'a', label: 'Fix', state: 'now' }).getAttribute('aria-current'), 'step');
  assert(!stagePill({ key: 'a', label: 'Fix', state: '' }).hasAttribute('aria-current'), 'only now');
});

test('stagePill: live is a class of its own', () => {
  assert(stagePill({ key: 'a', label: 'Fix', state: 'now', live: true }).classList.contains('live'), 'live');
});

test('stagePill: another\'s move is a class of its own', () => {
  assert(stagePill({ key: 'a', label: 'Fix', state: 'now', other: true }).classList.contains('other'), 'other');
  assert(!stagePill({ key: 'a', label: 'Fix', state: 'now' }).classList.contains('other'), 'only when set');
});

test('stagePill: with open it is a button that opens', () => {
  let opened = 0;
  const p = stagePill({ key: 'a', label: 'Fix', state: '' }, () => opened++);
  eq([p.tagName, p.type], ['BUTTON', 'button']);
  assert(!p.classList.contains('plain'), 'not plain');
  p.click();
  eq(opened, 1);
});

const detail = { title: 'Open', rows: [{ id: 'F1', text: 'A cache', meta: 'measured' }, { text: 'No id' }], note: 'And the rest.' };

test('stagePill: detail adds an ⓘ with its tip, in one grid of three cells', () => {
  const box = stagePill({ key: 'a', label: 'Fix', state: '', detail });
  fixture().append(box);
  eq(box.className, 'kit-tip-at');
  const more = box.querySelector('.kit-stage .kit-more');
  eq([more.getAttribute('role'), more.getAttribute('aria-label')], ['button', 'More on Fix']);
  const tip = box.querySelector('.kit-tip');
  eq([tip.dataset.tip, tip.querySelector('b').textContent, tip.querySelector('.kit-tip-note').textContent], ['a', 'Open', 'And the rest.']);
  eq([...tip.querySelectorAll('.kit-tip-row')].map(r => [...r.children].map(c => c.textContent)), [['F1', 'A cache', 'measured'], ['', 'No id', '']]);
  eq(getComputedStyle(tip.querySelector('.kit-tip-rows')).display, 'grid');
});

test('stagePill: a press on the ⓘ shows the tip and does not open the stage', () => {
  let opened = 0;
  const box = stagePill({ key: 'a', label: 'Fix', state: '', detail }, () => opened++);
  fixture().append(box);
  box.querySelector('.kit-more').click();
  assert(box.classList.contains('show'), 'shown');
  eq(opened, 0);
});

const segsOf = t => [...t.querySelector('.kit-stages-bar').children];
const boxOf = el => el.getBoundingClientRect();

test('stageTrack: its stages in one joined bar with no arrows, each opening what it names', () => {
  const got = [];
  const t = stageTrack({
    label: 'Where this job stands',
    open: id => got.push(id),
    stages: [
      { key: 'a', label: 'Baseline', state: 'done', opens: 'baseline' },
      { key: 'b', label: 'Findings', state: 'now', opens: 'findings' },
      { key: 'c', label: 'Verify', state: '' },
    ],
  });
  eq([t.tagName, t.className, t.getAttribute('aria-label')], ['NAV', 'kit-stages', 'Where this job stands']);
  assert(!t.querySelector('.kit-arrow'), 'no arrows');
  eq([...t.children].map(c => c.className), ['kit-stages-bar']);
  const segs = segsOf(t);
  eq(segs.map(c => c.textContent), ['✓ Baseline', 'Findings', 'Verify']);
  segs[1].click();
  eq(got, ['findings']);
  eq(segs[1].getAttribute('aria-current'), 'step');
  assert(segs[2].classList.contains('plain'), 'one that opens nothing is plain');
});

test('stageTrack: each state\'s class on its segment', () => {
  const t = stageTrack({ stages: [
    { key: 'a', label: 'A', state: 'done' },
    { key: 'b', label: 'B', state: 'now', live: true },
    { key: 'c', label: 'C', state: 'now', other: true },
    { key: 'd', label: 'D', state: 'flagged' },
    { key: 'e', label: 'E', state: '' },
  ] });
  eq(segsOf(t).map(s => s.className), ['kit-stage done plain', 'kit-stage now plain live', 'kit-stage now plain other', 'kit-stage flagged plain', 'kit-stage plain']);
});

test('stageTrack: the segments share one row and touch, with one radius at the ends', () => {
  const fx = fixture();
  fx.style.width = '900px';
  const t = stageTrack({ stages: [
    { key: 'a', label: 'Start', state: 'done' },
    { key: 'b', label: 'Build', count: '6 of 8', state: 'now', live: true, detail: { title: 'Build' } },
    { key: 'c', label: 'Sign off', state: '' },
  ] });
  fx.append(t);
  const segs = segsOf(t).map(s => s.matches('.kit-stage') ? s : s.querySelector('.kit-stage'));
  const bs = segs.map(boxOf);
  for (let i = 1; i < bs.length; i++) {
    eq(bs[i].top, bs[0].top, `segment ${i} on the first row`);
    assert(Math.abs(bs[i].left - bs[i - 1].right) <= 1.01, `segment ${i} touches the one before: ${bs[i - 1].right} → ${bs[i].left}`);
  }
  const cs = segs.map(s => getComputedStyle(s));
  assert(cs[0].borderTopLeftRadius !== '0px' && cs[0].borderTopRightRadius === '0px', 'first rounds its left');
  eq([cs[1].borderTopLeftRadius, cs[1].borderTopRightRadius], ['0px', '0px'], 'middle is square');
  assert(cs[2].borderTopRightRadius !== '0px' && cs[2].borderTopLeftRadius === '0px', 'last rounds its right');
  fx.style.width = '';
});

test('stageTrack: a parked track says so in its class, and greys its segments', () => {
  const fx = fixture();
  const t = stageTrack({ stages: [{ key: 'a', label: 'A', state: 'now' }], parked: true });
  fx.append(t);
  eq(t.className, 'kit-stages parked');
  const cs = getComputedStyle(t.querySelector('.kit-stage'));
  eq([cs.opacity, cs.filter], ['0.55', 'grayscale(1)']);
});

test('stageTrack: a stage the caller built takes its place in the bar, and after follows it after a gap', () => {
  const fx = fixture();
  const tab = document.createElement('button');
  tab.className = 'kit-stage';
  tab.textContent = 'Tab';
  const badge = document.createElement('span');
  badge.textContent = 'badge';
  const t = stageTrack({ stages: [{ key: 'a', label: 'A', state: '' }, tab], after: [badge, null] });
  fx.append(t);
  eq(t.children.length, 2);
  const bar = t.children[0];
  assert(bar.children.length === 2 && bar.children[1] === tab && t.children[1] === badge, 'in order');
  assert(boxOf(badge).left - boxOf(bar).right >= 6, 'after sits apart from the bar');
});

test('stageTrack: on a narrow page the bar wraps onto a second line, its borders kept', () => {
  const fx = fixture();
  fx.style.width = '220px';
  const t = stageTrack({ stages: ['Start', 'Understanding', 'Decisions', 'Look', 'Spec', 'Plans'].map(l => ({ key: l, label: l, state: 'done' })) });
  fx.append(t);
  const segs = segsOf(t);
  const tops = new Set(segs.map(s => Math.round(boxOf(s).top)));
  assert(tops.size > 1, 'more than one line');
  for (const s of segs) {
    const cs = getComputedStyle(s);
    eq([cs.borderTopWidth, cs.borderBottomWidth, cs.borderLeftWidth, cs.borderRightWidth], ['1px', '1px', '1px', '1px']);
  }
  assert(boxOf(t).right <= boxOf(fx).right + 0.5, 'inside its column');
  fx.style.width = '';
});

test('stageTrack: in a band wider than a phone, a track longer than the band scrolls sideways on one row', () => {
  assert(innerWidth > 640, `the window is wider than a phone: ${innerWidth}`);
  const fx = fixture();
  fx.style.width = '600px';
  const t = stageTrack({ stages: ['Start', 'Understanding', 'Decisions', 'Look', 'Spec', 'Plans', 'Build · 6 of 8', 'Sign off', 'Wrap up'].map(l => ({ key: l, label: l, state: 'done' })) });
  fx.append(h('header', { class: 'kit-band' }, h('div', { class: 'kit-band-under' }, t)));
  assert(t.scrollWidth > t.clientWidth, `it scrolls: ${t.scrollWidth} > ${t.clientWidth}`);
  const segs = segsOf(t);
  eq(new Set(segs.map(s => Math.round(boxOf(s).top))).size, 1, 'all on one row');
  t.scrollLeft = t.scrollWidth;
  const last = boxOf(segs[segs.length - 1]);
  const nav = boxOf(t);
  assert(last.right <= nav.right + 1 && last.left >= nav.left - 1, 'the last segment scrolls into view');
  fx.style.width = '';
});

test('waitBadges: none, nothing', () => {
  eq(waitBadges([]), []);
});

test('waitBadges: a wait on you comes first, in your colours', () => {
  const [first, more] = waitBadges([{ text: 'waiting on Alex · 1', who: 'Alex' }, { text: 'waiting on you · 2', who: 'you' }]);
  eq([first.className, first.dataset.badge, first.dataset.who, first.textContent], ['kit-pill kit-badge t-you', 'wait', 'you', 'waiting on you · 2']);
  eq(more.querySelector('.kit-more-waits').textContent, 'and 1 more');
});

test('waitBadges: anyone else is in the wait colours, and one wait has no more', () => {
  const all = waitBadges([{ text: 'waiting on Alex · 1', who: 'Alex' }]);
  eq(all.length, 1);
  eq(all[0].className, 'kit-pill kit-badge t-wait');
});

test('waitBadges: the rest sit in a tip that drops the repeated words', () => {
  const [, more] = waitBadges([{ text: 'waiting on you · 2', who: 'you' }, { text: 'waiting on Alex · 1', who: 'Alex' }]);
  fixture().append(more);
  eq([more.className, more.dataset.badge], ['kit-tip-at kit-waits-at', 'wait-more']);
  const tip = more.querySelector('.kit-tip');
  eq([tip.dataset.tip, tip.querySelector('b').textContent, tip.querySelector('.kit-tip-row').textContent], ['waits', 'Also waiting on', 'Alex · 1']);
  more.querySelector('.kit-more-waits').click();
  assert(more.classList.contains('show'), 'a press shows it');
});

test('workingLine: the line with its pulsing dot, nothing with no text', () => {
  const p = workingLine({ text: 'Writing the plan' });
  eq([p.tagName, p.className, p.getAttribute('role'), p.hasAttribute('tabindex'), p.children.length], ['P', 'kit-working', 'status', false, 2]);
  eq(p.firstChild.getAttribute('aria-hidden'), 'true');
  eq([p.lastChild.className, p.lastChild.textContent], ['kit-agent-text', 'Writing the plan']);
  eq(workingLine({ text: '' }), null);
});

test('workingLine: a slot keeps its height with nothing in it', () => {
  const s = workingLine({ text: '', slot: true });
  fixture().append(s);
  eq([s.className, s.children.length, getComputedStyle(s).height], ['kit-agent-slot', 0, '28px']);
});

test('workingLine: in a slot a long line shows in full in a tip', () => {
  const s = workingLine({ text: 'Writing the plan', slot: true });
  fixture().append(s);
  eq(s.className, 'kit-agent-slot kit-tip-at');
  const line = s.querySelector('.kit-working');
  eq(line.getAttribute('tabindex'), '0');
  eq(s.querySelector('.kit-tip').textContent, 'Writing the plan');
  line.click();
  assert(s.classList.contains('show'), 'a press shows it');
});

test('workingLine: a message not settled yet reads as pending', () => {
  eq(workingLine({ text: 'sent', pending: true, slot: true }).querySelector('.kit-working').className, 'kit-working kit-pending');
});
