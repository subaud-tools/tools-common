import { test, eq, assert, fixture } from './harness.js';
import { frame, collapsible, narrowMode } from '/_kit/frame.js';
import { createDrafts, sendBar } from '/_kit/drafts.js';
import { buttons, bar, band, h, emptyCard } from '/_kit/dom.js';
import { indexSection, indexRow } from '/_kit/index.js';
import { filterRow } from '/_kit/frontpage.js';
import { thread } from '/_kit/thread.js';
import { railTabs } from '/_kit/tabs.js';
import { lineTip, wireTip } from '/_kit/tip.js';

const parts = (extra = {}) => ({
  name: 'tooltest',
  left: { panel: 'index', label: 'The plan' },
  centre: { label: 'Cards' },
  right: { panel: 'thread', label: 'Thread' },
  ...extra,
});

function clean() {
  for (const k of Object.keys(localStorage)) if (k.includes('.collapsed.')) localStorage.removeItem(k);
}

function mount(f) {
  const app = document.createElement('div');
  app.className = 'kit-app';
  app.append(document.createElement('div'), f.left, f.centre, f.right);
  fixture().append(app);
  return app;
}

test('frame: three columns of the app grid, each side with its toggle and body', () => {
  clean();
  const f = frame(parts());
  eq([f.left.tagName, f.centre.tagName, f.right.tagName], ['ASIDE', 'MAIN', 'ASIDE']);
  eq([f.left.className, f.centre.className, f.right.className],
    ['kit-list kit-col kit-left-col', 'kit-read kit-col kit-mid', 'kit-rail kit-col kit-right-col']);
  eq([f.left.getAttribute('aria-label'), f.centre.getAttribute('aria-label'), f.right.getAttribute('aria-label')], ['The plan', 'Cards', 'Thread']);
  eq([...f.left.children].map(c => c.className), ['kit-col-toggle', 'kit-col-body']);
  assert(f.left.lastChild === f.leftBody && f.right.lastChild === f.rightBody, 'the bodies are the handles');
  eq(f.left.firstChild.dataset.panel, 'index');
});

test('frame: a side the caller leaves out is not drawn', () => {
  clean();
  const f = frame(parts({ right: undefined }));
  assert(f.right === null && f.rightBody === null, 'no right column');
  assert(f.left && f.centre, 'the others are there');
});

test('frame: the toggle folds its side and says so', () => {
  clean();
  const f = frame(parts());
  mount(f);
  f.left.style.transition = 'none'; // the fold's slide would hide the width
  const t = f.left.firstChild;
  eq([t.textContent, t.title, t.getAttribute('aria-expanded')], ['‹', 'Hide the index', 'true']);
  eq(f.right.firstChild.textContent, '›');
  t.click();
  assert(f.left.classList.contains('kit-collapsed'), 'folded');
  eq([t.textContent, t.title, t.getAttribute('aria-expanded')], ['›', 'Show the index', 'false']);
  eq([getComputedStyle(f.left).width, getComputedStyle(f.leftBody).display], ['40px', 'none']);
  t.click();
  assert(!f.left.classList.contains('kit-collapsed'), 'unfolded');
  eq(getComputedStyle(f.left).width, '288px');
});

test('frame: a fold is remembered under <name>.collapsed.<panel>', () => {
  clean();
  const f = frame(parts());
  f.right.firstChild.click();
  eq(localStorage.getItem('tooltest.collapsed.thread'), '1');
  f.right.firstChild.click();
  eq(localStorage.getItem('tooltest.collapsed.thread'), '');
});

test('frame: it opens with the state diazo users already have, and another tool is apart', () => {
  clean();
  localStorage.setItem('diazo.collapsed.index', '1');
  assert(frame(parts({ name: 'diazo' })).left.classList.contains('kit-collapsed'), 'diazo.collapsed.index folds it');
  assert(!frame(parts({ name: 'other' })).left.classList.contains('kit-collapsed'), 'another tool has its own');
  clean();
});

test('frame: moving through cards never changes the column', () => {
  clean();
  const f = frame(parts());
  mount(f);
  assert(!('setRightEmpty' in f), 'nothing a card holds can reach the column');
  assert(!f.right.classList.contains('kit-collapsed'), 'nothing remembered: open');
  f.right.firstChild.click();
  const again = frame(parts());
  assert(again.right.classList.contains('kit-collapsed'), 'closed by hand, closed on the next frame');
  eq(localStorage.getItem('tooltest.collapsed.thread'), '1');
});

test('frame: a press survives a new frame on the same name, and a remembered 1 alone folds', () => {
  clean();
  const f = frame(parts());
  f.right.firstChild.click();
  assert(frame(parts()).right.classList.contains('kit-collapsed'), 'the press is kept');
  localStorage.setItem('tooltest.collapsed.thread', '');
  localStorage.setItem('tooltest.collapsed.thread.card', 'F1');
  assert(!frame(parts()).right.classList.contains('kit-collapsed'), 'anything but 1 starts open, and the old per-card hold means nothing');
  clean();
});

test('collapsible: folded starts it folded and leaves what the page remembers alone', () => {
  clean();
  const col = document.createElement('aside');
  const body = document.createElement('div');
  collapsible({ col, body, panel: 'index', side: 'left', name: 'tooltest', folded: true });
  assert(col.classList.contains('kit-collapsed'), 'folded');
  eq(localStorage.getItem('tooltest.collapsed.index'), null);
});

