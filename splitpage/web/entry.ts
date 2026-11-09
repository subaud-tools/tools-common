// The split page: xterm.js over the tool's terminal websocket on the left, the
// tabs on the right, and a divider between them. The wire is splitpage's
// (wire.go): binary frames carry terminal bytes both ways, a text frame from
// here is a resize, and the first frame from the server is the replay.

import { FitAddon } from '@xterm/addon-fit';
import { Unicode11Addon } from '@xterm/addon-unicode11';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { WebglAddon } from '@xterm/addon-webgl';
import { Terminal } from '@xterm/xterm';
import type { Resize } from '../wire.d.ts';
import { handleKey } from './keys.ts';
import {
  afterTabs,
  afterTyped,
  arrow,
  edge,
  firstView,
  layoutKey,
  released,
  type State,
  storedLayout,
  storedWidth,
  tabChange,
  termShows,
  widthKey,
} from './layout.ts';
import { sentText } from './relay.ts';
import { socketScheme } from './socket.ts';
import { startTabs } from './tabs.ts';

const fontFamily =
  'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace';
const encoder = new TextEncoder();
// wire.go's close codes.
const closeNoSession = 4404;
const closeReplaced = 4409;
const closeStopped = 4410;

// What the tool filled in (splitpage.Config). The page is authenticated by
// localweb's cookie, so no address here carries a token. A page opened with
// ?session= is for that session (proj serves many from one server), and its
// own query goes on to the terminal socket.
const pageQuery = new URLSearchParams(location.search);
pageQuery.delete('t');
// take=1 in the page's own address (a tool opening its window) takes the
// terminal once: it leaves the address, so a reload or a window the browser
// restores never takes it again.
const takeOnLoad = pageQuery.get('take') === '1';
if (pageQuery.has('take')) {
  pageQuery.delete('take');
  const kept = pageQuery.toString();
  history.replaceState(null, '', location.pathname + (kept ? `?${kept}` : '') + location.hash);
}
const socketPath = document.body.dataset.socket ?? '';
const session = pageQuery.get('session') ?? document.body.dataset.session ?? '';
const canRestart = document.body.dataset.restart === 'true';
const canTake = document.body.dataset.take === 'true';
const script = document.body.dataset.script ?? '';
const withSession = (path: string): string =>
  `${path}?session=${encodeURIComponent(session)}`;

// socketURL is the terminal socket's address: Config.Socket with the page's
// own query and the session added, and take=1 when taking the terminal from
// another page.
function socketURL(take: boolean): string {
  const [path, own = ''] = socketPath.split('?', 2);
  const q = new URLSearchParams(own);
  for (const [k, v] of pageQuery) q.set(k, v);
  q.set('session', session);
  if (take) q.set('take', '1');
  return `${socketScheme(location.protocol)}//${location.host}${path}?${q}`;
}

const notice = document.getElementById('stopped')!;
const noticeText = document.getElementById('stopped-text')!;
const startAgain = document.getElementById('start-again') as HTMLButtonElement;
const takeHere = document.getElementById('take-here') as HTMLButtonElement;

// showNotice says text, with one of the two buttons or neither.
function showNotice(text: string, button: HTMLButtonElement | null = null): void {
  noticeText.textContent = text;
  startAgain.hidden = button !== startAgain;
  takeHere.hidden = button !== takeHere;
  notice.hidden = false;
  button?.focus();
}

// Reloading can't help once the server has gone, so this is the page's last
// word: nothing replaces this notice.
let serverGone = false;
function sayServerGone(): void {
  serverGone = true;
  showNotice('The page’s server has stopped.');
}

// A browser that keeps no storage (or refuses it) still shows the page.
function stored(storage: () => Storage, key: string): string | null {
  try {
    return storage().getItem(key);
  } catch {
    return null;
  }
}
function keep(storage: () => Storage, key: string, value: string): void {
  try {
    storage().setItem(key, value);
  } catch {
    // not kept: the page still works for this load
  }
}

// The layout (layout.ts): a closed side lasts for the browser tab, and the
// divider's width is kept per page address.
const body = document.body;
const widthAt = widthKey(location.host, location.pathname);
let state: State = {
  layout: storedLayout(stored(() => sessionStorage, layoutKey)),
  narrow: false,
  view: 'terminal',
  dot: false,
};
const keptWidth = storedWidth(stored(() => localStorage, widthAt));
if (keptWidth !== null) body.style.setProperty('--term-width', `${keptWidth}px`);
// termShown fits the terminal and says its size, once, as it shows again:
// set by startTerminal.
let termShown = (): void => {};

