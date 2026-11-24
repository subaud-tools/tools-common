// Types for /_kit/kit.js, the tools-common localweb/page kit.
//
// TypeScript consumers bundle with esbuild and leave the kit external:
//   esbuild --external:/_kit/*
//   tsconfig "paths": { "/_kit/kit.js": ["<tools-common dir>/localweb/page/assets/kit.d.ts"] }
// where <tools-common dir> is `go list -m -f '{{.Dir}}' github.com/subaud-tools/tools-common`.

// ---- theme.js

/** system follows prefers-color-scheme; light and dark are remembered overrides. */
export type ThemeMode = 'system' | 'light' | 'dark';

export interface Theme {
  get(): ThemeMode;
  set(mode: ThemeMode): void;
  /** system → light → dark → system; returns the new mode. */
  cycle(): ThemeMode;
}

/** Apply the remembered mode (localStorage["<tool>.theme"]); a control, when given, cycles on click. */
export function initTheme(tool: string, control?: HTMLElement | null): Theme;

// ---- keys.js

/** Anything the family defaults can drive; list() returns one. */
export interface ListNav {
  move(d: number): void;
  open(): void;
  toggle(): void;
  toggleRange(): void;
  /** When present, createKeys binds / to it. */
  focusSearch?(): void;
}

export interface KeyBinding {
  /** "j", "1", "?", "↵", "↑", "↓", "Esc", modifiers "⌃⌥⇧⌘" as prefixes, sequences space-separated ("g a"). */
  keys: string;
  label: string;
  /** Return false to leave the event unhandled (not preventDefault-ed). */
  run(e: KeyboardEvent): void | boolean;
  /** Overlay group; defaults to "page". The family's own are "family". */
  group?: string;
  /** Fire even while a text field has focus (e.g. "⌘↵"). Single chords only. */
  inField?: boolean;
}

export interface Keys {
  /** Throws on a clash with a default or an earlier key. Returns an unregister function. */
  register(b: KeyBinding): () => void;
  /** Toggle, or force open/closed, the ? overlay. */
  showHelp(open?: boolean): void;
  bindings(): Array<{ keys: string; label: string; group: string }>;
  destroy(): void;
}

/** One thing the page's Esc closes (a menu, a composer, a panel). */
export interface EscCloser {
  /** Shown in the ? overlay as an Esc row, in the order tried. */
  label: string;
  /** Close it if it is open and return true; return false when there is nothing to close. */
  close(): boolean;
}

/**
 * Family defaults: j/↓ k/↑ move, o/↵ open, x select, ⇧x range (when list is given), / search (when the list has one,
 * or search is given; not both); ? keys; Esc closes or leaves a field.
 * esc: on Esc, in a text field too, each closer is tried in order and the first that returns true takes the key;
 * with none closing, Esc leaves the field as before. While a sheet or the ? overlay is open, Esc is the sheet's.
 * search: binds / alone, without the list keys.
 */
export function createKeys(opts?: {
  list?: ListNav;
  esc?: EscCloser[];
  search?: () => void;
  target?: EventTarget;
  now?: () => number;
}): Keys;

// ---- api.js

export class ApiError extends Error {
  status: number;
  /** status 401: this page's cookie no longer matches the server's token (signed out). The name is kept from when a 401 meant a restart. */
  readonly isStale: boolean;
  constructor(status: number, message: string);
}

export interface Api {
  get<T = unknown>(path: string, query?: Record<string, string>): Promise<T>;
  post<T = unknown>(path: string, body?: unknown): Promise<T>;
  put<T = unknown>(path: string, body?: unknown): Promise<T>;
  del<T = unknown>(path: string): Promise<T>;
  /** Calls onNewBuild, if it has not run yet: live()'s onNewBuild takes this. */
  newBuild(): void;
}

/** JSON over the tool's /api/. 204 or an empty body resolves null; non-2xx throws ApiError. onStale runs once, on the first 401. onNewBuild runs once, when a response's X-Tool-Build differs from the first this page saw, or on api.newBuild(). */
export function createApi(opts?: { base?: string; token?: string; fetch?: typeof fetch; onStale?(err: ApiError): void; onNewBuild?(): void }): Api;

// ---- live.js

/** stale: a poll got 401 (this page's cookie no longer matches the token: signed out); the client has stopped for good. */
export type LiveStatus = 'live' | 'polling' | 'down' | 'stale';

export interface LiveEvent<T = unknown> {
  type: string;
  data: T;
  cursor: string;
}

export interface LiveOptions {
  /** SSE endpoint: GET ?tab=&page=&since=; flush headers on connect; every message is the default event, id = cursor, data = JSON {type, data}. */
  events: string;
  /** Poll endpoint: GET ?tab=&page=&since=<cursor> → {cursor, events: [{type, data}]}. A hidden tab checks in through it once a minute. */
  poll: string;
  /** Every event except show events, which go to onShow, and spotlight events, which every kit page draws itself (spotlight.js). */
  onEvent(e: LiveEvent): void;
  onStatus?(s: LiveStatus): void;
  /** A stale event arrived (a new install; this serve runs the old code). Pass createApi's newBuild, so it and a changed X-Tool-Build make one notice. */
  onNewBuild?(): void;
  /** What this tab shows, in the tool's words, sent as page on every request; default "" (the front page). */
  page?: string;
  /** A {type: "show", data: {tab, page}} event naming this tab arrived: show page (e.g. navigate to it). */
  onShow?(page: string): void;
  cursor?: string;
  /** Poll interval in ms while the stream is down; default 2000. */
  interval?: number;
  /** Check-in interval in ms while the tab is hidden; default 60000. */
  hiddenInterval?: number;
  /** Makes the tab id; default crypto.randomUUID. */
  randomUUID?: () => string;
  EventSource?: typeof EventSource;
  fetch?: typeof fetch;
  setTimeout?: (fn: () => void, ms: number) => unknown;
  clearTimeout?: (id: unknown) => void;
  /** Takes visibilitychange; default globalThis.document. */
  document?: Pick<Document, 'visibilityState' | 'addEventListener' | 'removeEventListener'>;
  /** Hears {type: "kit.shown", shown} from its parent (proj's split page); default globalThis.window. */
  window?: Pick<Window, 'parent' | 'addEventListener' | 'removeEventListener'>;
  /** false: don't draw the step the serve holds (GET /api/kit/spotlight) when the stream first opens. Default true. */
  spotlight?: boolean;
}

/** tab(): this page load's id, sent as tab on every request (send it when asking the server to move this tab). */
export function live(opts: LiveOptions): { stop(): void; cursor(): string; tab(): string };

// ---- selection.js

/** A set of row ids that several views bind to (a flat list and a board of the same items). */
export interface Selection {
  ids(): string[];
  has(id: string): boolean;
  toggle(id: string): void;
  /** Set every id between anchorId and id (in orderedIds) to the anchor's state. If either anchorId or id is not in orderedIds, this toggles id. */
  range(anchorId: string, id: string, orderedIds: string[]): void;
  all(ids: string[]): void;
  deselect(ids: string[]): void;
  clear(): void;
  /** The id last toggled or ranged to; null after clear(). */
  anchor(): string | null;
  /** Called with the ids after every change; returns an unsubscribe function. */
  onChange(cb: (ids: string[]) => void): () => void;
}

export function createSelection(): Selection;

// ---- sheet.js

export interface SheetHandle {
  el: HTMLElement;
  /** Idempotent; always closes (canDismiss is not asked); returns focus to where it was and calls onClose. */
  close(): void;
  /** Shows msg in the error spot at the end of the button row (a sheet with actions); empty or missing clears it. */
  error(msg?: string): void;
}

/** A small modal sheet over a backdrop: Esc or a backdrop click closes it, focus stays inside, page keys wait. */
/** returnFocus: where focus goes on close if the opener has left the page (default: the main region, else body). */
/** canDismiss: asked before Esc or a backdrop click closes it; false keeps it open (a draft to keep). */
/** With actions, the button row ends with an empty `.kit-sheet-error` (role alert) that error() fills. */
export function sheet(o?: { title?: string; body?: Node | string; actions?: Button[]; onClose?(): void; returnFocus?: HTMLElement; canDismiss?(): boolean }): SheetHandle;

export interface ConfirmHandle {
  el: HTMLElement;
  /** Idempotent; closes it with run not called (or its result ignored). */
  close(): void;
  /** Turns the action button off or on; it stays off while run runs. */
  setDisabled(disabled: boolean): void;
}

/** A sheet that asks one question: title, body, the action (danger or fill) and Cancel; focus on the action; Esc, backdrop or Cancel close it with nothing done; the action awaits run(): resolved closes, rejected shows the reason in `.kit-sheet-error` and enables the action again. */
export function confirm(o: { title: string; body?: Node | string; action: { label: string; tone: 'danger' | 'fill' }; run(): Promise<unknown>; disabled?: boolean }): ConfirmHandle;

/** Whether any sheet is open (the keyboard layer suspends page keys while one is). */
export function sheetOpen(): boolean;

// ---- dom.js

type Child = Node | string | number | null | undefined | false;

/** Create an element: class, on<event>, dataset, boolean attributes; string children are text. */
export function h(tag: string, attrs?: Record<string, unknown> | null, ...children: Array<Child | Child[]>): HTMLElement;

export interface Section {
  id: string;
  label: string;
  /** Any string: "46", "37/150". */
  count?: string | number;
}

export interface Primary {
  label: string;
  run(): void;
}

export type StatusTone = 'muted' | 'signal' | 'danger';

export interface BarHandle {
  el: HTMLElement;
  /** Settles once the bar has asked the guide whether the page's tool is beta (and, if so, put " · beta" after the brand). */
  beta: Promise<void>;
  /** Settles once the bar has drawn the hosted machine's place from the same guide answer (a.kit-bar-ws, the workspace linking to billet's start page, then span.kit-bar-switch, diazo | proj | galley with the page's tool filled in and the brand hidden), or knows there is none, as on a device, where both stay hidden. On a phone the workspace goes into the ⋯ and the switch stays. */
  place: Promise<void>;
  themeControl: HTMLElement;
  /** The Guide button every page's bar has, left of the theme control: it opens openGuide(). */
  guideControl: HTMLElement;
  /** The bar's ⋯, shown only at 640px wide or less, where the bar stays one 52px line: the switch, the brand, the section buttons and the primary stay, and the workspace, the status, the also-open switcher, the live pill, Guide and themeControl go into its tray. They are the same elements, moved there while the tray is open and back whenever it closes, so each keeps working. themeControl carries the class kit-bar-theme for it. The section buttons sit in span.kit-bar-sections (display: contents wider than a phone); on a phone they keep their whole labels and that span scrolls sideways when they don't fit. */
  moreControl: HTMLElement;
  setSection(id: string): void;
  /** Show or hide every section button, for one bar kept across pages. */
  setSectionsShown(shown: boolean): void;
  /** Redraw the section buttons in place, beside the brand, with the same look and onSection, for one bar kept across pages (Plans · Later on one page, Plan · Record on another). active is the one on (none without it); the buttons keep setSectionsShown's state, and setSection and setCount act on the new ones. */
  setSections(sections: Section[], active?: string): void;
  setCount(id: string, count?: string | number | null): void;
  /** tone: muted (default), signal, or danger (e.g. "offline · 3 queued"). */
  setStatus(text: string, opts?: { tone?: StatusTone }): void;
  /** The pill; text overrides its label. stale with no text (what onStale and live()'s stale call for on a 401) shows "signed out" with a Sign in again button, which posts /signin {page} so the server opens a signed-in tab of this page. stale with text is the newer-build notice. */
  setLive(s: LiveStatus, text?: string): void;
  /** The one filled button; null hides it. */
  setPrimary(p: Primary | null): void;
  /** The "also open" button before the live pill, and its list in this order. An empty array hides it. */
  setElsewhere(items: ElsewhereItem[]): void;
}

