// spotlight.js: one step of the getting-started walk on the real page. The
// tour's ring goes on the control with a two-line note beside it ("2 of 9",
// what to press, why), and nothing blocks the page: the learner presses the
// real control. live() draws a {type: "spotlight"} event with it on every kit
// page (pageserve's POST /api/kit/spotlight sends one), so a tool's page needs
// no code of its own: only data-walk hooks.
//
// A step is { n, of, tool, walk, ready, press, prepare, title, note, look, ok }: walk names the
// control's data-walk hook. The learner's click is the signal the step is
// done: a click on the ringed control (or, for a text box or a form, its form
// being submitted, or another data-walk control in its form being pressed,
// which the message names as also) clears the ring and posts {type:
// "kit:spotlight-done", n, tool, walk, also?} to window.parent (proj's split
// page; the same channel as kit.forward). The listener runs in the capture phase, so the tool's own
// handler still runs. A step with ok puts an ok button on the note, which is
// the step's only done (the split page's first note). While the control isn't
// on the page (the agent is still preparing it) the note shows the step's
// prepare line (what the agent is doing, what the learner will do next), or
// "Your agent is getting this ready…" under the title when it has none, with
// no ring; the moment the control appears the note switches to the title and
// note and the control is ringed. A step with ready names a data-walk hook
// that is on the page once the step is ready though its control appears only
// after the learner acts (galley's README, before a selection brings Add
// instruction): once that is there the note shows the title and note, still
// with no ring or ok button and placed as the waiting note is, and the ring
// lands when the control appears. A note taller than about 40% of the window
// scrolls inside itself.
//
// A walk's end card is { end: { tool, learned, next, next_tool } }: centred,
// no ring, "You learned" with the lines and what is next, and one filled
// button, "Go on to ‹next_tool›" or Done, which clears it and posts {type:
// "kit:walk-next", tool, next_tool} to window.parent (next_tool empty for
// Done).
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
// CONTEXT_WORDS is how many characters of words a container needs, beyond the
// control's own, to be what the step is about.
const CONTEXT_WORDS = 160;
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
  if (step && step.end) return endCard(step.end);
  if (!step || !step.walk) return;
  const sel = `[data-walk="${CSS.escape(step.walk)}"]`;
  const ring = h('div', { class: 'kit-spot-ring', hidden: true });
  const waiting = h('p', { class: step.prepare ? 'kit-spot-wait kit-spot-prep' : 'kit-spot-wait', hidden: true }, step.prepare || 'Your agent is getting this ready…');
  const title = h('p', { class: 'kit-spot-title' }, step.title || '');
  const note = step.note ? h('p', { class: 'kit-spot-note' }, step.note) : null;
  const okBtn = step.ok ? h('button', { class: 'kit-btn fill kit-spot-ok', type: 'button' }, 'ok') : null;
  const acts = okBtn ? h('div', { class: 'kit-spot-acts' }, okBtn) : null;
  const card = h('div', { class: 'kit-spot-card', role: 'status', 'aria-live': 'polite', hidden: true, 'data-walk-step': String(step.n || '') },
    h('p', { class: 'kit-spot-count' }, step.n && step.of ? `${step.n} of ${step.of}` : ''),
    title, note, waiting, acts);
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

  const shownEl = q => {
    const e = document.querySelector(q);
    return e && e.getBoundingClientRect().width > 0 ? e : null;
  };
  const target = () => shownEl(sel);
  const readySel = step.ready ? `[data-walk="${CSS.escape(step.ready)}"]` : '';
  // ready: the step is ready though its control isn't on the page yet.
  const ready = () => !!readySel && !!shownEl(readySel);
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
    // doing: the title and note show, with the control or once the step is
    // ready without it.
    const doing = !!t || ready();
    waiting.hidden = doing;
    // While preparing, a prepare line stands alone; with none, the title
    // shows above "getting this ready". The ok button waits for the control.
    title.hidden = !doing && !!step.prepare;
    if (note) note.hidden = !doing;
    if (acts) acts.hidden = !t;
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
  // also names another walk control the same press used (a reply box's
  // form whose other hooked button sends the words and does that step too).
  function done(also) {
    if (current === me) current = null;
    me.stop(true);
    const to = globalThis.parent || globalThis;
    const msg = { type: 'kit:spotlight-done', n: step.n, tool: step.tool, walk: step.walk };
    if (also) msg.also = also;
    to.postMessage(msg, '*');
  }
  const inside = (t, n) => n instanceof Node && (t.contains(n) || n.contains(t));
  function onClick(e) {
    if (step.ok) return;
    const t = document.querySelector(sel);
    if (!t || !(e.target instanceof Element)) return;
    if (!isTextBox(t)) {
      if (t.contains(e.target)) done();
      return;
    }
    // A text box is answered by its form's submit, or by a press on another
    // walk control in that form (diazo's "This is the direction" sends the
    // reply and settles the direction at once): done, naming that control.
    const form = t.closest('form');
    const other = e.target.closest('[data-walk]');
    if (form && other && other !== t && !other.contains(t) && form.contains(other)) done(other.getAttribute('data-walk'));
  }
  function onSubmit(e) {
    if (step.ok) return;
    const t = document.querySelector(sel);
    if (t && isTextBox(t) && inside(t, e.target)) done();
  }
  if (okBtn) okBtn.addEventListener('click', () => done());

  place();
  watch.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-walk', 'hidden', 'class', 'style'] });
  addEventListener('scroll', place, true);
  addEventListener('resize', place);
  document.addEventListener('click', onClick, true);
  document.addEventListener('submit', onSubmit, true);
  // The page moves under it too (a card opening, a pane folding).
  timer = setInterval(place, 250);
}

