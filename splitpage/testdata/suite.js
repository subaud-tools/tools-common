// The split page's browser suite, run by browser_test.go in headless Chrome.
// run.html frames the page (same origin, so its DOM and window.splitPage are
// in reach); the tests run in order on that one page and post the result to
// /api/test/result. ?restart=1 says the tool offers a restart.

const q = new URLSearchParams(location.search);
const one = q.get('one');
const two = q.get('two');
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

  test('a pinned tab has no close button', async () => {
    const res = await post('/api/split/open', { session, address: two, title: 'Pinned', pinned: true });
    const pinned = (await res.json()).tabs.find((t) => t.pinned).id;
    await until(() => barTab(pinned), 'the pinned tab in the bar');
    assert(!barTab(pinned).querySelector('.tab-close'), 'a pinned tab has a close button');
    assert(barTab(first).querySelector('.tab-close'), 'an ordinary tab lost its close button');
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
} else {
  test('a stopped program, with no restart, has no Start it again', async () => {
    await pageReady();
    await post('/api/test/release');
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
