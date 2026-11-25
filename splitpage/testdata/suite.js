// The split page's browser suite, run by browser_test.go in headless Chrome.
// run.html frames the page (same origin, so its DOM and window.splitPage are
// in reach); the tests run in order on that one page and post the result to
// /api/test/result. ?restart=1 says the tool offers a restart.

const q = new URLSearchParams(location.search);
const one = q.get('one');
const two = q.get('two');
const clip = q.get('clip');
const send = q.get('send');
const elsewhere = q.get('elsewhere'); // send.html on another origin
const restart = q.get('restart') === '1';
// The place's switch tools' front pages: diazo is up, cast fails to start,
// galley starts on a press.
const tool = { diazo: q.get('diazo'), cast: q.get('cast'), galley: q.get('galley') };
const phone = q.get('phone') === '1';
const session = 's1';
const frame = document.getElementById('page');

const tests = [];
const test = (name, fn) => tests.push({ name, fn });

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// until polls fn until it returns something truthy, and returns that.
async function until(fn, msg, ms = 4000) {
  const end = Date.now() + ms;
  for (;;) {
    const v = await fn();
    if (v) return v;
    if (Date.now() > end) throw new Error(`timed out: ${msg}`);
    await sleep(25);
  }
}

const win = () => frame.contentWindow;
const doc = () => frame.contentDocument;
const split = () => win().splitPage;

