import { test, eq, assert, fixture } from './harness.js';
import { spotlight, clearSpotlight } from '/_kit/spotlight.js';
import { live } from '/_kit/live.js';
import { fakeEventSource } from './fakes.js';

const sleep = ms => new Promise(r => setTimeout(r, ms));
const step = o => ({ n: 2, of: 9, tool: 'diazo', walk: 'reply', title: 'Press Send.', note: 'Your agent reads it.', look: 'Reply under the take', ...o });
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
  eq(card.querySelector('.kit-spot-count').textContent, '2 of 9');
  eq(card.querySelector('.kit-spot-title').textContent, 'Press Send.');
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
  // A headless browser may deliver the scroll event a frame or more late; the
  // spotlight also re-places every 250ms, so the ring catches up within that.
  const at = () => [fx.querySelector('button').getBoundingClientRect().y, document.querySelector('.kit-spot-ring').getBoundingClientRect().y];
  let [ry, ringY] = at();
  for (let i = 0; i < 20 && !near(ry, ringY); i++) {
    await sleep(50);
    [ry, ringY] = at();
  }
  assert(near(ry, ringY), `ring follows: ${ry} vs ${ringY}`);
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

test('spotlight: a text box is also done when another walk control in its form is pressed, and says which', async () => {
  // diazo's reply box: "This is the direction" sends the words typed and
  // settles the direction in one press, which is no submit.
  const fx = fixture();
  fx.innerHTML = '<form><textarea data-walk="reply"></textarea><button type="button" data-walk="direction">This is the direction</button><button type="button">Explain this more</button><button type="submit">Send</button></form>';
  fx.querySelector('form').addEventListener('submit', e => e.preventDefault());
  let pressed = 0;
  fx.querySelector('[data-walk=direction]').addEventListener('click', () => pressed++);
  const d = done();
  await spotlight(step({ n: 1, walk: 'reply' }));
  fx.querySelectorAll('button')[1].click();
  await sleep(30);
  eq(d.got, [], 'a button with no walk hook');
  fx.querySelector('[data-walk=direction]').click();
  await sleep(30);
  d.stop();
  eq(d.got.map(m => [m.n, m.walk, m.also]), [[1, 'reply', 'direction']]);
  eq(pressed, 1, "the tool's own handler still runs");
  assert(!document.querySelector('.kit-spot-card'), 'cleared');
});