// A window whose width the test sets, 800 to start: fire(true) drags it to
// 800 (one at a time), fire(false) to 1600 (wide), fire(n) to n. Each query is
// a (width <= Npx), and a listener hears only a change of its own query.
function withWidth(run) {
  const real = window.matchMedia;
  let width = 800;
  const heard = [];
  const queries = [];
  const mqs = [];
  window.matchMedia = q => {
    queries.push(q);
    const max = Number(/\(width <= (\d+)px\)/.exec(q)[1]);
    const mq = {
      get matches() { return width <= max; },
      addEventListener: (_, f) => heard.push([mq, f]),
      removeEventListener: (_, f) => {
        const i = heard.findIndex(([m, g]) => m === mq && g === f);
        if (i >= 0) heard.splice(i, 1);
      },
    };
    mqs.push(mq);
    return mq;
  };
  const fire = w => {
    const was = new Map(mqs.map(m => [m, m.matches]));
    width = w === true ? 800 : w === false ? 1600 : w;
    for (const [m, f] of [...heard]) if (m.matches !== was.get(m)) f({ matches: m.matches });
  };
  try {
    return run(fire, { queries, heard });
  } finally {
    window.matchMedia = real;
  }
}

function narrowed(extra = {}) {
  clean();
  const f = frame(parts());
  const app = mount(f);
  const seen = [];
  const n = narrowMode({ root: app, left: f.left, right: f.right, onShow: s => seen.push(s), ...extra });
  return { f, app, n, seen };
}

const stateOf = ({ app }) => (app.classList.contains('kit-narrow-left') ? 'left' : app.classList.contains('kit-narrow-right') ? 'right' : null);
const stored = () => Object.keys(localStorage).filter(k => k.includes('.collapsed.')).sort().map(k => [k, localStorage.getItem(k)]);

test('narrowMode: at 999 or less the page is narrow on the card, and it follows the window', () => {
  withWidth((fire, { queries }) => {
    const p = narrowed();
    eq(queries, ['(width <= 999px)', '(width <= 1319px)']);
    assert(p.app.classList.contains('kit-narrow'), 'narrow');
    eq(stateOf(p), null);
    fire(false);
    assert(!p.app.classList.contains('kit-narrow'), 'wide again');
    fire(true);
    assert(p.app.classList.contains('kit-narrow'), 'narrow again');
  });
});

test('narrowMode: closed sides are 40px strips whatever kit-collapsed says, and the centre has the rest', () => {
  withWidth(() => {
    const { f, app } = narrowed();
    app.style.width = '800px';
    assert(!f.left.classList.contains('kit-collapsed'), 'the fold says open');
    eq([f.left.offsetWidth, f.right.offsetWidth, f.centre.offsetWidth], [40, 40, 720]);
    eq(getComputedStyle(f.leftBody).display, 'none');
    eq(app.scrollWidth, 800);
  });
});

test('narrowMode: a press moves the state, and the open side takes the centre track', () => {
  withWidth(() => {
    const p = narrowed();
    p.app.style.width = '800px';
    p.f.left.firstChild.click();
    eq(stateOf(p), 'left');
    eq(p.seen, ['left']);
    eq([p.f.left.offsetWidth, p.f.right.offsetWidth], [760, 40]);
    eq(getComputedStyle(p.f.centre).visibility, 'hidden');
    assert(getComputedStyle(p.f.leftBody).display !== 'none', 'the body shows');
    eq(p.app.scrollWidth, 800);
  });
});

test('narrowMode: a press on the open side returns to the card', () => {
  withWidth(() => {
    const p = narrowed();
    p.f.right.firstChild.click();
    eq(stateOf(p), 'right');
    p.f.right.firstChild.click();
    eq(stateOf(p), null);
    eq(p.seen, ['right', null]);
    eq(getComputedStyle(p.f.centre).visibility, 'visible');
  });
});

test('narrowMode: a press on the other strip moves straight there', () => {
  withWidth(() => {
    const p = narrowed();
    p.f.left.firstChild.click();
    p.f.right.firstChild.click();
    eq(stateOf(p), 'right');
    eq(p.seen, ['left', 'right']);
  });
});

test('narrowMode: show moves the state and tells onShow only of a change', () => {
  withWidth(() => {
    const p = narrowed();
    p.n.show('right');
    p.n.show('right');
    p.n.show(null);
    eq(p.seen, ['right', null]);
  });
});

test('narrowMode: presses leave what is remembered untouched', () => {
  withWidth(() => {
    const p = narrowed();
    const before = stored();
    p.f.left.firstChild.click();
    p.f.right.firstChild.click();
    p.f.right.firstChild.click();
    eq(stored(), before);
    assert(!p.f.left.classList.contains('kit-collapsed') && !p.f.right.classList.contains('kit-collapsed'), 'the folds stay');
  });
});

test('narrowMode: the toggle follows the state while narrow and the fold again when wide', () => {
  withWidth(fire => {
    const { f, n } = narrowed();
    const face = t => [t.textContent, t.title, t.getAttribute('aria-expanded')];
    const l = f.left.firstChild;
    const r = f.right.firstChild;
    eq(face(l), ['›', 'Show the index', 'false']);
    eq(face(r), ['‹', 'Show the thread', 'false']);
    l.click();
    eq(face(l), ['‹', 'Hide the index', 'true']);
    n.show('right');
    eq(face(l), ['›', 'Show the index', 'false']);
    eq(face(r), ['›', 'Hide the thread', 'true']);
    fire(false);
    eq(face(l), ['‹', 'Hide the index', 'true']);
    eq(face(r), ['›', 'Hide the thread', 'true']);
  });
});