const closeTerm = document.getElementById('close-term') as HTMLButtonElement;
const closeTabs = document.getElementById('close-tabs') as HTMLButtonElement;

function draw(): void {
  body.dataset.layout = state.layout;
  const left = state.layout === 'tabs-closed' ? 'Bring the tabs back' : 'Close the terminal: the tabs fill the window';
  const right = state.layout === 'term-closed' ? 'Bring the terminal back' : 'Close the tabs: the terminal fills the window';
  closeTerm.title = left;
  closeTerm.setAttribute('aria-label', left);
  closeTabs.title = right;
  closeTabs.setAttribute('aria-label', right);
}

// apply moves the page to next: it keeps a changed layout, draws it, and fits
// the terminal if it has just come back.
function apply(next: State): void {
  const was = termShows(state);
  if (next.layout !== state.layout) keep(() => sessionStorage, layoutKey, next.layout);
  state = next;
  draw();
  if (!was && termShows(state)) termShown();
}

function startTerminal(): void {
  const term = new Terminal({
    fontFamily,
    fontSize: 13,
    allowProposedApi: true,
    macOptionIsMeta: true,
    macOptionClickForcesSelection: true,
  });
  const fit = new FitAddon();
  term.loadAddon(fit);
  term.loadAddon(new Unicode11Addon());
  // A link the program prints opens in a browser tab of its own: an outside
  // site can't be framed, and is reached by a click (spec: outside sites open
  // from a link).
  term.loadAddon(new WebLinksAddon((_ev, uri) => window.open(uri, '_blank', 'noopener')));
  term.unicode.activeVersion = '11';
  term.open(document.getElementById('term')!);
  try {
    const webgl = new WebglAddon();
    webgl.onContextLoss(() => webgl.dispose());
    term.loadAddon(webgl);
  } catch {
    // no WebGL here: xterm's DOM renderer still draws
  }
  // A closed terminal is never fitted and never says a size: the program
  // keeps its own until the terminal shows again.
  const fitShown = (): void => {
    if (termShows(state)) fit.fit();
  };
  if (termShows(state)) {
    fit.fit();
    term.focus();
  }

  let ws: WebSocket;
  // xterm answers any terminal queries in the kept output as it writes them, and
  // those answers are old: nothing goes to the program until the replay, the first
  // frame, has been written.
  let replayed = false;
  const canSend = (): boolean => replayed && ws.readyState === WebSocket.OPEN;
  const send = (data: string): void => {
    if (canSend()) ws.send(encoder.encode(data));
  };
  const sendSize = (): void => {
    if (termShows(state) && ws.readyState === WebSocket.OPEN) {
      const msg: Resize = { type: 'resize', cols: term.cols, rows: term.rows };
      ws.send(JSON.stringify(msg));
    }
  };

  term.attachCustomKeyEventHandler((ev) => {
    // Only left Option is Alt; right Option still types its characters. The
    // modifier's own keydown is the one event that tells them apart.
    if (ev.type === 'keydown' && ev.key === 'Alt') {
      term.options.macOptionIsMeta = ev.code === 'AltLeft';
    }
    return handleKey(ev, send);
  });
  term.onData(send);
  term.onBinary((data) => {
    if (canSend()) {
      ws.send(Uint8Array.from(data, (c) => c.charCodeAt(0)));
    }
  });
  term.onResize(sendSize);
  term.onTitleChange((title) => {
    document.title = title;
  });
  term.onSelectionChange(() => {
    const text = term.getSelection();
    if (text) void navigator.clipboard.writeText(text).catch(() => {});
  });
  // A program copies through OSC 52.
  term.parser.registerOscHandler(52, (data) => {
    const b64 = data.slice(data.indexOf(';') + 1);
    if (b64 !== '?') {
      const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const text = new TextDecoder().decode(bytes);
      void navigator.clipboard.writeText(text).catch(() => {});
    }
    return true;
  });
  new ResizeObserver(fitShown).observe(document.getElementById('term')!);
  termShown = (): void => {
    // A fit that changes the size says it (onResize); one that doesn't still
    // says it once, since nothing was said while closed.
    let said = false;
    const heard = term.onResize(() => {
      said = true;
    });
    fit.fit();
    heard.dispose();
    if (!said) sendSize();
    term.focus();
  };

  // A tab opened with types (lwc's lesson) types into the terminal as a paste
  // does, with no Enter: the user reads it and sends it. A closed terminal
  // opens first.
  addEventListener('message', (ev) => {
    const text = sentText(ev.data, ev.origin, tabs.from(ev.source));
    if (text !== null) {
      apply(afterTyped(state));
      term.paste(text);
      term.focus();
    }
  });

  const connect = (take = false): void => {
    const socket = new WebSocket(socketURL(take));
    socket.binaryType = 'arraybuffer';
    ws = socket;
    replayed = false;
    socket.onopen = sendSize;
    socket.onmessage = (ev) => {
      term.write(new Uint8Array(ev.data as ArrayBuffer), () => {
        replayed = true;
      });
    };
    socket.onclose = (ev) => void closed(ev);
    // What the browser tests read and wait on.
    // fit sizes the terminal to its panel again: a tool's script that pads the
    // terminal (lwc's first-run note) calls it.
    Object.assign(window, { splitPage: { term, socket, canSend, tabs, fit: fitShown } });
  };

  const closed = async (ev: CloseEvent): Promise<void> => {
    if (serverGone) return;
    switch (ev.code) {
      case closeStopped:
        showNotice('The session’s program has stopped.', canRestart ? startAgain : null);
        return;
      case closeReplaced:
        if (canTake) showNotice('Opened in another tab.', takeHere);
        else showNotice('Opened in another tab: reload to show it here.');
        return;
      case closeNoSession:
        showNotice('This session no longer exists.');
        return;
    }
    // Only a server that still answers can be reconnected to by reloading.
    try {
      await fetch(withSession('/api/split/tabs'));
      term.write(`\r\n[${ev.reason || 'connection lost'}: reload to reconnect]\r\n`);
    } catch {
      sayServerGone();
    }
  };

  startAgain.addEventListener('click', () => {
    startAgain.disabled = true;
    void (async () => {
      try {
        const res = await fetch(withSession('/api/split/restart'), { method: 'POST' });
        if (res.ok) {
          notice.hidden = true;
          term.focus();
          connect();
        } else {
          showNotice(`Couldn’t start it again: ${await res.text()}`, startAgain);
        }
      } catch {
        sayServerGone();
      } finally {
        startAgain.disabled = false;
      }
    })();
  });

  takeHere.addEventListener('click', () => {
    notice.hidden = true;
    term.focus();
    connect(true);
  });

  connect(takeOnLoad);
}