test('spotlight: while the control is not on the page the note waits off the text, and it is ringed the moment it appears', async () => {
  const fx = fixture();
  // A page of text in a column down the middle, the way a plan or a document reads.
  fx.innerHTML = `<div style="position:fixed;left:${innerWidth / 2 - 70}px;top:0;width:140px">${'<p style="margin:0 0 8px">A line of the page the learner reads while the agent works.</p>'.repeat(40)}</div>`;
  await spotlight(step({ walk: 'approve-spec', title: 'Press Approve on the spec.' }));
  await sleep(300);
  const card = document.querySelector('.kit-spot-card');
  assert(card && !card.hidden, 'the note shows');
  assert(card.classList.contains('kit-spot-lost'), 'waiting');
  assert(document.querySelector('.kit-spot-ring').hidden, 'no ring yet');
  eq(card.querySelector('.kit-spot-title').textContent, 'Press Approve on the spec.');
  eq(card.querySelector('.kit-spot-wait').textContent, 'Your agent is getting this ready…');
  eq(overText(card), [], 'the waiting note covers none of the text');
  assert(inView(card), 'in the window');
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

// overText lists the text on the page the card lies over; inView says it is
// all in the window.
const hit = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
function overText(card) {
  const c = card.getBoundingClientRect();
  return [...document.querySelectorAll('#fx p, #fx [contenteditable]')].filter(e => hit(c, e.getBoundingClientRect())).map(e => e.tagName);
}
const inView = card => { const c = card.getBoundingClientRect(); return c.left >= 0 && c.top >= 0 && c.right <= innerWidth && c.bottom <= innerHeight; };

test('spotlight: the note sits beside the control on the side away from the text, never over the text column', async () => {
  const fx = fixture();
  // The reply's Send under a take: a column of text on the left, the button at its foot.
  fx.innerHTML = `<div style="position:fixed;left:16px;top:0;width:${Math.round(innerWidth * 0.5)}px">${'<p style="margin:0 0 6px">The take reads like this, line after line, down the column.</p>'.repeat(30)}</div>`
    + '<button data-walk="reply" style="position:fixed;left:40px;top:160px">Send</button>';
  await spotlight(step());
  await sleep(30);
  const card = document.querySelector('.kit-spot-card');
  eq(overText(card), [], 'the note covers none of the take');
  assert(inView(card), 'in the window');
  assert(!hit(card.getBoundingClientRect(), fx.querySelector('button').getBoundingClientRect()), 'nor the control');
  clearSpotlight();
});

test('spotlight: a control over a document (galley: select a passage, then Add instruction) puts the note in the margin', async () => {
  const fx = fixture();
  const side = Math.max(300, (innerWidth - 220) / 2);
  fx.innerHTML = `<div contenteditable="true" style="position:fixed;left:${side}px;top:0;width:${innerWidth - 2 * side}px;height:${innerHeight}px">${'<p style="margin:0 0 6px">A sentence of the README to select.</p>'.repeat(20)}</div>`
    + `<button data-walk="add-instruction" style="position:fixed;left:${side + 20}px;top:140px">Add instruction</button>`;
  await spotlight(step({ n: 7, tool: 'galley', walk: 'add-instruction' }));
  await sleep(30);
  const card = document.querySelector('.kit-spot-card');
  const c = card.getBoundingClientRect();
  eq(overText(card), [], 'the note covers none of the document');
  assert(c.right <= side || c.left >= innerWidth - side, `in a margin: ${JSON.stringify([c.left, c.right, side])}`);
  assert(inView(card), 'in the window');
  clearSpotlight();
});

test('spotlight: text in plain divs and spans counts as text too', async () => {
  const fx = fixture();
  // diazo's Approve: a box above, the button, and a line of help beside it, none of them paragraphs.
  fx.innerHTML = `<div style="position:fixed;left:16px;top:120px;width:${innerWidth - 32}px">`
    + '<div style="height:60px;border:1px solid #888">Anything to add</div>'
    + '<div style="display:flex;gap:8px;margin-top:8px"><button data-walk="approve-spec">Approve spec</button>'
    + '<span>Then the agent commits it and writes the plan, or answers it: Reword, or Reopen a decision.</span></div></div>';
  await spotlight(step({ n: 5, walk: 'approve-spec' }));
  await sleep(30);
  const card = document.querySelector('.kit-spot-card');
  eq(textUnder(card), [], 'the note covers no words');
  clearSpotlight();
});

test('spotlight: with no clear spot in view, the control is scrolled to the middle once so the note has room', async () => {
  const fx = fixture();
  const lines = '<div style="margin:0 0 6px">A line of the spec that runs the whole width of the page, with more words.</div>'.repeat(60);
  fx.innerHTML = `<div id="scroller" style="position:fixed;inset:0;overflow:auto"><div style="width:100%">${lines}<button data-walk="approve-spec">Approve spec</button><div style="height:${innerHeight}px"></div></div></div>`;
  await spotlight(step({ n: 5, walk: 'approve-spec' }));
  await sleep(400);
  const card = document.querySelector('.kit-spot-card');
  const b = fx.querySelector('button').getBoundingClientRect();
  assert(b.top >= 0 && b.bottom <= innerHeight, 'the control is in view');
  eq(textUnder(card), [], 'the note covers no words');
  clearSpotlight();
});

// The real walk's diazo spec step: a header of short labels, then the spec's
// card filling the page, its optional box, Approve and a help line at its foot.
// Every place the note can go covers some words: the header's big labels, or
// the tips of the spec's lines (fewer, by area); it must take the labels, never the spec the learner is asked to read before approving.
test('spotlight: with words everywhere, the note covers what is around the page before the words around the control', async () => {
  const fx = fixture();
  const W = innerWidth, H = innerHeight;
  const HEAD = 200; // taller than the note: the band at the top covers none of the spec
  const label = s => `<span style="display:inline-block;margin:0 6px;font-size:26px;line-height:28px">${s}</span>`;
  // Each line of the spec runs to x=496, just past where a note at the right edge starts.
  const line = '<p style="margin:0 0 10px;width:480px;white-space:nowrap;text-align:justify;text-align-last:justify">The README is ten lines and says what the tool is.</p>';
  fx.innerHTML = `<div id="head" style="position:fixed;left:0;top:0;width:${W}px;height:${HEAD}px;overflow:hidden">${(label('Plan') + label('Record') + label('live') + label('Guide') + label('theme') + label('Share')).repeat(10)}</div>`
    + `<section id="spec" style="position:fixed;left:16px;top:${HEAD}px;width:${W - 32}px">`
    + line.repeat(Math.max(1, Math.floor((H - HEAD - 110) / 30)))
    + '<textarea placeholder="Anything to add for the agent (optional)" style="display:block;width:40%;height:50px"></textarea>'
    + '<div style="display:flex;gap:8px;margin-top:8px"><button data-walk="approve-spec">Approve spec</button>'
    + '<span>Then the agent writes the plan.</span></div></section>';
  const note = 'The spec says in plain words what will change. Nothing is planned until you agree with it, so this is where you catch a misunderstanding before any work starts.';
  await spotlight(step({ n: 4, of: 5, walk: 'approve-spec', title: 'Press Approve on the spec.', note }));
  await sleep(400);
  const card = document.querySelector('.kit-spot-card');
  eq(textUnder(card, 'spec'), [], 'the note covers none of the spec, its box or its help line: ' + JSON.stringify([card.getBoundingClientRect(), innerWidth, innerHeight]));
  assert(inView(card), 'in the window');
  assert(!hit(card.getBoundingClientRect(), fx.querySelector('button').getBoundingClientRect()), 'nor the control');
  clearSpotlight();
});

// The same, with the spec in a scroller scrolled to its foot (as diazo's is
// when Approve is lit): words it clips out of sight under the header are not
// on the page, so the note still finds the place that covers none of it.
test('spotlight: words a scroller clips out of sight do not count as text under the note', async () => {
  const fx = fixture();
  const W = innerWidth, H = innerHeight;
  const HEAD = 200;
  const label = s => `<span style="display:inline-block;margin:0 6px;font-size:26px;line-height:28px">${s}</span>`;
  const line = '<p style="margin:0 0 10px;width:480px;white-space:nowrap;text-align:justify;text-align-last:justify">The README is ten lines and says what the tool is.</p>';
  fx.innerHTML = `<div style="position:fixed;left:0;top:0;width:${W}px;height:${HEAD}px;overflow:hidden">${(label('Plan') + label('Record') + label('live') + label('Guide') + label('theme') + label('Share')).repeat(10)}</div>`
    + `<div id="scroller" style="position:fixed;left:16px;top:${HEAD}px;width:${W - 32}px;height:${H - HEAD}px;overflow:auto"><section id="spec">`
    + line.repeat(40)
    + '<textarea style="display:block;width:40%;height:50px"></textarea>'
    + '<div style="display:flex;gap:8px;margin-top:8px"><button data-walk="approve-spec">Approve spec</button><span>Then the agent writes the plan.</span></div></section></div>';
  const sc = fx.querySelector('#scroller');
  sc.scrollTop = sc.scrollHeight;
  const note = 'The spec says in plain words what will change. Nothing is planned until you agree with it, so this is where you catch a misunderstanding before any work starts.';
  await spotlight(step({ n: 4, of: 5, walk: 'approve-spec', title: 'Press Approve on the spec.', note }));
  await sleep(400);
  const card = document.querySelector('.kit-spot-card');
  const c = card.getBoundingClientRect();
  const visible = textUnder(card, 'spec').length && c.bottom > HEAD;
  assert(!visible, `the note covers none of the spec in sight: ${JSON.stringify([c.top, c.bottom, textUnder(card, 'spec')])}`);
  clearSpotlight();
});

// textUnder lists the words on the page the card lies over (every text node,
// or those under the element with id within), and any field under it there.
function textUnder(card, within = 'fx') {
  const c = card.getBoundingClientRect();
  const root = document.getElementById(within);
  const out = [...root.querySelectorAll('textarea')].filter(e => hit(c, e.getBoundingClientRect())).map(() => 'textarea');
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const r = document.createRange();
  for (let n = w.nextNode(); n; n = w.nextNode()) {
    if (!n.textContent.trim()) continue;
    r.selectNodeContents(n);
    for (const b of r.getClientRects()) if (hit(c, b)) { out.push(n.textContent.trim().slice(0, 30)); break; }
  }
  return out;
}

test('spotlight: the lit control carries data-walk-lit while its step shows and through the click that ends it, so the tool can make that press do the whole step', async () => {
  const fx = fixture();
  fx.innerHTML = '<button data-walk="choose">Choose A</button>';
  const btn = fx.querySelector('button');
  let litAtClick = null;
  btn.addEventListener('click', () => { litAtClick = btn.hasAttribute('data-walk-lit'); });
  await spotlight(step({ n: 4, walk: 'choose' }));
  await sleep(30);
  assert(btn.hasAttribute('data-walk-lit'), 'lit while shown');
  btn.click();
  eq(litAtClick, true, "the tool's own click handler still sees it lit");
  await sleep(30);
  assert(!btn.hasAttribute('data-walk-lit'), 'gone after');
  await spotlight(step({ n: 4, walk: 'choose' }));
  await sleep(30);
  clearSpotlight();
  await sleep(30);
  assert(!btn.hasAttribute('data-walk-lit'), 'gone when cleared');
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

test('spotlight: while the control is missing the note is the preparing line with no ring, then the title and note with the ring once it appears', async () => {
  const fx = fixture();
  fx.innerHTML = '';
  await spotlight(step({ n: 2, of: 6, tool: 'proj', walk: 'proj-tab', prepare: "Your agent is opening proj's own page as a tab on the right. When it's there, you'll press its tab.", title: 'Press the proj tab.', note: 'The right side holds the pages.' }));
  await sleep(30);
  const card = document.querySelector('.kit-spot-card');
  const shown = sel => { const e = card.querySelector(sel); return !!e && !e.hidden; };
  assert(card && !card.hidden, 'the note shows');
  assert(document.querySelector('.kit-spot-ring').hidden, 'no ring while preparing');
  eq(card.querySelector('.kit-spot-wait').textContent, "Your agent is opening proj's own page as a tab on the right. When it's there, you'll press its tab.");
  assert(shown('.kit-spot-wait') && !shown('.kit-spot-title') && !shown('.kit-spot-note'), 'only the preparing line');
  eq(card.querySelector('.kit-spot-count').textContent, '2 of 6');
  fx.innerHTML = '<button data-walk="proj-tab" style="margin:40px">proj</button>';
  await sleep(30);
  assert(!document.querySelector('.kit-spot-ring').hidden, 'ringed once it showed');
  assert(!shown('.kit-spot-wait') && shown('.kit-spot-title') && shown('.kit-spot-note'), 'the doing note now');
  eq(card.querySelector('.kit-spot-title').textContent, 'Press the proj tab.');
  fx.innerHTML = '';
  await sleep(300);
  assert(shown('.kit-spot-wait') && document.querySelector('.kit-spot-ring').hidden, 'back to preparing when it goes');
  clearSpotlight();
});

test('spotlight: with ready, the doing note shows with no ring once the ready element is there, and the ring lands when the control appears (galley: the README, then Add instruction after a selection)', async () => {
  const fx = fixture();
  fx.innerHTML = '';
  await spotlight(step({ n: 1, of: 3, tool: 'galley', walk: 'add-instruction', ready: 'select-passage', prepare: 'Your agent is writing the README.', title: 'Select a sentence in the README, then press Add instruction.', note: 'This is galley.' }));
  await sleep(30);
  const card = document.querySelector('.kit-spot-card');
  const ring = document.querySelector('.kit-spot-ring');
  const shown = sel => { const e = card.querySelector(sel); return !!e && !e.hidden; };
  assert(shown('.kit-spot-wait') && !shown('.kit-spot-title') && ring.hidden, 'preparing while neither is there');
  // Lines that don't wrap, so the README is as tall on CI's fonts as here and a corner stays free of it.
  fx.innerHTML = '<div data-walk="select-passage" style="position:fixed;left:200px;top:40px;width:300px">' + '<p style="margin:0;line-height:20px;white-space:nowrap;overflow:hidden">A line of the README the learner selects.</p>'.repeat(6) + '</div>';
  await sleep(30);
  assert(!shown('.kit-spot-wait') && shown('.kit-spot-title') && shown('.kit-spot-note'), 'the doing note once the ready element is there');
  assert(ring.hidden, 'no ring: the control is not there yet');
  assert(card.classList.contains('kit-spot-lost'), 'placed as the waiting note is');
  eq(overText(card), [], 'off the README');
  fx.insertAdjacentHTML('beforeend', '<button data-walk="add-instruction" style="position:fixed;left:520px;top:40px">Add instruction</button>');
  await sleep(30);
  const r = fx.querySelector('button').getBoundingClientRect();
  assert(!ring.hidden && near(r.x, ring.getBoundingClientRect().x), 'ringed once the control appears');
  assert(!card.classList.contains('kit-spot-lost'), 'beside it now');
  const got = [];
  const on = e => got.push(e.data);
  addEventListener('message', on);
  fx.querySelector('button').click();
  await sleep(30);
  removeEventListener('message', on);
  eq(got.filter(m => m && m.type === 'kit:spotlight-done').map(m => m.walk), ['add-instruction'], 'the click on the control ends the step');
  clearSpotlight();
});

test('spotlight: a long note sits off the control and the text column, and scrolls inside itself when taller than about 40% of the window', async () => {
  const fx = fixture();
  fx.innerHTML = `<div style="position:fixed;left:16px;top:0;width:${Math.round(innerWidth * 0.45)}px">${'<p style="margin:0 0 6px">The page reads like this, line after line, down the column.</p>'.repeat(30)}</div>`
    + '<button data-walk="sessions-tab" style="position:fixed;left:40px;top:160px">sessions</button>';
  const long = 'These are the sessions running now, grouped by project; the one you are in is among them. Starting a new piece of work starts a new session, so each keeps its own terminal and pages. ';
  await spotlight(step({ walk: 'sessions-tab', title: 'Press sessions.', note: long }));
  await sleep(30);
  let card = document.querySelector('.kit-spot-card');
  eq(overText(card), [], 'a long note covers none of the text');
  assert(inView(card), 'in the window');
  assert(!hit(card.getBoundingClientRect(), fx.querySelector('button').getBoundingClientRect()), 'nor the control');
  await spotlight(step({ walk: 'sessions-tab', title: 'Press sessions.', note: long.repeat(12) }));
  await sleep(30);
  card = document.querySelector('.kit-spot-card');
  assert(card.offsetHeight <= innerHeight * 0.4 + 2, `at most about 40% tall: ${card.offsetHeight} of ${innerHeight}`);
  assert(card.scrollHeight > card.clientHeight, 'scrolls inside itself');
  assert(getComputedStyle(card).overflowY === 'auto', 'overflow auto');
  assert(inView(card), 'in the window');
  clearSpotlight();
});

// next collects the kit:walk-next messages posted to the parent.
function next() {
  const got = [];
  const on = e => { if (e.data && e.data.type === 'kit:walk-next') got.push(e.data); };
  addEventListener('message', on);
  return { got, stop: () => removeEventListener('message', on) };
}
const endCard = o => ({ end: { tool: 'proj', learned: ['A session is a terminal.', 'It keeps running.'], next: "Plan a small change on diazo's page.", next_tool: 'diazo', ...o } });

test('spotlight: an end card shows centred with what was learned, no ring, and its button posts kit:walk-next with next_tool', async () => {
  const fx = fixture();
  fx.innerHTML = '<p>Some page.</p>';
  const d = next();
  await spotlight(endCard());
  await sleep(30);
  const card = document.querySelector('.kit-spot-card');
  assert(card && !card.hidden && card.classList.contains('kit-spot-end'), 'the end card shows');
  const ring = document.querySelector('.kit-spot-ring');
  assert(!ring || ring.hidden, 'no ring');
  eq(card.querySelector('.kit-spot-title').textContent, 'You learned');
  eq([...card.querySelectorAll('li')].map(l => l.textContent), ['A session is a terminal.', 'It keeps running.']);
  assert(card.textContent.includes("Plan a small change on diazo's page."), 'what is next');
  const c = card.getBoundingClientRect();
  // Centred in the viewport a fixed box sees, which leaves out scrollbars (innerWidth counts them).
  const vw = document.documentElement.clientWidth, vh = document.documentElement.clientHeight;
  assert(Math.abs((c.left + c.right) / 2 - vw / 2) <= 2 && Math.abs((c.top + c.bottom) / 2 - vh / 2) <= 2, `centred: ${JSON.stringify([c.left, c.right, c.top, c.bottom, vw, vh])}`);
  const btn = card.querySelector('button.kit-btn.fill');
  eq(btn.textContent, 'Go on to diazo');
  btn.click();
  await sleep(30);
  d.stop();
  eq(d.got, [{ type: 'kit:walk-next', tool: 'proj', next_tool: 'diazo' }]);
  assert(!document.querySelector('.kit-spot-card'), 'cleared');
});

test('spotlight: the last end card says Done, which posts kit:walk-next with an empty next_tool', async () => {
  fixture();
  const d = next();
  await spotlight(endCard({ tool: 'galley', next: "That's the walk.", next_tool: '' }));
  const btn = document.querySelector('.kit-spot-card button.kit-btn.fill');
  eq(btn.textContent, 'Done');
  btn.click();
  await sleep(30);
  d.stop();
  eq(d.got, [{ type: 'kit:walk-next', tool: 'galley', next_tool: '' }]);
  assert(!document.querySelector('.kit-spot-card'), 'cleared');
});

test('live: an end-card spotlight event draws the end card', async () => {
  fixture();
  const fes = fakeEventSource();
  const l = live({ events: '/e', poll: '/p', EventSource: fes.FakeES, fetch: async () => new Response('{}'), onEvent: () => {}, spotlight: false });
  const es = fes.last();
  es.emitOpen();
  es.emitMessage('c1', { type: 'spotlight', data: endCard() });
  await sleep(50);
  assert(document.querySelector('.kit-spot-end'), 'drawn');
  clearSpotlight();
  l.stop();
});