test('narrowMode: leaving narrow clears the state, and a wide press folds and is remembered', () => {
  withWidth(fire => {
    const p = narrowed();
    p.f.left.firstChild.click();
    fire(false);
    eq(stateOf(p), null);
    eq(p.seen, ['left', null]);
    p.f.left.firstChild.click();
    assert(p.f.left.classList.contains('kit-collapsed'), 'folded');
    eq(localStorage.getItem('tooltest.collapsed.index'), '1');
    fire(true);
    eq(stateOf(p), null);
    fire(false);
    assert(p.f.left.classList.contains('kit-collapsed'), 'the wide choice survives narrow');
  });
});

test('narrowMode: show does nothing while the page is wide', () => {
  withWidth(fire => {
    const p = narrowed();
    fire(false);
    p.n.show('left');
    eq(stateOf(p), null);
    eq(p.seen, []);
  });
});

test('narrowMode: a count is a badge under the toggle, absent at zero, and shown only on a closed strip', () => {
  withWidth(fire => {
    const { f, n } = narrowed();
    const badge = () => f.right.querySelector(':scope > .kit-col-count');
    assert(!badge(), 'none to start');
    n.setCount('right', 3);
    eq(badge().textContent, '3');
    assert(f.right.firstChild.nextElementSibling === badge(), 'under the toggle');
    assert(badge().getBoundingClientRect().top >= f.right.firstChild.getBoundingClientRect().bottom, 'below it on the strip');
    n.setCount('right', 4);
    eq(f.right.querySelectorAll('.kit-col-count').length, 1);
    eq(badge().textContent, '4');
    n.show('right');
    eq(getComputedStyle(badge()).display, 'none');
    n.show(null);
    fire(false);
    eq(getComputedStyle(badge()).display, 'none');
    fire(true);
    n.setCount('right', 0);
    assert(!badge(), 'gone at zero');
  });
});

test('narrowMode: at wide widths a count shows on a closed right strip, not on an open one, and never on the left', () => {
  withWidth(fire => {
    const { f, n } = narrowed();
    f.right.style.transition = 'none';
    fire(false);
    n.setCount('right', 2);
    n.setCount('left', 2);
    const badge = col => col.querySelector(':scope > .kit-col-count');
    eq(getComputedStyle(badge(f.right)).display, 'none');
    f.right.firstChild.click();
    eq(getComputedStyle(badge(f.right)).display, 'block');
    eq(badge(f.right).textContent, '2');
    assert(badge(f.right).getBoundingClientRect().top >= f.right.firstChild.getBoundingClientRect().bottom, 'below the toggle on the strip');
    assert(badge(f.right).getBoundingClientRect().right <= f.right.getBoundingClientRect().right, 'inside the strip');
    f.right.firstChild.click();
    eq(getComputedStyle(badge(f.right)).display, 'none');
    f.left.firstChild.click();
    eq(getComputedStyle(badge(f.left)).display, 'none');
    clean();
  });
});

test('narrowMode: a page with one side has only that strip', () => {
  withWidth(() => {
    clean();
    const f = frame(parts({ right: undefined }));
    const app = document.createElement('div');
    app.className = 'kit-app';
    app.append(document.createElement('div'), f.left, f.centre);
    fixture().append(app);
    const n = narrowMode({ root: app, left: f.left });
    n.setCount('right', 2);
    n.show('right');
    assert(!app.classList.contains('kit-narrow-right'), 'no such side');
    f.left.firstChild.click();
    assert(app.classList.contains('kit-narrow-left'), 'the side it has');
  });
});

test('narrowMode: stop lets go of the window', () => {
  withWidth((fire, { heard }) => {
    const { n } = narrowed();
    eq(heard.length, 2);
    n.stop();
    eq(heard.length, 0);
  });
});

// The two-column layout (kit-two), from 1000 to 1319 wide: one side open
// beside the centre, the other a strip.
const twoOf = ({ app }) => (app.classList.contains('kit-two-left') ? 'left' : app.classList.contains('kit-two-right') ? 'right' : null);

test('narrowMode: from 1000 to 1319 the page is two columns, and it follows the window', () => {
  withWidth(fire => {
    fire(1180);
    const p = narrowed();
    assert(p.app.classList.contains('kit-two') && !p.app.classList.contains('kit-narrow'), 'two columns at 1180');
    fire(1000);
    assert(p.app.classList.contains('kit-two'), 'two columns at 1000');
    fire(999);
    assert(p.app.classList.contains('kit-narrow') && !p.app.classList.contains('kit-two'), 'one at a time at 999');
    fire(1319);
    assert(p.app.classList.contains('kit-two'), 'two columns at 1319');
    fire(1320);
    assert(!p.app.classList.contains('kit-two') && !p.app.classList.contains('kit-narrow'), 'three columns at 1320');
  });
});

test('narrowMode: in two columns an item page opens on its right side, a front page on its left', () => {
  withWidth(fire => {
    fire(1180);
    const p = narrowed();
    eq(twoOf(p), 'right');
    eq(p.seen, ['right']);
    clean();
    const f = frame(parts({ right: undefined }));
    const app = document.createElement('div');
    app.className = 'kit-app';
    app.append(document.createElement('div'), f.left, f.centre);
    fixture().append(app);
    narrowMode({ root: app, left: f.left });
    eq(twoOf({ app }), 'left');
  });
});

test('narrowMode: in two columns a press on a strip opens it and folds the other', () => {
  withWidth(fire => {
    fire(1180);
    const p = narrowed();
    p.f.left.firstChild.click();
    eq(twoOf(p), 'left');
    p.f.right.firstChild.click();
    eq(twoOf(p), 'right');
    eq(p.seen, ['right', 'left', 'right']);
  });
});