/** An item in the bar's "also open" list: other work a click away. The bar shows one fixed-width button that counts the items (and those that need you) and opens the list. */
export interface ElsewhereItem {
  label: string;
  /** Muted line under the label in the list, e.g. "needs you · Decisions". */
  detail?: string;
  /** Who it waits on: you (signal dot and edge), working (the agent's dot), idle (muted, the default). */
  tone?: 'you' | 'working' | 'idle';
  /** The page you are on: listed in its place and counted, marked "you are here"; its row only closes the list. */
  current?: boolean;
  onClick(): void;
}

export function bar(o: {
  /** With href, the brand links there (the tool's home page); without it, plain text. */
  brand: { name: string; mark?: Node; href?: string };
  sections?: Section[];
  active?: string;
  onSection?(id: string): void;
  status?: string;
  primary?: Primary | null;
  theme?: HTMLElement;
  /** No longer shown: a 401 shows the kit's "signed out" pill, and the newer-build notice passes its own text. Kept so tools that set it still type-check. */
  staleText?: string;
  /** Swaps what Sign in again uses after its press (tests): the requests, the one-second checks, and closing or reloading the tab. */
  signIn?: { fetch?: typeof fetch; setTimeout?: (fn: () => void, ms: number) => unknown; close?(): void; reload?(): void };
  /** Where the bar loads the guide for the beta mark and the place (tests); /api/kit/guide by default. */
  guideUrl?: string;
}): BarHandle;

export interface BandHandle {
  /** header.kit-band: on the app grid it spans every column in row 2, between the bar and the columns, wherever it is appended. */
  el: HTMLElement;
  /** input.kit-input.kit-band-search, the band's search field, or null with none. */
  readonly search: HTMLInputElement | null;
  /** The title's words, in place: the h1 stays the same element. */
  setTitle(title: string | Node): void;
  /** Replaces the nodes on the title's line beside the title; the title, the fold, the end and the second line stay. */
  setBeside(nodes?: Array<Node | string> | null): void;
  /** Replaces the fold (see BandFold); the ⋯ follows. */
  setFold(fold?: BandFold[] | null): void;
  /** Replaces the nodes at the title line's right end (the page's actions), before the search and the ⋯. */
  setEnd(nodes?: Array<Node | string> | null): void;
  /** Draws the search field at the title line's end, or takes it away with null. */
  setSearch(search?: BandSearch | null): void;
  /** Replaces the tool's own ⋯ items. */
  setMenu(items?: RowMenuItem[] | null): void;
  /** Replaces the start of the second line (the track, the status pills, a back link); the end stays. Empty with no end takes the line away. */
  setUnder(nodes?: Array<Node | string> | null): void;
  /** Replaces the nodes at the second line's right end (the needs-you pill), before the sort. */
  setUnderEnd(nodes?: Array<Node | string> | null): void;
  /** Puts node (a list's sort; sortedList's band does this) last on the second line, or takes it away with null. */
  setSort(node?: Node | null): void;
}

/** The band's search: a field at the title line's end. onInput hears its value on every input. label names it to a screen reader (default placeholder). */
export interface BandSearch {
  placeholder?: string;
  value?: string;
  label?: string;
  onInput?(value: string): void;
}

/** A node beside the title (in span.kit-band-fold, which lays its nodes out on the title line itself) that moves into the band's ⋯ on a phone (640 wide or less) and on any width where the title would go under its floor (320px, or its own width when shorter) with the fold on the line: the band is then header.kit-band.kit-band-folded, node hides and item, when given, shows in the ⋯, before the tool's menu items; the band measures its line and unfolds as soon as the fold fits again. With at: 'end' the node sits in the title line's end place instead (span.kit-band-fold-end, before end), as galley's History and HTML preview do, and folds the same way: the way to give an end action that leaves a phone's line. With shrink: true (beside the title, not at the end) node gives way with an ellipsis, down to nothing, after what is beside the title and the search and before the title (it gets class kit-band-shrink); without it a fold node never shrinks. */
export interface BandFold {
  node: Node;
  item?: RowMenuItem;
  at?: 'end';
  shrink?: boolean;
}

/**
 * The strip under the bar with the page's title, measured from diazo's: 104px
 * high at every width, a phone included, with or without its second line, so a
 * tool sets no height of its own. An 18px bold title, then on its line beside
 * (a state pill, a size, an email), fold, and at the line's right end
 * (div.kit-band-end) the fold entries with at: 'end', end (the page's actions),
 * search (input.kit-band-search, 240px when there is room, never under 96px,
 * still a field on a phone) and the one ⋯ (rowMenu, with the kit's bordered
 * control look). The second line
 * (div.kit-band-under): under (a stage track, status pills, a back link), and
 * at its right end (div.kit-band-under-end) underEnd (the needs-you pill) then
 * sort (a list's sort: pass the band to sortedList). The second line is one
 * line at every width: a track or pills too long scroll sideways. The ⋯ holds
 * the fold's items (on a phone, or while the band is folded) and menu (the tool's, at every width);
 * it is drawn only when there is something for it, so a page never has two.
 * No place given, no empty container. The title stays whole while the rest of
 * its line gives way: the last thing beside it shrinks first, with an ellipsis
 * (a long email on a phone), then the search down to 96px, then the fold
 * entries with shrink; end nodes and the rest of the fold stay whole. The
 * title then shrinks, with an ellipsis, never under its floor (320px, or its
 * own width when shorter) while the fold is on the line: short of that room
 * the fold goes into the ⋯ (BandFold). A title too long for the line alone
 * shrinks last.
 * Search and sort go only through the band: nothing sits between the band and
 * the columns.
 */
export function band(o: {
  title: string | Node;
  beside?: Array<Node | string>;
  under?: Array<Node | string>;
  end?: Array<Node | string>;
  search?: BandSearch | null;
  underEnd?: Array<Node | string>;
  sort?: Node | null;
  fold?: BandFold[];
  menu?: RowMenuItem[];
}): BandHandle;

export interface Chip {
  id: string;
  label: string;
  count?: string | number;
  on?: boolean;
}

export interface Row {
  /** The row's identity across setItems; without it, key + title is. */
  id?: string;
  /** The mono kicker line. */
  key?: string;
  title: string;
  meta?: string;
  sub?: string;
  selectable?: boolean;
}

export interface ListHandle<T> extends ListNav {
  el: HTMLElement;
  /** The store this list binds to: the one passed in, or its own. */
  selection: Selection;
  /** Keeps the open row, cursor and selection by row id (else key + title); calls onSelect if the selection changed. Tested to 500 rows; paginate beyond that. */
  setItems(items: T[]): void;
  setChips(group: 'view' | 'filter', chips: Chip[]): void;
  move(d: number): void;
  open(i?: number): void;
  toggle(i?: number): void;
  toggleRange(i?: number): void;
  /** The selected items among those rendered now. */
  selected(): T[];
  /** Every selected row id, rendered or not (other pages, select-all-in-view). Rows need an id. */
  selectedIds(): string[];
  selectAll(ids: string[]): void;
  deselect(ids: string[]): void;
  clearSelection(): void;
  /** The cursor row's index, -1 when empty. */
  current(): number;
  /** Set the search text (e.g. restored from the URL) without calling onInput. */
  setSearch(text: string): void;
  /** Present only when the list has a search field; the keyboard layer binds / to it. */
  focusSearch?(): void;
  /** Stop listening to a shared selection (call when the list is discarded). */
  destroy(): void;
}

export function list<T>(o: {
  label: string;
  views?: Chip[];
  filters?: Chip[];
  onChip?(group: 'view' | 'filter', id: string): void;
  row(item: T): Row;
  onOpen?(item: T, i: number): void;
  onSelect?(selected: T[]): void;
  /** A search field in the header. onInput runs on every input (no debounce). Esc clears it, then leaves it; / focuses it. */
  search?: { placeholder?: string; value?: string; onInput(text: string): void };
  /** Bind to a shared selection store; rows need an id. Default: the list's own. */
  selection?: Selection;
  /** Open the row the cursor moves to (the reading column follows j/k). */
  openOnMove?: boolean;
  foot?: Node;
}): ListHandle<T>;

export function facts(pairs: Array<[string, string | Node]>): HTMLElement;

export interface Button {
  label: string;
  run?(): void;
  /** The one primary in a card. */
  fill?: boolean;
  /** A destructive verb: red text. */
  danger?: boolean;
  disabled?: boolean;
}

export function buttons(bs: Button[]): HTMLElement;

/** A colour-edged card. With stack, its body (div.kit-card-body.kit-stack) puts 12px between its parts, gives its paragraphs no margins of their own, and leaves no gap for a hidden part. */
export function card(o: { edge?: 'signal' | 'agent' | 'wait'; head?: string; body?: Node | string | Array<Node | string>; actions?: Button[]; stack?: boolean }): HTMLElement;

export interface CardLineAction {
  label: string;
  run?(): void;
  /** A destructive verb: in the danger colour. */
  danger?: boolean;
  disabled?: boolean;
  /** Its aria-label, when the label alone doesn't say what it acts on ("Remove alice@example.com"). */
  title?: string;
  /** Set as data-* attributes on its button (`{ action: 'clear-setting' }` is `data-action="clear-setting"`), so a page can find it. */
  data?: Record<string, string>;
}

/** One line in a card: its words on the left, its small mono meta and link-buttons on the right with a dot between each, a rule between lines. No meta and no actions, no right side. */
export function cardLine(o: { main: Node | string | Array<Node | string>; meta?: Node | string; actions?: CardLineAction[] }): HTMLElement;