// endCard draws a walk's end card in the middle of the window: what the
// learner learned, what is next, and the button that starts the next walk
// (or ends them).
function endCard(end) {
  const label = end.next_tool ? `Go on to ${end.next_tool}` : 'Done';
  const btn = h('button', { class: 'kit-btn fill kit-spot-next', type: 'button' }, label);
  const card = h('div', { class: 'kit-spot-card kit-spot-end', role: 'dialog', 'aria-label': `${end.tool || 'Walk'}: you learned`, 'data-walk-end': end.tool || '' },
    h('p', { class: 'kit-spot-count' }, end.tool || ''),
    h('p', { class: 'kit-spot-title' }, 'You learned'),
    h('ul', { class: 'kit-spot-learned' }, ...(end.learned || []).map(l => h('li', {}, l))),
    end.next ? h('p', { class: 'kit-spot-note' }, end.next) : null,
    h('div', { class: 'kit-spot-acts' }, btn));
  document.body.append(card);
  const me = { stop() { card.remove(); } };
  current = me;
  btn.addEventListener('click', () => {
    if (current === me) current = null;
    me.stop();
    const to = globalThis.parent || globalThis;
    to.postMessage({ type: 'kit:walk-next', tool: end.tool || '', next_tool: end.next_tool || '' }, '*');
  });
  btn.focus({ preventScroll: true });
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

// context is what the step is about: the control's nearest container holding
// words of its own (a take above a reply box, the spec above Approve), short
// of the whole page. The note covers anything else first.
function context(t) {
  if (!t) return null;
  const own = (t.textContent || '').length;
  for (let e = t.parentElement; e && e !== document.body && e !== document.documentElement; e = e.parentElement) {
    if ((e.textContent || '').length - own >= CONTEXT_WORDS) return e;
  }
  return null;
}

// textBoxes is where the page's words and fields are in view: each line box
// of every text node, and every field or editable document, leaving out the
// note itself and the control's own label, and cut to what the containers
// that clip them (a scroller, a box with overflow hidden) leave in sight.
// near marks those in the control's context.
function textBoxes(view, t, card) {
  const out = [];
  const ctx = context(t);
  const clips = new Map();
  // clipOf is the part of the window el's clipping ancestors leave in sight.
  const clipOf = el => {
    if (!el || el === document.body || el === document.documentElement) return { left: 0, top: 0, right: view.width, bottom: view.height };
    if (clips.has(el)) return clips.get(el);
    let c = clipOf(el.parentElement);
    const st = getComputedStyle(el);
    if (st.overflowX !== 'visible' || st.overflowY !== 'visible') {
      const r = el.getBoundingClientRect();
      c = { left: Math.max(c.left, r.left), top: Math.max(c.top, r.top), right: Math.min(c.right, r.right), bottom: Math.min(c.bottom, r.bottom) };
    }
    clips.set(el, c);
    return c;
  };
  const cut = (b, c) => ({ left: Math.max(b.left, c.left), top: Math.max(b.top, c.top), right: Math.min(b.right, c.right), bottom: Math.min(b.bottom, c.bottom) });
  const seen = b => b.right - b.left >= 1 && b.bottom - b.top >= 1 && b.bottom > 0 && b.top < view.height && b.right > 0 && b.left < view.width;
  for (const e of document.querySelectorAll(FIELDS)) {
    if (card.contains(e) || (t && t.contains(e))) continue;
    const b = cut(e.getBoundingClientRect(), clipOf(e.parentElement));
    if (seen(b)) out.push({ b, near: !!ctx && ctx.contains(e) });
  }
  const range = document.createRange();
  const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode: n => (!n.textContent.trim() || card.contains(n) || (t && t.contains(n)) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
  });
  for (let n = walk.nextNode(), k = 0; n && k < 4000; n = walk.nextNode(), k++) {
    const p = n.parentElement;
    if (p && (p.closest('script, style, template, [hidden]'))) continue;
    range.selectNodeContents(n);
    const near = !!ctx && ctx.contains(n);
    const c = clipOf(p);
    for (const r of range.getClientRects()) {
      const b = cut(r, c);
      if (seen(b)) out.push({ b, near });
    }
  }
  return out;
}

// spot picks the first place that is in the window, off the control (r) and
// over no words; else the in-window place that covers the fewest words of the
// control's context, then the fewest words at all. under is how much text the
// place covers.
function spot(places, r, cs, view, t, card) {
  const text = textBoxes(view, t, card);
  let best = null, leastNear = Infinity, least = Infinity;
  for (const p of places) {
    const box = { left: p.x, top: p.y, right: p.x + cs.width, bottom: p.y + cs.height };
    if (box.left < MARGIN - 0.5 || box.top < MARGIN - 0.5 || box.right > view.width - MARGIN + 0.5 || box.bottom > view.height - MARGIN + 0.5) continue;
    if (r && overlap(box, { left: r.left - GAP / 2, top: r.top - GAP / 2, right: r.right + GAP / 2, bottom: r.bottom + GAP / 2 }) > 0) continue;
    let under = 0, near = 0;
    for (const { b, near: n } of text) {
      const o = overlap(box, b);
      under += o;
      if (n) near += o;
    }
    if (under === 0) return { ...p, under };
    if (near < leastNear || (near === leastNear && under < least)) { leastNear = near; least = under; best = { ...p, under }; }
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
    if (step && (step.walk || step.end)) await spotlight(step);
  } catch {
    // no spotlight route here: nothing to resume
  }
}
