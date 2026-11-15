// spotlight.js: one step of the getting-started walk on the real page. The
// tour's ring goes on the control with a two-line note beside it ("2 of 10",
// what to press, why), and nothing blocks the page: the learner presses the
// real control, and that click clears it. live() draws a {type: "spotlight"}
// event with it on every kit page (pageserve's POST /api/kit/spotlight sends
// one), so a tool's page needs no code of its own: only data-walk hooks.
//
// A step is { n, of, tool, walk, title, note, look, ok }: walk names the
// control's data-walk hook; look is what to look for when it isn't there. It
// waits up to o.wait ms (default 5000) for the control to appear; one that
// never does, or goes away, gets the note in the middle of the window with
// "Look for …". ok puts an ok button on the note, which clears it and fires
// kit:spotlight-ok on window with the step (the split page's first note).
import { h } from './dom.js';
import { placeNote } from './tour.js';

const sleep = ms => new Promise(r => setTimeout(r, ms));

let current = null;

// clearSpotlight takes the step shown away, if any.
export function clearSpotlight() {
  if (!current) return;
  current.stop();
  current = null;
}

export async function spotlight(step, o = {}) {
  clearSpotlight();
  if (!step || !step.walk) return;
  const wait = o.wait ?? 5000;
  const sel = `[data-walk="${CSS.escape(step.walk)}"]`;
  const ring = h('div', { class: 'kit-spot-ring', hidden: true });
  const look = h('p', { class: 'kit-spot-look', hidden: true }, step.look ? `Look for ${step.look.replace(/\.$/, '')}.` : '');
  const okBtn = step.ok ? h('button', { class: 'kit-btn fill kit-spot-ok', type: 'button' }, 'ok') : null;
  const card = h('div', { class: 'kit-spot-card', role: 'status', 'aria-live': 'polite', hidden: true, 'data-walk-step': String(step.n || '') },
    h('p', { class: 'kit-spot-count' }, step.n && step.of ? `${step.n} of ${step.of}` : ''),
    h('p', { class: 'kit-spot-title' }, step.title || ''),
    step.note ? h('p', { class: 'kit-spot-note' }, step.note) : null,
    look,
    okBtn ? h('div', { class: 'kit-spot-acts' }, okBtn) : null);
  document.body.append(ring, card);

  let stopped = false, timer = 0;
  const me = {
    stop() {
      stopped = true;
      clearInterval(timer);
      removeEventListener('scroll', place, true);
      removeEventListener('resize', place);
      document.removeEventListener('click', onClick, true);
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
  // the middle with what to look for when the control isn't on the page.
  function place() {
    if (stopped) return;
    const t = target();
    const view = { width: innerWidth, height: innerHeight };
    card.hidden = false;
    card.classList.toggle('kit-spot-lost', !t);
    look.hidden = !!t;
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
  // A click on the control is the step done: the ring goes at once.
  function onClick(e) {
    const t = document.querySelector(sel);
    if (t && e.target instanceof Node && t.contains(e.target)) clearSpotlight();
  }
  if (okBtn) {
    okBtn.addEventListener('click', () => {
      clearSpotlight();
      dispatchEvent(new CustomEvent('kit:spotlight-ok', { detail: step }));
    });
  }

  const end = Date.now() + wait;
  while (!stopped && !target() && Date.now() < end) await sleep(50);
  if (stopped) return;
  const t = target();
  if (t) t.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  place();
  addEventListener('scroll', place, true);
  addEventListener('resize', place);
  document.addEventListener('click', onClick, true);
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
