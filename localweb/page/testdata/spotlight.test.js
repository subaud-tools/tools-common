import { test, eq, assert, fixture } from './harness.js';
import { spotlight, clearSpotlight } from '/_kit/spotlight.js';
import { live } from '/_kit/live.js';
import { fakeEventSource } from './fakes.js';

const sleep = ms => new Promise(r => setTimeout(r, ms));
const step = o => ({ n: 2, of: 10, tool: 'diazo', walk: 'reply', title: 'Press Reply.', note: 'Your agent reads it.', look: 'Reply under the take', ...o });
const near = (a, b) => Math.abs(a - b) <= 1;

test('spotlight: rings the data-walk control with its note and n of N, and never blocks a click', async () => {
  const fx = fixture();
  fx.innerHTML = '<button data-walk="reply" style="margin:60px">Reply</button>';
  const btn = fx.querySelector('button');
  let clicked = 0;
  btn.addEventListener('click', () => clicked++);
  await spotlight(step());
  const ring = document.querySelector('.kit-spot-ring');
  const card = document.querySelector('.kit-spot-card');
  assert(ring && !ring.hidden && card && !card.hidden, 'drawn');
  eq(card.querySelector('.kit-spot-count').textContent, '2 of 10');
  eq(card.querySelector('.kit-spot-title').textContent, 'Press Reply.');
  eq(card.querySelector('.kit-spot-note').textContent, 'Your agent reads it.');
  const r = btn.getBoundingClientRect(), rr = ring.getBoundingClientRect();
  assert(near(r.x, rr.x) && near(r.width, rr.width), `ring on the control: ${JSON.stringify([r.x, rr.x])}`);
  const at = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
  assert(at === btn, 'the control is still what a click lands on');
  btn.click();
  eq(clicked, 1);
  assert(!document.querySelector('.kit-spot-card'), 'a click on the control clears it');
});

test('spotlight: follows the control when the page scrolls', async () => {
  const fx = fixture();
  fx.innerHTML = '<div style="height:2000px"><button data-walk="reply" style="margin-top:900px">Reply</button></div>';
  await spotlight(step());
  scrollBy(0, 300);
  await sleep(80);
  const r = fx.querySelector('button').getBoundingClientRect();
  const rr = document.querySelector('.kit-spot-ring').getBoundingClientRect();
  assert(near(r.y, rr.y), `ring follows: ${r.y} vs ${rr.y}`);
  clearSpotlight();
  scrollTo(0, 0);
});

test('spotlight: waits for a control that appears late', async () => {
  const fx = fixture();
  setTimeout(() => { fx.innerHTML = '<button data-walk="choose">Choose</button>'; }, 150);
  await spotlight(step({ walk: 'choose' }), { wait: 2000 });
  assert(!document.querySelector('.kit-spot-ring').hidden, 'ringed once it showed');
  assert(!document.querySelector('.kit-spot-card').classList.contains('kit-spot-lost'));
  clearSpotlight();
});

test('spotlight: a control not on the page gets the note centred with look for', async () => {
  fixture();
  await spotlight(step({ walk: 'nowhere' }), { wait: 60 });
  const card = document.querySelector('.kit-spot-card');
  assert(document.querySelector('.kit-spot-ring').hidden, 'no ring');
  assert(card.classList.contains('kit-spot-lost'), 'centred');
  eq(card.querySelector('.kit-spot-look').textContent, 'Look for Reply under the take.');
  const c = card.getBoundingClientRect();
  assert(Math.abs(c.x + c.width / 2 - innerWidth / 2) < 20, 'centred across');
  clearSpotlight();
  assert(!document.querySelector('.kit-spot-card'), 'cleared');
});

test('spotlight: ok on the note clears it and tells the page', async () => {
  const fx = fixture();
  fx.innerHTML = '<div data-walk="split" style="width:200px;height:80px"></div>';
  let heard = null;
  const on = e => { heard = e.detail; };
  addEventListener('kit:spotlight-ok', on);
  await spotlight(step({ n: 1, walk: 'split', ok: true }));
  document.querySelector('.kit-spot-ok').click();
  removeEventListener('kit:spotlight-ok', on);
  eq(heard && heard.n, 1);
  assert(!document.querySelector('.kit-spot-card'), 'cleared');
});

test('spotlight: a newer step replaces the one shown', async () => {
  const fx = fixture();
  fx.innerHTML = '<button data-walk="a">a</button><button data-walk="b">b</button>';
  void spotlight(step({ walk: 'a', title: 'A' }));
  await spotlight(step({ walk: 'b', title: 'B' }));
  eq(document.querySelectorAll('.kit-spot-card').length, 1);
  eq(document.querySelector('.kit-spot-title').textContent, 'B');
  clearSpotlight();
});

test('live: a spotlight event draws on any kit page, and an empty one clears, without reaching onEvent', async () => {
  const fx = fixture();
  fx.innerHTML = '<button data-walk="revise">Revise</button>';
  const fes = fakeEventSource();
  const seen = [];
  const l = live({ events: '/e', poll: '/p', EventSource: fes.FakeES, fetch: async () => new Response('{}'), onEvent: e => seen.push(e.type), spotlight: false });
  const es = fes.last();
  es.emitOpen();
  es.emitMessage('c1', { type: 'spotlight', data: step({ walk: 'revise', title: 'Press Revise.' }) });
  await sleep(50);
  eq(document.querySelector('.kit-spot-title').textContent, 'Press Revise.');
  es.emitMessage('c2', { type: 'spotlight', data: {} });
  await sleep(20);
  assert(!document.querySelector('.kit-spot-card'), 'cleared');
  eq(seen, []);
  l.stop();
});