test('narrowMode: in two columns a press on the open side\'s toggle leaves two strips', () => {
  withWidth(fire => {
    fire(1180);
    const p = narrowed();
    p.app.style.width = '1180px';
    p.f.right.firstChild.click();
    eq(twoOf(p), null);
    eq(p.seen, ['right', null]);
    eq([p.f.left.offsetWidth, p.f.right.offsetWidth, p.f.centre.offsetWidth], [44, 44, 1180 - 88]);
    p.n.show('right');
    eq(twoOf(p), 'right');
    p.n.show(null);
    eq(twoOf(p), null);
  });
});

test('narrowMode: moving between the three layouts goes back to each one\'s default', () => {
  withWidth(fire => {
    const p = narrowed();
    p.f.left.firstChild.click();
    eq(stateOf(p), 'left');
    fire(1180);
    eq([stateOf(p), twoOf(p)], [null, 'right']);
    p.f.left.firstChild.click();
    fire(1600);
    eq([stateOf(p), twoOf(p)], [null, null]);
    fire(1180);
    eq(twoOf(p), 'right');
    p.f.right.firstChild.click();
    fire(800);
    eq([stateOf(p), twoOf(p)], [null, null]);
    fire(1180);
    eq(twoOf(p), 'right');
  });
});

test('narrowMode: in two columns presses leave what is remembered untouched', () => {
  withWidth(fire => {
    fire(1180);
    const p = narrowed();
    const before = stored();
    p.f.left.firstChild.click();
    p.f.right.firstChild.click();
    p.f.right.firstChild.click();
    eq(stored(), before);
    assert(!p.f.left.classList.contains('kit-collapsed') && !p.f.right.classList.contains('kit-collapsed'), 'the folds stay');
  });
});

test('layout: at 1180 the middle column is the window less the 384px right column and a 44px strip', async () => {
  const p = await layoutPage(1180);
  const n = laid(p);
  assert(p.app.classList.contains('kit-two-right'), 'the right side is open');
  near(box(p.f.left).width, 44, 'the left strip');
  near(box(p.f.right).width, 384, 'the right column');
  near(box(p.f.centre).width, 1180 - 384 - 44, 'the middle');
  eq(p.doc.documentElement.scrollWidth, 1180);
  n.stop();
});

// A layout page as a touch screen draws it: its kit.css taken whole, with the
// (pointer: coarse) rules made to hold. o is frame's options; mode is the
// layout narrowMode gives it, by the window's own width.
async function touchPage(w, o = {}) {
  const css = (await (await fetch('/_kit/kit.css')).text()).replaceAll('(pointer: coarse)', 'all');
  const p = await layoutPage(w, o);
  p.doc.querySelector('link[rel=stylesheet]').remove();
  p.doc.head.append(Object.assign(p.doc.createElement('style'), { textContent: css }));
  return p;
}

// laid runs narrowMode on p with its own window's widths, once the window has
// its size (a new frame's queries see its old one until it is laid out).
function laid(p) {
  void p.doc.documentElement.offsetWidth;
  const real = window.matchMedia;
  window.matchMedia = q => p.doc.defaultView.matchMedia(q);
  try {
    return narrowMode({ root: p.app, left: p.f.left, right: p.f.right });
  } finally {
    window.matchMedia = real;
  }
}

// reach is how far a press on a toggle lands on it, across its middle and
// down it, a pixel at a time.
function reach(doc, t) {
  const r = t.getBoundingClientRect();
  const on = (x, y) => t.contains(doc.elementFromPoint(x, y));
  const cx = r.left + r.width / 2;
  const cy = r.top + r.height / 2;
  let across = 0;
  let down = 0;
  for (let x = Math.floor(cx - 40); x <= cx + 40; x++) if (on(x, cy)) across++;
  for (let y = Math.floor(cy - 40); y <= cy + 40; y++) if (on(cx, y)) down++;
  return [across, down];
}

test('touch: on a coarse pointer at 800 an opened side fills the centre\'s track', async () => {
  for (const [side, other] of [['left', 'right'], ['right', 'left']]) {
    const p = await touchPage(800);
    const n = laid(p);
    p.f[side].firstChild.click();
    assert(p.app.classList.contains(`kit-narrow-${side}`), `${side} open`);
    near(box(p.f[side]).width, 800 - 44, `the open ${side} side`);
    near(box(p.f[other]).width, 44, `the ${other} strip`);
    assert(box(p.f[`${side}Body`]).width > 600, `the ${side} body shows: ${box(p.f[`${side}Body`]).width}`);
    n.stop();
  }
});

test('layout: in two columns a closed right strip holding tabs puts its toggle where every strip does', async () => {
  const p = await layoutPage(1180);
  p.f.rightBody.append(tabs(['Thread', 'Asks']).el);
  const n = laid(p);
  near(box(p.f.right.firstChild).top - box(p.f.right).top, 17, 'open: the toggle on the tabs\' line');
  p.f.right.firstChild.click();
  near(box(p.f.right.firstChild).top - box(p.f.right).top, 8, 'closed: 8px down, as every strip');
  n.stop();
});

test('narrowMode: centre goes back to the middle in one at a time, and moves nothing in two columns or wide', () => {
  withWidth(fire => {
    const p = narrowed();
    p.n.show('left');
    p.n.centre();
    eq(stateOf(p), null);
    fire(1180);
    eq(twoOf(p), 'right');
    p.n.centre();
    eq(twoOf(p), 'right');
    p.f.left.firstChild.click();
    p.n.centre();
    eq(twoOf(p), 'left');
    fire(1600);
    p.n.centre();
    eq(p.seen, ['left', null, 'right', 'left', null]);
  });
});

