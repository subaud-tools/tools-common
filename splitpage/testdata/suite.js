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

// pageReady waits for the page in the frame to have connected its terminal.
async function pageReady() {
  await until(() => doc()?.readyState === 'complete' && split()?.socket, 'the page connects');
}

if (restart) {
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
