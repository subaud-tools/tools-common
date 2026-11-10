import { test, eq, assert, fixture } from './harness.js';
import { recordPage, recordCard, readOnly, linkIds, idPieces, searchHits, embeddedData } from '/_kit/record.js';
import { decisionCard } from '/_kit/decision.js';
import { h } from '/_kit/dom.js';

const text = el => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
const tick = (ms = 30) => new Promise(r => setTimeout(r, ms));

test('idPieces: the ids it knows, each its own piece', () => {
  eq(idPieces('See DCSN1 and DCSN9, then TASK2.', new Set(['DCSN1', 'TASK2'])), ['See ', { id: 'DCSN1' }, ' and DCSN9, then ', { id: 'TASK2' }, '.']);
  eq(idPieces('nothing here', new Set(['F1'])), ['nothing here']);
  eq(idPieces('F2 first', new Set(['F2'])), [{ id: 'F2' }, ' first']);
});

test('searchHits: any case, the words around the first match, nothing for an empty query', () => {
  const entries = [
    { tab: 'a', id: 'x', label: 'X', text: 'The cache misses on every build' },
    { tab: 'b', id: 'y', label: 'Y', text: 'nothing' },
  ];
  eq(searchHits(entries, 'CACHE'), [{ tab: 'a', id: 'x', label: 'X', snippet: 'The cache misses on every build' }]);
  eq(searchHits(entries, '  '), []);
  const long = [{ tab: 'a', id: 'x', label: 'X', text: `${'w '.repeat(40)}needle${' z'.repeat(40)}` }];
  const s = searchHits(long, 'needle')[0].snippet;
  assert(s.startsWith('…') && s.endsWith('…') && s.includes('needle'), s);
});

test('linkIds: known ids in text become links, not inside code, links or pre', () => {
  const root = h('div', null, h('p', null, 'See F2 and F9.'), h('code', null, 'F2'), h('a', { href: '#x' }, 'F2'), h('pre', null, 'F2'));
  linkIds(root, new Set(['F2']));
  const links = root.querySelectorAll('a.kit-ref');
  eq(links.length, 1);
  eq([links[0].getAttribute('href'), links[0].textContent], ['#F2', 'F2']);
  eq(text(root.querySelector('p')), 'See F2 and F9.');
  eq(root.querySelector('code').textContent, 'F2');
});

test("linkIds: a card's header keeps its own id as text", () => {
  const root = h('section', { class: 'kit-card' }, h('div', { class: 'kit-card-head' }, h('span', null, 'F2')), h('p', null, 'F2'));
  linkIds(root, new Set(['F2']));
  eq([root.querySelector('.kit-card-head a'), root.querySelectorAll('a').length], [null, 1]);
});

test('linkIds: the caller can draw the link', () => {
  const root = h('p', null, 'about F2');
  linkIds(root, new Set(['F2']), id => h('b', { class: 'mine' }, id));
  eq(root.innerHTML, 'about <b class="mine">F2</b>');
});

test('readOnly: buttons, note lines and text boxes go, and whatever else the caller names', () => {
  const card = h('section', { class: 'kit-card' },
    h('div', { class: 'kit-card-body' },
      h('p', null, 'kept'),
      h('div', { class: 'kit-btns' }, h('button', null, 'x')),
      h('div', { class: 'kit-note-line' }, h('textarea')),
      h('textarea'),
      h('div', { class: 'kit-sendbar' }),
      h('div', { class: 'mine' })));
  assert(readOnly(card, '.mine') === card, 'returns the card');
  eq(text(card), 'kept');
  eq(card.querySelector('.kit-card-body').children.length, 1);
});