/**
 * One setting in a card: a card line (`div.kit-card-line.kit-setting-line`, the same rule, paddings and type as cardLine) whose height never depends on whether it has a meta or actions.
 *
 * Its children, in order: `span.kit-setting-line-name` (holding `span.kit-setting-line-label`, the name, then `small.kit-setting-line-hint` when there is a hint), `span.kit-setting-line-control` (only with a control; the line then carries `with-control`), and `span.kit-card-line-side.kit-setting-line-side` (only with a meta or an action: `small.kit-card-line-meta`, then `span.kit-setting-line-acts` holding the `button.kit-card-line-act`s with a dot between each).
 *
 * Wide, with a control: one row. The name is in a fixed first column (`--kit-setting-name`, 200px) so the controls of consecutive lines share a left edge; the control is next, at most `--kit-setting-control` (320px) wide; the side is at the right end. When the window is 640px wide or less: the name and the side share the first row and the control is under them at full width. Set either custom property on the line or anything around it to change a width.
 *
 * The side is one row and never goes under the control. Its actions are never cut; its meta takes the room left and is cut with an ellipsis, with its whole text in its `title`. The name is one line, cut with an ellipsis when it doesn't fit, with the name and hint in its `title`.
 *
 * With no control the name and the side share one row at every width; when the actions don't fit beside the name they go under it, at the right, whatever the meta says.
 *
 * The setting's name becomes the control's accessible name (`aria-labelledby` the label, whose id is `id` or one the kit makes) when the control has none of its own: the control itself when it is an input, select, textarea, button or has a `role`, else the one input, select or textarea inside it. A control with an `aria-label`, an `aria-labelledby` or a `label` (a pickField, a chipPick, a textField) is left as it is.
 */
export function settingLine(o: {
  /** The setting's name. */
  name: string;
  /** Small muted words after the name, drawn as given after a space ("· top to bottom", "· 2 of 17 on"). */
  hint?: string;
  /** Its control: a pickField's el, a chipPick's el, an input with a button, or words. */
  control?: Node | string;
  /** As cardLine's: small mono words on the right ("changed here"). */
  meta?: Node | string;
  /** As cardLine's: link-buttons on the right (Reset, All, None). */
  actions?: CardLineAction[];
  /** The id of the name's label, when the page wants to choose it; the kit makes one only when it ties the name to the control. */
  id?: string;
}): HTMLElement;

/** A label over a text input (its id, given or made, ties them), with an optional hint line; onInput gets the value on every input. mono sets the input in the mono face. */
export function textField(o: {
  label: string;
  value?: string;
  placeholder?: string;
  mono?: boolean;
  hint?: string;
  id?: string;
  onInput?(value: string): void;
}): { el: HTMLElement; input: HTMLInputElement };

/** A checkbox and its words in one label.kit-tick, the box centred on the words, 8px between them; a press on the words ticks the box. onChange gets checked on every change. */
export function tick(o: {
  label: Node | string;
  checked?: boolean;
  /** The input's value attribute. */
  value?: string;
  onChange?(checked: boolean): void;
}): { el: HTMLLabelElement; input: HTMLInputElement };

/** One choice of a pickField. */
export interface PickChoice {
  value: string;
  label: string;
  /** A muted second line under the label in the menu. */
  detail?: string;
  /** It stands for nothing picked yet (Agent picks): the button reads muted while it is the current choice. */
  blank?: boolean;
}

export interface PickField {
  /** The .kit-field: the label over the dropdown. */
  el: HTMLElement;
  /** The kit-input button that opens the menu. */
  button: HTMLButtonElement;
  /** The current choice's value. */
  readonly value: string;
  /** Makes value the current choice, without calling onPick or onCurrent. With reads, the button's words are worked out again, also when value is the one it has. */
  set(value: string): void;
}

/** The last line of a pickField's menu, and the choices it opens in place. */
export interface PickMore {
  /** The line's words (All models…). */
  label: string;
  /** The choices that replace the line when it is pressed, in order after choices. With none, no line is drawn. A value should be in choices or here, not both. */
  choices: PickChoice[];
}

/**
 * The kit's dropdown: a label over a button drawn as kit-input with a chevron, naming the current choice, that opens the kit's menu surface (kit-row-pop) listing each choice with its muted detail line and the current one in the soft signal fill.
 * The menu hangs 4px below the button on its left edge, or its right edge when the left would run past the nearest .kit-card or .kit-float (a sheet) or the window (when neither fits, on its left edge with its lines wrapped to the room there), and is never narrower than the button. It opens above the button when there is more room above than below, and is capped to the room it has, scrolling inside with the focused choice kept in view. One pop-out is open on the page at a time (rowMenu's too).
 * Enter, Space or an arrow opens it on the current choice, arrows move, Enter, Space or a press picks, Esc closes and returns the focus to the button; a press outside closes it.
 * value starts as the current choice (the first choice when left out); onPick hears a value that differs from the current one.
 * more ends the menu with one line reading more.label (button.kit-pick-opt.kit-pick-more, under an hr): the arrows reach it like a choice, and a press, Enter or Space on it picks nothing and leaves the menu open, with the line and its rule hidden, more.choices shown after choices, the menu placed again for its new height and the focus on the first of more.choices. The menu opens collapsed every time, unless the current value is only in more.choices (and not in choices): then it opens on the longer list, on the current choice, so the current choice is always in the menu. value and set(value) take a value from more.choices, and the button then reads that choice's label. With more.choices empty, no line is drawn.
 * labelHidden keeps the label in the page for a screen reader (label.kit-field-label.kit-label-hidden, still naming the button) and does not draw it: for a grid or a table cell that already names the dropdown.
 * size 'compact' is the dropdown for a bar or a band: the field (el) carries kit-pick-compact and its button is 28px high with 12px words and no padding above or below; the menu's rows are an ordinary dropdown's. The button is as wide as the field, so the page gives el its width. Left out, the dropdown is as before.
 * reads is what the button shows instead of the current choice's label: a string (the same words whatever is chosen), or a function given the current choice (undefined when the value is none of the choices) that returns the words. It is asked at the start and again on every pick and every set(value), so set(field.value) reads again when what it depends on changed; arrows in the menu move the focus only and change no words. With reads the button's title is always those words in full (for when its width cuts them), kept by the kit on every pick and set, and the button is named for a screen reader by its label then those words (aria-labelledby the label and span.kit-pick-label). The menu still reads each choice's own label, and a blank choice still reads muted. Left out, the button reads the choice's label and has no title or aria-labelledby, as before.
 * onCurrent hears a press, Enter or Space on the choice that is already the current one, with its value, once, after the menu has closed and the button has the focus back; onPick does not hear that press. Left out, that press only closes the menu, as before.
 */
export function pickField(o: { label: string; choices: PickChoice[]; value?: string; id?: string; onPick?(value: string): void; more?: PickMore; labelHidden?: boolean; size?: 'compact'; reads?: string | ((choice: PickChoice | undefined) => string); onCurrent?(value: string): void }): PickField;

/** One chip of a chipPick. */
export interface PickChip {
  value: string;
  label: string;
  /** Gives the chip a ✕ button beside it, with this as its accessible name (Unpin claude-opus-4-8); a press calls onRemove. */
  remove?: string;
}

/**
 * A group of chips to choose from (div.kit-chip-pick, role group, named by its label): span.kit-field-label reading label, then div.kit-chip-set holding one button.kit-chip per chip with data-value, those whose value is in chosen on with aria-pressed="true".
 * One-of (the default): a press on the chip that is on does nothing, a press on another calls onToggle with its value. many: every press calls onToggle with the chip's value, on or off.
 * A chip with remove is drawn in span.kit-chip-rm with button.kit-chip-x (✕) after it: a sibling of the chip's button, never inside it, named by remove, whose press calls onRemove with the chip's value and not onToggle.
 * The caller keeps the state and redraws, as with sortSwitch. When the press had the focus and a chipPick of the same label is drawn during onToggle or onRemove, the redrawn chip of that value gets the focus back; after a remove, the ✕ that took the removed one's place, else the last ✕. A redraw after the call returns (after a save, say) moves no focus.
 * labelHidden keeps the label in the page for a screen reader (kit-label-hidden) and does not draw it.
 */
export function chipPick(o: { label: string; chips: PickChip[]; chosen: string[]; many?: boolean; labelHidden?: boolean; onToggle(value: string): void; onRemove?(value: string): void }): HTMLElement;

/**
 * The open and close of a button's pop-out, as rowMenu and pickField use it: show opens pop (closing whichever pop-out was open on the page), and a press outside wrap or Esc closes it. onToggle hears it open and close unless the call was quiet. It listens on the document wrap lives in. A pop with the popover attribute shows in the top layer, adding nothing to the page's size; place puts it where it belongs (placePop): called once it shows, and again when the window is resized or anything but the pop scrolls. A pop opened before it is in the page shows once it is.
 */
export function popOut(o: { wrap: HTMLElement; btn: HTMLElement; pop: HTMLElement; onToggle?(open: boolean): void; place?(e?: Event): void; /** Hears every close, quiet ones included (onToggle doesn't hear a quiet one). */ onClose?(): void }): { show(quiet?: boolean): void; close(quiet?: boolean): void; readonly open: boolean };

/** Puts a top-layer pop (one with the popover attribute, position fixed) at its button, as pickField and rowMenu do: 4px below the button when it fits there or there is more room below than above, else 4px above it; never taller than the room, scrolling inside itself. Across, the default is pickField's: on the button's left edge when it fits within the nearest card or sheet and the window, else its right edge when it fits from that, else the left edge wrapped to the room, never narrower than the button. right is a row menu's: on the button's right edge when it fits within the window, else its left edge, else the edge with more room, wrapped to it. Give it to popOut as place. */
export function placePop(btn: HTMLElement, pop: HTMLElement, o?: { right?: boolean }): void;

/** A tinted box inside a card that asks before something happens: its words, then a row of buttons (none, no row). tone: signal (the default) or danger. */
export function confirmBox(o: { tone?: 'signal' | 'danger'; body: Node | string | Array<Node | string>; buttons?: Button[] }): HTMLElement;

/** The card a list shows with nothing in it: a centred line of muted words and one button (none, no button). */
export function emptyCard(o: { text: string; action?: { label: string; run?(): void; fill?: boolean } }): HTMLElement;

export interface KeyedRows<T> {
  /**
   * Draws a row for each new key, removes the rows of keys gone, calls update
   * only for an item whose data (compared as JSON) differs from the last set,
   * and moves the rows into the items' order. An unchanged row is the same
   * element, so an open menu, details or input in it is never replaced. A
   * repeated key keeps its first item.
   */
  set(items: T[]): void;
  /** The row drawn for a key, or null. */
  get(key: string | number): HTMLElement | null;
}

/**
 * Keeps a list's rows by key in container, which holds only the rows: a poll
 * changes only the rows whose state changed. update changes a row in place;
 * without it, a changed row is drawn anew in its place.
 */
export function keyedRows<T>(container: HTMLElement, o: {
  key(item: T): string | number;
  draw(item: T): HTMLElement;
  update?(row: HTMLElement, item: T): void;
}): KeyedRows<T>;

/** Line-numbered source: two <pre>s, scrolls sideways; highlight returns the source's content. */
export function codeBlock(src: string, o?: { start?: number; highlight?(src: string): Node }): HTMLElement;

