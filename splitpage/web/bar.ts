// The split page's bar across the top: the kit's own bar (kit-bar,
// kit-bar-ws, kit-bar-switch, kit-ctl, from /_kit/kit.css), drawn from the
// place the page's host gives (GET /api/split/place): the workspace, linking
// home, and the diazo | cast | galley switch, with the tool whose page is in
// front filled in. A host that gives no place leaves only the Terminal
// button, which entry.ts draws.

import type { Place, TabList } from '../wire.d.ts';

const api = '/api/split/';

export interface BarView {
  // draw fills in the switch for list: the tool of the tab in front while
  // pages shows, or the tool being started; and marks a tool whose tab was
  // opened behind and hasn't shown.
  draw(list: TabList, pagesShow: boolean): void;
}

// startBar draws the bar's place. pressed is told a tool was pressed, before
// its call, so the page can show the pages side; take shows the list the
// tool call answers.
export function startBar(session: string, pressed: () => void, take: (list: TabList) => void): BarView {
  const ws = document.getElementById('bar-ws') as HTMLAnchorElement;
  const toolSwitch = document.getElementById('bar-switch')!;
  const note = document.getElementById('tool-note')!;
  const noteText = document.getElementById('tool-note-text')!;
  const links = new Map<string, HTMLAnchorElement>();
  let place: Place | null = null;
  let pending = ''; // the tool pressed, until its call answers
  let last: { list: TabList; pagesShow: boolean } = { list: { session, tabs: [], selected: '' }, pagesShow: false };
  let noteFor = ''; // the selected tab when the note last showed: a new one clears it

  const say = (text: string): void => {
    noteText.textContent = text;
    note.hidden = text === '';
    noteFor = last.list.selected;
  };

  const press = async (name: string): Promise<void> => {
    const tool = place?.tools?.find((t) => t.name === name);
    if (!tool) return;
    pending = name;
    pressed();
    const open = (last.list.tabs ?? []).some((t) => t.tool === name);
    say(!tool.up && !open ? `Starting ${name}…` : '');
    view.draw(last.list, last.pagesShow);
    try {
      const res = await fetch(`${api}tool`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session, name }),
      });
      if (res.ok) {
        const list = (await res.json()) as TabList;
        pending = '';
        say('');
        tool.up = true;
        take(list);
      } else {
        pending = '';
        say(`Couldn’t start ${name}: ${(await res.text()).trim()}`);
      }
    } catch {
      pending = '';
      say(`Couldn’t reach the page’s server to show ${name}.`);
    }
    view.draw(last.list, last.pagesShow);
  };

  const view: BarView = {
    draw(list, pagesShow) {
      last = { list, pagesShow };
      if (pending === '' && !note.hidden && list.selected !== noteFor) say('');
      const tabs = list.tabs ?? [];
      const front = pagesShow ? tabs.find((t) => t.id === list.selected)?.tool ?? '' : '';
      const filled = pending || front;
      for (const [name, a] of links) {
        const on = name === filled;
        a.classList.toggle('on', on);
        if (on) a.setAttribute('aria-current', 'page');
        else a.removeAttribute('aria-current');
        a.classList.toggle('new', tabs.some((t) => t.tool === name && t.new === true && t.id !== list.selected));
      }
    },
  };

  void (async () => {
    try {
      const res = await fetch(`${api}place?session=${encodeURIComponent(session)}`);
      if (!res.ok) return; // no place: only the Terminal button
      place = (await res.json()) as Place;
    } catch {
      return;
    }
    ws.href = place.home;
    ws.textContent = place.workspace;
    ws.hidden = false;
    for (const tool of place.tools ?? []) {
      // A real link, so a middle-click or a modified click opens the tool in
      // a browser tab of its own; a plain click shows it on the right.
      const a = document.createElement('a');
      a.href = tool.href;
      a.textContent = tool.name;
      a.dataset.tool = tool.name;
      a.addEventListener('click', (ev) => {
        if (ev.button !== 0 || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;
        ev.preventDefault();
        void press(tool.name);
      });
      links.set(tool.name, a);
      toolSwitch.append(a);
    }
    toolSwitch.hidden = links.size === 0;
    view.draw(last.list, last.pagesShow);
  })();

  return view;
}
