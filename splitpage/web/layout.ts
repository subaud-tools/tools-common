// The page's layout and its rules, apart from the DOM so a test can run them.
// Wide, the page is split, or has one side closed (the terminal or the tabs);
// narrow, it shows one side at a time, the view, and never changes the wide
// layout, so widening brings the split back as it was left.

import type { TabList } from '../wire.d.ts';

export type Layout = 'split' | 'term-closed' | 'tabs-closed';
export type View = 'terminal' | 'pages';

export interface State {
  layout: Layout; // the wide layout, kept for the browser tab (sessionStorage)
  narrow: boolean; // the window is the page kit's narrow width or less
  view: View; // the side a narrow page shows
  dot: boolean; // a tab opened behind that Pages hasn't shown yet
}

// The page kit's narrow width.
export const narrowQuery = '(max-width: 640px)';
// While dragging, the divider stops this far from each edge; let go nearer
// than this, it closes the side next to that edge.
export const edge = 120;
export const layoutKey = 'splitpage.layout';

// widthKey is where the divider's width is kept (localStorage): one per page
// address, so proj's sessions share one width and lwc keeps its own.
export function widthKey(host: string, path: string): string {
  return `splitpage.width ${host}${path}`;
}

export function storedLayout(v: string | null): Layout {
  return v === 'term-closed' || v === 'tabs-closed' ? v : 'split';
}

// storedWidth is a kept width in pixels, or null for none or nonsense.
export function storedWidth(v: string | null): number | null {
  if (v === null || !/^\d+$/.test(v)) return null;
  const n = Number(v);
  return n >= edge ? n : null;
}

// arrow is the layout after a click on the divider's ◀ (left) or ▶ (right):
// each closes the side it points at, and from a closed side opens the split.
// Only one side is ever closed.
export function arrow(layout: Layout, dir: 'left' | 'right'): Layout {
  if (dir === 'left') return layout === 'tabs-closed' ? 'split' : 'term-closed';
  return layout === 'term-closed' ? 'split' : 'tabs-closed';
}

// released is the side a drag let go at x closes, or null: within edge of
// the left edge the terminal, within edge of the right the tabs. total is the
// page's width and divider the divider's.
export function released(x: number, total: number, divider: number): Layout | null {
  if (x < edge) return 'term-closed';
  if (total - divider - x < edge) return 'tabs-closed';
  return null;
}

// The view a new window opens on, narrow: Pages when there is a tab.
export function firstView(tabs: number): View {
  return tabs > 0 ? 'pages' : 'terminal';
}

export function termShows(s: State): boolean {
  return s.narrow ? s.view === 'terminal' : s.layout !== 'term-closed';
}

// What a new tab list did to the tabs.
export interface Change {
  front: boolean; // a tab opened in front (or an open one opened again)
  first: boolean; // the first tab, in front or behind
  behind: boolean; // a tab opened behind, beside others
  last: boolean; // the last tab closed
}

// tabChange compares the list the page showed with the next one. prev is
// null for the first list the page hears, which changes nothing.
export function tabChange(prev: TabList | null, next: TabList): Change {
  const change = { front: false, first: false, behind: false, last: false };
  if (prev === null) return change;
  const was = new Set((prev.tabs ?? []).map((t) => t.id));
  const now = new Set((next.tabs ?? []).map((t) => t.id));
  const added = [...now].filter((id) => !was.has(id));
  const moved = next.selected !== '' && next.selected !== prev.selected;
  // A selection that moves while the tab that showed is still there was
  // opened; one that moves because that tab closed is its neighbour.
  change.front = moved && (added.includes(next.selected) || now.has(prev.selected));
  change.first = was.size === 0 && now.size > 0;
  change.behind = added.length > 0 && !change.front && !change.first;
  change.last = was.size > 0 && now.size === 0;
  return change;
}

// afterTabs is the state after a change to the tabs: wide, a tab in front or
// the first opens closed tabs and closing the last closes them; narrow, the
// same are switches, and a tab opened behind marks Pages.
export function afterTabs(s: State, c: Change): State {
  if (c.last) return s.narrow ? { ...s, view: 'terminal' } : { ...s, layout: 'tabs-closed' };
  if (c.front || c.first) {
    if (s.narrow) return show(s, 'pages');
    return s.layout === 'tabs-closed' ? { ...s, layout: 'split' } : s;
  }
  if (c.behind && s.narrow && s.view === 'terminal') return { ...s, dot: true };
  return s;
}

// afterTyped is the state once a tab types into the terminal: it shows.
export function afterTyped(s: State): State {
  if (s.narrow) return { ...s, view: 'terminal' };
  return s.layout === 'term-closed' ? { ...s, layout: 'split' } : s;
}

// show switches a narrow page to view; Pages showing clears its mark.
export function show(s: State, view: View): State {
  return { ...s, view, dot: view === 'pages' ? false : s.dot };
}
