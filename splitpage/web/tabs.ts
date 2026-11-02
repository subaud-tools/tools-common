// The right half: a bar of tabs, one frame per tab, following the server's
// list. Hidden frames stay loaded; the server knows which tab shows.

import type { Tab, TabList } from '../wire.d.ts';

const api = '/api/split/';

export interface TabsView {
  // The list the page shows now.
  list(): TabList;
  // The tab whose frame is source, or undefined for any other window.
  from(source: MessageEventSource | null): Tab | undefined;
}

export function startTabs(session: string): TabsView {
  const bar = document.getElementById('tab-list')!;
  const frames = document.getElementById('frames')!;
  const empty = document.getElementById('tabs-empty')!;
  const reload = document.getElementById('reload') as HTMLButtonElement;
  const buttons = new Map<string, HTMLElement>();
  const shown = new Map<string, HTMLIFrameElement>();
  let current: TabList = { session, tabs: [], selected: '' };

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
    const label = document.createElement('span');
    label.className = 'tab-title';
    el.append(label);
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

  const frame = (tab: Tab): HTMLIFrameElement => {
    const el = document.createElement('iframe');
    el.title = tab.title || tab.address;
    el.dataset.id = tab.id;
    // A tool page's copy buttons write to the clipboard, which a frame may
    // only do when allowed.
    el.allow = 'clipboard-write';
    el.src = tab.address;
    frames.append(el);
    return el;
  };

  function render(list: TabList): void {
    const tabs = list.tabs ?? [];
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
      let el = buttons.get(tab.id);
      if (!el) {
        el = button(tab);
        buttons.set(tab.id, el);
      }
      // Never the address's query: a tool's ?t= token would show.
      const where = new URL(tab.address);
      el.querySelector('.tab-title')!.textContent = tab.title || where.host;
      el.title = where.origin + where.pathname;
      const on = tab.id === list.selected;
      el.classList.toggle('selected', on);
      el.setAttribute('aria-selected', String(on));
      bar.append(el); // in the server's order
      let f = shown.get(tab.id);
      if (!f) {
        f = frame(tab);
        shown.set(tab.id, f);
      }
      f.classList.toggle('shown', on);
    }
    empty.hidden = tabs.length > 0;
    reload.disabled = list.selected === '';
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
  stream.onmessage = (ev) => render(JSON.parse(ev.data as string) as TabList);
  render(current);
  const from = (source: MessageEventSource | null): Tab | undefined => {
    if (source === null) return undefined;
    for (const [id, f] of shown) {
      if (f.contentWindow === source) return current.tabs?.find((t) => t.id === id);
    }
    return undefined;
  };

  return { list: () => current, from };
}
