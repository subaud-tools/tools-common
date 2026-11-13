import { test, eq, assert, fixture } from './harness.js';
import { tour, placeNote, registeredTour } from '/_kit/tour.js';

const sleep = ms => new Promise(r => setTimeout(r, ms));
// until waits for the overlay to show step id (a loaded machine runs slow).
async function until(id, ms = 3000) {
  const end = Date.now() + ms;
  for (;;) {
    const o = document.querySelector('.kit-tour');
    if (o && o.dataset.step === id && !o.querySelector('.kit-tour-card').hidden) return o;
    if (Date.now() > end) throw new Error(`step ${id} never showed (at ${o ? o.dataset.step : 'none'})`);
    await sleep(20);
  }
}
const key = k => (document.activeElement || document.body).dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));

function page() {
  const fx = fixture();
  fx.innerHTML = '<button id="a" style="margin:40px">a</button><button id="b">b</button>';
  return fx;
}
const steps = () => [
  { id: 'a', target: '#a', note: 'This is a.' },
  { id: 'gone', target: '#nowhere', note: 'Never shown.' },
  { id: 'b', target: '#b', note: 'This is b.' },
];
const fresh = name => { localStorage.removeItem(name); return name; };

test('tour: outlines the first control with its note and count', async () => {
  page();
  const t = tour(steps(), { seenKey: fresh('kit.tour.test1'), wait: 50 });
  t.start();
  const o = await until('a');
  eq(o.querySelector('.kit-tour-note').textContent, 'This is a.');
  eq(o.querySelector('.kit-tour-count').textContent, '1 of 3');
  const r = document.getElementById('a').getBoundingClientRect();
  const ring = o.querySelector('.kit-tour-ring').getBoundingClientRect();
  eq([Math.round(ring.x), Math.round(ring.width)], [Math.round(r.x), Math.round(r.width)]);
  key('Escape');
});

test('tour: → goes on, skipping a step whose control is not there, and done ends it', async () => {
  page();
  const t = tour(steps(), { seenKey: fresh('kit.tour.test2'), wait: 50 });
  t.start();
  await until('a');
  key('ArrowRight');
  const o = await until('b');
  eq(o.querySelector('.kit-tour-next').textContent, 'done');
  o.querySelector('.kit-tour-next').click();
  await sleep(50);
  assert(!document.querySelector('.kit-tour'), 'ended');
  assert(t.seen(), 'seen');
});

test('tour: Esc skips and marks it seen once; startOnce then does nothing', async () => {
  page();
  const t = tour(steps(), { seenKey: fresh('kit.tour.test3'), wait: 50 });
  assert(!t.seen());
  t.startOnce();
  await until('a');
  key('Escape');
  await sleep(20);
  assert(!document.querySelector('.kit-tour'), 'Esc ended it');
  assert(t.seen(), 'seen after Esc');
  t.startOnce();
  await sleep(60);
  assert(!document.querySelector('.kit-tour'), 'not again');
});

test('tour: keys go to the tour, not the page, while it shows', async () => {
  page();
  let pageKeys = 0;
  const onKey = () => pageKeys++;
  document.addEventListener('keydown', onKey);
  const t = tour(steps(), { seenKey: fresh('kit.tour.test4'), wait: 50 });
  t.start();
  await until('a');
  key('j');
  key('Escape');
  document.removeEventListener('keydown', onKey);
  eq(pageKeys, 0);
});

test('tour: a step whose before() says false is skipped; onEnd hears the end', async () => {
  page();
  let ended = 0;
  const s = steps();
  s[0].before = async () => false;
  const t = tour(s, { seenKey: fresh('kit.tour.test5'), wait: 50, onEnd: () => ended++ });
  t.start();
  await until('b');
  key('Escape');
  eq(ended, 1);
});

test('tour: the last one registered is the page\'s', () => {
  const t = tour(steps(), { seenKey: 'kit.tour.reg' });
  assert(registeredTour() === t);
  eq(t.steps.length, 3);
});

const view = { width: 1600, height: 900 };
const card = { width: 320, height: 140 };
const overlaps = (a, b) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

test('placeNote: below a control, left of a full-height rail, above one at the foot, always inside', () => {
  let t = { x: 200, y: 10, width: 80, height: 30 };
  let p = placeNote(t, card, view);
  assert(p.y >= t.y + t.height && !overlaps({ ...p, ...card }, t), 'below');
  t = { x: 1240, y: 52, width: 360, height: 848 };
  p = placeNote(t, card, view);
  assert(p.x + card.width <= t.x, 'left of the rail');
  t = { x: 600, y: 820, width: 100, height: 30 };
  p = placeNote(t, card, view);
  assert(p.y + card.height <= t.y, 'above');
  for (t of [{ x: 0, y: 60, width: 40, height: 20 }, { x: 1590, y: 60, width: 10, height: 20 }, { x: 700, y: 400, width: 200, height: 100 }]) {
    p = placeNote(t, card, view);
    assert(p.x >= 0 && p.x + card.width <= view.width && p.y >= 0 && p.y + card.height <= view.height, JSON.stringify(t));
  }
});