test('touch: on a coarse pointer every column toggle takes a press 44px across and down', async () => {
  for (const [w, what, cls] of [[800, 'one at a time', 'kit-narrow'], [1180, 'two columns', 'kit-two'], [1655, 'three columns', 'kit-app']]) {
    const p = await touchPage(w);
    const n = laid(p);
    assert(p.app.classList.contains(cls) && (cls !== 'kit-app' || !/kit-narrow|kit-two/.test(p.app.className)), `${what}: ${p.app.className}`);
    for (const col of [p.f.left, p.f.right]) {
      const [across, down] = reach(p.doc, col.firstChild);
      assert(across >= 44 && down >= 44, `${what}, ${col.getAttribute('aria-label')}: ${across} by ${down}`);
      near(box(col.firstChild).width, 25, `${what}: the toggle is drawn as before`);
    }
    n.stop();
  }
  const p = await touchPage(1655);
  p.f.left.firstChild.click();
  const [across, down] = reach(p.doc, p.f.left.firstChild);
  assert(across >= 44 && down >= 44, `a folded strip at three columns: ${across} by ${down}`);
});

test('touch: with a fine pointer a column toggle is drawn and pressed at 25px, as before', async () => {
  const p = await layoutPage(1655);
  assert(p.doc.defaultView.matchMedia('(pointer: fine)').matches, 'the test window has a fine pointer');
  const t = p.f.right.firstChild;
  eq([box(t).width, box(t).height], [25, 25]);
  const [across, down] = reach(p.doc, t);
  assert(across <= 26 && down <= 26, `pressed only on the button: ${across} by ${down}`);
});

function tipped(when) {
  const trigger = document.createElement('button');
  const tip = lineTip('all of it');
  const box = document.createElement('span');
  box.className = 'kit-tip-at';
  box.append(trigger, tip);
  const outside = document.createElement('button');
  fixture().append(box, outside);
  wireTip(box, trigger, tip, when);
  return { box, trigger, tip, outside };
}

test('tip: a press opens it in the window, on top of whatever scrolls', () => {
  const { box, trigger, tip } = tipped();
  eq([tip.getAttribute('role'), tip.className, tip.textContent], ['tooltip', 'kit-tip', 'all of it']);
  eq(getComputedStyle(tip).display, 'none');
  trigger.click();
  assert(box.classList.contains('show'), 'shown');
  eq(trigger.getAttribute('aria-expanded'), 'true');
  eq([getComputedStyle(tip).display, getComputedStyle(tip).position], ['block', 'fixed']);
  assert(tip.style.top && tip.style.left, 'placed');
});

test('tip: it goes over its box where the window has no room below', () => {
  const { box, trigger, tip } = tipped();
  box.style.cssText = `position:fixed; top:${innerHeight - 30}px; left:40px`;
  trigger.click();
  assert(parseFloat(tip.style.top) < box.getBoundingClientRect().top, `tip top ${tip.style.top}`);
});

test('tip: Esc closes it', () => {
  const { box, trigger } = tipped();
  trigger.click();
  trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  assert(!box.classList.contains('show'), 'closed');
});

test('tip: the next tap elsewhere closes it', () => {
  const { box, trigger, outside } = tipped();
  trigger.click();
  outside.click();
  assert(!box.classList.contains('show'), 'closed');
  eq(trigger.getAttribute('aria-expanded'), 'false');
});

test('tip: Enter toggles it from the keyboard', () => {
  const { box, trigger } = tipped();
  trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  assert(box.classList.contains('show'), 'opened');
});

test('tip: a press with nothing to show goes to what is under it', () => {
  const { box, trigger } = tipped(() => false);
  let reached = false;
  box.parentElement.addEventListener('click', () => (reached = true), { once: true });
  trigger.click();
  assert(!box.classList.contains('show'), 'stays shut');
  assert(reached, 'the press carried on');
});

// A sandboxed frame without allow-same-origin (diazo's mockup view) throws on
// reaching localStorage at all.
function withoutStorage(run) {
  const was = Object.getOwnPropertyDescriptor(window, 'localStorage');
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    get() { throw new DOMException('denied', 'SecurityError'); },
  });
  try {
    run();
  } finally {
    Object.defineProperty(window, 'localStorage', was);
  }
}

test('frame: draws where storage is blocked, and folds without remembering', () => {
  clean();
  withoutStorage(() => {
    const f = frame(parts());
    mount(f);
    assert(!f.left.classList.contains('kit-collapsed'), 'nothing remembered: open');
    f.left.firstChild.click();
    assert(f.left.classList.contains('kit-collapsed'), 'the press still folds');
    f.right.firstChild.click();
    assert(f.right.classList.contains('kit-collapsed'), 'the thread folds the same');
    assert(frame(parts()).right.classList.contains('kit-collapsed') === false, 'with nowhere to keep it, a new frame starts open');
  });
  eq(localStorage.getItem('tooltest.collapsed.index'), null);
});

// ---- the locked send bar: frame's foot holds it on the centre's bottom edge

test('frame: foot puts the bar in a kit-sendfoot, the centre\'s last child, and null takes it away', () => {
  clean();
  const f = frame(parts());
  mount(f);
  const content = document.createElement('p');
  f.centre.append(content);
  const bar = sendBar({ count: '0 of 1', sends: 0, hint: '', discard() {}, send() {} });
  f.foot(bar);
  const foot = f.centre.lastElementChild;
  eq(foot.className, 'kit-sendfoot');
  assert(foot.firstElementChild === bar && foot.children.length === 1, 'the bar is in it');
  f.centre.replaceChildren(content);
  const again = sendBar({ count: '1 of 1', sends: 1, hint: '', discard() {}, send() {} });
  f.foot(again);
  assert(f.centre.lastElementChild === foot && foot.firstElementChild === again, 'after a redraw it goes back last, holding the new bar');
  f.foot(null);
  assert(!f.centre.querySelector('.kit-sendfoot'), 'gone when empty');
});

