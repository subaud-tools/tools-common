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

// done collects the kit:spotlight-done messages posted to the parent (this
// page is the top window, so they come back to it).
function done() {
  const got = [];
  const on = e => { if (e.data && e.data.type === 'kit:spotlight-done') got.push(e.data); };
  addEventListener('message', on);
  return { got, stop: () => removeEventListener('message', on) };
}

test('spotlight: a click on the ringed control posts kit:spotlight-done with n, tool and walk, and the tool still gets the click', async () => {
  const fx = fixture();
  fx.innerHTML = '<button data-walk="choose"><span>Choose</span></button>';
  let clicked = 0;
  fx.querySelector('button').addEventListener('click', () => clicked++);
  const d = done();
  await spotlight(step({ n: 4, walk: 'choose' }));
  fx.querySelector('span').click();
  await sleep(30);
  d.stop();
  eq(d.got, [{ type: 'kit:spotlight-done', n: 4, tool: 'diazo', walk: 'choose' }]);
  eq(clicked, 1);
  assert(!document.querySelector('.kit-spot-ring'), 'the ring goes');
});

test('spotlight: a click elsewhere is not the step done', async () => {
  const fx = fixture();
  fx.innerHTML = '<button data-walk="choose">Choose</button><button id="other">Other</button>';
  const d = done();
  await spotlight(step({ walk: 'choose' }));
  fx.querySelector('#other').click();
  await sleep(30);
  d.stop();
  eq(d.got, []);
  assert(document.querySelector('.kit-spot-ring'), 'still ringed');
  clearSpotlight();
});

test('spotlight: a text box is done when its form is submitted, not when it is clicked', async () => {
  const fx = fixture();
  fx.innerHTML = '<form data-walk="reply"><textarea></textarea><button type="submit">Send</button></form>';
  let submitted = 0;
  fx.querySelector('form').addEventListener('submit', e => { e.preventDefault(); submitted++; });
  const d = done();
  await spotlight(step({ n: 2, walk: 'reply' }));
  fx.querySelector('textarea').click();
  await sleep(30);
  eq(d.got, [], 'clicking into the box');
  fx.querySelector('button').click();
  await sleep(30);
  d.stop();
  eq(d.got.map(m => m.n), [2]);
  eq(submitted, 1);
  assert(!document.querySelector('.kit-spot-card'), 'cleared');
});

test('spotlight: while the control is not on the page the note waits centred, and it is ringed the moment it appears', async () => {
  const fx = fixture();
  await spotlight(step({ walk: 'approve-spec', title: 'Press Approve on the spec.' }));
  await sleep(300);
  const card = document.querySelector('.kit-spot-card');
  assert(card && !card.hidden, 'the note shows');
  assert(card.classList.contains('kit-spot-lost'), 'centred');
  assert(document.querySelector('.kit-spot-ring').hidden, 'no ring yet');
  eq(card.querySelector('.kit-spot-title').textContent, 'Press Approve on the spec.');
  eq(card.querySelector('.kit-spot-wait').textContent, 'Your agent is getting this ready…');
  const c = card.getBoundingClientRect();
  assert(Math.abs(c.x + c.width / 2 - innerWidth / 2) < 20, 'centred across');
  fx.innerHTML = '<button data-walk="approve-spec" style="margin:40px">Approve</button>';
  await sleep(30);
  const r = fx.querySelector('button').getBoundingClientRect();
  const ring = document.querySelector('.kit-spot-ring');
  assert(!ring.hidden, 'ringed once it showed');
  assert(near(r.x, ring.getBoundingClientRect().x), 'on the control');
  assert(!card.classList.contains('kit-spot-lost'), 'beside it now');
  assert(card.querySelector('.kit-spot-wait').hidden, 'no waiting line');
  clearSpotlight();
  assert(!document.querySelector('.kit-spot-card'), 'cleared');
});

test('spotlight: ok on the note clears it and posts kit:spotlight-done; a click on the lit area does not', async () => {
  const fx = fixture();
  fx.innerHTML = '<div data-walk="split" style="width:200px;height:80px"></div>';
  const d = done();
  await spotlight(step({ n: 1, tool: 'proj', walk: 'split', ok: true }));
  fx.querySelector('div').click();
  await sleep(30);
  eq(d.got, [], 'the area itself');
  document.querySelector('.kit-spot-ok').click();
  await sleep(30);
  d.stop();
  eq(d.got, [{ type: 'kit:spotlight-done', n: 1, tool: 'proj', walk: 'split' }]);
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
