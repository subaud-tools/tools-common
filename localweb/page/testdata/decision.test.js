import { test, eq, assert, fixture } from './harness.js';
import { decisionCard, optionBlock, evidenceList, callRow } from '/_kit/decision.js';
import { h } from '/_kit/dom.js';

const text = el => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
const kids = el => [...el.children].map(c => c.className);

const options = [
  { id: 'A', title: 'Pin Node 22', includes: 'The `.nvmrc` file.', pullsIn: 'Nothing new.', recommended: true },
  { id: 'B', title: 'Not yet', pullsIn: 'A **slower** build until then.', chosen: true },
];

test('decisionCard: head, question, then the problem, the options and the reasoning in order', () => {
  const card = decisionCard({
    id: 'F2',
    edge: 'signal',
    head: { crumb: 'galley · fix plan', state: 'needs you', key: 'muda/galley/F2' },
    question: 'Should galley pin its Node version?',
    example: 'Today a runner picks **any** Node.',
    options,
    recommendation: { option: 'A', why: 'Saves *4 minutes* a build.' },
    next: 'A pull request opens.',
    calls: [{ name: 'Cache key', took: 'The lockfile hash', instead: 'A weekly key', why: 'It changes only when deps do.' }],
    evidence: [{ text: 'Cold install', source: 'run 123' }, { text: 'Cached', source: 'https://example.com/run/124' }],
  });
  eq([card.tagName, card.id, card.dataset.card], ['SECTION', 'card-F2', 'F2']);
  eq(card.className, 'kit-card kit-decision edge-signal');
  const head = card.querySelector('.kit-card-head');
  eq(text(head.querySelector('.kit-card-crumb')), 'galley · fix plan');
  eq([head.querySelector('.kit-pill').className, text(head.querySelector('.kit-pill'))], ['kit-pill kit-badge', 'needs you']);
  eq(text(head.querySelector('.kit-card-key')), 'muda/galley/F2');
  eq(text(card.querySelector('h2.kit-decision-title')), 'Should galley pin its Node version?');
  const body = card.querySelector('.kit-card-body');
  eq(kids(body), [
    'kit-decision-example kit-md',
    'kit-options',
    'kit-rec',
    'kit-next-step',
    'kit-calls',
    'kit-fold kit-evidence-fold',
  ]);
  eq(body.querySelector('.kit-decision-example strong').textContent, 'any');
  eq(body.querySelector('.kit-options').style.getPropertyValue('--option-count').trim(), '2');
  const rec = body.querySelector('.kit-rec');
  eq(text(rec.querySelector('.kit-label')), 'Recommendation');
  eq(text(rec.querySelector('p')), 'Option A · Saves 4 minutes a build.');
  eq(rec.querySelector('p em').textContent, '4 minutes');
  eq(text(body.querySelector('.kit-next-step .kit-label')), 'What happens next');
  const fold = body.querySelector('.kit-evidence-fold');
  eq([fold.tagName, fold.open], ['DETAILS', false]);
  eq(text(fold.querySelector('summary')), 'Evidence · 2');
});

test('decisionCard: a Node is drawn as it is, so a caller keeps its plain text', () => {
  const card = decisionCard({
    id: 'D1',
    question: 'Q?',
    example: document.createTextNode('Plain **not bold**'),
    options: [{ id: 'A', title: 'One', pullsIn: document.createTextNode('x') }],
    recommendation: { option: 'A', why: document.createTextNode('because *so*') },
  });
  const ex = card.querySelector('.kit-decision-example');
  eq([ex.tagName, ex.textContent], ['P', 'Plain **not bold**']);
  eq(text(card.querySelector('.kit-rec p')), 'Option A · because *so*');
  assert(!card.querySelector('.kit-rec em'), 'not markdown');
});

test('decisionCard: raw HTML in its text shows as text', () => {
  const card = decisionCard({ id: 'D1', question: 'Q?', example: '<img src=x onerror=alert(1)>', options: [], recommendation: { option: 'A' } });
  assert(!card.querySelector('img'), 'no element from the text');
  assert(text(card.querySelector('.kit-decision-example')).includes('<img'), 'shown as text');
});

