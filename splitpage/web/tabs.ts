// The right half: one frame per tab, following the server's list, and a slim
// row of tabs for the pages that aren't a switch tool's (a tab with no Tool):
// a tool's tab is reached through the bar's switch, so the row shows only
// while one of the others is open. Hidden frames stay loaded; the server
// knows which tab shows. Each
// frame is told whether it shows ({type: "kit.shown", shown}, which the kit's
// live() takes from its parent), so an unselected tool page lets go of its
// live stream: a browser allows about six connections to one host.

import type { Tab, TabList } from '../wire.d.ts';

const api = '/api/split/';

export interface TabsView {
  // The list the page shows now.
  list(): TabList;
  // The tab whose frame is source, or undefined for any other window.
  from(source: MessageEventSource | null): Tab | undefined;
  // take shows a list a call answered (the bar's tool call), as the stream's.
  take(list: TabList): void;
}

// changed hears each list the page shows, with the one it showed before:
// null on the server's first list, so a reload's tabs are not taken for tabs
// just opened, and never called before it. again says the server sent the
// same list as its last.
export function startTabs(
  session: string,
  changed: (prev: TabList | null, next: TabList, again: boolean) => void,
): TabsView {
  const row = document.getElementById('tabbar')!;
  const bar = document.getElementById('tab-list')!;
  const frames = document.getElementById('frames')!;
  const empty = document.getElementById('tabs-empty')!;
  const reload = document.getElementById('reload') as HTMLButtonElement;
  const buttons = new Map<string, HTMLElement>();
  const shown = new Map<string, HTMLIFrameElement>();
  let current: TabList = { session, tabs: [], selected: '' };
  let heard = false;
  let last: string | null = null; // the stream's last list, as sent

  const call = async (name: string, body: object): Promise<void> => {
    const res = await fetch(api + name, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session, ...body }),
    });
    if (res.ok) render((await res.json()) as TabList);
  };

  const button = (tab: Tab): HTMLElement => {
    const el = document.createElement('div');
    el.className = 'tab';
    el.setAttribute('role', 'tab');
    el.dataset.id = tab.id;
    // A tab opened behind is marked until it first shows.
    const dot = document.createElement('span');
    dot.className = 'tab-new';
    dot.setAttribute('aria-label', 'Not seen yet');
    const label = document.createElement('span');
    label.className = 'tab-title';
    el.append(dot, label);
    if (!tab.pinned) {
      const close = document.createElement('button');
      close.type = 'button';
      close.className = 'tab-close';
      close.setAttribute('aria-label', 'Close this tab');
      close.textContent = '\u00d7';
      close.addEventListener('click', (ev) => {
        ev.stopPropagation();
        void call('close', { id: tab.id });
      });
      el.append(close);
    }
    el.addEventListener('click', () => {
      // Shown at once; the server's answer and stream agree.
      render({ ...current, selected: tab.id });
      void call('select', { id: tab.id });
    });
    return el;
  };

  // tell posts the frame's shown state to its page, at the tab's origin only.
  const tell = (f: HTMLIFrameElement, address: string): void => {
    try {
      f.contentWindow?.postMessage({ type: 'kit.shown', shown: f.classList.contains('shown') }, new URL(address).origin);
    } catch {
      // a frame gone or an address with no origin: nothing to tell
    }
  };

  const frame = (tab: Tab): HTMLIFrameElement => {
    const el = document.createElement('iframe');
    el.title = tab.title || tab.address;
    el.dataset.id = tab.id;
    // A tool page's copy buttons write to the clipboard, which a frame may
    // only do when allowed.
    el.allow = 'clipboard-write';
    el.src = tab.address;
    // On every load, so a page that reloads or navigates hears it again.
    el.addEventListener('load', () => tell(el, tab.address));
    frames.append(el);
    return el;
  };

  function render(list: TabList, again = false, streamed = false): void {
    const tabs = list.tabs ?? [];
    const prev = current;
    current = { ...list, tabs };
    const ids = new Set(tabs.map((t) => t.id));
    for (const [id, el] of buttons) {
      if (!ids.has(id)) {
        el.remove();
        buttons.delete(id);
        shown.get(id)?.remove();
        shown.delete(id);
      }
    }
    for (const tab of tabs) {
      const on = tab.id === list.selected;
      let el = buttons.get(tab.id);
      if (tab.tool) {
        // a tool's tab: on the switch, not in the row
        el?.remove();
        buttons.delete(tab.id);
      } else {
        if (!el) {
          el = button(tab);
          buttons.set(tab.id, el);
        }
        // Never the address's query: a tool's ?t= token would show.
        const where = new URL(tab.address);
        el.querySelector('.tab-title')!.textContent = tab.title || where.host;
        el.title = where.origin + where.pathname;
        el.classList.toggle('selected', on);
        // Shown is seen: the mark goes as the tab shows, before the server says so.
        el.classList.toggle('new', tab.new === true && !on);
        el.setAttribute('aria-selected', String(on));
        bar.append(el); // in the server's order
      }
      let f = shown.get(tab.id);
      if (!f) {
        f = frame(tab);
        shown.set(tab.id, f);
      } else if (f.getAttribute('src') !== tab.address) {
        // The tool moved the tab (its page came back on a new port).
        const moved = frame(tab);
        f.replaceWith(moved);
        f = moved;
        shown.set(tab.id, f);
      }
      if (f.classList.contains('shown') !== on) {
        f.classList.toggle('shown', on);
        tell(f, tab.address);
      }
    }
    row.hidden = buttons.size === 0;
    empty.hidden = tabs.length > 0;
    reload.disabled = list.selected === '';
    if (heard || streamed) changed(heard ? prev : null, current, again);
  }

  reload.addEventListener('click', () => {
    const tab = current.tabs?.find((t) => t.id === current.selected);
    const f = tab && shown.get(tab.id);
    // A cross-origin frame can't be told to reload, and setting src again does
    // nothing when the address has a # part (casebook's do): a new frame in its
    // place always loads.
    if (tab && f) {
      const fresh = frame(tab);
      fresh.classList.add('shown');
      f.replaceWith(fresh);
      shown.set(tab.id, fresh);
    }
  });

  const stream = new EventSource(`${api}stream?session=${encodeURIComponent(session)}`);
  stream.onmessage = (ev) => {
    const data = ev.data as string;
    const again = last === data;
    last = data;
    render(JSON.parse(data) as TabList, again, true);
    heard = true;
  };
  // A stream that reconnects sends its list again: that is no open.
  stream.onerror = () => {
    last = null;
  };
  render(current);
  const from = (source: MessageEventSource | null): Tab | undefined => {
    if (source === null) return undefined;
    for (const [id, f] of shown) {
      if (f.contentWindow === source) return current.tabs?.find((t) => t.id === id);
    }
    return undefined;
  };

  return { list: () => current, from, take: (l) => render(l) };
}
