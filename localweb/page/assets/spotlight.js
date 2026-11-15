// spotlight.js: one step of the getting-started walk on the real page. The
// tour's ring goes on the control with a two-line note beside it ("2 of 9",
// what to press, why), and nothing blocks the page: the learner presses the
// real control. live() draws a {type: "spotlight"} event with it on every kit
// page (pageserve's POST /api/kit/spotlight sends one), so a tool's page needs
// no code of its own: only data-walk hooks.
//
// A step is { n, of, tool, walk, title, note, look, ok }: walk names the
// control's data-walk hook. The learner's click is the signal the step is
// done: a click on the ringed control (or, for a text box or a form, its form
// being submitted) clears the ring and posts {type: "kit:spotlight-done", n,
// tool, walk} to window.parent (proj's split page; the same channel as
// kit.forward). The listener runs in the capture phase, so the tool's own
// handler still runs. A step with ok puts an ok button on the note, which is
// the step's only done (the split page's first note). While the control isn't
// on the page (the agent is still preparing it) the note waits with "Your
// agent is getting this ready…", and the control is ringed the moment it
// appears.
//
// The note never covers what the learner reads or selects: it goes beside the
// control on a side with no text (right, left, below, above), else in the
// window's margin at the control's height, else in a corner; the waiting note
// takes the corner with the least text under it. The text is every line of
// words on the page and every box or editable document. With no clear spot
// in view, the control is scrolled to the middle of its scroller once, which
// usually leaves room beside it.
//
// The lit control carries data-walk-lit while its step shows, and keeps it
// through the click that ends the step (the tool's own handler still sees
// it), so a tool can make the walk's press do the whole step: diazo's Choose
// also sends the choice.
import { h } from './dom.js';

const MARGIN = 8;
const GAP = 12;
const FIELDS = 'textarea, select, input:not([type=button],[type=submit],[type=hidden],[type=checkbox],[type=radio]), [contenteditable=""], [contenteditable="true"]';
let lits = 0;

let current = null;

// clearSpotlight takes the step shown away, if any.
export function clearSpotlight() {
  if (!current) return;
  current.stop();
  current = null;
}

// isTextBox: a control the learner types into, which is done when sent.
const isTextBox = e => e.matches('form, textarea, [contenteditable=""], [contenteditable="true"], input:not([type=button],[type=submit],[type=checkbox],[type=radio],[type=reset])')
  || !!e.querySelector('textarea, [contenteditable=""], [contenteditable="true"], input:not([type=button],[type=submit],[type=checkbox],[type=radio],[type=reset],[type=hidden])');

export async function spotlight(step) {
  clearSpotlight();
  if (!step || !step.walk) return;
  const sel = `[data-walk="${CSS.escape(step.walk)}"]`;
  const ring = h('div', { class: 'kit-spot-ring', hidden: true });
  const waiting = h('p', { class: 'kit-spot-wait', hidden: true }, 'Your agent is getting this ready…');
  const okBtn = step.ok ? h('button', { class: 'kit-btn fill kit-spot-ok', type: 'button' }, 'ok') : null;
  const card = h('div', { class: 'kit-spot-card', role: 'status', 'aria-live': 'polite', hidden: true, 'data-walk-step': String(step.n || '') },
    h('p', { class: 'kit-spot-count' }, step.n && step.of ? `${step.n} of ${step.of}` : ''),
    h('p', { class: 'kit-spot-title' }, step.title || ''),
    step.note ? h('p', { class: 'kit-spot-note' }, step.note) : null,
    waiting,
    okBtn ? h('div', { class: 'kit-spot-acts' }, okBtn) : null);
  document.body.append(ring, card);

  let stopped = false, timer = 0, seen = false, lit = null, centred = false;
  const litMark = String(++lits);
  // unlight takes data-walk-lit off the control it is on, unless a newer
  // step lit that control since.
  const unlight = e => { if (e && e.getAttribute('data-walk-lit') === litMark) e.removeAttribute('data-walk-lit'); };
  // Its own ring and note move on every place; only the page's changes count.
  const watch = new MutationObserver(ms => {
    if (ms.some(m => m.target !== ring && !card.contains(m.target))) place();
  });
  const me = {
    // stop takes the step away; later keeps data-walk-lit until the click
    // that ended it has reached the tool.
    stop(later = false) {
      stopped = true;
      const was = lit;
      if (later) setTimeout(() => unlight(was), 0);
      else unlight(was);
      clearInterval(timer);
      watch.disconnect();
      removeEventListener('scroll', place, true);
      removeEventListener('resize', place);
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('submit', onSubmit, true);
      ring.remove();
      card.remove();
    },
  };
  current = me;

  const target = () => {
    const e = document.querySelector(sel);
    return e && e.getBoundingClientRect().width > 0 ? e : null;
  };
  // place puts the ring on the control and the note beside it, or the note
  // waiting off the text while the control isn't on the page.
  function place() {
    if (stopped) return;
    const t = target();
    if (t && !seen) t.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    seen = !!t;
    if (t !== lit) {
      unlight(lit);
      lit = t;
      if (t) t.setAttribute('data-walk-lit', litMark);
    }
    const view = { width: innerWidth, height: innerHeight };
    card.hidden = false;
    card.classList.toggle('kit-spot-lost', !t);
    waiting.hidden = !!t;
    ring.hidden = !t;
    const cs = { width: card.offsetWidth, height: card.offsetHeight };
    let p;
    if (t) {
      const r = t.getBoundingClientRect();
      Object.assign(ring.style, { left: `${r.x}px`, top: `${r.y}px`, width: `${r.width}px`, height: `${r.height}px` });
      p = spot(beside(r, cs, view), r, cs, view, t, card);
      if (p.under > 0 && !centred) {
        centred = true;
        t.scrollIntoView({ block: 'center', inline: 'nearest' });
        const r2 = t.getBoundingClientRect();
        Object.assign(ring.style, { left: `${r2.x}px`, top: `${r2.y}px`, width: `${r2.width}px`, height: `${r2.height}px` });
        p = spot(beside(r2, cs, view), r2, cs, view, t, card);
      }
    } else {
      p = spot(corners(cs, view), null, cs, view, null, card);
    }
    card.style.left = `${p.x}px`;
    card.style.top = `${p.y}px`;
  }
  // done is the learner's click landing: the ring goes and the split page
  // hears which step it was.
  function done() {
    if (current === me) current = null;
    me.stop(true);
    const to = globalThis.parent || globalThis;
    to.postMessage({ type: 'kit:spotlight-done', n: step.n, tool: step.tool, walk: step.walk }, '*');
  }
  const inside = (t, n) => n instanceof Node && (t.contains(n) || n.contains(t));
  function onClick(e) {
    if (step.ok) return;
    const t = document.querySelector(sel);
    if (t && !isTextBox(t) && e.target instanceof Node && t.contains(e.target)) done();
  }
  function onSubmit(e) {
    if (step.ok) return;
    const t = document.querySelector(sel);
    if (t && isTextBox(t) && inside(t, e.target)) done();
  }
  if (okBtn) okBtn.addEventListener('click', done);

  place();
  watch.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-walk', 'hidden', 'class', 'style'] });
  addEventListener('scroll', place, true);
  addEventListener('resize', place);
  document.addEventListener('click', onClick, true);
  document.addEventListener('submit', onSubmit, true);
  // The page moves under it too (a card opening, a pane folding).
  timer = setInterval(place, 250);
}