// A page of the frame in its own window, w wide and 700 high, so the kit's
// widths (the phone rules at 640 or less) are the window's.
async function sized(w) {
  const win = document.createElement('iframe');
  win.style.cssText = `width:${w}px; height:700px; border:0; display:block`;
  win.srcdoc = '<!doctype html><link rel="stylesheet" href="/_kit/kit.css"><style>html,body{height:100%;margin:0}</style><body>';
  const loaded = new Promise(r => win.addEventListener('load', r, { once: true }));
  fixture().append(win);
  await loaded;
  return win.contentDocument;
}

// footPage draws a short or long page of drafts w wide. css is a tool's own
// stylesheet; wrapped puts the content in a centred wrapper as muda's and
// cull's centres are; place: false leaves the bar for the test to place.
async function footPage(w, long, { css = '', wrapped = false, place = true } = {}) {
  clean();
  const doc = await sized(w);
  if (css) doc.head.append(Object.assign(doc.createElement('style'), { textContent: css }));
  const f = frame(parts());
  const app = doc.createElement('div');
  app.className = w <= 999 ? 'kit-app kit-narrow' : 'kit-app';
  const top = doc.createElement('div');
  top.className = 'kit-bar';
  app.append(top, f.left, f.centre, f.right);
  doc.body.append(app);
  const d = createDrafts();
  const into = wrapped ? doc.createElement('div') : f.centre;
  if (wrapped) {
    into.style.cssText = 'max-width:880px; margin:0 auto';
    f.centre.append(into);
  }
  for (let i = 0; i < (long ? 30 : 1); i++) {
    into.append(wrapped ? 'Short.' : d.box(`note:${i}`, `Note ${i}`, 3).el, buttons([{ label: `Choose ${i}`, run() {} }]));
  }
  const p = { f, into };
  p.place = () => {
    f.foot(sendBar({ count: '1 of 2 answered', sends: 1, hint: 'Unanswered ones stay open.', discard() {}, send() {} }));
    p.foot = f.centre.querySelector(':scope > .kit-sendfoot');
  };
  if (place) p.place();
  return p;
}

const near = (a, b, what) => assert(Math.abs(a - b) < 1, `${what}: got ${a}, want ${b}`);

function onEdge({ f, foot }, what) {
  const col = f.centre.getBoundingClientRect();
  const r = foot.getBoundingClientRect();
  near(r.bottom, col.top + f.centre.clientTop + f.centre.clientHeight, `${what}: its bottom is the column's`);
  near(r.left, col.left + f.centre.clientLeft, `${what}: its left is the column's`);
  near(r.width, f.centre.clientWidth, `${what}: its width is the column's`);
  return r;
}

function nothingUnder({ f, foot }, what) {
  const r = foot.getBoundingClientRect();
  for (const c of f.centre.querySelectorAll('button, textarea, input, select, a')) {
    if (foot.contains(c)) continue;
    const b = c.getBoundingClientRect();
    assert(b.bottom <= r.top + 0.5 || b.top >= r.bottom - 0.5, `${what}: ${c.textContent || c.placeholder} sits under the bar`);
  }
}