test('decisionCard: lead above the example, notes between it and the options, then the caller\'s parts', () => {
  const mk = cls => h('p', { class: cls });
  const card = decisionCard({
    id: 'D1',
    head: { crumb: 'D1', state: h('span', { class: 'kit-pill kit-badge t-you' }, 'open'), after: [mk('after-state')] },
    question: 'Q?',
    lead: [mk('testing'), null],
    example: 'e',
    notes: [mk('reopen'), false, mk('revision')],
    options,
    bar: mk('choose-bar'),
    since: [{ at: '2026-11-03', text: 'Pull request #12 opened' }, { at: '2026-11-05', text: 'Merged' }],
    recommendation: { option: 'A', why: 'w', evidence: [{ text: 'measured', source: 'run 1' }] },
    after: [mk('deps')],
    questions: [{ label: 'Explain this more', run() {} }],
    foot: [mk('note-line')],
    class: 'extra',
  });
  eq(card.className, 'kit-card kit-decision extra');
  const head = card.querySelector('.kit-card-head');
  eq(kids(head), ['kit-card-crumb', 'kit-pill kit-badge t-you', 'after-state']);
  eq(kids(card.querySelector('.kit-card-body')), [
    'testing', 'kit-decision-example kit-md', 'reopen', 'revision', 'kit-options', 'choose-bar', 'kit-since', 'kit-rec', 'deps', 'kit-btns', 'note-line',
  ]);
  const since = card.querySelector('.kit-since');
  eq(text(since.querySelector('.kit-label')), 'Since then');
  eq([...since.querySelectorAll('li')].map(text), ['2026-11-03 Pull request #12 opened', '2026-11-05 Merged']);
  // The recommendation's own evidence is listed under it, unfolded.
  eq(text(card.querySelector('.kit-rec .kit-evidence li')), 'measured run 1');
});

test('decisionCard: readOnly leaves out every control', () => {
  let pressed = 0;
  const card = decisionCard({
    id: 'D1',
    question: 'Q?',
    options: [{ ...options[0], actions: [{ label: 'Choose A', run: () => pressed++ }] }],
    bar: h('div', { class: 'choose-bar' }),
    recommendation: { option: 'A' },
    calls: [{ took: 't', instead: 'i', why: 'w', onReverse: () => pressed++ }],
    questions: [{ label: 'Explain this more', run() {} }],
    foot: [h('div', { class: 'note-line' })],
    readOnly: true,
  });
  assert(!card.querySelector('button'), 'no button');
  assert(!card.querySelector('.choose-bar, .note-line'), 'no bar or foot');
  eq(text(card.querySelector('.kit-option-title')), 'Pin Node 22');
});

test('optionBlock: its head, pills, visual, what it needs and includes, then its actions', () => {
  let ran = 0;
  const visual = h('figure', { class: 'shot' });
  const el = optionBlock({ id: 'A', title: 'Pin Node 22', includes: 'The `.nvmrc`.', pullsIn: 'Nothing.', recommended: true, chosen: true, picked: true, visual, actions: [{ label: 'Choose A', fill: true, run: () => ran++ }] });
  eq([el.className, el.dataset.option], ['kit-option chosen picked', 'A']);
  const head = el.querySelector('.kit-option-head');
  eq([...head.children].map(c => [c.className, c.textContent]), [
    ['kit-option-id', 'A'], ['kit-option-title', 'Pin Node 22'], ['kit-pill', 'recommended'], ['kit-pill ok', 'chosen'],
  ]);
  assert(el.children[1] === visual, 'the visual under the head');
  const facts = el.querySelector('.kit-option-facts');
  eq(text(facts.querySelector('.kit-label')), 'Also needs');
  eq(text(facts.querySelector('.kit-md')), 'Nothing.');
  eq(text(facts.querySelector('details summary')), 'What it includes');
  eq(facts.querySelector('details code').textContent, '.nvmrc');
  el.querySelector('.kit-btns button').click();
  eq(ran, 1);
});

