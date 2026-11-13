// tour.js: Show me around, lifted from casebook's first-run walkthrough. A
// page registers its steps with tour(steps); start() pauses the page under an
// overlay that takes every click and key, outlines one control at a time with
// a short note beside it, and goes on with → or next (Esc or skip ends it).
// It never presses anything: the controls it points at can't be clicked under
// it. Done or skipped, it is marked seen (localStorage, per tool since each
// tool's page is its own origin), so startOnce() shows it only the first time.
// The guide offers it on the page's own section (guide.js, registeredTour).
//
// A step is { id, target, note, before }: target is a selector on the real
// page; before(), when given, readies the step (opens a pane) and returning
// false skips it. A step whose control doesn't appear within o.wait ms
// (default 4000) is skipped. o.seenKey names the flag (default kit.tour);
// o.onStart and o.onEnd(restore) let a page hold and resume what moves under
// it. History entries a step's own navigation makes are gone back over at
// the end; the user's own navigation (Back, a link) ends the tour there.
import { h } from './dom.js';

const MARGIN = 8;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(v, hi));
const sleep = ms => new Promise(r => setTimeout(r, ms));

// placeNote puts the note beside its control, inside the window and off the
// control: below it, else above, else to its left, else to its right (the
// first that fits); else in the middle of the window.
export function placeNote(target, card, view, gap = 12) {
  const maxX = Math.max(MARGIN, view.width - card.width - MARGIN);
  const maxY = Math.max(MARGIN, view.height - card.height - MARGIN);
  const x = clamp(target.x, MARGIN, maxX);
  const y = clamp(target.y, MARGIN, maxY);
  const below = target.y + target.height + gap;
  if (below + card.height <= view.height - MARGIN) return { x, y: below };
  const above = target.y - gap - card.height;
  if (above >= MARGIN) return { x, y: above };
  const left = target.x - gap - card.width;
  if (left >= MARGIN) return { x: left, y };
  const right = target.x + target.width + gap;
  if (right + card.width <= view.width - MARGIN) return { x: right, y };
  return {
    x: clamp((view.width - card.width) / 2, MARGIN, maxX),
    y: clamp((view.height - card.height) / 2, MARGIN, maxY),
  };
}

// waitFor polls for a shown element matching sel, up to ms.
async function waitFor(sel, ms) {
  const end = Date.now() + ms;
  for (;;) {
    const e = document.querySelector(sel);
    if (e && e.getBoundingClientRect().width > 0) return e;
    if (Date.now() > end) return null;
    await sleep(50);
  }
}

let registered = null;

// registeredTour is the tour this page registered last, or null.
export function registeredTour() {
  return registered;
}

export function tour(steps, o = {}) {
  const seenKey = o.seenKey || 'kit.tour';
  const wait = o.wait ?? 4000;
  let running = false;

  const seen = () => {
    try { return localStorage.getItem(seenKey) === 'seen'; } catch { return false; }
  };
  const markSeen = () => {
    try { localStorage.setItem(seenKey, 'seen'); } catch { /* no storage: it shows again */ }
  };

  function start() {
    if (running) return;
    running = true;
    if (o.onStart) o.onStart();
    const focused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const ring = h('div', { class: 'kit-tour-ring', hidden: true });
    const count = h('p', { class: 'kit-tour-count' });
    const note = h('p', { class: 'kit-tour-note' });
    const skipBtn = h('button', { class: 'kit-btn kit-tour-skip', type: 'button' }, 'skip');
    const nextBtn = h('button', { class: 'kit-btn fill kit-tour-next', type: 'button' }, 'next');
    const card = h('div', { class: 'kit-tour-card', hidden: true }, count, note, h('div', { class: 'kit-tour-acts' }, skipBtn, nextBtn));
    const overlay = h('div', { class: 'kit-tour', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Show me around' }, ring, card);
    document.body.append(overlay);

    let at = -1, ended = false, raf = 0, moving = false, pushed = 0;
    const onHash = () => { if (moving) pushed++; else finish(false); };
    window.addEventListener('hashchange', onHash);

    // placeNow puts the ring on the step's control and the note beside it.
    function placeNow() {
      const step = steps[at];
      const target = step ? document.querySelector(step.target) : null;
      if (target) {
        const r = target.getBoundingClientRect();
        Object.assign(ring.style, { left: `${r.x}px`, top: `${r.y}px`, width: `${r.width}px`, height: `${r.height}px` });
        const p = placeNote(r, { width: card.offsetWidth, height: card.offsetHeight }, { width: innerWidth, height: innerHeight });
        card.style.left = `${p.x}px`;
        card.style.top = `${p.y}px`;
      }
    }

    // place follows the step's control every frame.
    function place() {
      placeNow();
      raf = requestAnimationFrame(place);
    }

    // show goes to step i, or the first after it whose control is there.
    async function show(i) {
      for (; i < steps.length; i++) {
        const step = steps[i];
        if (step.before && (await step.before()) === false) continue;
        const target = await waitFor(step.target, wait);
        if (ended) return;
        if (!target) continue;
        target.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        at = i;
        overlay.dataset.step = step.id;
        count.textContent = `${i + 1} of ${steps.length}`;
        note.textContent = step.note;
        nextBtn.textContent = i === steps.length - 1 ? 'done' : 'next';
        ring.hidden = false;
        card.hidden = false;
        // Placed now, not on the next frame: a page whose frames lag (a background tab) would show the ring at 0,0 first.
        placeNow();
        nextBtn.focus();
        return;
      }
      finish();
    }

    function next() {
      if (moving || ended) return;
      moving = true;
      void show(at + 1).finally(() => { moving = false; });
    }

    // finish ends it; restore (done, skip, Esc) goes back over the tour's own
    // history entries, the user's own navigation (restore false) stays put.
    function finish(restore = true) {
      if (ended) return;
      ended = true;
      markSeen();
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('hashchange', onHash);
      overlay.remove();
      if (restore && pushed > 0) history.go(-pushed);
      if (focused && focused.isConnected) focused.focus();
      running = false;
      if (o.onEnd) o.onEnd(restore);
    }

    // onKey takes every key first: Esc skips, → goes on, Tab moves between the
    // two buttons, Enter and space press the focused one; the page's keys wait.
    function onKey(e) {
      e.stopImmediatePropagation();
      if (e.key === 'Escape') { e.preventDefault(); finish(); return; }
      if (e.key === 'ArrowRight') { e.preventDefault(); next(); return; }
      if (e.key === 'Tab') {
        e.preventDefault();
        (document.activeElement === nextBtn ? skipBtn : nextBtn).focus();
        return;
      }
      if ((e.target === skipBtn || e.target === nextBtn) && (e.key === 'Enter' || e.key === ' ')) return;
      e.preventDefault();
    }

    skipBtn.addEventListener('click', () => finish());
    nextBtn.addEventListener('click', () => next());
    window.addEventListener('keydown', onKey, true);
    raf = requestAnimationFrame(place);
    moving = true;
    void show(0).finally(() => { moving = false; });
  }

  const handle = {
    steps,
    start,
    seen,
    startOnce() { if (!seen()) start(); },
  };
  registered = handle;
  return handle;
}