test('recordCard: read-only, named for search, its thread under it', () => {
  const card = decisionCard({ id: 'F2', question: 'Pin Node?', options: [{ id: 'A', title: 'Pin', pullsIn: 'x', actions: [{ label: 'Choose A' }] }], recommendation: { option: 'A' }, questions: [{ label: 'Explain this more' }] });
  const el = recordCard(card, {
    label: 'F2 Pin Node?',
    edge: 'signal',
    messages: [{ id: 1, from: 'user', at: '2026-11-01T10:00:00Z', text: 'Why 22?' }, { id: 2, from: 'agent', at: '2026-11-01T10:05:00Z', text: 'The last green run.' }],
  });
  assert(el === card, 'the same card');
  assert(!el.querySelector('button'), 'no controls');
  eq(el.dataset.sec, 'F2 Pin Node?');
  assert(el.classList.contains('edge-signal'), 'edge');
  const t = el.querySelector('.kit-card-body > .kit-rec-thread');
  eq(text(t.querySelector('.kit-label')), 'Thread');
  eq([...t.querySelectorAll('.kit-thread-msg')].map(m => m.className), ['kit-thread-msg user', 'kit-thread-msg agent']);
  const bare = recordCard(h('section', { class: 'kit-card edge-signal' }, h('div', { class: 'kit-card-body' })), { label: 'x', messages: [] });
  assert(!bare.querySelector('.kit-rec-thread'), 'no messages, no thread');
  assert(!bare.classList.contains('edge-signal'), 'no edge given, none kept');
});

test('recordCard: the caller can draw each message', () => {
  const el = recordCard(h('section', { class: 'kit-card' }, h('div', { class: 'kit-card-body' })), { label: 'x', messages: [{ id: 1 }], message: m => h('li', { class: 'mine' }, String(m.id)) });
  eq(el.querySelector('.kit-thread-msgs').innerHTML, '<li class="mine">1</li>');
});

function demo(o = {}) {
  const root = fixture();
  root.style.height = '600px';
  const shown = [];
  const page = recordPage({
    root,
    name: 'kittest',
    tabs: [
      { id: 'overview', label: 'Overview', count: '2 files' },
      { id: 'findings', label: 'Findings', count: '2' },
    ],
    draw(tab) {
      if (tab.id === 'overview') {
        const el = h('div', null, h('p', { 'data-sec': 'Summary', id: 'overview-summary' }, 'Read F2 first, then F3.'));
        return { el, secs: [{ id: 'overview-summary', label: 'Summary', depth: 2 }] };
      }
      const cards = ['F2', 'F3'].map(id => recordCard(decisionCard({ id, question: `${id}: the zebra question?`, options: [], recommendation: { option: 'A' } }), { label: id, messages: [] }));
      return { el: h('div', null, ...cards), secs: [] };
    },
    known: new Set(['F2', 'F3']),
    thread: (open, selected) => h('p', { class: 'which' }, `${open}:${selected ?? ''}`),
    onShow: (tab, at) => shown.push([tab, at]),
    ...o,
  });
  return { root, page, shown };
}

test('recordPage: the frame, a pane per tab, the first open, ids linked', () => {
  history.replaceState(null, '', location.pathname + location.search);
  const { root, page } = demo();
  assert(root.classList.contains('kit-app') && root.classList.contains('kit-record'), 'classes');
  eq([...root.children].map(c => c.tagName), ['DIV', 'ASIDE', 'MAIN', 'ASIDE']);
  const band = root.querySelector('.kit-rec-band');
  eq([...band.querySelectorAll('.kit-stage')].map(s => s.textContent), ['Overview · 2 files', 'Findings · 2']);
  eq(band.querySelector('.kit-stage.now').dataset.stage, 'overview');
  assert(band.querySelector('.kit-rec-find input.kit-rec-search'), 'search in the band');
  const panes = [...root.querySelectorAll('main .kit-rec-tab')];
  eq(panes.map(p => [p.id, p.dataset.tab, p.classList.contains('off')]), [['tab-overview', 'overview', false], ['tab-findings', 'findings', true]]);
  eq([...panes[0].querySelectorAll('a.kit-ref')].map(a => a.getAttribute('href')), ['#F2', '#F3']);
  eq(page.open(), 'overview');
  eq(text(root.querySelector('.kit-right-col .which')), 'overview:');
  page.stop();
});

test('recordPage: a press on a tab shows it; a link to a card opens its tab with its thread', async () => {
  history.replaceState(null, '', location.pathname + location.search);
  const { root, page, shown } = demo();
  root.querySelector('.kit-stage[data-stage="findings"]').click();
  eq(page.open(), 'findings');
  assert(!root.querySelector('#tab-findings').classList.contains('off'), 'findings on');
  assert(root.querySelector('#tab-overview').classList.contains('off'), 'overview off');
  page.show('overview');
  location.hash = '#F3';
  await tick();
  eq([page.open(), page.selected()], ['findings', 'F3']);
  eq(text(root.querySelector('.kit-right-col .which')), 'findings:F3');
  eq(shown[shown.length - 1], ['findings', 'card-F3']);
  location.hash = '#overview';
  await tick();
  eq([page.open(), page.selected()], ['overview', null]);
  page.stop();
  location.hash = '#F2';
  await tick();
  eq(page.open(), 'overview', 'stopped: the hash moves nothing');
  history.replaceState(null, '', location.pathname + location.search);
});