export function fold(label: string, content: Node | string, o?: { open?: boolean }): HTMLDetailsElement;

/** ↵ or blur commits a changed value; Esc reverts and leaves. Page keys don't fire while it has focus. */
export function noteField(o: { value?: string; placeholder?: string; onCommit(v: string): void }): HTMLInputElement;

/** A message's state: tools-common/msgstate's State. */
export type MessageState = 'sent' | 'with_agent' | 'working' | 'answered' | 'declined' | 'failed' | 'no_reply';

/** A message's state pill (its label from msgstate.js) with the line under it; no line, no line element. */
export function messagePill(state: MessageState, line?: string): HTMLSpanElement;

// ---- msgstate.js (generated from tools-common/msgstate)

/** Every state in order, with the words its pill shows. */
export const MESSAGE_STATES: ReadonlyArray<{ state: MessageState; label: string }>;

// ---- enter.js

/**
 * A plain Enter calls submit and prevents its new line; Shift-Enter, a repeat
 * and an IME's Enter (isComposing or keyCode 229) keep the key's usual meaning.
 * Returns the field.
 */
export function submitOnEnter<T extends { addEventListener(type: 'keydown', listener: (e: KeyboardEvent) => void): void }>(
  field: T,
  submit: () => void,
): T;

// ---- share.js (styled by share.css, which kit.css imports, through --share-* properties)

export const SHARE_LABEL: 'Share ▾';
export const SHARE_DOWNLOAD_HTML: 'Download HTML';
export const SHARE_DOWNLOAD_MD: 'Download Markdown';
export const SHARE_SHARE_HTML: 'Share HTML';
export const SHARE_SHARE_MD: 'Share Markdown';
export const SHARE_COPY_LINK: 'Copy link';
export const SHARE_PRINT: 'Print or save as PDF';
/** How long a Share's copied line stays on the status line, in ms. */
export const SHARE_REPLY_MS: number;

/** The status line after a Share put the file at path on the clipboard: "<base name> copied · paste to attach". */
export function sharedLine(path: string): string;

/** One menu row; act is the tool's own name for what it does. */
export interface ShareRow<A extends string = string> {
  label: string;
  act: A;
}

/** A label over the rows after it: not a menuitem, not pressable, not in the tab order. */
export interface ShareHeading {
  label: string;
  heading: true;
}

export type ShareItem<A extends string = string> = ShareRow<A> | ShareHeading;

export interface ShareMenu {
  el: HTMLElement;
  open(): void;
  close(): void;
  toggle(): void;
  isOpen(): boolean;
  /** Removes the menu and its listeners, the button's toggle included. */
  destroy(): void;
}

/** Builds button's menu from items, hidden, and makes the button toggle it, right-aligned under it. A pick closes it and calls onPick; an outside click, Escape and a resize close it. */
export function shareMenu<A extends string>(button: HTMLElement, items: ShareItem<A>[], onPick: (act: A, item: ShareRow<A>) => void): ShareMenu;

// ---- tip.js

/** Makes trigger open tip (a .kit-tip) inside box (a .kit-tip-at): on hover, keyboard focus, Enter or a tap; Esc, leaving by keyboard or a tap elsewhere closes it. when says whether there is anything to show; a press with nothing to show goes to what is under it. */
export function wireTip(box: HTMLElement, trigger: HTMLElement, tip: HTMLElement, when?: () => boolean): void;
/** A tip of one plain line. */
export function lineTip(text: string): HTMLElement;

// ---- frame.js

export interface CollapsibleOptions {
  col: HTMLElement;
  body: HTMLElement;
  /** Names the panel to the reader ("Show the index") and in the key. */
  panel: string;
  side: 'left' | 'right';
  /** The tool's name: the fold is remembered in localStorage["<name>.collapsed.<panel>"]. */
  name: string;
  /** Start folded whatever the page remembers, and leave what it remembers alone. */
  folded?: boolean;
  /** Hears each press of the toggle. */
  onPress?(): void;
}

/** Puts a toggle and body in col: the side folds to a thin strip and the page remembers it. Returns a function that folds or opens the side without remembering it. */
export function collapsible(o: CollapsibleOptions): (folded: boolean) => void;

export interface FrameSide {
  panel: string;
  /** The column's aria-label. */
  label: string;
  folded?: boolean;
}

export interface FrameOptions {
  /** The tool's name; see CollapsibleOptions.name. */
  name: string;
  left?: FrameSide;
  centre: { label: string };
  right?: FrameSide;
}

export interface Frame {
  left: HTMLElement | null;
  /** Where the caller draws the index. */
  leftBody: HTMLElement | null;
  /** The centre column, which the caller draws into. */
  centre: HTMLElement;
  right: HTMLElement | null;
  /** Where the caller draws the thread. */
  rightBody: HTMLElement | null;
  /** Locks node (a sendBar) to the centre's bottom edge: a kit-sendfoot, full width, made the centre's last child, so call it after drawing the centre. null takes it away. The band spans the kit's 24px side padding, so keep it. */
  foot(node: Node | null): void;
  /** The wide view (a system design's topic chat): true runs the centre over the right column's space, the right column hidden, and lifts the 1100px cap on its cards; the band, the left column and the centre's left edge and first item stay where they are. On a narrow page (narrowMode's kit-narrow) it changes nothing: one column shows at a time there, the right one included. false puts it back. */
  wide(on: boolean): void;
}

/**
 * The three columns of a .kit-app grid; the caller appends left, centre and right after its bar (and band).
 * Where they start: the centre's first card 24px under the band, a side column's first label (an index section's or a filter row's, the thread's) 16px under it; the left column is 288px.
 * Every card in the centre (.kit-mid .kit-card; an empty-state card, emptyCard, keeps its own 26px by 10px padding) has the kit's shape, 14px by 16px padding and an 8px corner, and fills the centre up to 1100px, left-aligned, whatever a tool's own card class says.
 * With no right (a front page), the centre runs to the window's edge, its cards still stopping at the cap.
 */
export function frame(o: FrameOptions): Frame;

/** A side of the frame, or null for the centre. */
export type NarrowSide = 'left' | 'right' | null;

export interface NarrowOptions {
  /** The .kit-app grid. */
  root: HTMLElement;
  /** Columns collapsible (or frame) drew. */
  left?: HTMLElement | null;
  right?: HTMLElement | null;
  /** Hears each change of what has the frame. */
  onShow?(side: NarrowSide): void;
}

export interface NarrowMode {
  /** Gives the frame to a side, or to the centre with null. Does nothing while the page is wide. */
  show(side: NarrowSide): void;
  /** Puts n under a strip's toggle, none at zero. It shows on a closed strip while narrow, and on a closed right strip at wide widths. */
  setCount(side: 'left' | 'right', n: number): void;
  /** Lets go of the window, when the page goes. */
  stop(): void;
}

/** One thing at a time at 1080 wide or less: the centre, or a side in its place with the other a strip. A page opens on the centre. The fold and what is remembered of it are ignored and never written while narrow, so they come back when the window widens. */
export function narrowMode(o: NarrowOptions): NarrowMode;

// ---- index.js

/** A row's needs-you dot, which says so in a tip. */
export function attentionDot(): HTMLElement;

export interface IndexRowOptions {
  /** What the row opens: its data-card, and what select gets. */
  id: string;
  title: string;
  /** Where it lives (repo · folder): a muted line of its own (span.kit-meta.kit-place) between the title and the meta, muted whatever the row's state. */
  place?: string;
  meta?: string;
  /** Where a search matched (galley's "in the text: …"): a line of its own inside the row's button after the meta (span.kit-found, 12px, muted); a <mark> in it gets the signal-soft ground. */
  found?: Node | string;
  /** The row in front of the reader. */
  on?: boolean;
  /** It needs the reader: a dot, and its meta in the signal colour. */
  attention?: boolean;
  /** Its meta in the wait colour. */
  waits?: boolean;
  /** It holds a draft: a wait-coloured edge and meta. */
  draft?: boolean;
  /** A mark before the title, such as ✓, ●, ○ or ✕ (a step list's). No mark, no mark element. */
  mark?: string;
  /** The mark's colour: done (ok), now (signal), later (muted), fail (danger). */
  markState?: 'done' | 'now' | 'later' | 'fail';
  /** Nodes after the row's button, before the dot. */
  extra?: Node[];
  select?(id: string): void;
}

/** One row of the left index; add a class of your own for anything further. */
export function indexRow(o: IndexRowOptions): HTMLElement;

export interface IndexSectionOptions {
  name: string;
  rows: HTMLElement[];
  /** The words when there are no rows. */
  empty: string;
  /** Turns the name into a link: "<name> ›". */
  open?: () => void;
  /** Drawn on the right of the name, in one heading row (div.kit-index-head): a "+ Add" button. It is centred on the name's line and adds nothing to its height, so the name sits where a name alone does (16px under the band in a first section). Without it the name stands alone as before. */
  action?: Node;
}

/** A named group of rows. */
export function indexSection(o: IndexSectionOptions): HTMLElement;

// ---- thread.js

/** One message, as plain values; the caller may carry more on it for attachments. */
export interface ThreadMessageValue {
  id: number | string;
  from: 'user' | 'agent';
  /** RFC 3339; anything else shows as it came. */
  at: string;
  /** What the caller says about it, in the head: "your note". */
  words?: string;
  /** A link after the words, opening through the caller. */
  link?: { text: string; href: string; open(): void } | null;
  /** Where one of the user's stands: a msgstate state, drawn with messagePill. */
  state?: string;
  /** The line under the state's pill. */
  stateLine?: string;
  text?: string;
}

/** Draws what a message carries, under its text. */
export type ThreadAttachments<M> = (m: M) => Node | null;

/** Draws a message's text in place of the plain paragraph, in a div.kit-thread-msg-md; a message with no text draws no body. */
export type ThreadRender<M> = (m: M) => Node;

export function threadMessage<M extends ThreadMessageValue>(
  m: M,
  attachments?: ThreadAttachments<M> | null,
  render?: ThreadRender<M> | null,
): HTMLElement;

/** The note box: el goes in the column; Enter in box, or Send note, calls send. */
export interface ThreadNote {
  el: HTMLElement;
  box: HTMLTextAreaElement;
  send(): void;
  /** The button's words; none, Send note. */
  label?: string;
}

export interface ThreadOptions<M extends ThreadMessageValue> {
  /** What the thread is on; with none it draws only empty. */
  id?: string | null;
  /** The words with no id. */
  empty?: string;
  name?: string;
  /** The card's key: a button that copies a link to it, plain when readOnly; none, no line. */
  key?: string | null;
  /** The address's #fragment the key copies; default the id. */
  link?: string;
  messages?: M[];
  note?: ThreadNote | null;
  readOnly?: boolean;
  attachments?: ThreadAttachments<M>;
  /** Draws each message's text; none, it is plain. */
  render?: ThreadRender<M>;
}