// beside lists where the note may go for a control at r, best first: beside
// it, then in the window's margin at its height, then the corners.
function beside(r, cs, view) {
  const y = clamp(r.y, MARGIN, view.height - cs.height - MARGIN);
  const x = clamp(r.x, MARGIN, view.width - cs.width - MARGIN);
  return [
    { x: r.right + GAP, y },
    { x: r.x - GAP - cs.width, y },
    { x, y: r.bottom + GAP },
    { x, y: r.y - GAP - cs.height },
    { x: view.width - cs.width - MARGIN, y },
    { x: MARGIN, y },
    ...corners(cs, view),
  ];
}

// corners lists the window's corners, bottom right first, then its middle.
function corners(cs, view) {
  const right = view.width - cs.width - MARGIN, bottom = view.height - cs.height - MARGIN;
  return [
    { x: right, y: bottom }, { x: right, y: MARGIN }, { x: MARGIN, y: bottom }, { x: MARGIN, y: MARGIN },
    { x: (view.width - cs.width) / 2, y: (view.height - cs.height) / 2 },
  ];
}

const clamp = (v, lo, hi) => Math.max(lo, Math.min(v, Math.max(lo, hi)));
const overlap = (a, b) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));

// textBoxes is where the page's words and fields are in view: each line box
// of every text node, and every field or editable document, leaving out the
// note itself and the control's own label.
function textBoxes(view, t, card) {
  const out = [];
  const seen = b => b.width >= 1 && b.height >= 1 && b.bottom > 0 && b.top < view.height && b.right > 0 && b.left < view.width;
  for (const e of document.querySelectorAll(FIELDS)) {
    if (card.contains(e) || (t && t.contains(e))) continue;
    const b = e.getBoundingClientRect();
    if (seen(b)) out.push(b);
  }
  const range = document.createRange();
  const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode: n => (!n.textContent.trim() || card.contains(n) || (t && t.contains(n)) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
  });
  for (let n = walk.nextNode(), k = 0; n && k < 4000; n = walk.nextNode(), k++) {
    const p = n.parentElement;
    if (p && (p.closest('script, style, template, [hidden]'))) continue;
    range.selectNodeContents(n);
    for (const b of range.getClientRects()) if (seen(b)) out.push(b);
  }
  return out;
}

// spot picks the first place that is in the window, off the control (r) and
// over no words; else the in-window place with the fewest under it. under is
// how much text the place covers.
function spot(places, r, cs, view, t, card) {
  const text = textBoxes(view, t, card);
  let best = null, least = Infinity;
  for (const p of places) {
    const box = { left: p.x, top: p.y, right: p.x + cs.width, bottom: p.y + cs.height };
    if (box.left < MARGIN - 0.5 || box.top < MARGIN - 0.5 || box.right > view.width - MARGIN + 0.5 || box.bottom > view.height - MARGIN + 0.5) continue;
    if (r && overlap(box, { left: r.left - GAP / 2, top: r.top - GAP / 2, right: r.right + GAP / 2, bottom: r.bottom + GAP / 2 }) > 0) continue;
    let under = 0;
    for (const b of text) under += overlap(box, b);
    if (under === 0) return { ...p, under };
    if (under < least) { least = under; best = { ...p, under }; }
  }
  return best || { x: clamp((view.width - cs.width) / 2, MARGIN, view.width), y: clamp((view.height - cs.height) / 2, MARGIN, view.height), under: Infinity };
}

// resumeSpotlight draws the step the tool's serve holds now, for a page that
// opened after it was sent (GET url: the step, or 204 for none).
export async function resumeSpotlight(url = '/api/kit/spotlight') {
  try {
    const res = await fetch(url, { credentials: 'same-origin' });
    if (res.status !== 200) return;
    const step = await res.json();
    if (step && step.walk) await spotlight(step);
  } catch {
    // no spotlight route here: nothing to resume
  }
}