async function post(path, body) {
  return fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

async function tabs_(s) {
  const res = await fetch(`/api/split/tabs?session=${s}`);
  return res.json();
}

async function tabs() {
  const res = await fetch(`/api/split/tabs?session=${session}`);
  return res.json();
}

const input = async () => (await fetch('/api/test/input')).text();
const queries = async () => (await fetch('/api/test/queries')).json();

// newQuery waits for a terminal connection after the first n and returns its
// query's parameters.
async function newQuery(n, msg) {
  const q = await until(async () => {
    const all = await queries();
    return all.length > n && all[all.length - 1];
  }, msg);
  return new URLSearchParams(q);
}

// load points the frame at path and waits for the page to connect.
async function load(path) {
  const loaded = new Promise((r) => frame.addEventListener('load', r, { once: true }));
  if (path === undefined) win().location.reload();
  else frame.src = path;
  await loaded;
  await pageReady();
}

// The terminal's text, every line joined.
function screen() {
  const buf = split().term.buffer.active;
  const lines = [];
  for (let i = 0; i < buf.length; i++) lines.push(buf.getLine(i).translateToString(true));
  return lines.join('\n');
}

const bar = () => [...doc().querySelectorAll('#tab-list .tab')];
const barTab = (id) => doc().querySelector(`#tab-list .tab[data-id="${id}"]`);
const shownFrame = () => doc().querySelector('#frames iframe.shown');

// tell gives the framed tab id cmd (a post to the split page, or a go to
// another address), asked again until the tab's page has loaded and answers.
let told = 0;
async function tell(id, cmd) {
  const n = ++told;
  const f = await until(() => doc().querySelector(`#frames iframe[data-id="${id}"]`), `the frame of ${id}`);
  let done = false;
  const on = (ev) => {
    if (ev.data?.done === n) done = true;
  };
  addEventListener('message', on);
  try {
    await until(async () => {
      f.contentWindow.postMessage({ id: n, ...cmd }, '*');
      await sleep(50);
      return done;
    }, `${id} answers`);
  } finally {
    removeEventListener('message', on);
  }
}

// Geometry of the page's parts, as drawn.
const rect = (id) => doc().getElementById(id).getBoundingClientRect();
const pageWidth = () => doc().documentElement.clientWidth;
const near = (a, b) => Math.abs(a - b) < 1;
const resizes = async () => (await fetch('/api/test/resizes')).json();
const closeTerm = () => doc().getElementById('close-term'); // ◀
const closeTabs = () => doc().getElementById('close-tabs'); // ▶

// The bar across the top: the switch's links, the Terminal button, the
// terminal's ×, and the slim row of tabs.
const switchLink = (name) => doc().querySelector(`#bar-switch a[data-tool="${name}"]`);
const termToggle = () => doc().getElementById('term-toggle');
const termX = () => doc().getElementById('term-close');
const slimRow = () => doc().getElementById('tabbar');
const rowShows = () => rect('tabbar').height > 0;
const hostOf = (address) => new URL(address).host;
// press clicks a switch tool as a plain click does.
function press(name) {
  switchLink(name).dispatchEvent(new (win().MouseEvent)('click', { bubbles: true, cancelable: true, button: 0, view: win() }));
}
const shownHost = () => {
  const src = shownFrame()?.getAttribute('src');
  return src ? hostOf(src) : '';
};
// barShows checks the bar: the kit's 52px, the window's whole width, at its top.
function assertBar() {
  const b = rect('bar');
  assert(b.height === 52, `the bar is ${b.height}px high`);
  assert(b.left === 0 && near(b.width, pageWidth()) && b.top === 0, `the bar at ${b.left}..${b.right} of ${pageWidth()}`);
  const t = rect('term');
  const p = rect('tabs-panel');
  assert((t.width === 0 || t.top >= b.bottom) && (p.width === 0 || p.top >= b.bottom), 'a side under the bar');
}

// termClosed and tabsClosed say one side is gone and the other fills the
// window beside the divider, which sits at the window's edge.
function termClosed() {
  const d = rect('divider');
  return rect('term').width === 0 && d.left === 0 && near(rect('tabs-panel').width, pageWidth() - d.width);
}
function tabsClosed() {
  const d = rect('divider');
  return rect('tabs-panel').width === 0 && near(d.right, pageWidth()) && near(rect('term').width, pageWidth() - d.width);
}
const splitOpen = () => rect('term').width > 0 && rect('tabs-panel').width > 0;

// assertHandle checks the way back: a 28 x 64 tab, inside the window.
function assertHandle(el) {
  const r = el.getBoundingClientRect();
  assert(r.width === 28 && r.height === 64, `handle ${r.width} x ${r.height}`);
  assert(r.left >= 0 && r.right <= pageWidth(), `handle at ${r.left}..${r.right} of ${pageWidth()}`);
  assert(win().getComputedStyle(el).visibility === 'visible', 'the handle is hidden');
}

// drag moves the divider to x and lets go there.
function drag(x) {
  const divider = doc().getElementById('divider');
  const at = (type, cx) =>
    divider.dispatchEvent(new PointerEvent(type, { pointerId: 1, clientX: cx, clientY: 100, bubbles: true }));
  at('pointerdown', divider.getBoundingClientRect().left);
  at('pointermove', x);
  at('pointerup', x);
}

// fitsPanel says a resize frame is the terminal's real size: the size xterm
// has, whose cells fill the terminal's panel.
function fitsPanel(size) {
  const s = doc().querySelector('#term .xterm-screen').getBoundingClientRect();
  const t = rect('term-screen');
  const term = split().term;
  return (
    size.cols === term.cols && size.rows === term.rows &&
    s.width <= t.width && t.width - s.width < 40 && s.height <= t.height && t.height - s.height < 40
  );
}

// pageReady waits for the page in the frame to have connected its terminal.
async function pageReady() {
  await until(() => doc()?.readyState === 'complete' && split()?.socket, 'the page connects');
}

if (phone) {
  // A narrow page shows one side at a time, full width, under the bar. The
  // page starts wide (run.html's 1280px) to leave a closed side and a width
  // narrow must keep.
  const shows = (id) => {
    const r = rect(id);
    return r.width > 0 && r.height > 0;
  };
  const onTerminal = () => near(rect('term').width, pageWidth()) && rect('tabs-panel').width === 0;
  const onPages = () => near(rect('tabs-panel').width, pageWidth()) && rect('term').width === 0;
  const marked = (name) => switchLink(name).classList.contains('new') && win().getComputedStyle(switchLink(name), '::before').content !== 'none';
  const wideKeys = () =>
    JSON.stringify([Object.entries(win().sessionStorage).sort(), Object.entries(win().localStorage).sort()]);
  let kept;

  test('wide: the tabs closed at a width of 400', async () => {
    await pageReady();
    await post('/api/test/release');
    await until(() => split().canSend(), 'the replay is written');
    drag(400);
    await until(() => near(rect('term').width, 400), 'the divider drags');
    closeTabs().click();
    await until(tabsClosed, 'the tabs close');
    kept = wideKeys();
  });

  test('at 390px the bar stays 52px with the switch and ▣, the divider goes, and with no tab the terminal fills the width', async () => {
    // A phone lays a page out at its own width only when the page says so.
    const viewport = doc().querySelector('meta[name="viewport"]')?.content ?? '';
    assert(viewport.includes('width=device-width'), `viewport: ${JSON.stringify(viewport)}`);
    frame.style.width = '390px';
    frame.style.height = '844px';
    await until(() => !shows('divider') && pageWidth() === 390, 'the page goes narrow');
    assert(onTerminal(), `terminal ${rect('term').width}, tabs ${rect('tabs-panel').width}`);
    await load(); // a new window with no tab
    await until(() => switchLink('diazo'), 'the switch draws');
    await sleep(200);
    assert(!shows('divider') && onTerminal(), 'a new window with no tab opens on the terminal');
    assertBar();
    assert(!shows('bar-ws'), 'the workspace on a phone\'s bar');
    assert(shows('bar-switch') && shows('term-toggle'), 'the switch and ▣ on the bar');
    assert(termToggle().textContent.trim().startsWith('\u25a3') && rect('term-toggle').width < 60, `▣ is ${rect('term-toggle').width}px: its label shows`);
    assert(rect('term-toggle').right <= pageWidth(), '▣ past the edge');
  });

  test('a tool shows its page, ▣ the terminal, and only the terminal says a size', async () => {
    await until(() => split().canSend(), 'the replay is written');
    await sleep(300);
    const n = (await resizes()).length;
    press('diazo');
    await until(() => onPages() && shownHost() === hostOf(tool.diazo), 'diazo shows, full width');
    assert(switchLink('diazo').classList.contains('on'), 'diazo is not filled in');
    assert(termToggle().getAttribute('aria-pressed') === 'false', '▣ is pressed while the pages show');
    await sleep(300);
    assert((await resizes()).length === n, 'a resize while the pages show');
    termToggle().click();
    await until(onTerminal, 'the terminal shows, full width');
    assert(termToggle().getAttribute('aria-pressed') === 'true', '▣ is not pressed while the terminal shows');
    assert(!switchLink('diazo').classList.contains('on'), 'diazo is filled in while the terminal shows');
    await until(async () => (await resizes()).length > n, 'a resize as the terminal shows');
    await sleep(300);
    const got = (await resizes()).slice(n);
    assert(got.length === 1 && fitsPanel(got[0]), `resizes as the terminal shows: ${JSON.stringify(got)}`);
    termToggle().click();
    await until(onPages, '▣ again shows the pages');
    termToggle().click();
    await until(onTerminal, 'and the terminal');
  });

  test('a tab opened in front switches to the pages, and a tool\'s tab opened behind marks its tool', async () => {
    let res = await post('/api/split/open', { session, address: one, title: 'One' });
    assert(res.ok, `open one: ${res.status}`);
    await until(onPages, 'a tab opened in front switches to the pages');
    await until(rowShows, 'the slim row shows the page');
    termToggle().click();
    await until(onTerminal, 'the terminal shows');
    assert(!marked('galley'), 'galley marked before any tab opened behind');
    res = await post('/api/split/open', { session, address: tool.galley, title: 'galley', behind: true });
    assert(res.ok, `open galley behind: ${res.status}`);
    await until(() => marked('galley'), 'a tool\'s tab opened behind marks its tool');
    assert(onTerminal(), 'a tab opened behind switched to the pages');
    press('galley');
    await until(() => onPages() && shownHost() === hostOf(tool.galley), 'galley shows');
    assert(!marked('galley'), 'the mark stays once galley shows');
    termToggle().click();
    await until(onTerminal, 'the terminal shows again');
  });

  test('typed text switches to the terminal', async () => {
    await until(() => split().canSend(), 'the replay is written');
    const res = await post('/api/split/open', { session, address: send, title: 'Types', types: true });
    const typer = (await res.json()).selected;
    await until(onPages, 'the pages show');
    const before = await input();
    await tell(typer, { post: { type: 'send', text: 'switched' } });
    await until(onTerminal, 'typed text switches to the terminal');
    await until(async () => (await input()).slice(before.length) === 'switched', 'the text is typed');
  });

  test('a new window with a tab opens on the pages', async () => {
    await load();
    await until(onPages, 'a new window with a tab opens on the pages');
  });

  test('a narrow load with a tab never shows, fits or focuses the terminal, and says no size', async () => {
    await until(() => split().canSend(), 'the replay is written');
    await sleep(300);
    const n = (await resizes()).length;
    // Watch from the moment the page's script has drawn the narrow page.
    let terminalShowed = false;
    let watching = true;
    const watch = () => {
      const d = doc();
      if (d?.body?.classList.contains('narrow') && d.getElementById('term').getBoundingClientRect().width > 0) {
        terminalShowed = true;
      }
      if (watching) setTimeout(watch, 0);
    };
    const loaded = new Promise((r) => frame.addEventListener('load', r, { once: true }));
    win().location.reload();
    watch();
    await loaded;
    await pageReady();
    await until(onPages, 'the page settles on the pages');
    await until(() => split().canSend(), 'the replay is written');
    await sleep(300);
    watching = false;
    assert(!terminalShowed, 'the terminal showed before the pages');
    assert(!doc().activeElement?.classList.contains('xterm-helper-textarea'), 'the terminal took the focus');
    const got = (await resizes()).slice(n);
    assert(got.length === 0, `resizes while the pages show: ${JSON.stringify(got)}`);
  });

  test('narrow keeps the wide layout as it was, and widening to 1280px brings it back', async () => {
    assert(wideKeys() === kept, `narrow wrote ${wideKeys()}, was ${kept}`);
    frame.style.width = '1280px';
    frame.style.height = '700px';
    await until(() => shows('divider') && pageWidth() === 1280 && tabsClosed(), 'the tabs are closed again at 1280px');
    assertBar();
    closeTerm().click();
    await until(() => splitOpen() && near(rect('term').width, 400), `the split at ${rect('term').width}, want 400`);
  });
} else if (restart) {
  test('holds input until the replay is written', async () => {
    await pageReady();
    await until(() => split().socket.readyState === WebSocket.OPEN, 'the socket opens');
    assert(!split().canSend(), 'the page can send before the first frame');
    split().term.input('early');
    await sleep(200);
    assert((await input()) === '', `sent before the replay: ${JSON.stringify(await input())}`);
    await post('/api/test/release');
    await until(() => split().canSend(), 'the replay is written');
    split().term.input('late');
    await until(async () => (await input()) === 'late', 'only input after the replay arrives');
  });

  test('typing is echoed', async () => {
    split().term.input('hi');
    await until(() => screen().includes('latehi'), 'the echo shows');
  });

  test('Shift+Enter sends a newline', async () => {
    const box = doc().querySelector('.xterm-helper-textarea');
    box.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', shiftKey: true, bubbles: true, cancelable: true }),
    );
    await until(async () => (await input()) === 'latehi\n', 'the newline arrives');
  });

  test('a link in the terminal opens in a browser tab when clicked', async () => {
    const opened = [];
    win().open = (...a) => {
      opened.push(a);
      return null;
    };
    const t = split().term;
    t.input(' https://example.com/x ');
    await until(() => screen().includes('https://example.com/x'), 'the link shows');
    const b = t.buffer.active;
    let row = -1;
    let col = -1;
    for (let y = 0; y < t.rows; y++) {
      const line = b.getLine(b.viewportY + y)?.translateToString() ?? '';
      const at = line.indexOf('https://example.com/x');
      if (at >= 0) {
        row = y;
        col = at + 3;
      }
    }
    assert(row >= 0, 'the link is on screen');
    const el = doc().querySelector('#term .xterm-screen');
    const r = el.getBoundingClientRect();
    const x = r.left + ((col + 0.5) * r.width) / t.cols;
    const y = r.top + ((row + 0.5) * r.height) / t.rows;
    const ev = (type) => new (win().MouseEvent)(type, { bubbles: true, clientX: x, clientY: y, button: 0, view: win() });
    await until(() => {
      el.dispatchEvent(ev('mousemove'));
      return doc().querySelector('#term .xterm-screen')?.classList.contains('xterm-cursor-pointer');
    }, 'the link is under the pointer');
    el.dispatchEvent(ev('mousedown'));
    el.dispatchEvent(ev('mouseup'));
    el.dispatchEvent(ev('click'));
    await until(() => opened.length > 0, 'the link opens');
    assert(opened[0][0] === 'https://example.com/x' && opened[0][1] === '_blank', `opened ${JSON.stringify(opened[0])}`);
  });

  let first, second;
  test('opens two local pages as tabs', async () => {
    let res = await post('/api/split/open', { session, address: one, title: 'One' });
    assert(res.ok, `open one: ${res.status}`);
    res = await post('/api/split/open', { session, address: two, title: 'Two' });
    assert(res.ok, `open two: ${res.status}`);
    const list = await res.json();
    [first, second] = list.tabs.map((t) => t.id);
    await until(() => bar().length === 2, 'two tabs in the bar');
    assert(bar()[0].textContent.includes('One') && bar()[1].textContent.includes('Two'), 'tab titles');
    assert(barTab(second).classList.contains('selected'), 'the newest tab is selected');
    await until(() => shownFrame()?.dataset.id === second, 'the newest frame shows');
    assert(doc().querySelectorAll('#frames iframe').length === 2, 'one frame per tab');
  });

  test('refuses a non-local address', async () => {
    const res = await post('/api/split/open', { session, address: 'https://github.com/', title: 'GitHub' });
    assert(res.status === 400, `open github.com: ${res.status}`);
    assert(bar().length === 2, 'the bar changed');
  });

  test('a click switches tabs, and the server knows', async () => {
    barTab(first).click();
    await until(async () => (await tabs()).selected === first, 'GET tabs reads the click');
    assert(shownFrame()?.dataset.id === first, 'the clicked frame shows');
    assert(doc().querySelectorAll('#frames iframe').length === 2, 'the hidden frame stays loaded');
  });

  test('closes a tab', async () => {
    barTab(second).querySelector('.tab-close').click();
    await until(() => bar().length === 1, 'one tab left in the bar');
    assert((await tabs()).tabs.length === 1, 'the server still has the closed tab');
    assert(doc().querySelectorAll('#frames iframe').length === 1, 'the closed frame is gone');
  });

  test('a tab opened behind never shows, and is marked until it is shown', async () => {
    const behind = `${two}?behind`;
    // Every class change on any frame, from before the open: the new frame
    // must never be the shown one, not even for a moment.
    const flashed = [];
    const watch = new (win().MutationObserver)((records) => {
      for (const r of records) {
        const f = r.type === 'attributes' ? r.target : null;
        if (f?.classList.contains('shown') && f.getAttribute('src') === behind) flashed.push(f.dataset.id);
        for (const n of r.addedNodes ?? []) {
          if (n.classList?.contains('shown') && n.getAttribute('src') === behind) flashed.push(n.dataset.id);
        }
      }
    });
    watch.observe(doc().getElementById('frames'), { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] });
    const res = await post('/api/split/open', { session, address: behind, title: 'Behind', behind: true });
    assert(res.ok, `open behind: ${res.status}`);
    const list = await res.json();
    const id = list.tabs.find((t) => t.address === behind).id;
    assert(list.selected === first, `selected ${list.selected}, want ${first}`);
    await until(() => barTab(id), 'the behind tab in the bar');
    await sleep(100);
    watch.disconnect();
    assert(flashed.length === 0, 'the behind tab showed');
    assert(shownFrame()?.dataset.id === first, 'the shown tab changed');
    assert(barTab(id).classList.contains('new'), 'the behind tab is not marked new');
    const dot = barTab(id).querySelector('.tab-new');
    assert(dot && win().getComputedStyle(dot).display !== 'none', 'the behind tab has no dot');
    assert(!barTab(first).classList.contains('new'), 'the shown tab is marked new');
    barTab(id).click();
    assert(!barTab(id).classList.contains('new'), 'the clicked tab is still marked new');
    await until(async () => (await tabs()).tabs.find((t) => t.id === id)?.new !== true, 'the server clears new');
    assert(!barTab(id).classList.contains('new'), 'the mark came back');
    barTab(id).querySelector('.tab-close').click();
    await until(() => !barTab(id) && shownFrame()?.dataset.id === first, 'the behind tab closes');
  });

  test('the reload button reloads a tab whose address has a # part', async () => {
    const res = await post('/api/split/open', { session, address: `${one}#/decide`, title: 'Hash' });
    assert(res.ok, `open hash: ${res.status}`);
    const id = (await res.json()).selected;
    await until(() => shownFrame()?.dataset.id === id && shownFrame().contentDocument?.readyState === 'complete', 'the hash tab loads');
    const before = shownFrame().contentWindow.performance.timeOrigin;
    doc().getElementById('reload').click();
    await until(() => {
      const f = shownFrame();
      return f?.dataset.id === id && f.contentDocument?.readyState === 'complete' && f.contentWindow.performance.timeOrigin !== before;
    }, 'the hash tab loads again');
    barTab(id).querySelector('.tab-close').click();
    await until(() => !barTab(id), 'the hash tab closes');
  });

  test('a tab the tool moves loads its new address, still one tab', async () => {
    let res = await post('/api/split/open', { session, address: `${one}?moving`, title: 'Moving', pinned: true });
    assert(res.ok, `open moving: ${res.status}`);
    const id = (await res.json()).selected;
    await until(() => shownFrame()?.dataset.id === id, 'the moving tab shows');
    const count = bar().length;
    const to = `${two}?moved`;
    res = await post('/api/test/replace-tab', { Session: session, ID: id, Address: to });
    assert(res.ok, `replace: ${res.status}`);
    await until(() => {
      const f = shownFrame();
      return f?.dataset.id === id && f.getAttribute('src') === to;
    }, 'the moved tab loads its new address');
    assert(bar().length === count, `tabs after the move: ${bar().length}, want ${count}`);
    assert(doc().querySelectorAll(`#frames iframe[data-id="${id}"]`).length === 1, 'one frame for the moved tab');
  });

  test('the tab list never scrolls up and down', async () => {
    const list = doc().getElementById('tab-list');
    assert(win().getComputedStyle(list).overflowY === 'hidden', `tab list overflow-y: ${win().getComputedStyle(list).overflowY}`);
  });

  test('a pinned tab has no close button', async () => {
    const res = await post('/api/split/open', { session, address: two, title: 'Pinned', pinned: true });
    const pinned = (await res.json()).tabs.find((t) => t.pinned).id;
    await until(() => barTab(pinned), 'the pinned tab in the bar');
    assert(!barTab(pinned).querySelector('.tab-close'), 'a pinned tab has a close button');
    assert(barTab(first).querySelector('.tab-close'), 'an ordinary tab lost its close button');
  });

  test('a framed tool page may write to the clipboard', async () => {
    const res = await post('/api/split/open', { session, address: clip, title: 'Clip' });
    const id = (await res.json()).selected;
    const f = await until(() => doc().querySelector(`#frames iframe[data-id="${id}"]`), 'the clip frame');
    let got;
    const on = (ev) => {
      if (ev.source === f.contentWindow) got = ev.data;
    };
    addEventListener('message', on);
    // Asked again until the framed page has loaded and answers.
    await until(async () => {
      f.contentWindow.focus();
      f.contentWindow.postMessage('copy', '*');
      await sleep(100);
      return got;
    }, 'the framed page answers');
    removeEventListener('message', on);
    // Headless Chrome denies every clipboard write, even at the top level, so
    // a copy can't succeed here: what matters is that the frame's permissions
    // policy no longer blocks it, which is what a frame without the allow
    // attribute gets.
    assert(got.copied || !/permissions policy/.test(got.error), `writeText in a tab: ${got.error}`);
    assert(f.allow.includes('clipboard-write'), `frame allow: ${f.allow}`);
    barTab(id).querySelector('.tab-close').click();
    await until(() => !barTab(id), 'the clip tab closes');
  });

  test('a reload of the page shows the same tabs', async () => {
    const before = await tabs();
    const loaded = new Promise((r) => frame.addEventListener('load', r, { once: true }));
    win().location.reload();
    await loaded;
    await pageReady();
    await until(() => bar().length === before.tabs.length, 'the tabs come back');
    const ids = bar().map((el) => el.dataset.id);
    assert(JSON.stringify(ids) === JSON.stringify(before.tabs.map((t) => t.id)), `tabs after reload: ${ids}`);
    assert(barTab(before.selected).classList.contains('selected'), 'the selection after reload');
  });

  test("a tool's script makes room above the terminal with fit", async () => {
    const t = split().term;
    const rows = t.rows;
    t.element.style.paddingTop = '60px';
    split().fit();
    await until(() => t.rows < rows, `rows after padding: ${t.rows}, before ${rows}`);
    t.element.style.paddingTop = '';
    split().fit();
    await until(() => t.rows === rows, `rows after the padding went: ${t.rows}, want ${rows}`);
  });

  test('the divider drags', async () => {
    const divider = doc().getElementById('divider');
    const at = (type, x) =>
      divider.dispatchEvent(new PointerEvent(type, { pointerId: 1, clientX: x, clientY: 100, bubbles: true }));
    at('pointerdown', divider.getBoundingClientRect().left);
    at('pointermove', 300);
    at('pointerup', 300);
    const width = doc().body.style.getPropertyValue('--term-width');
    assert(width === '300px', `--term-width ${width}`);
  });

  test("the tool's script runs and sees the page's terminal", async () => {
    const saw = await until(() => win().scriptSaw, 'the script runs');
    assert(saw.term && saw.cols > 0, `the script saw ${JSON.stringify(saw)}`);
  });

  test('a tab that types puts a send in the terminal, and nothing else does', async () => {
    await until(() => split().canSend(), 'the replay is written');
    let res = await post('/api/split/open', { session, address: send, title: 'Types', types: true });
    assert(res.ok, `open send: ${res.status}`);
    const typer = (await res.json()).selected;
    res = await post('/api/split/open', { session, address: `${send}?plain`, title: 'Plain' });
    const plain = (await res.json()).selected;
    const before = await input();
    // From a tab without types, and of another type from the one with it.
    await tell(plain, { post: { type: 'send', text: 'from plain' } });
    await tell(typer, { post: { type: 'other', text: 'other type' } });
    await tell(typer, { post: { type: 'send', text: 'typed\n' } });
    await until(async () => (await input()).length > before.length, 'the send arrives');
    await sleep(200);
    const got = (await input()).slice(before.length);
    assert(got === 'typed', `typed ${JSON.stringify(got)}`);
    // The tab that types, gone to another origin, types nothing.
    await tell(typer, { go: elsewhere });
    await sleep(300);
    await tell(typer, { post: { type: 'send', text: 'from elsewhere' } });
    await sleep(300);
    const after = (await input()).slice(before.length);
    assert(after === 'typed', `typed ${JSON.stringify(after)}`);
    for (const id of [typer, plain]) {
      barTab(id).querySelector('.tab-close').click();
      await until(() => !barTab(id), 'the send tab closes');
    }
  });

  test('a stopped program offers Start it again', async () => {
    await until(() => split().canSend(), 'the reloaded page has its replay');
    const before = split().socket;
    await post('/api/test/stop');
    const notice = doc().getElementById('stopped');
    const again = doc().getElementById('start-again');
    await until(() => !notice.hidden, 'the stopped notice');
    assert(!again.hidden, 'no Start it again');
    again.click();
    await until(() => notice.hidden && split().socket !== before, 'the page reconnects');
    await until(() => split().canSend(), 'the new connection has its replay');
  });

  test('a page opened with ?session= and ?socket= connects with both', async () => {
    let res = await post('/api/split/open', { session: 'x', address: one, title: 'X one' });
    assert(res.ok, `open in session x: ${res.status}`);
    const n = (await queries()).length;
    await load('/?session=x&socket=y');
    const p = await newQuery(n, 'the page connects');
    assert(p.get('session') === 'x' && p.get('socket') === 'y', `socket query: ${p}`);
    assert(!p.has('take'), `the first connection sent take: ${p}`);
    await until(() => bar().length === 1 && bar()[0].textContent.includes('X one'), "the bar shows session x's tabs");
  });

  test('with Take, 4409 offers Show it here, which reconnects with take=1', async () => {
    await until(() => split().canSend(), 'the replay is written');
    const n = (await queries()).length;
    await post('/api/test/replace');
    const notice = doc().getElementById('stopped');
    await until(() => !notice.hidden, 'the replaced notice');
    const here = doc().getElementById('take-here');
    assert(here && !here.hidden, 'no Show it here');
    assert(doc().getElementById('start-again').hidden, 'Start it again offered on 4409');
    here.click();
    const p = await newQuery(n, 'the page reconnects');
    assert(p.get('take') === '1' && p.get('session') === 'x' && p.get('socket') === 'y', `take query: ${p}`);
    await until(() => notice.hidden && split().canSend(), 'the taken connection has its replay');
  });

  test('a page opened with take=1 takes once, then drops take from its address', async () => {
    let n = (await queries()).length;
    await load('/?session=x&socket=y&take=1');
    let p = await newQuery(n, 'the page connects');
    assert(p.get('take') === '1', `the first connection did not take: ${p}`);
    const left = new URLSearchParams(win().location.search);
    assert(!left.has('take'), `take left in the address: ${win().location.search}`);
    assert(left.get('session') === 'x' && left.get('socket') === 'y', `address lost its session: ${win().location.search}`);
    await until(() => split().canSend(), 'the replay is written');
    n = (await queries()).length;
    await load();
    p = await newQuery(n, 'the reloaded page connects');
    assert(!p.has('take'), `a reload took the session: ${p}`);
    assert(p.get('session') === 'x', `the reload lost its session: ${p}`);
  });
  // Closing a side. The page is on session x from here.
  const xs = 'x';

  test('each arrow closes its side, the other fills the window, and the handle brings it back', async () => {
    await until(() => split().canSend(), 'the replay is written');
    await until(splitOpen, 'the split shows');
    const w0 = rect('term').width;
    closeTerm().click();
    await until(termClosed, 'the terminal closes and the tabs fill the window');
    assertHandle(closeTabs());
    assert(rect('close-term').width === 0, 'the closing arrow still shows');
    closeTabs().click();
    await until(() => splitOpen() && near(rect('term').width, w0), `the split opens at ${w0}`);
    closeTabs().click();
    await until(tabsClosed, 'the tabs close and the terminal fills the window');
    assertHandle(closeTerm());
    closeTerm().click();
    await until(() => splitOpen() && near(rect('term').width, w0), `the split opens again at ${w0}`);
  });

  test('a drag let go within 120px of an edge closes that side, and 200px away it does not', async () => {
    const w0 = rect('term').width;
    drag(60);
    await until(termClosed, 'a drag to 60px closes the terminal');
    closeTabs().click();
    await until(() => splitOpen() && near(rect('term').width, w0), `the handle opens the split at ${w0}`);
    drag(pageWidth() - 60);
    await until(tabsClosed, 'a drag to 60px from the right closes the tabs');
    closeTerm().click();
    await until(() => splitOpen() && near(rect('term').width, w0), `the handle opens the split at ${w0}`);
    drag(200);
    await sleep(100);
    assert(splitOpen() && near(rect('term').width, 200), `a drag to 200px: terminal ${rect('term').width}`);
    drag(w0);
    await until(() => near(rect('term').width, w0), 'the divider goes back');
  });

  test('no resize reaches the terminal while it is closed, and one with its real size when it opens', async () => {
    await until(() => split().canSend(), 'the replay is written');
    await sleep(300); // the last test's drag has said its size
    let n = (await resizes()).length;
    const rows = split().term.rows;
    closeTerm().click();
    await until(termClosed, 'the terminal closes');
    frame.style.height = '600px';
    split().fit();
    await sleep(300);
    assert((await resizes()).length === n, `resizes while closed: ${JSON.stringify((await resizes()).slice(n))}`);
    assert(split().term.rows === rows, `the closed terminal was fitted: ${split().term.rows} rows, was ${rows}`);
    closeTabs().click();
    await until(async () => (await resizes()).length > n, 'a resize when the terminal opens');
    await sleep(300);
    let got = (await resizes()).slice(n);
    assert(got.length === 1, `resizes on opening: ${JSON.stringify(got)}`);
    assert(got[0].rows < rows && fitsPanel(got[0]), `the resize on opening: ${JSON.stringify(got[0])}, was ${rows} rows`);
    // Opening at the size it had still says its size, once.
    frame.style.height = '';
    await until(() => split().term.rows === rows, 'the terminal grows back');
    await sleep(200);
    n = (await resizes()).length;
    closeTerm().click();
    await until(termClosed, 'the terminal closes again');
    closeTabs().click();
    await until(async () => (await resizes()).length > n, 'a resize when the terminal opens again');
    await sleep(300);
    got = (await resizes()).slice(n);
    assert(got.length === 1 && got[0].rows === rows && fitsPanel(got[0]), `resizes on opening again: ${JSON.stringify(got)}`);
  });

  test('typed text from a tab that types opens a closed terminal', async () => {
    await until(() => split().canSend(), 'the replay is written');
    const res = await post('/api/split/open', { session: xs, address: send, title: 'Types', types: true });
    assert(res.ok, `open send: ${res.status}`);
    const typer = (await res.json()).selected;
    closeTerm().click();
    await until(termClosed, 'the terminal closes');
    const before = await input();
    await tell(typer, { post: { type: 'send', text: 'opened' } });
    await until(() => splitOpen(), 'the terminal opens');
    await until(async () => (await input()).slice(before.length) === 'opened', 'the text is typed');
    barTab(typer).querySelector('.tab-close').click();
    await until(() => !barTab(typer), 'the send tab closes');
  });

  test('a tab opened in front opens closed tabs, and one opened behind with other tabs does not', async () => {
    const w0 = rect('term').width;
    closeTabs().click();
    await until(tabsClosed, 'the tabs close');
    let res = await post('/api/split/open', { session: xs, address: `${one}?behind`, title: 'Behind', behind: true });
    assert(res.ok, `open behind: ${res.status}`);
    const behind = (await res.json()).tabs.find((t) => t.address === `${one}?behind`).id;
    await until(() => barTab(behind), 'the behind tab in the bar');
    await sleep(200);
    assert(tabsClosed(), 'a tab opened behind opened the tabs');
    res = await post('/api/split/open', { session: xs, address: `${two}?front`, title: 'Front' });
    assert(res.ok, `open front: ${res.status}`);
    await until(() => splitOpen() && near(rect('term').width, w0), 'a tab opened in front opens the tabs');
  });

  test('an agent opening the tab that already shows opens closed tabs', async () => {
    const w0 = rect('term').width;
    const list = await tabs_(xs);
    const address = list.tabs.find((t) => t.id === list.selected).address;
    closeTabs().click();
    await until(tabsClosed, 'the tabs close');
    await sleep(200);
    const res = await post('/api/split/open', { session: xs, address, title: 'Again' });
    assert(res.ok, `open again: ${res.status}`);
    assert((await res.json()).selected === list.selected, 'the open made a new tab');
    await until(() => splitOpen() && near(rect('term').width, w0), 'opening the shown tab again opens the tabs');
  });

  test('closing the last tab closes the tabs, a reload keeps them closed, and the first tab opens them', async () => {
    while (bar().length > 0) {
      const count = bar().length;
      bar()[0].querySelector('.tab-close').click();
      await until(() => bar().length < count, 'a tab closes');
    }
    await until(tabsClosed, 'closing the last tab closes the tabs');
    await load();
    await sleep(300);
    assert(tabsClosed(), 'a reload opened the tabs');
    const res = await post('/api/split/open', { session: xs, address: `${one}?first`, title: 'First', behind: true });
    assert(res.ok, `open first: ${res.status}`);
    await until(splitOpen, 'the first tab, even behind, opens the tabs');
  });

  test('a reload keeps a closed terminal, and opening it sends its real size', async () => {
    await until(() => split().canSend(), 'the replay is written');
    closeTerm().click();
    await until(termClosed, 'the terminal closes');
    const n = (await resizes()).length;
    await load();
    await until(() => split().canSend(), 'the reloaded page has its replay');
    await sleep(300);
    assert(termClosed(), 'a reload opened the terminal');
    assert((await resizes()).length === n, `resizes from a closed terminal: ${JSON.stringify((await resizes()).slice(n))}`);
    closeTabs().click();
    await until(async () => (await resizes()).length > n, 'a resize when the terminal opens');
    await sleep(300);
    const got = (await resizes()).slice(n);
    assert(got.length === 1 && fitsPanel(got[0]), `resizes on opening: ${JSON.stringify(got)}`);
  });

  test('a new window opens split at the remembered width', async () => {
    drag(420);
    await until(() => near(rect('term').width, 420), 'the divider drags');
    closeTerm().click();
    await until(termClosed, 'the terminal closes');
    win().sessionStorage.clear(); // what a new window starts with
    await load();
    await until(() => splitOpen() && near(rect('term').width, 420), `a new window at ${rect('term').width}, want 420`);
  });

  // The bar across the top, from the test host's place.
  const note = () => doc().getElementById('tool-note');
  const noteText = () => doc().getElementById('tool-note-text').textContent;
  const filled = (name) => switchLink(name).classList.contains('on');

  test('the bar spans the window at 52px, with the workspace, the switch and Terminal', async () => {
    await until(() => switchLink('galley'), 'the switch draws');
    assertBar();
    const ws = doc().getElementById('bar-ws');
    assert(!ws.hidden && ws.textContent === 'tools-workspace', `workspace: ${ws.textContent}`);
    const names = [...doc().querySelectorAll('#bar-switch a')].map((a) => a.textContent);
    assert(JSON.stringify(names) === '["diazo","cast","galley"]', `switch: ${names}`);
    // Real links, so a middle-click opens the tool in a browser tab.
    for (const n of names) assert(switchLink(n).href === tool[n], `${n} links ${switchLink(n).href}`);
    assert(termToggle().getAttribute('aria-pressed') === 'true' && termToggle().classList.contains('on'), 'Terminal is not highlighted');
    assert(doc().getElementById('term-name').textContent === `terminal · ${xs}`, `header: ${doc().getElementById('term-name').textContent}`);
    assert(rect('term-head').height === 28 && rect('term-head').top === rect('bar').bottom, `header ${rect('term-head').height}px at ${rect('term-head').top}`);
  });

  test('pressing diazo shows its page on the right, once, and leaves the terminal as it was', async () => {
    if (bar().length === 0) await post('/api/split/open', { session: xs, address: `${one}?other`, title: 'Other' });
    await until(() => bar().length > 0, 'a page that is not a tool\'s');
    const w0 = rect('term').width;
    const before = (await tabs_(xs)).tabs.length;
    press('diazo');
    await until(() => shownHost() === hostOf(tool.diazo), 'diazo shows');
    assert(filled('diazo') && !filled('cast') && !filled('galley'), 'diazo is not the one filled in');
    let l = await tabs_(xs);
    assert(l.tabs.length === before + 1, `tabs ${l.tabs.length}, want ${before + 1}`);
    assert(near(rect('term').width, w0), `the terminal moved: ${rect('term').width}, was ${w0}`);
    assert(!barTab(l.selected), "diazo's tab is in the slim row");
    bar()[0].click();
    await until(() => shownHost() !== hostOf(tool.diazo), 'the other page shows');
    assert(!filled('diazo'), 'diazo is filled in with another page in front');
    press('diazo');
    await until(() => shownHost() === hostOf(tool.diazo), 'diazo shows again');
    l = await tabs_(xs);
    assert(l.tabs.length === before + 1, `a second diazo tab: ${l.tabs.length}`);
  });

  test('pressing galley, which is down, starts it: Starting galley… on the right, then its page', async () => {
    press('galley');
    await until(() => !note().hidden && rect('tool-note').width > 0 && noteText() === 'Starting galley…', 'Starting galley… shows');
    assert(filled('galley'), 'galley is not filled in while it starts');
    await until(() => shownHost() === hostOf(tool.galley) && note().hidden, 'galley shows');
    assert(filled('galley'), 'galley is not filled in');
  });

  test('pressing cast, which fails to start, says why on the right', async () => {
    press('cast');
    await until(() => !note().hidden && rect('tool-note').width > 0 && noteText().includes('could not bind'), 'why cast did not start');
    assert(!filled('cast'), 'cast is filled in after it failed');
    press('diazo');
    await until(() => shownHost() === hostOf(tool.diazo) && note().hidden, 'diazo shows and the note goes');
  });

  test('× closes the terminal, Terminal brings it back at its width, and the arrows agree', async () => {
    const w0 = rect('term').width;
    termX().click();
    await until(termClosed, '× closes the terminal');
    assert(termToggle().getAttribute('aria-pressed') === 'false' && !termToggle().classList.contains('on'), 'Terminal is highlighted with the terminal closed');
    assertBar();
    termToggle().click();
    await until(() => splitOpen() && near(rect('term').width, w0), `Terminal opens it at ${rect('term').width}, want ${w0}`);
    assert(termToggle().getAttribute('aria-pressed') === 'true', 'Terminal is not highlighted');
    termToggle().click();
    await until(termClosed, 'Terminal closes it');
    closeTabs().click();
    await until(() => splitOpen() && near(rect('term').width, w0), 'and ▶ opens it again');
  });

  test('with the pages closed, pressing a tool opens the split with it', async () => {
    const w0 = rect('term').width;
    closeTabs().click();
    await until(tabsClosed, 'the pages close');
    assert(!filled('diazo'), 'a tool is filled in while the terminal fills the window');
    press('galley');
    await until(() => splitOpen() && near(rect('term').width, w0) && shownHost() === hostOf(tool.galley), 'the split opens with galley');
  });

  test("a page that isn't a tool's shows the slim row, and closing it removes the row", async () => {
    while (bar().length > 0) {
      const count = bar().length;
      bar()[0].querySelector('.tab-close').click();
      await until(() => bar().length < count, 'a page closes');
    }
    await until(() => !rowShows(), 'the row goes with the last page that is not a tool\'s');
    assert(splitOpen(), "the tools' tabs closed the pages");
    const res = await post('/api/split/open', { session: xs, address: `${one}?slim`, title: 'Slim' });
    const id = (await res.json()).selected;
    await until(() => rowShows() && bar().length === 1 && barTab(id), 'the row shows the page');
    const r = rect('tabbar');
    const p = rect('tabs-panel');
    assert(r.top === rect('bar').bottom && near(r.left, p.left) && near(r.width, p.width), `the row at ${r.left},${r.top} ${r.width}, over the pages at ${p.left} ${p.width}`);
    barTab(id).querySelector('.tab-close').click();
    await until(() => !rowShows(), 'closing it removes the row');
  });
} else {
  test('without a Script nothing extra loads', async () => {
    await pageReady();
    await sleep(200);
    assert(win().scriptSaw === undefined, 'a script ran');
    const scripts = win().performance.getEntriesByType('resource').filter((e) => e.name.endsWith('.js'));
    assert(scripts.every((e) => e.name.endsWith('/split.js')), `loaded ${scripts.map((e) => e.name)}`);
  });

  test('without Take, 4409 says reload and offers no button', async () => {
    await pageReady();
    await post('/api/test/release');
    await until(() => split().canSend(), 'the replay is written');
    await post('/api/test/replace');
    const notice = doc().getElementById('stopped');
    await until(() => !notice.hidden, 'the replaced notice');
    const here = doc().getElementById('take-here');
    assert(!here || here.hidden, 'Show it here offered with no take');
    assert(doc().getElementById('start-again').hidden, 'Start it again offered on 4409');
    const text = doc().getElementById('stopped-text').textContent;
    assert(text.includes('reload to show it here'), `notice: ${text}`);
    await load(); // a fresh connection for the next test
  });

  test('a stopped program, with no restart, has no Start it again', async () => {
    await until(() => split().canSend(), 'the replay is written');
    await post('/api/test/stop');
    const notice = doc().getElementById('stopped');
    await until(() => !notice.hidden, 'the stopped notice');
    assert(doc().getElementById('start-again').hidden, 'Start it again offered with no restart');
    assert(doc().getElementById('stopped-text').textContent.includes('stopped'), 'the notice text');
  });
}

async function run() {
  const failures = [];
  for (const t of tests) {
    try {
      await Promise.race([t.fn(), sleep(8000).then(() => Promise.reject(new Error('timeout')))]);
    } catch (e) {
      failures.push(`${t.name}: ${e && e.message ? e.message : e}`);
      break; // the tests share one page: the rest would fail for this one's reason
    }
  }
  const head = failures.length ? `FAIL ${failures.length}` : `PASS ${tests.length}`;
  return [head, ...failures].join('\n');
}

let out;
try {
  out = await run();
} catch (e) {
  out = `FAIL 1\nsuite: ${e && e.stack ? e.stack : e}`;
}
await fetch('/api/test/result', { method: 'POST', body: out });