/** The thread column's content. */
export function thread<M extends ThreadMessageValue>(o: ThreadOptions<M>): HTMLElement;

// ---- tabs.js

export interface RailTab {
  id: string;
  label: string;
  /** Shown after the label; 0 shows, and null or undefined leaves none. */
  count?: number | string | null;
  /** The tab's content. It stays in the page while hidden; to redraw, the tool changes what's inside its own element. */
  body: Node;
}

export interface RailTabsOptions {
  /** The tool's name: the tab last pressed is remembered under <name>.railTab. */
  name: string;
  tabs: RailTab[];
  /** The tab to start on when the page remembers none. Default the first. */
  open?: string;
  /** Hears each press with the tab's id; setOpen doesn't call it. */
  onOpen?(id: string): void;
}

export interface RailTabs {
  /** Goes in the frame's rightBody, so the toggle folds the column around it. */
  el: HTMLElement;
  /** Shows a tab for the tool, without remembering it: only a press is the reader's choice. An unknown id changes nothing. */
  setOpen(id: string): void;
  setCount(id: string, n: number | string | null | undefined): void;
}

/** Tabs in the right column, under its fold toggle's line, one body shown at a time. */
export function railTabs(o: RailTabsOptions): RailTabs;

/** What the kit remembers for a reader, in localStorage. Where localStorage throws (a frame sandboxed without allow-same-origin), get answers null and set and remove do nothing, so the page still draws. */
export const remembered: {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
};

// ---- track.js

export interface StageDetail {
  title: string;
  rows?: { id?: string; text: string; meta?: string }[];
  note?: string;
}

/** One stage, as plain values, so each tool or job gives its own. */
export interface StageValue {
  key: string;
  label: string;
  /** Drawn after the label: "Findings · 3 of 5". */
  count?: string;
  /** The class it draws in; done adds a tick, now is the aria-current step. */
  state?: 'done' | 'now' | 'flagged' | '';
  /** A pulsing dot: something runs in it. */
  live?: boolean;
  /** The current stage's move is someone else's: drawn outlined, not filled. */
  other?: boolean;
  /** Adds an ⓘ with this in its tip. */
  detail?: StageDetail;
  /** What it opens: stageTrack passes this to open. Unset, the stage is plain. */
  opens?: string | null;
}

/** One stage; open, when given, makes it a button. */
export function stagePill(s: StageValue, open?: (() => void) | null): HTMLElement;

export interface StageTrackOptions {
  /** A stage, or an element (a tab of the caller's) that takes its place as it is. */
  stages: (StageValue | HTMLElement)[];
  open?: (opens: string) => void;
  /** The track's aria-label. */
  label?: string;
  /** Greys it out and stops its pulse. */
  parked?: boolean;
  /** What follows on the line: wait badges, counts. */
  after?: (Node | null)[];
}

/** The stages as one joined bar (nav.kit-stages holding span.kit-stages-bar): no arrows and no gaps, one border and radius round the segments, a hairline between them; it wraps onto a second line on a narrow page. A caller's element in stages takes its place in the bar; after follows the bar on the line, after a gap. */
export function stageTrack(o: StageTrackOptions): HTMLElement;

export interface WaitValue {
  text: string;
  /** Who it waits on; 'you' is the reader. */
  who: string;
}

/** One badge, on you if any wait is, and the rest behind "and N more"; [] with no waits. */
export function waitBadges(waits: WaitValue[]): HTMLElement[];

export interface WorkingLineOptions {
  text: string | null;
  /** Draw it as a message not settled yet. */
  pending?: boolean;
  /** Hold one line's height with or without text; a long line gets a tip. */
  slot?: boolean;
}

/** The agent's one line with a pulsing dot. */
export function workingLine(o: WorkingLineOptions & { slot: true }): HTMLElement;
export function workingLine(o: WorkingLineOptions): HTMLElement | null;

// ---- drafts.js

/** The three questions a card can always be asked, in the page's words. */
export const QUESTIONS: { explain: string; smaller: string; breaks: string };

/** A button for buttons(): once asked it reads "✓ Sent: <label>" and stays off until the agent answers. */
export function questionButton(o: { label: string; asked: boolean; run(): void }): Button;

export interface DraftBox {
  /** What holds the box; put this in the page. */
  el: HTMLElement;
  box: HTMLTextAreaElement;
}

export interface Drafts {
  /** The reader's choices until Send, by what they answer. The caller redraws after changing it. */
  picks: Map<string, string>;
  /** A text box for key; drawn again, it holds what was typed. */
  box(key: string, placeholder: string, rows?: number): DraftBox;
  get(key: string): string;
  keys(): IterableIterator<string>;
  /** Returns the text, forgets it and empties every box drawn for key. */
  take(key: string): string;
  /** Puts text back in a box after a refused send. */
  restore(key: string, text: string): void;
  /** The drafts whose key starts with prefix, by what follows it. */
  notes(prefix: string): Map<string, string>;
  /** Any pick, or any text that is more than space: a reload would lose it. */
  dirty(): boolean;
  /** Clears the picks and the drafts whose key starts with prefix. */
  discard(prefix: string): void;
}

/** Keeps drafts apart from the page, so they survive a redraw. wrap holds the box in something of the tool's own. */
export function createDrafts(o?: { wrap?(box: HTMLTextAreaElement, key: string): HTMLElement }): Drafts;

export interface SendBarOptions {
  /** Where the page stands: "1 of 2 answered". */
  count: string;
  /** How many go on Send; none leaves Discard and Send off. */
  sends: number;
  hint: string;
  discard(): void;
  send(): void;
  /** Buttons before Discard. */
  extra?: Button[];
}

/** The bar at the foot of a page of drafts; place it with frame's foot, which locks it to the centre's bottom edge. */
export function sendBar(o: SendBarOptions): HTMLElement;

// ---- draftlist.js

export interface DraftListItem {
  id: string;
  /** The item the draft is on, drawn as given. */
  quote: string;
  /** The draft's words. */
  text: string;
  /** A line under the words. */
  meta?: string;
}

export interface DraftCallbacks {
  /** Hears the new words on blur or Enter, when they changed. The row already shows them, so it needn't redraw. */
  onEdit?(id: string, text: string): void;
  /** Hears delete. Unsaved words go with the draft. The tool removes the row. */
  onDelete?(id: string): void;
  /** Hears a press on the row, or the focus moving into its box: show the item. The row marks itself, so it needn't redraw. */
  onSelect?(id: string): void;
}

/** One draft's row, an <li>: its quote, its words in a box, Edit and Delete. Edit focuses the box with the caret at the end and marks the row `editing` while it has the focus; Escape in the box puts back the words last saved and saves nothing. */
export function draftRow(o: DraftCallbacks & { draft: DraftListItem; on?: boolean }): HTMLElement;

export interface DraftList {
  el: HTMLElement;
  /** Draws again, at any moment. A row whose draft id is still there stays the same element, with its focus, caret and unsaved words; only what changed is updated. New words from the tool replace a box's only when it has nothing unsaved. A draft no longer given goes, unsaved words with it. */
  redraw(o: { drafts: DraftListItem[]; selected?: string }): void;
}

/** The drafts list, for a tab of the right column. The tool stores the drafts. Put el in the page once and call redraw on updates: taking el out of the page takes the focus from its box. */
export function draftList(o: DraftCallbacks & { drafts: DraftListItem[]; empty: string; selected?: string }): DraftList;

// ---- elsewhere.js

/** The call to make whenever the bar's "also open" list may have changed. Each runs read() for the items and sets the bar only when they changed (their onClick aside), so an open list stays open. A call during a read reads once more after it, never twice at once; a failed read leaves the list as it was. */
export function keepElsewhere(bar: Pick<BarHandle, 'setElsewhere'>, read: () => Promise<ElsewhereItem[]> | ElsewhereItem[]): () => Promise<void>;

// ---- frontpage.js

/** A value to filter by, with how many it holds. */
export interface FilterItem {
  value: string;
  label: string;
  count: number;
  /** filterRow: rows nested under this one (a repo's folders), each drawn indented (li.kit-sub) right after it, only while it or one of them is chosen. A press on one calls onToggle with its value. Not counted in All. One level only: a sub-item's own subs are ignored. */
  subs?: FilterItem[];
}

/** A section of the left column: All with the total of the top items, then one row per item with its count, each followed by its subs while it or one of them is chosen. Several can be chosen; All is on when none is. onToggle hears the value pressed, '' for All. */
export function filterRow(o: { label: string; items: FilterItem[]; chosen: string[]; onToggle(value: string): void }): HTMLElement;

/** The status pills, drawn in the stage track's joined bar (nav.kit-stages holding span.kit-stages-bar), each count after a dot in its span.kit-pill-n: Open · 8. A pill with no count is hidden unless chosen. The value '' is the tool's All, on when none is chosen. onToggle hears the value pressed. */
export function statusPills(o: { pills: FilterItem[]; chosen: string[]; onToggle(value: string): void; label?: string }): HTMLElement;

/** An order a sort switch offers. */
export interface SortOrder {
  value: string;
  /** The chip's words. */
  label: string;
}

/** The line over a list that orders it (div.kit-sort): a muted span.kit-sort-label reading label (default sort), then one button.kit-chip per order, the chosen one on with aria-pressed="true". onPick hears the order pressed; the caller keeps it (with remembered) and redraws. Placed directly over its list, never in the left column; a list whose page has a band passes the band to sortedList, which puts its switch in the band's sort place. When the press had the focus in the switch and onPick redraws it at once, the new switch's chosen chip gets the focus. */
export function sortSwitch(o: { orders: SortOrder[]; chosen: string; onPick(value: string): void; label?: string }): HTMLElement;

/** An order a sorted list offers: a sort switch's chip, and how it compares two items (as Array.prototype.sort's). */
export interface SortedOrder<T> extends SortOrder {
  compare(a: T, b: T): number;
}

export interface SortedList<T> {
  /** div.kit-sorted: the sort switch (none when given a band), then one section.kit-card, or with groups one section.kit-card.kit-group per group that has rows. */
  el: HTMLElement;
  /** Redraw with new items, in the order chosen; groups, when given (and the list has no groupings), replaces the grouping (another grouping draws its own kept order). With no groups it keeps the current grouping: a grouped list stays grouped. A page that wants the plain list again builds a new sortedList. */
  set(items: T[], groups?: SortedGroups<T>): void;
}

/** One group an item is in: its key (kept in the groups' order and its fold) and the words its heading shows. */
export interface SortedGroup {
  key: string;
  label: string;
}

