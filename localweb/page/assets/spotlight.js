// spotlight.js: one step of the getting-started walk on the real page. The
// tour's ring goes on the control with a two-line note beside it ("2 of 10",
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
// on the page (the agent is still preparing it) the note sits in the middle
// with "Your agent is getting this ready…", and the control is ringed the
// moment it appears.
import { h } from './dom.js';
import { placeNote } from './tour.js';

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

  let stopped = false, timer = 0, seen = false;
  // Its own ring and note move on every place; only the page's changes count.
  const watch = new MutationObserver(ms => {
    if (ms.some(m => m.target !== ring && !card.contains(m.target))) place();
  });
  const me = {
    stop() {
      stopped = true;
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
  // place puts the ring on the control and the note beside it, or the note in
  // the middle, waiting, while the control isn't on the page.
  function place() {
    if (stopped) return;
    const t = target();
    if (t && !seen) t.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    seen = !!t;
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
      p = placeNote(r, cs, view);
    } else {
      p = { x: Math.max(8, (view.width - cs.width) / 2), y: Math.max(8, (view.height - cs.height) / 2) };
    }
    card.style.left = `${p.x}px`;
    card.style.top = `${p.y}px`;
  }
  // done is the learner's click landing: the ring goes and the split page
  // hears which step it was.
  function done() {
    clearSpotlight();
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