test('recordPage: search reads every tab, and a hit opens its tab at it', () => {
  history.replaceState(null, '', location.pathname + location.search);
  const { root, page } = demo();
  const box = root.querySelector('.kit-rec-search');
  box.value = 'zebra';
  box.dispatchEvent(new Event('input'));
  const hits = [...root.querySelectorAll('.kit-rec-hits a')];
  eq(hits.map(a => a.getAttribute('href')), ['#card-F2', '#card-F3']);
  eq(text(hits[0].querySelector('b')), 'Findings · F2');
  hits[1].click();
  eq([page.open(), page.selected()], ['findings', 'F3']);
  eq(root.querySelectorAll('.kit-rec-hits > *').length, 0, 'the hits close');
  box.value = 'nothing like it';
  box.dispatchEvent(new Event('input'));
  eq(text(root.querySelector('.kit-rec-hits')), 'Nothing found.');
  page.stop();
  history.replaceState(null, '', location.pathname + location.search);
});

test('recordPage: the caller can draw the band and the index, and turn search off', () => {
  history.replaceState(null, '', location.pathname + location.search);
  const { root, page } = demo({
    search: false,
    band: o => h('nav', { class: 'mine' }, o.tabs.map(t => h('button', { onclick: () => o.select(t.id) }, t.label)), o.find),
    index: (open, selected) => h('p', { class: 'idx' }, `${open}/${selected ?? ''}`),
  });
  assert(!root.querySelector('.kit-rec-search'), 'no search');
  eq(text(root.querySelector('.kit-rec-band .mine')), 'OverviewFindings');
  root.querySelectorAll('.kit-rec-band .mine button')[1].click();
  eq(text(root.querySelector('.kit-left-col .idx')), 'findings/');
  page.stop();
});

test('embeddedData: the data a file carries and the file itself; null on a served page', () => {
  eq(embeddedData('kit-nothing-here'), null);
  const block = h('script', { type: 'application/json', id: 'kit-test-data' });
  block.textContent = JSON.stringify({ title: 'A record', n: 2 });
  document.body.append(block);
  document.documentElement.dataset.theme = 'dark';
  const got = embeddedData('kit-test-data');
  delete document.documentElement.dataset.theme;
  block.remove();
  eq(got.data, { title: 'A record', n: 2 });
  assert(got.self.startsWith('<!doctype html>\n<html'), got.self.slice(0, 40));
  assert(!got.self.includes('data-theme'), 'the theme the page set is not the file');
  assert(got.self.includes('id="kit-test-data"'), 'the data block is in it');
});

test('recordPage: route says when a hashchange is the page\'s to follow', async () => {
  history.replaceState(null, '', location.pathname + location.search);
  let follow = false;
  const { page } = demo({ route: () => follow });
  eq(page.open(), 'overview', 'the first draw does not ask');
  location.hash = '#F3';
  await tick();
  eq([page.open(), page.selected()], ['overview', null], 'ignored while route says no');
  follow = true;
  location.hash = '#F2';
  await tick();
  eq([page.open(), page.selected()], ['findings', 'F2']);
  page.stop();
  history.replaceState(null, '', location.pathname + location.search);
});

test('recordPage: go writes the address for a hit and a tab, in place of history.pushState', () => {
  history.replaceState(null, '', location.pathname + location.search);
  const went = [];
  const { root, page } = demo({ go: h => went.push(h) });
  const box = root.querySelector('.kit-rec-search');
  box.value = 'zebra';
  box.dispatchEvent(new Event('input'));
  root.querySelectorAll('.kit-rec-hits a')[1].click();
  root.querySelector('.kit-stage[data-stage="overview"]').click();
  eq(went, ['#F3', '#overview']);
  eq(location.hash, '', 'the address is the caller\'s to write');
  eq(page.open(), 'overview');
  page.stop();
});