/**
 * sortedList's groups: rows grouped into cards that fold and move, sorted inside each by the chosen order.
 * Each heading (div.kit-group-line) holds span.kit-group-grip (⠿, draggable: drop it on another group, on its upper or lower half, to put it before or after that group), button.kit-label.kit-group-head (the fold, aria-expanded, reading `label · n`, or label alone for a key in uncounted), and a rowMenu ⋯ (button.kit-row-more.kit-group-more) with Move up, Move down, Move to top and Reset order (data-action up, down, top, reset), each with a detail line naming where the group goes. A move or a drop redraws in the new order and keeps it under <listname>.order.<name> as a JSON array of keys (removed when it equals the default); Reset order removes it. A group with no rows is hidden and keeps its place; a move goes past it.
 * The order drawn: the kept one, with keys that no longer exist left out (a key exists while order names it or an item has it); they are left out only when drawing, and a move keeps every kept key a filter hides in its kept place (right after the kept key before it that is shown, else right before the one after it); then each key of order missing from it, right after the key before it in order; then the rest A to Z by label. With nothing kept, order, then the rest A to Z.
 * Folds are kept under <listname>.folded.<key> ('1' folded, '' open); a key in folded starts folded while nothing is kept. Every heading and row is drawn alike: no edge or colour of its own.
 */
export interface SortedGroups<T> {
  /** The grouping's name: its order is kept under <listname>.order.<name>. */
  name: string;
  /** The group an item is in. */
  key(item: T): SortedGroup;
  /** The default order of the keys; keys it doesn't name follow, A to Z. */
  order: string[];
  /** Keys whose heading shows no count. */
  uncounted?: string[];
  /** Keys that start folded while no fold is kept for them. */
  folded?: string[];
}

/**
 * sortedList's pick: tick boxes bound to a selection store. Each row (the element row(item) returns) gets class kit-pickrow, class sel while ticked, and starts with span.kit-box (role="checkbox", aria-checked "true" or "false"); each group's heading gets a span.kit-box between its grip and its fold, and with no groups the card opens with div.kit-group-line holding the box and then title's heading, if any. A head's box reads "true" when every row under it is ticked, "mixed" when only some are, else "false", and a press ticks every row under it, or unticks them all when all are (a folded group's too). A press on a box goes no further: it neither opens a row nor folds a group. Shift-click on a row's box sets the rows showing from the store's anchor to it (Selection.range; a folded group's rows are left out), a plain press toggles it. Ticks are kept by id across presses and set, and after each draw an id no item drawn has (gone from set's items, or filtered out by the page) is deselected. The kit adds no actions: the page reads selection.ids() and puts its actions in the band.
 */
export interface SortedPick<T> {
  /** The store the boxes read and write (createSelection); the page keeps it, and its changes from anywhere repaint the boxes. */
  selection: Selection;
  /** The item's id in the store. */
  id(item: T): string;
}

/**
 * One grouping a sorted list offers on its group switch: a chip reading label, and the groups it draws (SortedGroups), or null for one card of every row.
 * Each grouping's groups keep their own order and folds under their own name, so switching back keeps the reader's arrangement.
 */
export interface SortedGrouping<T> {
  value: string;
  /** The chip's words. */
  label: string;
  groups: SortedGroups<T> | null;
}

/** One list in the order chosen on its sort switch (div.kit-sorted): the switch, then one section.kit-card holding ul.kit-group-rows with row(item) for each item in that order, or p.kit-empty reading empty when there are none. With groups (SortedGroups), the switch is followed instead by one folding section.kit-card.kit-group per group that has rows, each with its ul.kit-group-rows in the chosen order, and title is not drawn; with no items, the one card with the empty line. Without groups it draws exactly as before. The choice is remembered under <name>.sort; with none, or one no order has, the first order. A press re-sorts and redraws in place; the items given are not reordered. label replaces the switch's sort. title, when given, opens the card with div.kit-label.kit-group-head reading title(n) for the n rows shown, redrawn on every press and set (it doesn't fold). After a press with the focus in the switch, the chosen chip has it. band, a band's handle, puts the switch in the band's sort place (band.setSort) instead of over the cards, so el holds the cards alone: a div.kit-band-sort holding the switch and a compact pickField (labelled label, default sort) that takes the switch's place on a phone (640 wide or less); a pick on either re-sorts, and the picker stays in place, keeping the focus. pick (SortedPick) adds tick boxes; without it nothing changes. groupings (SortedGrouping, at least one) puts a group switch (sortSwitch labelled group, one chip per grouping) before the sort switch: over the cards, or given a band in its sort place, which is then div.kit-band-sorts holding div.kit-band-sort.kit-band-group (the group chips and their own compact pickField, labelled group, for a phone) and then the sort's div.kit-band-sort. A press on either regroups in place as set(items, groups) does, keeping the sort and the ticks; while the grouping chosen has groups the sort switch and its picker read "sort in groups", otherwise label (default sort). The choice is remembered under <name>.group; with none, or one no grouping has, the first grouping. With groupings, groups is ignored, in the call and in set: the page passes groups only inside a grouping. Without groupings nothing changes. */
export function sortedList<T>(o: { name: string; orders: SortedOrder<T>[]; items: T[]; row(item: T): HTMLElement; empty: string; label?: string; title?(n: number): string; groups?: SortedGroups<T>; band?: BandHandle; pick?: SortedPick<T>; groupings?: SortedGrouping<T>[] }): SortedList<T>;

export interface ListGroup {
  key: string;
  title: string;
  /** The group's rows, each an <li>. */
  rows: HTMLElement[];
  /** The line shown when it has no rows. */
  empty: string;
  /** The edge of a group that needs you. */
  edge?: 'signal' | 'agent' | 'wait';
}

/** Named groups of rows, each a card that folds in place. folded holds the keys that start folded; onFold hears each press with the key and whether it is now folded. The tool decides which groups to pass, and keeps what it hears for its next draw. */
export function groupList(o: { groups: ListGroup[]; folded: string[]; onFold(key: string, folded: boolean): void }): HTMLElement;

/** An item of a row's menu that runs: a menuitem button. action and walk become data-action and data-walk, so a caller keeps its hooks; danger reads it in the danger colour; disabled greys it out and it never runs. */
export interface RowMenuButton {
  label: string;
  /** A muted line under the label (.kit-row-detail); a menu holding any caps its width so the lines wrap. */
  detail?: string;
  /** Runs once the menu has closed. */
  run(): void;
  danger?: boolean;
  disabled?: boolean;
  action?: string;
  walk?: string;
}

/** An item of a row's menu that goes somewhere: a menuitem link (<a href>), keeping action and walk as data-action and data-walk. run, when given, runs once the menu has closed. */
export interface RowMenuLink {
  label: string;
  href: string;
  /** A muted line under the label (.kit-row-detail), as on a button. */
  detail?: string;
  run?(): void;
  danger?: boolean;
  action?: string;
  walk?: string;
}

/** A line between a row menu's items (<hr role="separator">). */
export interface RowMenuSeparator {
  separator: true;
}

/** A heading over the row menu's items after it (<div class="kit-row-head" role="presentation">): a small muted label, not a menuitem, never focused; a press on it leaves the menu open. */
export interface RowMenuHeading {
  heading: string;
}

/** An item of a row's menu: a button, a link, a separator or a heading. */
export type RowMenuItem = RowMenuButton | RowMenuLink | RowMenuSeparator | RowMenuHeading;

/** A row's ⋯ button and its menu (.kit-row-menu): a press opens it, and a press on an item, outside it or Esc closes it; a press on a disabled item or a heading leaves it open. An item's detail is a muted line under its label, and a menu holding any caps its width (min(340px, 100vw - 16px)) so the lines wrap. The menu (.kit-row-pop, hidden while closed) stays inside the wrapper in the page's markup and shows in the top layer (the popover attribute), placed from the ⋯ button by placePop: on the button's right edge 4px below it, on its left edge when the right would run past the window, above it when there is more room above, never taller than the room (it scrolls inside itself), and kept at the button while the page scrolls or the window is resized. Opening or closing it moves nothing: the page grows no longer and does not scroll. It draws above everything in the page, a sheet included; a walk's ring and note (spotlight) and the tour stay above it. Its width is what it had inside the wrapper (140px at least, no wider than the wrapper unless a word needs it). rowMenu sets top, left, right, bottom, width, max-width and max-height on the menu's own style, so a page's CSS for those on .kit-row-pop no longer places or sizes it; min-width still applies. One is open on the page at a time: opening another closes it. label is the button's aria-label; onMenu hears it open and close. open draws it already open, as the one open menu on the page (closing any other), without scrolling it into view or taking focus, for a caller that redraws its rows and keeps which menu is open from onMenu; onMenu does not hear that opening, only the closing. A menu drawn open before it is in the page has hidden off at once and shows at its button once it is in the page, before the page is next drawn; a focus the caller gives one of its items as soon as the row is in (a queued microtask) lands. An open menu taken off the page and not put back in the same change closes without telling onMenu. buttonClass replaces kit-row-more on the ⋯ button (kit-ctl for a header's bordered look). */
export function rowMenu(o: { label: string; items: RowMenuItem[]; onMenu?(open: boolean): void; open?: boolean; buttonClass?: string }): HTMLElement;

// ---- needs.js

/** One thing that needs the reader. */
export interface NeedsItem {
  id: string;
  label: string;
  /** A second line in the menu. */
  detail?: string;
}

export interface NeedsPill {
  el: HTMLButtonElement;
  /** The list now. Items that haven't changed leave an open menu and its rows alone. */
  set(items: NeedsItem[]): void;
  /** Closes the menu. A page that takes el out for good calls this. */
  close(): void;
}

/** The count of what needs the reader, as a button: one item opens on a press, several open a menu naming each in the order given, none hides it. open hears the item's id. */
export function needsPill(o: { items: NeedsItem[]; open(id: string): void }): NeedsPill;

/** The line after an answer: how many are left and a button naming next, which calls open. With none left it says so, with no button. It never moves the page. */
export function nextLine(o: { left: number; next?: NeedsItem | null; open(id: string): void; done?: string }): HTMLElement;

/** Shows el with its answer control on screen: the element marked data-answer, else a text box in it. On an el too tall for the screen the control wins. A text box is focused. */
export function arrive(el: Element): void;

// ---- prose.js

/** A heading's id: its text, lower case, words joined by hyphens, markup and entities dropped. */
export function slug(text: string): string;

export interface RenderMarkdownOptions {
  /** `## ` and `### ` headings get ids from their text (slug). Default true; false for text drawn more than once on a page (a card's). */
  headingIds?: boolean;
}

/** GitHub-flavoured markdown as HTML, safe to set as innerHTML: raw HTML comes out as text, a link goes only to http(s) or a #fragment, a mermaid fence is left as <pre class="mermaid"> for the page's renderer, and a leading header block (front matter) is not drawn. marked is vendored at /_kit/vendor/marked.esm.js. */
export function renderMarkdown(src: string, o?: RenderMarkdownOptions): string;

// ---- decision.js

/** Card text: a string is markdown (renderMarkdown, no heading ids); a Node is drawn as it is, so a caller keeps plain text. */
export type CardText = string | Node;