function startDivider(): void {
  const divider = document.getElementById('divider')!;
  let dragging = false;
  let from = ''; // the width before the drag, kept if the drag closes a side
  let dragged: number | null = null;
  divider.addEventListener('pointerdown', (ev) => {
    // The arrows are buttons, and a closed side's divider doesn't drag.
    if (state.layout !== 'split' || (ev.target as Element).closest('button')) return;
    dragging = true;
    from = body.style.getPropertyValue('--term-width');
    dragged = null;
    try {
      divider.setPointerCapture(ev.pointerId);
    } catch {
      // a pointer the browser doesn't know (a synthetic one) can't be captured
    }
    divider.classList.add('dragging');
  });
  divider.addEventListener('pointermove', (ev) => {
    if (!dragging) return;
    const most = body.clientWidth - divider.offsetWidth - edge;
    dragged = Math.min(Math.max(ev.clientX, edge), most);
    body.style.setProperty('--term-width', `${dragged}px`);
  });
  // Let go within edge of an edge, the drag closes that side and the split
  // keeps the width it had; anywhere else the new width is kept.
  const end = (ev: PointerEvent, letGo: boolean): void => {
    if (!dragging) return;
    dragging = false;
    divider.classList.remove('dragging');
    if (dragged === null) return;
    const closes = letGo ? released(ev.clientX, body.clientWidth, divider.offsetWidth) : null;
    if (closes === null) {
      keep(() => localStorage, widthAt, String(Math.round(dragged)));
      return;
    }
    if (from) body.style.setProperty('--term-width', from);
    else body.style.removeProperty('--term-width');
    apply({ ...state, layout: closes });
  };
  divider.addEventListener('pointerup', (ev) => end(ev, true));
  divider.addEventListener('pointercancel', (ev) => end(ev, false));
  closeTerm.addEventListener('click', () => apply({ ...state, layout: arrow(state.layout, 'left') }));
  closeTabs.addEventListener('click', () => apply({ ...state, layout: arrow(state.layout, 'right') }));
}

draw();
// A tab opened in front, or the first, opens closed tabs; closing the last
// closes them. The first list the page hears picks a narrow page's side.
const tabs = startTabs(session, (prev, next) => {
  if (prev === null) apply({ ...state, view: firstView(next.tabs?.length ?? 0) });
  else apply(afterTabs(state, tabChange(prev, next)));
});
startTerminal();
startDivider();
// The tool's own script (Config.Script), from its own assets, once
// window.splitPage is set.
if (script !== '') {
  const url = new URL(script, location.href);
  if (url.origin === location.origin) await import(url.href);
}