for (const w of [1280, 390]) {
  test(`frame foot at ${w}: on a short page the bar sits on the column's bottom edge, a solid band its full width`, async () => {
    const p = await footPage(w, false);
    eq(p.f.centre.scrollHeight <= p.f.centre.clientHeight, true);
    const r = onEdge(p, 'short');
    assert(r.top > p.f.centre.querySelector('button').getBoundingClientRect().bottom + 15, 'a gap between the content and the bar');
    const bg = getComputedStyle(p.foot).backgroundColor;
    assert(bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent', `a solid band, got ${bg}`);
    nothingUnder(p, 'short');
  });

  test(`frame foot at ${w}: on a long page the bar stays on the edge while it scrolls, and at the end nothing is under it`, async () => {
    const p = await footPage(w, true);
    assert(p.f.centre.scrollHeight > p.f.centre.clientHeight * 2, 'the page is long');
    onEdge(p, 'at the top');
    p.f.centre.scrollTop = p.f.centre.scrollHeight;
    onEdge(p, 'at the end');
    nothingUnder(p, 'at the end');
    const last = [...p.f.centre.querySelectorAll('button')].filter(b => !p.foot.contains(b)).at(-1);
    assert(last.getBoundingClientRect().bottom <= p.foot.getBoundingClientRect().top - 15, 'the last control clears the bar by the gap');
  });
}

for (const w of [1280, 390]) {
  test(`frame foot at ${w}: a centred wrapper in the centre keeps its width once the bar is placed`, async () => {
    const p = await footPage(w, false, { wrapped: true, place: false });
    const before = p.into.getBoundingClientRect();
    p.place();
    const after = p.into.getBoundingClientRect();
    near(after.width, before.width, 'its width');
    near(after.left, before.left, 'its left');
    onEdge(p, 'wrapped');
  });

  test(`frame foot at ${w}: the band sits flush whatever bottom padding the tool gives the centre`, async () => {
    for (const long of [false, true]) {
      const p = await footPage(w, long, { css: '.kit-mid { padding-bottom: 48px; }' });
      onEdge(p, `${long ? 'long' : 'short'}, at the top`);
      p.f.centre.scrollTop = p.f.centre.scrollHeight;
      onEdge(p, `${long ? 'long' : 'short'}, at the end`);
      nothingUnder(p, `${long ? 'long' : 'short'}, at the end`);
    }
  });
}

test('frame foot: the band is padded 24px wide and 12px at 640 or less', async () => {
  const pad = async w => {
    const s = getComputedStyle((await footPage(w, false)).foot);
    return [s.paddingTop, s.paddingRight, s.paddingBottom, s.paddingLeft];
  };
  eq(await pad(1280), ['12px', '24px', '12px', '24px']);
  eq(await pad(390), ['12px', '12px', '12px', '12px']);
});

test('frame foot: a width the tool gives a child of the centre wins over the full width', async () => {
  const p = await footPage(1280, false, { wrapped: true, css: '.narrow-child { width: 200px; }' });
  p.into.className = 'narrow-child';
  near(p.into.getBoundingClientRect().width, 200, 'its width');
});

test('frame: a hidden label far down the centre column scrolls with it, not with the document', () => {
  clean();
  const f = frame(parts());
  const app = mount(f);
  app.style.height = '300px';
  const tall = document.createElement('div');
  tall.style.height = '2000px';
  const label = document.createElement('span');
  label.className = 'kit-label-hidden';
  label.textContent = 'a control named for a screen reader';
  f.centre.append(tall, label);
  eq(f.centre.contains(label.offsetParent), true, 'the label is placed against the centre column');
  assert(f.centre.scrollHeight > 2000, 'the centre column scrolls');
  assert(app.scrollHeight <= app.clientHeight + 1, `the frame itself has nothing to scroll (${app.scrollHeight} in ${app.clientHeight})`);
});

// layoutPage draws a page w wide in its own window: the bar, the band, then
// the frame (o: frame's options), each column with a first item, so where
// each starts can be measured. css is a tool's own stylesheet.
async function layoutPage(w, o = {}, { css = '' } = {}) {
  clean();
  const doc = await sized(w);
  if (css) doc.head.append(Object.assign(doc.createElement('style'), { textContent: css }));
  const f = frame(parts(o));
  const app = doc.createElement('div');
  app.className = 'kit-app';
  const top = band({ title: 'A page', under: [h('span', null, 'track')] });
  app.append(bar({ brand: { name: 'tooltest' } }).el, top.el, ...[f.left, f.centre, f.right].filter(Boolean));
  doc.body.append(app);
  if (f.leftBody) f.leftBody.append(indexSection({ name: 'Findings', rows: [indexRow({ id: 'F1', title: 'One', select() {} })], empty: '' }));
  const card = h('section', { class: 'kit-card' }, h('p', null, 'The first card.'));
  f.centre.append(card);
  return { doc, f, app, top, card };
}

const box = el => el.getBoundingClientRect();

test('layout: the left column\'s first label is 16px under the band, the first middle card 24px', async () => {
  for (const w of [1655, 1280]) {
    const p = await layoutPage(w);
    const under = box(p.top.el).bottom;
    eq(under, 156, `${w}: the band ends at y156 under a 52px bar`);
    near(box(p.f.leftBody.querySelector('.kit-label')).top - under, 16, `${w}: the left column's first label`);
    near(box(p.card).top - under, 24, `${w}: the first middle card`);
    near(box(p.card).left, 288 + 24, `${w}: the card's left edge`);
  }
});

test('layout: a front page\'s filter row puts its first label where an item page\'s index section does', async () => {
  const p = await layoutPage(1655);
  const under = box(p.top.el).bottom;
  p.f.leftBody.replaceChildren(filterRow({ label: 'Kind', items: [{ value: 'a', label: 'A', count: 1 }], chosen: [], onToggle() {} }));
  near(box(p.f.leftBody.querySelector('.kit-label')).top - under, 16, 'the filter row\'s label');
});

test('layout: the right column\'s first label is 16px under the band too', async () => {
  const p = await layoutPage(1655);
  p.f.rightBody.append(thread({ id: 'F1', name: 'One', messages: [] }));
  near(box(p.f.rightBody.querySelector('.kit-label')).top - box(p.top.el).bottom, 16, 'the thread\'s label');
});

test('layout: a left section whose label has an action puts its label 16px under the band, the action centred on its line', async () => {
  for (const w of [1655, 390]) {
    const p = await layoutPage(w);
    if (w === 390) p.app.classList.add('kit-narrow', 'kit-narrow-left');
    const action = h('button', { class: 'kit-chip', type: 'button' }, '+ New');
    p.f.leftBody.replaceChildren(indexSection({ name: 'Artifacts', open() {}, action, rows: [indexRow({ id: 'A1', title: 'One', select() {} })], empty: '' }));
    const label = p.f.leftBody.querySelector('.kit-label');
    near(box(label).top - box(p.top.el).bottom, 16, `${w}: the label`);
    const mid = r => r.top + r.height / 2;
    assert(Math.abs(mid(box(action)) - mid(box(label))) <= 1, `${w}: the action is centred on the label's line (${mid(box(action))} vs ${mid(box(label))})`);
  }
});

const overlaps = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
const tabs = labels => railTabs({ name: 'tooltest', tabs: labels.map((label, i) => ({ id: label, label, count: i * 7 + 1, body: h('p', null, label) })) });

test('layout: the right column\'s tabs start 16px under the band, where a thread\'s label does, the toggle on their line', async () => {
  for (const w of [1655, 1280]) {
    const p = await layoutPage(w);
    const under = box(p.top.el).bottom;
    p.f.rightBody.append(tabs(['Drafts', 'Chat', 'Notes']).el);
    const first = p.f.rightBody.querySelector('[role="tab"]');
    near(box(first).top - under, 16, `${w}: the first tab`);
    const toggle = p.f.right.querySelector('.kit-col-toggle');
    const mid = r => r.top + r.height / 2;
    assert(Math.abs(mid(box(toggle)) - mid(box(first))) <= 1.5, `${w}: the toggle is on the tabs' line (${mid(box(toggle))} vs ${mid(box(first))})`);
    for (const t of p.f.rightBody.querySelectorAll('[role="tab"]')) assert(!overlaps(box(t), box(toggle)), `${w}: ${t.textContent} clears the toggle`);
  }
});

test('layout: a row of tabs too long for one line wraps clear of the toggle, and the toggle still folds the column', async () => {
  const p = await layoutPage(1655);
  p.f.rightBody.append(tabs(['Drafts', 'Chat', 'Notes', 'Evidence', 'History']).el);
  const toggle = p.f.right.querySelector('.kit-col-toggle');
  for (const t of p.f.rightBody.querySelectorAll('[role="tab"]')) assert(!overlaps(box(t), box(toggle)), `${t.textContent} clears the toggle`);
  p.f.right.style.transition = 'none'; // its width at once
  toggle.click();
  near(box(p.f.right).width, 40, 'folded to a strip');
  toggle.click();
  near(box(p.f.right).width, 384, 'and back');
});

test('layout: a middle card in a 1600px-wide middle column is 1100px wide, at the column\'s left padding', async () => {
  const p = await layoutPage(288 + 1600, { right: undefined });
  near(box(p.f.centre).width, 1600, 'the middle column');
  near(box(p.card).width, 1100, 'the card stops at the cap');
  near(box(p.card).left, box(p.f.centre).left + 24, 'left-aligned at the column\'s padding');
  const s = getComputedStyle(p.card);
  eq([s.paddingTop, s.paddingRight, s.paddingBottom, s.paddingLeft, s.borderTopLeftRadius], ['14px', '16px', '14px', '16px', '8px']);
});

test('layout: every middle card has the kit\'s shape and cap, whatever a tool\'s card class says', async () => {
  const p = await layoutPage(288 + 1600, { right: undefined }, { css: '.tool-card { padding: 32px 28px; border-radius: 12px; max-width: 1200px; }' });
  p.card.classList.add('tool-card');
  const nested = h('div', { class: 'tool-stack' }, h('section', { class: 'kit-card tool-card' }, 'deeper'));
  p.f.centre.append(nested);
  for (const c of [p.card, nested.firstChild]) {
    const s = getComputedStyle(c);
    eq([s.paddingTop, s.paddingLeft, s.borderTopLeftRadius], ['14px', '16px', '8px']);
    near(box(c).width, 1100, 'capped');
  }
});

test('layout: a frame with no right column has its middle column end at the window\'s edge', async () => {
  for (const w of [1655, 1280]) {
    const p = await layoutPage(w, { right: undefined });
    near(box(p.f.centre).right, w, `${w}: the middle runs to the edge`);
    near(box(p.f.centre).left, 288, `${w}: from the left column`);
  }
});

test('layout: wide(true) runs the middle column over the right column\'s space, the band and the left column unmoved', async () => {
  const p = await layoutPage(1655);
  const before = { band: box(p.top.el), left: box(p.f.left), mid: box(p.f.centre), card: box(p.card) };
  near(before.mid.right, 1655 - 384, 'the right column takes its 384px');
  p.f.wide(true);
  const mid = box(p.f.centre);
  near(mid.right, 1655, 'the middle runs to the edge');
  near(mid.left, before.mid.left, 'its left edge stays');
  near(box(p.card).top, before.card.top, 'its first card stays');
  near(box(p.card).left, before.card.left, 'and its left');
  for (const k of ['top', 'left', 'width', 'height']) {
    near(box(p.top.el)[k], before.band[k], `the band's ${k}`);
    near(box(p.f.left)[k], before.left[k], `the left column's ${k}`);
  }
  eq(box(p.f.right).width, 0, 'the right column is out of the way');
  p.f.wide(false);
  near(box(p.f.centre).right, 1655 - 384, 'wide(false) puts it back');
  assert(box(p.f.right).width > 0, 'with the right column');
});

test('layout: wide(true) on a narrow page leaves the centre where it is', async () => {
  const p = await layoutPage(900);
  p.app.classList.add('kit-narrow');
  const before = box(p.f.centre);
  p.f.wide(true);
  near(box(p.f.centre).left, before.left, 'its left');
});

test('layout: wide(true) while a narrow page shows its right column leaves it showing', async () => {
  const p = await layoutPage(900);
  p.f.rightBody.append(thread({ id: 'F1', name: 'One', messages: [] }));
  p.app.classList.add('kit-narrow', 'kit-narrow-right');
  const before = box(p.f.rightBody);
  assert(before.width > 0, 'the right column shows');
  p.f.wide(true);
  const r = box(p.f.rightBody);
  const mid = getComputedStyle(p.f.centre).visibility !== 'hidden' && box(p.f.centre).width > 0;
  assert(r.width > 0 || mid, 'something shows: never a blank page');
  near(r.width, before.width, 'the right column keeps its place');
  near(r.left, before.left, 'and its left');
  p.app.classList.remove('kit-narrow-right');
  near(box(p.f.centre).left, 40, 'back on the centre it sits where narrow puts it');
});

test('layout: the empty-state card in the middle keeps its own padding, under the cap', async () => {
  const p = await layoutPage(288 + 1600, { right: undefined });
  const e = emptyCard({ text: 'Nothing here yet.' });
  p.f.centre.append(e);
  const st = getComputedStyle(e);
  eq([st.paddingTop, st.paddingLeft], ['26px', '10px']);
  near(box(e).width, 1100, 'capped');
});