/** One evidence entry: what it shows and where it comes from. */
export interface EvidenceEntry {
  text: string;
  /** The run, job, file, resource or bill line it names. A web address is a link. */
  source?: string;
  /** Where source's words link to, when they aren't an address themselves: only http(s) or a #fragment; any other url is shown as code. */
  url?: string;
  /** A command's output, folded under the entry. */
  output?: string;
}

export interface EvidenceListOptions {
  /** Draws a source that isn't a web address as the caller's own link (a file it can open); null leaves it as code. */
  source?(source: string): Node | null;
}

/** The entries as a list: a web source or url is a link, o.source draws others, else code; output folds. null for none. */
export function evidenceList(entries: EvidenceEntry[] | null | undefined, o?: EvidenceListOptions): HTMLUListElement | null;

export interface OptionValue {
  id: string;
  title: string;
  /** Folded under What it includes. */
  includes?: CardText;
  /** Under Also needs. */
  pullsIn?: CardText;
  recommended?: boolean;
  chosen?: boolean;
  /** Was the reader's choice before the card was reopened. */
  was?: boolean;
  /** The reader's pick, not sent yet. */
  picked?: boolean;
  /** The caller's visual (a mockup frame, a diagram, a table), under the head. */
  visual?: Node | Node[] | null;
  /** Buttons, or a Node drawn as it is (fields and buttons of the caller's). */
  actions?: Button[] | Node | null;
  /** No actions. */
  readOnly?: boolean;
}

/** One option: id, title and pills, the visual, Also needs, What it includes (folded), then its actions. */
export function optionBlock(o: OptionValue): HTMLElement;

export interface CallValue {
  /** Heads the row, when given (the call's question or name); read-only, a reversed one says so beside it. */
  name?: Node | string;
  took: CardText;
  instead: CardText;
  why: CardText;
  reversed?: boolean;
  /** A Reverse button (Reversed and off once reversed); none without it. */
  onReverse?: () => void;
  /** More buttons after Reverse, in its row. */
  actions?: Button[];
  /** Listed unfolded between the facts and the buttons. */
  evidence?: EvidenceEntry[];
  /** As evidenceList's source. */
  source?(source: string): Node | null;
  /** No buttons. */
  readOnly?: boolean;
}

/** One of the agent's calls: Took, Instead of and Why, its evidence, then Reverse and the caller's buttons. Listed on a decision card it has the agent's rule at its left; alone (a call's own card) it has none. */
export function callRow(o: CallValue): HTMLElement;

export interface DecisionHead {
  /** The crumb: the card's id or where it is. */
  crumb?: Node | string | (Node | string)[];
  /** A string is a grey pill; a Node (the caller's pill, in its tone) is drawn as it is. */
  state?: Node | string | null;
  /** After the state on the header's line. */
  after?: (Node | null)[];
  /** The card's key, at the header's end. */
  key?: string;
}

export interface DecisionCardOptions {
  /** The card is section#card-<id>[data-card=<id>]. */
  id?: string;
  /** Its left edge: signal while it needs the reader, agent while it is the agent's. */
  edge?: 'signal' | 'agent' | 'wait' | '';
  /** More classes on the card. */
  class?: string;
  head?: DecisionHead;
  /** One sentence ending in a question mark, the card's title. */
  question?: Node | string;
  /** Above the example (a test under way, and what it waits on). */
  lead?: (Node | null | false | undefined)[];
  /** The problem, with its example, in plain words. */
  example?: CardText;
  /** Between the example and the options: reopened, with the agent, waiting, a revision line. */
  notes?: (Node | null | false | undefined)[];
  /** Each drawn with optionBlock (readOnly carried down), or a Node as it is. None leaves the options out. */
  options?: (OptionValue | Node)[];
  /** Under the options: the caller's choose bar. */
  bar?: Node | null;
  /** Under the options: one dated line per later post of the card (pull request opened, merged, verified). */
  since?: { at: string; text: string }[];
  /** Option <option> · why, with the recommendation's own evidence listed under it, unfolded. */
  recommendation?: { option: string; why?: CardText; evidence?: EvidenceEntry[] } | null;
  /** What happens next: what the reader sees after choosing, and how it is proved. */
  next?: CardText;
  /** The agent's calls on this card, each a callRow. */
  calls?: CallValue[];
  /** The card's evidence, folded last with its count. */
  evidence?: EvidenceEntry[];
  /** As evidenceList's source. */
  source?(source: string): Node | null;
  /** After the evidence: depends-on lines, the reader's note. */
  after?: (Node | null | false | undefined)[];
  /** The questions row: buttons, or a Node. */
  questions?: Button[] | Node | null;
  /** Last: a waiting line, a note box. */
  foot?: (Node | null | false | undefined)[];
  /** Leaves out the bar, the questions, foot and every button: the card as a record. */
  readOnly?: boolean;
}

/** A decision card: header and question; lead, example, notes; options and bar; Since then; recommendation; what happens next; calls; evidence folded; after, questions, foot. The caller passes every pill, note and press: the card knows no tool's states. */
export function decisionCard(o: DecisionCardOptions): HTMLElement;

// ---- record.js

/** Text split into plain runs and the ids in known, each its own piece. An id is capitals then digits (DCSN1, F2, F-002). */
export function idPieces(text: string, known: Set<string>): (string | { id: string })[];

/** Makes each id in known a link in root's text, outside code, pre, links and a card's header: link(id) draws it, by default <a class="kit-ref" href="#id">. */
export function linkIds(root: Element, known: Set<string>, link?: (id: string) => Node): void;

/** One searchable part of a record: a section of a tab, and its text. */
export interface RecordEntry {
  tab: string;
  id: string;
  label: string;
  text: string;
}

export interface RecordHit {
  tab: string;
  id: string;
  label: string;
  /** The words around the first match, with … where cut. */
  snippet: string;
}

/** The entries holding q (any case); nothing for an empty q. */
export function searchHits(entries: RecordEntry[], q: string, max?: number): RecordHit[];

/** Takes every control out of el: .kit-btns, .kit-note-line, .kit-sendbar, textarea, and whatever more (a selector) names. Returns el. */
export function readOnly<T extends Element>(el: T, more?: string): T;

export interface RecordCardOptions<M extends ThreadMessageValue> {
  /** The card's name for search (data-sec). */
  label: string;
  /** Its one edge in the record; none leaves it without. */
  edge?: 'signal' | 'agent' | 'wait' | '';
  /** Its thread, drawn under its body; none, no thread. */
  messages?: M[];
  /** Draws one message; default threadMessage with attachments and render. */
  message?: (m: M) => Node;
  attachments?: ThreadAttachments<M>;
  render?: ThreadRender<M>;
  /** More to take out, as readOnly's more. */
  more?: string;
}

/** A card as a record shows it: read-only, named for search, with its thread under it. Returns el. */
export function recordCard<T extends HTMLElement, M extends ThreadMessageValue>(el: T, o: RecordCardOptions<M>): T;

/** What a record file carries in <script type="application/json" id=id>, and the file itself as parsed (without the theme the page set), for a Download of it. null on a served page. Read it before anything is drawn. */
export function embeddedData<T = unknown>(id: string): { data: T; self: string } | null;

/** One tab of a record. */
export interface RecordTab {
  id: string;
  label: string;
  /** Shown after the label: "3 files". */
  count?: string;
}

/** A section of a tab, for the index. */
export interface RecordSection {
  id: string;
  label: string;
  depth?: number;
}

export interface RecordPageOptions {
  /** The page's .kit-app, after its bar: the band and the three columns go in it. */
  root: HTMLElement;
  /** The tool's name: each column's fold is remembered under it. */
  name: string;
  tabs: RecordTab[];
  /** Each tab's content, drawn once; every [data-sec] element in it is a part search reads. */
  draw(tab: RecordTab): { el: Node; secs?: RecordSection[] };
  /** The search box's words; false for no search. Default "Search the record". */
  search?: string | false;
  /** Ids turned into links in every tab's text: passing it links ids on every pane. A caller that wants links only on some panes leaves it out and calls linkIds itself on those. */
  known?: Set<string>;
  /** Draws one such link. */
  link?: (id: string) => Node;
  /** Draws the band; find is the search (null with none), select(tab) shows a tab. Default the tabs as a stage track with their counts, then find. */
  band?(o: { tabs: RecordTab[]; open: string; find: HTMLElement | null; select(tab: string): void }): Node;
  /** Draws the index; default the open tab's sections. */
  index?(open: string, selected: string | null): Node | null;
  /** Draws the thread column: the selected card's, else the open tab's. */
  thread?(open: string, selected: string | null): Node | null;
  /** Where a link goes; default a tab by its id, a card (#F2) by card-F2, else the element with that id. */
  target?(hash: string): { tab: string; id: string } | null;
  /** Hears each tab shown, with the element shown in it. */
  onShow?(tab: string, at: string | null): void;
  /** Whether a hashchange is the page's to follow; false ignores it (the address has moved on to another page). Default always. The first draw doesn't ask. */
  route?(): boolean;
  /** Writes the address (#id) for a search hit or a tab pressed. Default history.pushState. */
  go?(hash: string): void;
}

export interface RecordPage {
  band: HTMLElement;
  index: HTMLElement;
  main: HTMLElement;
  thread: HTMLElement;
  find: HTMLElement | null;
  /** Each tab's section.kit-rec-tab, by id. */
  panes: Map<string, HTMLElement>;
  /** Shows a tab, at an element in it (a card-<id> selects that card). */
  show(tab: string, at?: string | null): void;
  open(): string;
  selected(): string | null;
  /** Draws the band, the index and the thread again. */
  redraw(): void;
  /** Lets go of the address, the window and the page's listeners. */
  stop(): void;
}

/** A Record: every card of a piece of work read-only in one page, in tabs with counts, searchable, a link to a card opening its tab with its thread. What each tab holds is the tool's. */
export function recordPage(o: RecordPageOptions): RecordPage;

/** One step of Show me around: the control it outlines (a selector on the real page) and a short note. before() readies the step (opens a pane); false skips it. */
export interface TourStep {
  id: string;
  target: string;
  note: string;
  before?: () => unknown | Promise<unknown>;
}

export interface TourOptions {
  /** The localStorage flag marking it seen, per tool's origin (default kit.tour). */
  seenKey?: string;
  /** How long a step waits for its control before it is skipped, in ms (default 4000). */
  wait?: number;
  /** Runs as it starts: hold what moves under it (a live stream). */
  onStart?: () => void;
  /** Runs as it ends; restore is false when the user's own navigation ended it. */
  onEnd?: (restore: boolean) => void;
}

export interface Tour {
  steps: TourStep[];
  /** Shows it now: an overlay outlines each control in turn; → or next goes on, Esc or skip ends it. */
  start(): void;
  /** Shows it unless it was done or skipped before in this browser. */
  startOnce(): void;
  seen(): boolean;
}