test('optionBlock: a choice that was yours, and several visuals', () => {
  const el = optionBlock({ id: 'B', title: 'T', pullsIn: 'p', was: true, visual: [h('i'), h('b')] });
  eq(el.className, 'kit-option');
  eq(text(el.querySelector('.kit-was')), 'was your choice');
  eq([el.children[1].tagName, el.children[2].tagName], ['I', 'B']);
  assert(!el.querySelector('.kit-btns'), 'no actions, no row');
  assert(!el.querySelector('details'), 'no includes, no fold');
});

test('evidenceList: a web source is a link, the caller draws others, else code; output folds', () => {
  const opened = [];
  const ul = evidenceList([
    { text: 'Cold install', source: 'https://example.com/run/1' },
    { text: 'The transcript', source: 'documents/call.md', output: 'line one\nline two' },
    { text: 'Job log', source: 'ci.yml:12' },
  ], { source: s => (s.startsWith('documents/') ? h('a', { class: 'mine', onclick: () => opened.push(s) }, s) : null) });
  eq(ul.className, 'kit-evidence');
  const lis = ul.querySelectorAll('li');
  const a = lis[0].querySelector('a');
  eq([a.href, a.target, a.rel, a.textContent], ['https://example.com/run/1', '_blank', 'noreferrer', 'https://example.com/run/1']);
  eq(lis[1].querySelector('a.mine').textContent, 'documents/call.md');
  eq(text(lis[1].querySelector('details summary')), 'output');
  eq(lis[1].querySelector('pre.kit-output').textContent, 'line one\nline two');
  eq([lis[2].querySelector('code.kit-source').textContent], ['ci.yml:12']);
  eq(evidenceList([]), null);
  eq(evidenceList(undefined), null);
});

test('evidenceList: an entry with a url links its source words there', () => {
  const a = evidenceList([{ text: 'Run', source: 'run 42', url: 'https://example.com/42' }]).querySelector('a');
  eq([a.getAttribute('href'), a.textContent], ['https://example.com/42', 'run 42']);
});

test('callRow: what it took, instead and why, with Reverse', () => {
  let reversed = 0;
  const row = callRow({ name: 'Cache key', took: 'The lockfile hash', instead: 'A weekly key', why: 'Deps change *rarely*.', onReverse: () => reversed++, actions: [{ label: 'Explain this more', run() {} }] });
  eq(row.className, 'kit-call');
  eq(text(row.querySelector('.kit-call-name')), 'Cache key');
  eq([...row.querySelectorAll('.kit-call-facts .kit-label')].map(text), ['Took', 'Instead of', 'Why']);
  eq(row.querySelector('.kit-call-facts em').textContent, 'rarely');
  const bs = [...row.querySelectorAll('.kit-btns button')];
  eq(bs.map(b => b.textContent), ['Reverse', 'Explain this more']);
  bs[0].click();
  eq(reversed, 1);
});

test('callRow: a reversed call says so and cannot be reversed again; readOnly has no button', () => {
  const row = callRow({ took: 't', instead: 'i', why: 'w', reversed: true, onReverse() {} });
  eq(row.className, 'kit-call reversed');
  const b = row.querySelector('button');
  eq([b.textContent, b.disabled], ['Reversed', true]);
  assert(!callRow({ took: 't', instead: 'i', why: 'w', readOnly: true, onReverse() {} }).querySelector('button'), 'no button');
});

test('decisionCard: calls are listed under a label, each a callRow', () => {
  fixture().append(decisionCard({
    id: 'D1', question: 'Q?', options: [], recommendation: { option: 'A' },
    calls: [{ took: 'a', instead: 'b', why: 'c' }, { took: 'd', instead: 'e', why: 'f', reversed: true }],
  }));
  const calls = document.querySelector('#fx .kit-calls');
  eq(text(calls.querySelector(':scope > .kit-label')), "The agent's calls");
  eq(calls.querySelectorAll('.kit-call').length, 2);
});