/** Show me around: registers the page's tour (the Guide offers it on the page's own section) and returns it. */
export function tour(steps: TourStep[], o?: TourOptions): Tour;
/** The tour this page registered last, or null. */
export function registeredTour(): Tour | null;
/** Where a tour's note goes: below the control, else above, else left, else right, else the middle, always inside the window. */
export function placeNote(
  target: { x: number; y: number; width: number; height: number },
  card: { width: number; height: number },
  view: { width: number; height: number },
  gap?: number,
): { x: number; y: number };

/** One step of the getting-started walk, as pageserve's POST /api/kit/spotlight takes it and a spotlight event carries it. */
export interface SpotlightStep {
  n: number;
  of: number;
  tool: string;
  /** The control's data-walk hook: [data-walk="<walk>"]. */
  walk: string;
  /** A data-walk hook that is on the page once the step is ready though its control isn't yet: while it is there and the control isn't, the note shows the title and note with no ring. */
  ready?: string;
  /** "ok": the note's ok button is the step's click. */
  press?: string;
  /** The note while the agent prepares the step and the control isn't on the page yet; empty: the title with "Your agent is getting this ready…". */
  prepare?: string;
  /** The note's first line once the control is there: what to press. */
  title: string;
  /** The rest: what is happening. */
  note?: string;
  /** The control in words, for the agent; the page doesn't draw it. */
  look?: string;
  /** An ok button on the note: pressing it is the step's click (a click on the control isn't). */
  ok?: boolean;
  /** The tab id the serve asks to come forward. */
  forward?: string;
}

/** A walk's intro card, as a spotlight body: {intro: {...}}. */
export interface SpotlightIntroCard {
  intro: {
    tool: string;
    /** What the tool is for, in a line. */
    title: string;
    /** What the learner will do in the walk. */
    text: string;
  };
}
/** A walk's end card, as a spotlight body: {end: {...}}. */
export interface SpotlightEndCard {
  end: {
    tool: string;
    /** What the learner learned, one line each. */
    learned: string[];
    /** What comes next. */
    next: string;
    /** The next walk's tool; empty after the last (the button says Done). */
    next_tool: string;
  };
}
/** Rings the step's control with its note beside it (n of N), following the page as it moves; nothing blocks the page. The learner's click on the control (for a text box or form, its submit; for an ok step, the ok button) clears it and posts {type: "kit:spotlight-done", n, tool, walk} to window.parent; a press on another data-walk control in a text box's form also ends it, naming that control as also. While the control isn't on the page the note shows the step's prepare line off the page's text with no ring, and switches to the title and note with the ring the moment the control appears. An intro card shows centred with its title, text and one button, Start, which posts {type: "kit:walk-start", tool} to window.parent. An end card shows centred with what was learned and one button, "Go on to ‹next_tool›" or Done, which posts {type: "kit:walk-next", tool, next_tool} to window.parent. */
export function spotlight(step: SpotlightStep | SpotlightIntroCard | SpotlightEndCard): Promise<void>;
/** The message an intro card's Start posts to window.parent: the walk's first step shows. */
export interface WalkStart {
  type: 'kit:walk-start';
  tool: string;
}
/** The message an end card's button posts to window.parent: next_tool is empty for Done. */
export interface WalkNext {
  type: 'kit:walk-next';
  tool: string;
  next_tool: string;
}
/** The message spotlight() posts to window.parent when the learner's click lands. */
export interface SpotlightDone {
  type: 'kit:spotlight-done';
  n: number;
  tool: string;
  walk: string;
  /** Another walk control in a text box's form that the press used (diazo's "This is the direction" under the reply box): the walk passes over that step too. */
  also?: string;
}
/** Takes the step shown away. */
export function clearSpotlight(): void;
/** Draws the step the serve holds now (GET url, default /api/kit/spotlight; 204 for none). live() calls it when its stream first opens. */
export function resumeSpotlight(url?: string): Promise<void>;

/** One tool's section in the Guide, from tools-common's guide package. */
export interface GuideTool {
  name: string;
  summary: string;
  core: boolean;
  /** It works, but it is still changing: the kit badges it. */
  beta?: boolean;
  asks: string[];
  when: string;
  skip?: string;
  where?: string;
  pointers?: string;
  /** Its public guide page, where one exists. */
  guide?: string;
}

/** What GET /api/kit/guide answers: the tool this page is, the installed tools (core first), how they fit together, and the family's site. */
export interface GuideData {
  tool: string;
  family: string;
  fit: string;
  tools: GuideTool[];
  /** Only on a hosted machine (PAGE_PUBLIC_DOMAIN set): where the page sits, which the bar draws as the workspace link and the tool switch. */
  place?: GuidePlace;
}

/** A hosted machine's place, from pageserve: the workspace, billet's start page for it, and the tools of the bar's switch in order. */
export interface GuidePlace {
  workspace: string;
  /** billet's start page for the workspace: https://<domain>/?w=<ws>. */
  home: string;
  /** Each tool's page on the machine; current marks the page's own tool, when it is one of them. */
  tools: { name: string; href: string; current?: boolean }[];
}

export interface GuideViewOptions {
  /** Copies an ask (the clipboard by default). */
  copy?: (text: string) => unknown;
  /** The page's tour, offered as Show me around on its own tool's section. */
  tour?: Tour | null;
  /** Runs as Show me around starts. */
  onTour?: () => void;
}

/** The Guide: the installed tools down the side, the tool you're in open first (when, skip, asks with Copy; where it sits and pointers behind More). */
export function guideView(data: GuideData, o?: GuideViewOptions): HTMLElement;
/** Loads /api/kit/guide and opens the Guide in a sheet over the page, offering the registered tour. The bar's Guide button calls it. */
export function openGuide(o?: { url?: string; tour?: Tour | null; copy?: (text: string) => unknown }): Promise<SheetHandle>;
/**
 * What an empty front page says, drawn in el from GET /api/kit/guide: the page tool's one-line summary, its asks each with Copy,
 * and More in the Guide, which opens the Guide. Leaves el as it was, and resolves false, when the guide has no section for the tool or doesn't load.
 */
export function guideAsks(el: HTMLElement, o?: { url?: string; copy?: (text: string) => unknown }): Promise<boolean>;
/** The mark after a beta tool's name: " · beta" in the kit's muted meta text (.kit-meta). The space and the dot keep it apart from the name for a screen reader. */
export function betaMark(): HTMLSpanElement;
/** Loads /api/kit/guide and, when the page's tool is beta, appends betaMark() to el. The bar calls it on its brand. A page not served over http(s) (a Record opened from disk) asks for nothing. */
export function badgeIfBeta(el: HTMLElement, o?: { url?: string; protocol?: string }): Promise<void>;
/** Loads /api/kit/guide once for the bar, which draws the beta mark and the place from it: the answer, or null when it doesn't load or the page isn't served over http(s). */
export function guideForBar(o?: { url?: string; protocol?: string }): Promise<GuideData | null>;
/** Appends betaMark() to el when data (a guide answer, or null) says the page's tool is beta. */
export function markIfBeta(el: HTMLElement, data: GuideData | null): void;
/** Draws the Guide as the whole page in root, as /_kit/guide/ does. */
export function guidePage(root: HTMLElement, o?: { url?: string; copy?: (text: string) => unknown }): Promise<void>;

export interface ZoomableOptions {
  /** true: only the ⤢ mark opens the viewer; a click on the holder stays the holder's (a table's text stays selectable). Default false: a click anywhere on the holder but a button or link opens it too, with a zoom-in cursor (.kit-zoom-click). */
  markOnly?: boolean;
}
/**
 * Shows el bigger over the whole window (.kit-viewer, a dialog on a dark backdrop) with caption in its head and a Close button, which takes the focus.
 * An SVG (el, or an svg in it) is copied without its width and height and fills the window; an image is copied by its src and scaled to fill the window;
 * anything else, and anything holding a table, is deep-copied (without ids or contenteditable) onto a white panel (.kit-viewer-panel) at its own width,
 * at most the window's, scrolling both ways when bigger. Close, Esc or a click on the backdrop outside the picture closes it, and focus goes back to back,
 * else to what had the focus when it opened.
 */
export function viewer(el: Element, caption: string, back?: HTMLElement | null): void;
/**
 * Adds the ⤢ mark (button.kit-grow, title "See it bigger", aria-label "See ‹caption› bigger") on holder's top-right corner and marks holder .kit-zoomable
 * (position: relative). A press on the mark opens viewer(pic(), caption, mark); pic is asked at each press, and null opens nothing.
 * Returns the mark: hide it with mark.hidden, or take it off and append it to holder again, to show it only while it is wanted.
 */
export function zoomable(holder: HTMLElement, pic: () => Element | null, caption: string, opts?: ZoomableOptions): HTMLButtonElement;

// ---- diff.js

export type DiffOp = 'same' | 'del' | 'add';

/** One line of a hunk, with its line number in the old text (same and del) and in the new one (same and add). */
export interface DiffLine {
  op: DiffOp;
  text: string;
  old?: number;
  new?: number;
}

/** One run of changes with its context. */
export interface DiffHunk {
  /** The heading the change is under ('' for none). */
  section: string;
  /** Unchanged lines folded before it. */
  before: number;
  lines: DiffLine[];
}

export interface LineDiff {
  added: number;
  removed: number;
  hunks: DiffHunk[];
  /** Unchanged lines folded after the last hunk (every line when nothing changed). */
  after: number;
}

export interface LineDiffOptions {
  /** Unchanged lines shown on each side of a change. Default 3. */
  context?: number;
  /** How a line names a section: markdown headings by default (the text after its #s); false names none; a function returns a line's section, or null when the line names none. A hunk's section is the nearest one above its change; a removed line names none. */
  sections?: false | ((line: string) => string | null | undefined);
}

/** The line diff of b against a (a port of diazo's LineDiff): the longest common subsequence kept, the rest removed then added; a change too big to table (old × new lines past 4,000,000) is every line removed and added. */
export function lineDiff(a: string, b: string, o?: LineDiffOptions): LineDiff;

export interface DiffBoxOptions {
  /** The tool's heading (.kit-diff-head), and the box's aria-label when a string. */
  head?: string | Node;
  /** The tool's Why line (.kit-diff-why), drawn as given. */
  why?: string | Node;
  /** A diff already computed; otherwise a and b are diffed with the defaults. */
  diff?: LineDiff;
  a?: string;
  b?: string;
  /** Draw the old and new line numbers (.kit-diff.numbered), and give each section line the lines it spans ("@@ lines 3–6 · Git"). */
  numbers?: boolean;
  /** Old line numbers to mark: a removed line among them is .kit-dl.mark, a darker tint with ! for its sign. */
  marks?: Set<number>;
  /** The tool's words when nothing changed (.kit-diff-none). */
  none?: string;
}

/** The diff drawn (section.kit-diff): head, why, then each hunk under its section (.kit-diff-section) as .kit-dl rows (same, del struck on red, add on green), unchanged lines counted in .kit-fold ("11 lines unchanged"). With no change: the box with the none words, or null without them. */
export function diffBox(o: DiffBoxOptions): HTMLElement | null;
