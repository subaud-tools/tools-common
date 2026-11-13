# Changelog

Root module releases are tagged `vX.Y.Z`; the separate `sqlitedb` and
`mermaidkit` modules are tagged `sqlitedb/vX.Y.Z` and `mermaidkit/vX.Y.Z`. Releases before this file are described by their
tags and PRs.

## Unreleased

### Added
- record: the shared record of what this user has done across the family, one JSON file at `StateDir("subaud")/record.json`: lessons finished, tools used and named features reached, each with the date it first happened. `MarkLesson`, `MarkTool`, `MarkFeature` and `Read` (a missing file reads as empty); `Record.HasLesson`, `HasTool`, `HasFeature`. A mark holds an exclusive lock on `record.json.lock` around its read-modify-write and writes by rename, so two tools marking at once both land. Local only, nothing sent.
- guide: the family guide's text, embedded: one section per tool (`guide/tools/<name>.md`, front matter for its name, summary, `weight: core|light` and its asks; body sections When to reach for it, When to skip it, Where it sits, Pointers), how the tools fit together (`guide/fit.md`) and the walk's lessons (`guide/lessons/<n>-<topic>.md`, a title, a Goal and steps in learning-with-court's lesson shape, with an optional `**Choose:**` list). `Tools()`, `Lesson(n)`, `LessonNumbers()`, `Fit()` and `Named(text)`. Loading refuses a tool file missing a part (a core tool without Pointers too), a lesson step without its sentence, ask or Claude runs line, and any line that tells the user to type a family command. Placeholders are written ‹like this› (a markdown parser takes `<word>` for raw HTML), and loading refuses one written `<like this>` outside code. Full sections for diazo, galley, muda, proj, scratch, creel, muster and kempt, short entries for casebook, sift and cull; the four core lessons (what you have, sessions and windows, plan a change on diazo's page, review writing in galley) and two offered ones, each with an `**Offered when:**` line (sessions talk, find waste with muda).
- guide: `Skills()` renders the two family skills from the guide content, one template each (`guide/templates/*.md.tmpl`): `using-the-tools`, the agent's map (which tool a request calls for, how they hand off, introducing one tool at a time from the shared record, and when to offer the two later lessons), and `getting-started-with-subaud`, how to run the walk with `proj guide start`, `proj guide result` and `proj guide done`. Both say `owner: family`.
- skills: a family skill (front matter `owner: family`) is written by any tool, and replaces an existing copy only when that copy is family-owned too; `Install` and `Refresh` both keep the rule. `FamilyOwned(b)` reports it.
- pageserve: `<tool> skills install` installs the two family skills beside the tool's own.
- localweb/page: Guide on every page. `bar` has a Guide button left of the theme control (`BarHandle.guideControl`) that opens `openGuide()`: the family guide in a wide sheet, on the tool the page is (its summary, when to reach for it, when to skip it, and its asks each with Copy; where it sits and pointers behind More; its public guide page where one exists). Down the side, the installed tools (core first, the rest folded under Also installed), How they fit together and one link to subaud.tools. At 640px wide or less the side sits above. `guideView(data, o)` draws it; `/_kit/guide/` shows it as a page (`guidePage`).
- localweb/page: Show me around, lifted from casebook's first-run walkthrough. `tour(steps, o)` registers the page's tour and returns `{ start, startOnce, seen, steps }`: an overlay that takes every click and key outlines one control at a time with a note beside it (`placeNote`), → or next goes on, Esc or skip ends it, a step whose control doesn't appear (or whose `before()` says false) is skipped, and done or skipped it is marked seen under `o.seenKey` (default `kit.tour`). `registeredTour()`; the Guide offers Show me around on the page's own section when the page registered one.
- pageserve: every serve answers `GET /api/kit/guide` with the Guide's data (`guide.Data`): the tool it serves and every family tool whose command is on PATH.
- guide: `Data(tool, installed)` and `GuideData`, what the Guide draws, with each tool's public guide page where one exists.
- setupbundle: `Build` adds the family skills to every bundle at `files/skills/<name>/SKILL.md` (`FamilySkillPath`), and refuses a tool file at one of those paths. It adds no managed-file entries to setup.toml: kempt refuses two releases declaring the same managed file.

## 0.75.0

### Added
- localweb/page: `indexSection` takes `action`, a node drawn on the right of the section's name in one heading row (`div.kit-index-head`, name left, action right, on one line; a long name wraps rather than push the action out of a narrow column). The name is the same link or plain label as before. A section without an action is drawn exactly as before.
- The kit demo's left column has an Artifacts section with a **+ Add** action.

## 0.74.0

### Added
- localweb/page: `frame()` returns `foot(node | null)`, the one call that places a page's send bar. It puts `node` (a `sendBar`) in a `kit-sendfoot` made the centre column's last child, so call it after drawing the centre; a redraw that empties the centre takes it out, and the next call puts it back last. `foot(null)` takes it away. `sendBar` itself is unchanged.
- localweb/page: `.kit-sendfoot` locks the bar to the centre's bottom edge. While the centre holds one, it lays out as a column with no bottom padding. The bar is a solid band (`--kit-panel`, a line above) the column's full width. It sits on the bottom edge of a short page too, and stays at `bottom: 0` while a long page scrolls above it, so it is flush whatever bottom padding a tool sets and nothing is under it at the end. Inside it the bar loses its card look and is at most 880px wide, centred; at 640px wide or less its padding is 12px. The band cancels the kit's 24px side padding, so a page keeps that side padding for the band to span the column.
- localweb/page: while a footer is placed, the centre's other children keep a block's full width, so a centred wrapper (`max-width`, `margin: 0 auto`) does not shrink. The rule has no weight, so a width a tool gives a child wins.
- localweb/page: while a footer is placed, the last block's bottom margin becomes the 16px gap above the band, and sibling margins in the centre stop collapsing.
- The kit demo has `?view=sendshort` and `?view=sendlong`, and `?view=parts` places its bar with `foot`.
- PAGE-STANDARD.md: the Drafts row says the bar sits locked to the middle column's foot, placed with `frame`'s `foot`.

## 0.73.0

### Added
- localweb/page: `nextLine` takes `done`, the words for what the answer did (`Sent` unless given), so a page whose answers wait as drafts until Send can say so (cull: `Saved as a draft`). Pages that pass nothing are unchanged.

## 0.72.0

### Added
- localweb/page: `renderMarkdown(src, {headingIds})` and `slug(text)` (`prose.js`, from diazo's `prose.ts`): GitHub-flavoured markdown as HTML that is safe to set as innerHTML. Raw HTML comes out as text. A link goes only to http(s) or a `#fragment`. A mermaid fence is left as `<pre class="mermaid">`. `## `/`### ` headings get ids from their text unless `headingIds` is false, and a leading header block is not drawn. `.kit-prose` styles a rendered document.
- localweb/page: `marked` 18.1.1 is vendored as `/_kit/vendor/marked.esm.js`, with its licence beside it as `vendor/LICENSE.marked`, since the kit is loaded from `/_kit/` and not bundled. A test checks that the vendored file's header names 18.1.1, the version diazo's `web/package.json` names today; it does not read diazo's file. A kit module may now import `./vendor/<name>.esm.js` as well as `./<module>.js`.
- localweb/page: `decisionCard(o)`, `optionBlock(o)`, `evidenceList(entries, {source})` and `callRow(o)` (`decision.js`, from diazo's `card.ts`). The card has, in order: a header and its question; the problem with an example; options side by side, each with what it also needs and what it includes (folded); a bar under them; a **Since then** list of dated lines; the recommendation and why; what happens next; the agent's calls with Reverse; and the evidence, folded with its count. Card text that is a string is markdown, and a Node is drawn as it is. The caller passes every pill, note and press: the parts know no tool's states. `readOnly` leaves out every control. An entry's `url` links only to http(s) or a `#fragment`. A lone `callRow` (a call's own card) has no rule at its left, and takes its evidence between the facts and its buttons.
- localweb/page: `recordPage(o)`, `recordCard(el, o)`, `readOnly(el, more)`, `linkIds(root, known, link)`, `idPieces(text, known)`, `searchHits(entries, q)` and `embeddedData(id)` (`record.js`, from diazo's `record.ts`). A Record shows every card of a piece of work read-only on one page. A band holds the tabs with their counts and a search over every tab, with the index on the left, the tabs in the centre and the thread on the right. Each card's thread sits under it, ids in its text link between cards, and a link to a card opens its tab. The caller may draw the band, the index and the thread, decide with `route` whether a hashchange is the page's to follow, and write the address itself with `go`. `embeddedData` reads back the data a record file carries, and the file itself for a Download.
- localweb/page/build: `record-bundle.mjs` (`recordBundle({entry, css, outdir})`, from diazo's `build-record.mjs`). It bundles a tool's record entry with the kit inlined, not loaded from `/_kit/`, and puts its stylesheet after the kit's. A tool can then write one HTML file that opens from disk. Copy it as `eslint.base.mjs` and `probe.mjs` are copied. esbuild is the tool's own devDependency.
- The kit demo has `?view=decision` (a decided card with a Since then list and two calls, one reversed) and `?view=record` (a Record of the demo's cards). A test builds the demo's record file with `record-bundle.mjs` and opens it from disk in headless Chrome.

## 0.71.0

### Added
- splitpage: either side of the split can be closed, so the other fills the window. The divider has two arrows: ◀ closes the terminal, ▶ the tabs. A drag let go within 120px of an edge closes the side next to that edge. The closed side leaves a 28 × 64px handle in the accent color at the window's edge, inside the window, that opens the split at the width it had. Only one side closes at a time. A closed side lasts for the browser tab (`sessionStorage`: a reload keeps it, a new window opens split), and the divider's width is kept per page address (`localStorage`).
- splitpage: a closed side comes back by itself: text typed from a tab opened with `types` (lwc's Send to Claude) opens the terminal, then types as before; a tab opened in front opens the tabs, and so does any tab when there were none. Closing the last tab closes the tabs.
- splitpage: at 640px wide or less the page has no divider: a **Terminal | Pages** switch shows one side at a time, full width, entering and leaving as the window changes. A new window opens on Pages when there is a tab, else on Terminal. Typed text switches to Terminal, a tab opened in front (or the first tab) switches to Pages, and a tab opened behind puts a dot on Pages until Pages shows. Narrow never changes the wide layout's closed side or width. The page now says `width=device-width`, so a phone lays it out at its own width.

### Changed
- splitpage: while the terminal is closed (or Pages shows), the page neither fits the terminal nor sends a resize, so the program keeps its size and output; as the terminal shows again it is fitted and its real size is sent once. `window.splitPage`, its `fit` and `#term` keep their shape. Nothing changes in the Go API or the wire.

## 0.70.1

### Fixed
- splitpage builds for Windows again. Since 0.68.0 it imported pageserve, which is unix-only (`Setpgid`, `Flock`, `Kill`), to title a public tab from its tool's live entry, so any program importing splitpage failed to build for Windows. That lookup is now unix-only: on Windows a public tab opened with no title is named by its host (public addresses belong to hosted workspaces, which run on Linux). A test cross-builds splitpage for windows/amd64, so CI on Linux catches a unix-only import from now on. Nothing changes on Linux or macOS.

## 0.70.0

### Added
- splitpage: `OpenRequest.Behind` (`behind` on `POST /api/split/open`) opens a tab without showing it: the tab joins the bar and the tab that shows keeps showing, in one change, so the page never draws the new tab, not even for a moment. The new tab carries `Tab.New` (`new`) until it first shows (`Select`, a click on the page, or `Close` showing it as a neighbour), and the page marks it with a dot. An address already open is left as it is, and into a bar with nothing showing the tab shows. The client takes it as an option: `Open(base, token, session, address, title, splitpage.Behind())`. A caller that doesn't set it behaves as before.

## 0.69.0

### Added
- `PAGE_PUBLIC_HOME` (`localweb.PublicHomeEnv`): beside `PAGE_PUBLIC_DOMAIN`, it names the one tool whose public page is the bare domain, `https://<domain>`, so a hosted workspace's own address opens that tool. `localweb.PublicHome()` reads it; `PublicOrigin` gives that tool the bare domain and `PublicTool` maps the bare domain back to it, so pageserve's live entry advertises it there and splitpage accepts and titles a tab on it. Every other tool keeps `https://<tool>.<domain>`. With either setting unset nothing changes.

## 0.68.0

### Added
- Public page addresses on a hosted workspace, from one setting: with `PAGE_PUBLIC_DOMAIN` set (to the workspace's `<ws>.<domain>`), pageserve advertises a tool's page at `https://<tool>.<domain>`: the entry's `url` (token and all) and `base` are public, and a new `local` key keeps the loopback server, `http://127.0.0.1:<port>`, written whether the setting is set or not. `Entry.Loopback()` is the address callers on the machine use (`local`, or `base` on an older entry); the channel's `Client`, `Stop` and `conformance` call through it. `localweb.PublicDomain()`, `PublicOrigin(tool)` and `PublicTool(address)` read the setting.
- splitpage: with the setting set, a tab may hold `https://<tool>.<domain>` (one DNS label, no port) beside a loopback address; any other public address is refused. A public tab opened with no title is named from its tool's loopback server, found through the tool's live entry. The relay takes a public tab's messages from its own origin only.

With `PAGE_PUBLIC_DOMAIN` unset nothing changes.

## 0.67.0

### Fixed
- splitpage: the terminal socket opens over `wss:` on a page served over https, and `ws:` otherwise. It was always `ws:`, which a browser blocks on an https page as mixed content, so a split page behind https (a hosted workspace) never connected its terminal.

## 0.66.0

### Fixed
- `channelmcp`: a report whose event the tool doesn't know (one a newer harness added) is ignored without a log line, so pi no longer shows a `[channels] ... stderr` error on every turn in a tool built before the event existed. A malformed held, landed or activity report is still logged.

## 0.65.0

### Added
- page kit: `createKeys` takes `esc: [{label, close}]`, the page's Esc closers. On Esc, in a text field too, each `close()` is tried in order and the first that returns true takes the key; with none closing, Esc leaves the field as before. While a sheet or the `?` overlay is open, Esc stays the sheet's. The overlay lists each closer's label as an Esc row, in order, above the kit's own. A page passing no closers behaves as before.
- page kit: `createKeys` takes `search: fn`, binding `/` alone, without the list's j/k/↓/↑/o/↵/x keys. A page that also gives `list.focusSearch` gets a clash error.

## 0.64.0

### Added
- pageserve: `Servers()` lists every family page server on the machine (each tool's state folder with a `live/` folder, up or down), `Leftovers()` finds family serve, daemon and old owned `galley edit` processes no entry names, and `StartTool`, `StopTool`, `RestartTool` and `StopLeftover` act on them by tool name or pid.

## 0.63.0

### Added
- page kit: `thread`'s note takes `label`, the words on its button (default `Send note`), so a tool can say `Send`.

## 0.62.0

### Added
- page kit: `draftRow` (and each `draftList` row) has an Edit button before Delete. It focuses the words with the caret at the end; the row carries class `editing` while the box has the focus. Escape in the box puts back the words last saved, saves nothing and leaves the box. A tool picks it up by moving its tools-common pin.

## mermaidkit 0.3.0

### Fixed
- `check`: a diagram with a labelled node, a labelled edge or a state transition is no longer refused with "Object has no member 'addHook'". mermaid passes every label through DOMPurify, which has nothing to sanitize with outside a browser; when the bundle exports its DOMPurify (the shared entry does from tools-common 0.61.0) and it reports `isSupported` false, the Parser gives it pass-through methods. A bundle built from an older entry loads and checks as before.

## 0.61.0

### Added
- page kit: `threadMessage(m, attachments, render)` and `thread({..., render})` take an optional `render(m)` that draws a message's text; its body is `div.kit-thread-msg-text.kit-thread-msg-md`, laid out as normal blocks. With no renderer the thread draws plain text as before.
- `localweb/page/build/mermaid-entry.ts` also exports mermaid's DOMPurify, for `mermaidkit/check` 0.3.0. A tool picks it up by copying the entry again (its page-build step) and rebuilding its bundle.

## 0.60.0

### Changed
- page kit: the thread's message value for the person using the page is `from: 'user'` (was `'court'`), and its class is `kit-thread-msg user`. A tool that passes `'court'` must pass `'user'`. Comments and docs say "the user" instead of a personal name.

## 0.59.0

### Fixed
- `splitpage`: the tab bar no longer shows a vertical scrollbar at its right end when the system always shows scrollbars (macOS can), which pushed the reload button partly off the page. The tab list scrolls only sideways.

## 0.58.0

### Added
- `splitpage`: `Tabs.Replace(session, id, address)` moves a tab to a new address in place, keeping its id, title, pin, whether it types and whether it shows. It is the tool's call, not the page's: `Handler` doesn't serve it. lwc uses it when its lesson page comes back on a new port after Start it again, so the Lesson stays one tab. The page loads the new address in the tab's frame.
- `splitpage`: `window.splitPage.fit()` sizes the terminal to its panel again, for a tool's script that pads the terminal (lwc's first-run note makes room above it this way rather than covering its top rows).

## 0.57.0

### Changed
- `frame`: the thread stays where the reader left it. The toggle's remembered setting alone decides it, per tool and panel, and a setting already saved still applies.
- `narrowMode`'s `setCount`: a closed right strip shows its count at any width. The left strip's count stays narrow only.

### Removed
- `frame`'s `setRightEmpty` and the per-card hold on a press. A tool that calls it drops the call when it bumps; its typecheck names it. `collapsible` keeps `folded` and `onPress`.

## 0.56.0

### Changed
- `shareMenu` (`localweb/page/assets/share.js`): the menu opens above its button when it would run past the window's foot and there is more room above, so a Share button in a bar at the foot of the window opens up. A button with room below opens down as before.

## 0.55.0

### Added
- `splitpage`: a tab may type into the terminal. `OpenRequest` and `Tab` gain `Types`; the page of a tab opened with it posts `{type: "send", text}` to the split page, and the text goes to the terminal as a paste with its control characters (ESC among them) and final line endings dropped, so it never runs by itself: the user presses Enter. The message counts only from that tab's frame and from its address's origin; any other window, origin or message is ignored. Any page at that origin can post as the tab, so a tool opens no untrusted page of that origin beside it. lwc's lesson panel uses it for Send to Claude.
- `splitpage`: `Config.Script` names a module in the tool's own assets, which the page loads once it has started, with `window.splitPage` (its terminal) already set. With no `Script`, nothing more loads. lwc's first-run note is such a script.

## 0.54.0

### Added
- `splitpage`: a link the terminal prints is clickable and opens in a browser tab of its own (xterm's web-links addon), so an outside site reaches the user from one click.
- `splitpage`: a tab opened with no title takes the title of its server's front page (a family tool's page is titled with the tool's name), read without the address's path or query; else its host and port.

### Changed
- `splitpage`: the tab bar is light and taller, and the tab that shows is white, bold and edged in blue. A tab's label and tooltip never show its address's query, so a tool's `?t=` token stays off the screen.

### Fixed
- `splitpage`: the reload button reloads a tab whose address has a `#` part (casebook's do); it puts a fresh frame in the tab's place instead of setting the same address again.

## 0.53.1

### Fixed
- `pageserve`: the channel no longer logs a report it can't post because no serve runs (`sift channel: report activity: sift serve isn't running`), as its loop already didn't. pi sends an activity report each time a session starts or stops working, so every session of a tool whose serve wasn't up printed it. Other failed posts are still logged, and the last activity still reaches serve once it starts.

## 0.53.0

### Fixed
- `pageserve`: the channel remembers the last `activity` report the harness sent and posts it again whenever its loop finds a new serve, and after a failed post once serve answers again, instead of dropping it. The harness re-sends activity only when it reconnects to the channel, which a serve restart doesn't cause, so a session working through a restart showed idle, then stalled. Other reports are unchanged.

## 0.52.1

### Fixed
- `splitpage`: a page opened with `take=1` in its address takes the terminal on its first connection only, then drops `take` from its address, so a reload or a window the browser restores no longer takes the session from another terminal (proj's own page did the same). `Config.Take`'s doc now says so.

## 0.52.0

### Added
- `splitpage`: the family's split page, lifted from lwc's workshop split view. One page holds the session's terminal (xterm.js over the tool's own websocket), a divider, and a bar of tabs, each one of our own `http://127.0.0.1:<port>` pages in a frame that stays loaded while hidden. `Page(Config)` is a tool's localweb `Assets`; `Tabs` holds each session's tabs and the one that shows, in memory, with `Handler()` serving `GET tabs`, `POST open`, `select` and `close`, and a `stream` of changes under `/api/split/`; `Open` is the client that opens a tab. Open refuses any address not on `127.0.0.1` and shows an address already open; a pinned tab can't be closed. `wire.go` is the terminal contract every backend keeps (binary bytes, a text resize, a replay first, close codes 4404, 4409 and 4410), with `wire.d.ts` generated by wiregen; it also requires each backend to refuse a websocket whose Origin is not its own host. A page takes its session from its own `?session=` and passes its query on to the socket, so one server can serve many sessions; with `Config.Take`, a page another view took offers Show it here, which reconnects with `take=1`. Tab frames allow `clipboard-write`. No tool uses it yet.

## 0.51.0

### Added
- `channelmcp.ReportActivity`: a harness reports whether its session is working (a turn or a background agent is running) as `{event: "activity", working: true|false}` over `notifications/channels/report`, and a Claude Code mod as `<tool> report activity working|idle`. Both reach `OnReport` and `ReportFunc` as the event `activity` with the token `ActivityWorking` or `ActivityIdle`; a malformed one is ignored and logged. held, landed and turn_ended are unchanged.
- The plugin mod reports `activity` once at session start and whenever the session starts or stops working: from `turn.start` to the main loop's `turn.complete`, and from each `agent.spawn` until that subagent's own `turn.complete`. A tool that ignores the event needs nothing.

### Fixed
- The plugin mod no longer runs `report turn-ended` when a subagent's run ends: only the main loop's `turn.complete` ends the turn.

## 0.50.0

### Added
- `narrowMode({ root, left, right })` in the page kit's frame: at 1080 wide or less a page that turns it on shows one thing at a time (the centre, or a side in its place, the other a strip), with a count slot on each strip. The fold and what is remembered of it are ignored and never written while narrow. Pages that don't turn it on are unchanged.

## 0.49.0

### Added
- `claudeplugin.Spec.Group`: an optional command group, so a tool's mod runs `<bin> <group> watch` and `<bin> <group> report`. A tool that sets none renders exactly as before.

## 0.48.0

### Added
- `needsPill({items, open})` returns `{el, set, close}`: the count of what needs the reader as a button. One item opens on a press, several open a menu naming each in the order given, none hides it. `set` with the same items leaves an open menu and its rows alone, so a live update takes nothing from under the pointer.
- `nextLine({left, next, open})`: the line after an answer, how many are left with a Next button naming the next, and no button at zero. It never moves the page.
- `arrive(el)`: shows `el` with its answer control on screen (the element marked `data-answer`, else a text box in it) and focuses a text box.

## 0.47.0

### Added
- `railTabs({tabs, open, name, onOpen})`: tabs with counts in the right column, one body shown at a time, inside the frame's thread column so its empty fold still folds the whole column. A press on a tab is remembered per tool; `setOpen(id)` shows a tab for the tool without changing what the reader chose. `setCount(id, n)` updates a count.
- `draftList({drafts, empty, onEdit, onDelete, onSelect, selected})` returns `{el, redraw}`: each draft's quoted item, its words edited in place (saved on blur or Enter), delete, and a press that tells the tool which item to show; with none, the tool's `empty` line. Mount `el` once and call `redraw` on live updates: a row keeps its box, focus, caret and unsaved words while its draft id is unchanged, and the tool's text never replaces words the reader hasn't saved.
- `remembered` (`get`, `set`, `remove`): the one guarded `localStorage` helper the frame and the tabs use, exported for a tool that remembers a reader's choice too.

## 0.46.0

### Added
- `pageserve.Show(where, url, events, page)` puts a page in the session's own Chrome window beside its terminal when it has one, and otherwise reuses or opens a tab, answering `window`, `reused` or `opened`; `TerminalOf`, `TerminalGo` and `Window` run `proj terminal` and `proj window` for a session's tmux location (`Where`). The channel sends `Identity.Where`; a tool's open call adds it with `Where.Into(body)`. Moved from diazo.
- `Options.OnStop(ctx)`: the tool's own shutdown, run after running requests have finished and before the entry is withdrawn, so a restart never overlaps a serve still writing. Requests and `OnStop` together are bounded at 4.5 s; past that `Run` logs it and exits.
- `Commands.SkillName` and `conformance.Server.SkillName`, for a skill not named after its tool (galley's `reviewing-a-document`).

### Changed
- `POST /api/stop` takes only the `X-Local-Token` header: a request carrying the token as a cookie alone is refused with 403, so a page served by the tool can't stop it. `conformance.Check` tests this.
- `localweb`'s `Wait` returns once running requests have finished, up to 2 s, rather than when the listener closes.

### Fixed
- The frame (`collapsible`, `frame`) draws where `localStorage` throws, such as a sandboxed mockup frame, and remembers nothing there.

## 0.45.1

### Fixed
- The thread column's fold toggle sits on the THREAD label's line at the column's right edge, as the index column's does, instead of on a row of its own above the label. The thread's title starts below it.

## 0.45.0

### Added
- The page kit's `shareMenu` takes a `ShareItem` with `heading: true`: a label over the items after it, styled as the kit's section labels, that is not a menuitem, cannot be pressed and is not in the tab order. A page without `kit.css` can set its colour with `--share-muted`.

## 0.44.0

### Added
- The page kit's front page and switcher parts, from diazo's: `keepElsewhere(bar, read)` keeps the bar's switcher current (one read at a time, the bar set only on a change), and `filterRow`, `statusPills` and `groupList` draw a front page's filters, status pills with counts and folding groups from plain values.
- `frame`'s `setRightEmpty(empty, card)`: the thread column folds to its strip when its card has no messages and opens on the first one. A fold Court makes holds on that card, in that tab, until the card changes; the card id must be unique across the tool.
- `pageserve.Commands.Around` wraps the channel's run, the channel command takes `--scope <dir>`, and `Spec.Scope` names the wait's root without gating the loop. After a torn poll the loop finds a new serve within moments, then looks once per `Retry`.

## 0.43.0

### Added
- `msgstate.Message`: a thread message as a server sends it to the kit's thread, for a page that keeps its messages anywhere.

## threadstore 0.1.0

### Added
- `threadstore`, a separate module on `sqlitedb`: threads, messages, drafts, Sends (batches) and deliveries under one delivery rule. A Send is delivered whole, a session can hold several, the owner belongs to the scope and a takeover moves the owner with its unanswered messages, and a reply settles all its messages or none. Every write has a form that joins the tool's own transaction. A tool takes `Migrations` by position into its own database's steps.

## 0.42.0

Every server gets the standard's server rules with no code of its own. See `PAGE-STANDARD.md`.

### Changed
- `pageserve.Run` keeps its token in `StateDir/token` (0600; a file others can read is replaced), watches its own binary and marks its entry stale when an install replaces it, keeps its tab list in `StateDir/tabs.json`, and puts `X-Tool-Build` (the version and a hash of the assets) on API responses.
- The channel calls `Client.Fresh` before each tool call; a tool stops calling it itself. Channels that find one stale serve at once replace it once.

### Removed
- `pageserve.Options.Idle`, `Busy` and `Token`: a server never exits for being idle. On bumping, a tool removes them, and its own kept token, binary watch, tab setup and version header. A tool with its own `Options.Stream` (casebook) relays the `stale` event to its stream.

### Added
- `PAGE-STANDARD.md`: what a server and page must do, each rule naming the part that delivers it, and where each server stands.
- `pageserve/conformance`: `Check(t, Server)`, which a tool's tests run against its own serve.
- `Options.Tabs`, a callback handing a tool the tab list; the kit's `createApi` and `live` take `onNewBuild`, called once on a new build or a `stale` event.

## 0.41.0

### Added
- The page kit takes diazo's general page parts, so other tools can build diazo-shaped pages: `frame` and `collapsible` (three columns whose sides fold and are remembered per tool), `lineTip` and `wireTip` (the page's one pop-out), `indexRow`, `indexSection` and `attentionDot` (the left index), `thread` and `threadMessage` (a card's thread with its note box), `stageTrack`, `stagePill`, `workingLine` and `waitBadges` (the band), and `questionButton`, `QUESTIONS`, `createDrafts` and `sendBar` (drafts sent together). They take plain values and callbacks and know nothing of any one tool. Their classes are `kit-` classes in kit.css; the demo shows them at `?view=parts`.

## 0.40.0

### Added
- `hookconfig.Remove` removes only declared exact command-hook spellings under their event and matcher, preserving unrelated siblings and group fields. `Count` inspects those same identities without mutation for attributable duplicate-registration checks.
- `skills.OwnsWithMarkers` adds exact frontmatter string markers to the existing name ownership rule; `Owns` retains name-only behavior.

## 0.39.0

### Added
- The page kit's bar has `setSectionsShown(shown)`, which shows or hides its section buttons, so one bar can stay on screen across pages that have sections and pages that don't.

## 0.38.0

### Added
- `setupbundle.Source` and `BundleCommand` provide the shared build-only `setup-bundle --version X.Y.Z --out PATH` command. Producers supply canonical declaration bytes and a scoped filesystem; nil assets mean an intentionally empty bundle filesystem, not a fallback to local files.
- `skills.UserTargets()` returns portable default user skill destinations from the same harness table the direct installer uses, without reading HOME or environment overrides.

## 0.37.0

### Added
- `skills.Owns(name, body)` exposes the existing skill installer's ownership check so declarative setup can recognize a tool-installed skill without copying its frontmatter parser.

## 0.36.0

### Added
- `setupbundle`: a tool release's setup bundle, `<tool>_setup.tar.gz`, published beside its binaries. `Build(tool, version, manifest, files)` writes `setup.json` (`format: 1`, tool, version), `setup.toml` and each regular file of `files` under `files/`, with the same bytes for the same input; `Read` returns a `Bundle` (`Tool`, `Version`, `Manifest`, `Files`) and refuses another `setup.json` format, a symlink or other non-regular member, and any path outside `files/`. The root module remains stdlib-only.

## 0.35.0

### Changed
- The page kit's card header (`.kit-card-head`) is one line at a fixed 18 px, with or without a state pill: a `.kit-pill` in it is sized to the line, so moving between cards never shifts what is under the header. Nothing wraps; the key (`.kit-card-key`, pushed right) gives way first, then the crumb (`.kit-card-crumb`), each with an ellipsis. `card()` makes a string head its crumb. Headers that were about 13 px grow to 18 px.

## 0.34.0

### Added
- `sessiontheme`: shared window hues and persistent session shade slots, deterministic dark terminal palettes, pi 1.4 theme JSON rendering, and the typed resolved-theme query/header contract. The root module remains stdlib-only.

## 0.33.1

### Fixed
- A channel's wait loop logs each delivery the tool's `Wake` refuses (`<tool> channel: refused delivery: ` with its size and field names, never their values) instead of dropping it silently. diazo's channel dropped its overdue-wait wakes this way and left no trace.

## mermaidkit 0.2.0

### Changed
- The diagram check moved to its own package, `github.com/subaud-tools/tools-common/mermaidkit/check`: `check.NewParser(check.Bundle{...})` and `(*Parser).Check(text)`, otherwise as in 0.1.0. A tool that checks diagrams changes its import path (diazo); one that renders keeps `mermaidkit.Render` as it was (galley). `mermaidkit.Bundle` and `check.Bundle` are one type, so a tool that does both builds it once.
- Why: in one package, a tool that only renders carried mermaid's whole JavaScript parser too, and one that only checks carried the markdown renderer. Now each links only what it uses. A program that only calls `Render` builds 5.1 MB stripped on darwin/arm64, down from 12.2 MB with 0.1.0 (galley's binary had grown by 6.7 MB, 32%, when it took up 0.1.0), and one that only checks drops goldmark.

## 0.33.0

### Added
- `wiregen`: writes a page tool's `wire.d.ts` from its Go view structs and checks the committed file, the generator galley, diazo and casebook each carried in their `wire_test.go`. `Generate(roots, Options)` and `CheckCommitted(path, roots, Options, update)` (the drift test: an error naming the first differing line, or with `update` the file rewritten); `Options` holds the tool's `Header`, the `Regenerate` command its errors name, and `AllowUnknown`. It is the union of the three: a named string type with `Values()` is a union (wrapped one value per line past 80 columns, as prettier writes it), untagged embedded structs are promoted (pointer or not), `omitzero` is optional, a `[]byte` (base64) and a type with `MarshalText` are `string`, references are followed across packages, maps are `Record<K, V>` unless the file declares a type named `Record` (then `{ [key: K]: V }`), and two Go types with one TypeScript name, or a field it can only call `unknown` (an interface, a `json.RawMessage`, a type with its own `MarshalJSON`, named in the error), are refused unless `AllowUnknown`.
- `mermaidkit`, a separate module (`github.com/subaud-tools/tools-common/mermaidkit`, tagged `mermaidkit/vX.Y.Z`, because it needs goja and goldmark): diazo's diagram check and galley's themed page. `NewParser(Bundle)` (refusing an empty `Global`) and `Check(text)` parse a diagram with mermaid's own parser in goja and returns mermaid's reason (its first two lines). `Render(md, Theme, Bundle, docDir)` turns markdown into one self-contained HTML page (sidebar, local images embedded, the bundle inlined only when a diagram needs it) with `Theme`, `Palette`, `Font`, `BaseTheme()`, `ReadTheme(name, dir)` and `ImageTypes`. `Bundle{JS, Global}` is the tool's own built bundle and its esbuild `--global-name`; `Render` too refuses an empty `Global`. `just verify-extra` gates it as it does sqlitedb.
- `localweb/page/build/mermaid-entry.ts`: the mermaid bundle's entry a tool's build copies.
- `localweb/page/build/eslint.base.mjs`: the family's eslint rules (defect classes only), as `base({ root, ignores, testFiles, maxTestFiles, ambientGlobals })` for a tool's `eslint.config.mjs`: `root` is the tool's `import.meta.dirname`; `testFiles` (default `['*.test.ts']`, `[]` for none) are linted in a default project, `maxTestFiles` raises that project's cap (an error with `testFiles: []`); `ambientGlobals` (default on) turns `no-undef` off for `.ts`.
- `localweb/page/build/probe.mjs`: a browser probe's scaffolding, `check`, `counts`, `until` (4000 ms by default), `sleep`, `onCleanup` and `cleanup` (in the order added, so the browser closes before the serve fixture stops), `launchOrSkip({ required })` (null with no chromium, a failure when `required`, by default `KIT_BROWSER=required`), `run(main, { after })` (cleanup, then `after`, whose checks count, then the count and exit 1 on a failed check) and the geometry helpers `drawn`, `inside`, `sideBySide`. `just verify-slow` tests both in a scratch tool.

## 0.32.1

### Fixed
- `<tool> report` gives up after 5 seconds (`pageserve.ReportTimeout`). It ran on the client's 90-second long-poll timeout, so a serve that took the connection and never answered held the Claude Code plugin's hook that long.

### Added
- `Commands.Open`: opens the page for `<tool> serve` instead of the system opener, so a tool's own switch to keep the browser closed covers it.

## 0.32.0

### Added
- `update` prints the tool site's notice after its own output: it GETs `<site>/notice.txt` (ungated, 1 second timeout) and prints the trimmed text, cut to 2 KB, to stderr. No notice, an error or an empty body prints nothing and never fails the update. `App.PrintNotice` does the same for a tool that replaces `update`.
- `pageserve` does what casebook's own shell did, each as a hook or field a tool sets (a tool that sets none behaves as before):
  - `StatusError.ErrCode`: the JSON body's `code` (`"unknown_session"`), so two answers with one status can be told apart.
  - `Spec.PresenceBody(Identity)`: the body the channel posts to `/api/agent/presence`; `Identity.PID` is the harness's pid (the channel's parent); `Channel.Announce(ctx, client)` posts it, for a tool call that re-registers.
  - `Spec.OnServe(ctx, ch, entry)`: runs in the wait loop when the serve it reaches is a new process (a tool tells the agent what the restart interrupted), and the loop registers presence with it.
  - `Options.Stream`: answers `GET /api/events` instead of the `Events` log, for a page that streams from the tool's own event bus.
  - `Options.Busy`: while it answers true, serve stays up past `Idle` (for a page whose open tab should keep its serve alive).
  - `Options.Entry(*Entry)`: edits the entry before it is written (the server's own `StartedAt`); `Entry.Reopened` (`reopened`, omitted when false).
  - `Client.Passive()`: a copy of a client that never starts serve.

### Fixed
- `<tool> <command> -h` and the man page name the command when its `Synopsis` gives only the arguments: `Usage: diazo skills install [--agent NAME]…`, not `Usage: diazo install [--agent NAME]…`. A `Synopsis` that already starts with the command's name prints as before. Every pageserve command, and `login`, had lost its name.

### Changed
- An ungated binary whose site refuses `/dl/<tool>/latest` with 403 or 404 (a gated `/dl` refusing an unsigned request) says the site refused it with that status and, in case the site now needs a signed-in machine, names https://subaud.tools/account/ and the site's install command (`curl -fsSL https://<site>/install.sh | sh`), and `update` exits 1. A gated binary's errors are unchanged.
- A page tool's channel no longer restarts a page server that stopped after being idle; the next tool call starts it. The channel's wait loop, its reports, `<tool> watch` and `<tool> report` never start serve, so serve's idle exit (8 hours in cull and sift) now happens, and while no serve runs the loop logs nothing.

## 0.31.1

### Fixed
- `pageserve.Run` calls `OnStart` before it writes the entry, so a channel that finds a running serve finds the tool's own start-up done. Before, a channel could call the tool's API in the moment between the entry and `OnStart` (cull's page URL was still unset).

## 0.31.0

### Added
- `pageserve`: the page-tool server shell diazo, sift, cull and casebook
  each carried a copy of, with galley's registry, so each tool keeps only
  its own routes and channel tools. Built on `channelmcp`, `harness`,
  `localweb` and `skills`; the tool's name parameterizes every message.
  - `Entry`: the superset of a one-page tool's advert (`url`, `base`,
    `token`, `pid`, `version`, `stale`, `started_at`) and galley's registry
    entry (`v`, `url`, `room`, `page`, `pid`, `owner`), under the same JSON
    names, with the fields one of them never had omitted when empty, so
    each file keeps its shape and an old binary still reads a new one's.
  - `Live{Tool, Dir}` (`LiveFor(tool)` is `StateDir(tool)/live`): `Write`,
    `Remove`, `Claim` (an flock on the sibling `<room>.lock`: exactly one
    channel owns an unowned or orphaned entry), `List`/`Inspect` (reap dead
    pids, drop a second entry for one URL, report every file declined as a
    `Problem`; an entry from a newer version is reported and left alone),
    session presence (`AnnounceSession`, `WithdrawSession`, `SessionLive`),
    `LogDir`, `Token`, and per-page port hints (`LastPort`,
    `SaveLastPort`). Moved from galley's `internal/registry`.
  - A one-page tool's entry, `live/serve.json`: `Running`, `Advertise`,
    `Withdraw`, `ErrNotRunning`.
  - `Events`: the event log the page kit's `live()` reads, `Emit`,
    `Cursor`, and the `Poll` and `Stream` handlers, with `Tabs` check-ins.
  - `Run(ctx, Options)`: the serve process: one per machine (under
    `serve.lock`), its entry while it runs, `/api/events`, `/api/poll`,
    `/api/stop`, the idle exit, and an `OnStart` hook for the tool's own
    steps. `Process{Live, Args, Dir}.Start`/`Ensure` start it in the
    background; `Stop` stops it.
  - `Client` (`Do`, `Report`, `Fresh`, `StatusError`, `ErrNoServe`,
    `Query`) and `Channel` (`New`, `ForSession`, `Run`, `Watch`, `Root`)
    from a tool's `Spec`: its tools, its project root, how it reads a wait's
    answer (`Wake`), and whether its serve takes presence.
  - `Commands`: the `serve`, `channel`, `watch` and `report` commands from
    a tool's `Spec`, `Process` and hooks; `SkillsCommand(tool, skill)` is
    `<tool> skills install [--agent NAME]…`.

## 0.30.0

### Added
- `Config.Product`: the product a gated tool's `update` asks `/links` for,
  when one product covers several tools (tackle's six). Left empty it is
  `Name`, as before.

## 0.29.0

### Fixed
- `login`: a sign-in whose code expired (its time passed, or the service
  says so) is replaced in the same run, printing a new code to type, instead
  of ending with an error and nothing to act on. A denied sign-in still stops
  and says to run login again.

## 0.28.0

### Added
- `Config.Gated`: a tool whose `/dl` is closed to anyone. Its `update`
  fetches `latest`, the tarball and the `.sha256` through signed links from
  the access service; with no token, or one the service refuses, it says to
  run `<tool> login`, and for a tool the account doesn't own it names the
  account page. Ungated tools are unchanged and never ask for links.
- `auth.Link(ctx, product, path)`: a five-minute signed download URL from
  `POST /links`, asked with the machine's token. No token is
  `auth.ErrNotSignedIn` (nothing is asked), a refused one
  `auth.ErrSignInRefused`, a product not owned `*auth.NotOwnedError` with the
  account page.
- `login --wait`: signs in in one run, waiting while the machine is allowed
  (what `login` did in 0.26.0).

### Changed
- `login` signs in over two short runs, so nothing waits on a person. The
  first prints the URL and code, saves the sign-in at
  `ConfigDir("subaud")/pending` (mode 600) and exits 0; the next asks once
  and, once the machine is allowed, saves the token. A run while it is still
  pending says so and exits 0; a denied or expired code is dropped, and the
  next run starts over. `auth.Client.Login` is now the two-run sign-in;
  `auth.Client.LoginWait` is the one-run sign-in.

## 0.27.0

### Added
- The Claude Code mod reports held: when a line with a `report` token is
  submitted and `prompt.submit` has not resolved a second later (the agent is
  mid-turn, and the prompt waits for the turn to complete), it runs
  `<bin> report held <token>` in the session, on the same chain as every
  other report, so held always reaches the server before that line's landed.
  A line with no token runs nothing. A tool's plugin must be regenerated to
  get it.
- `channelmcp.ReportCommand` accepts `<tool> report held <token>` and
  delivers `ReportHeld` with the token.

## 0.26.0

### Added
- `login` and `logout`, built-in commands every tool inherits. `login` signs
  the machine in to the subaud.tools account by device code: it prints a URL
  and a code to type there, polls until the machine is allowed, denied or the
  code expires, and stores the machine's token at `ConfigDir("subaud")/token`
  (mode 600), shared by every tool. `logout` removes the machine from the
  account and deletes the token; it keeps the file on a network error.
- `auth`: `auth.Token()` returns `$SUBAUD_TOKEN`, else the stored token, for
  downloaders. The API base is fixed in code, so the environment can't send
  the token elsewhere.

## 0.25.0

### Added
- `localweb/page`: `submitOnEnter(field, submit)` in the kit's new `enter.js`
  (re-exported by `kit.js`, typed in `kit.d.ts`): a plain Enter calls
  `submit` and prevents its new line; Shift-Enter, a held (repeating) Enter
  and an IME's Enter (`isComposing` or keyCode 229) keep the key's usual
  meaning. It imports nothing, so a page can copy it alone. galley's contract,
  moved into the kit so every family page that takes a message uses one rule.

### Changed
- `noteField` commits on Enter through `submitOnEnter`: a held Enter,
  Shift-Enter and keyCode 229 no longer commit.

## 0.24.0

### Added
- `skills`: a tool's embedded agent skill, installed and kept current.
  `Install(name, body, agents, out, errw)` writes `body` as
  `<skills dir>/<name>/SKILL.md` for each agent named (claude-code, codex,
  pi), or for each harness whose home exists (`CLAUDE_CONFIG_DIR`,
  `CODEX_HOME`, `PI_CODING_AGENT_DIR` when absolute, else `~/.claude`,
  `~/.codex`, `~/.pi/agent`): exit 2 with no harness, 1 when any harness
  failed. Moved from tackle's `skills/install.go` (diazo's is a copy), with
  its rules: the skills directory may be a symlink, nothing beneath it may
  be, an existing SKILL.md is replaced only when its `name:` is the tool's,
  and each write is a fresh file renamed into place with the old mode.
- `skills.Refresh(name, body)`: for each harness whose home exists,
  rewrites the installed copy of the tool's own skill when it differs from
  `body`, and returns the paths it rewrote. It never creates a missing skill
  and skips a foreign one (another `name:`, or a symlink beneath the skills
  directory); a matching copy is not touched. A tool calls it when its
  channel starts.

## 0.23.0

### Added
- `msgstate`: the one lifecycle of a page message (sent, with_agent, working,
  answered, declined, failed, no_reply), each state's label, `Final(s)` and
  `Allowed(from, to)` for the moves the lifecycle spec draws. `State` has a
  `Values()` method, so a tool's wire generator emits it as a union.
  `Acknowledge(from, to)` is for the agent's replies: it lets a message still
  `sent` (its landed report not in yet) be settled or marked working.
- Page kit `messagePill(state, line)`: a message's state pill
  (`.kit-pill[data-state]`, one variant per state in the kit's colours) with
  its label and the line under it. The labels come from `msgstate.js`
  (`MESSAGE_STATES`), generated from `msgstate`; a test fails when they drift.
  The demo page shows every state.
- `channelmcp.Handler.OnReport(event, token)`: the server accepts the client
  notification `notifications/channels/report` with
  `{"event": "held"|"landed"|"turn_ended", "report": "<token>"}` (held and
  landed need the token) and hands it to OnReport, in order. A malformed
  report is ignored and logged; with no OnReport, reports are ignored. The
  token rides on an event as the meta key `report` (`channelmcp.MetaReport`),
  and each `<tool> watch` line also prints it as a top-level `report` field.
- `channelmcp.ReportCommand(deliver)`: `<tool> report landed <token>` and
  `<tool> report turn-ended`, mounted with `app.Register`. It reads the
  session as watch does, hands the report to the tool's own `deliver`
  callback, prints nothing, and does nothing in a bridge child.
- The Claude Code mod reports back: when a line's prompt starts a turn
  (`prompt.submit` resolves without a drop) it runs `<bin> report landed
  <token>` with the line's `report` token, and on a `turn.complete` after one
  of its lines landed it runs `<bin> report turn-ended`, both in the session,
  one report at a time so they reach the server in order. A failed report goes
  to the debug log and is not retried. A tool's plugin must be regenerated, and
  its binary must mount `ReportCommand` in the same release.

## 0.22.0

### Fixed
- localweb: the sign-in cookie is named per port (`<tool>_token_<port>`), so
  two serves of one tool on one machine (a branch build beside the live one)
  no longer sign each other's page out. A browser's old `<tool>_token` cookie
  is ignored.

## 0.20.0

### Added
- Page kit `bar()`: an optional `brand.href`. With it the brand is a link
  there (a tool's home page), drawn in the bar's own colour and underlined
  only on hover or focus; without it the brand is plain text, as before.

## 0.19.0

### Added
- `localweb.CanShare()` (macOS only) and `localweb.PutFile(path)`, which puts
  the file itself on the macOS clipboard so a paste attaches it; the path is
  an argument to the script, never part of its text. Moved from galley.
- Page kit `share.js`: `shareMenu(button, items, onPick)` builds a Share ▾
  button's menu from `{label, act}` items, right-aligned under the button,
  closing on a pick, an outside click, Esc or a resize; with the labels
  (`SHARE_*`), `sharedLine(path)` and `SHARE_REPLY_MS`. It imports nothing
  else from the kit, so a page can bundle it alone. Moved from galley.
- Page kit `share.css`: styles the menu through `--share-*` properties
  (ground, ink, line, hover, lift, font) that default to the kit's tokens;
  `kit.css` imports it.

## 0.18.0

### Added
- `channelmcp.StartWatch(w, tool)`: the one start every tool's `<tool> watch`
  makes. In a bridge child (the harness Child rule: `AGENT_SESSION_CHILD=1`
  with a non-empty `AGENT_SESSION_ID`) it prints `{"stop": reason}` and
  reports don't run (the caller exits 0); otherwise it returns the `Lines`
  writer for the tool.
- `channelmcp.NewLinesFor(w, tool)`: each line also carries `text`, the whole
  prompt (`<tool> event`, a ` key=value` per meta pair, a newline, the
  content), exactly what the 0.17.0 mod builds. `content` and `meta` stay, so
  plugins installed from 0.17.0 keep working against a new binary. The line
  format is additive. `NewLines` (no tool name) writes no `text`.

### Changed
- The Claude Code mod is a thin shim, since kempt updates a tool's binary but
  not its installed plugin: it submits each line's `text` word for word, and
  on a `stop` line logs the reason and never restarts `watch`. It no longer
  formats events or reads the environment; the binary decides both. Each
  tool regenerates its plugin and calls `StartWatch` from its `watch`.

## 0.17.0

### Fixed
- A tool's Claude Code mod stays quiet inside pi's claude-bridge, where the
  bridge stamps `AGENT_SESSION_CHILD=1` with an `AGENT_SESSION_ID` on the
  Claude Code children it spawns. The event belongs to the hosting pi session,
  which its own channel carrier delivers, so the mod no longer spawns
  `<tool> watch` there and submits a second turn. Each tool regenerates its
  plugin to pick this up.

## 0.15.0

### Added
- `channelmcp.Pusher`, the interface a tool's wait loop sends events to;
  `*Server` satisfies it. `channelmcp.Lines` is a second Pusher that writes
  each event as one JSON line, `{"content":...,"meta":{...}}`, for
  `<tool> watch`, refusing the same meta keys `Server.Notify` refuses.
- `harness.Capture.IsClaude`: the resolved session is Claude Code's own
  (`CLAUDE_CODE_SESSION_ID` won the rule, not a bridge child).
- `claudeplugin`: renders a tool's Claude Code plugin from a `Spec`:
  `plugin.json` (no `version`, so Claude Code versions it by commit),
  `.mcp.json` running `<bin> channel`, and a mod (`hooks/hooks.json`,
  `hooks/register.js`) that runs `<bin> watch` for the session, starts a turn
  with each event (a meta value with whitespace, a quote or `=` is quoted, so
  it stays one value on the header line), resubmits a dropped one from `turn.complete`, and restarts
  `watch` when it ends. `AssertCurrent` fails a tool's test when its
  committed plugin differs and names the regenerate command.

## 0.13.1

### Fixed
- `live`: a hidden tab closes its event stream and polls nothing; shown
  again it reopens from its cursor. Browsers allow about six connections to
  one host, so a stream per background tab froze every tab of a tool.

## 0.13.0

### Added
- `localweb.Config.Token`: a tool can hand in the token to use (64 hex
  characters) instead of a new one per start, so its open tabs keep working
  across a restart. Empty keeps today's behaviour.

## 0.12.0 (sqlitedb 0.2.0)

### Changed
- Module path is now `github.com/subaud-tools/tools-common` (and
  `github.com/subaud-tools/tools-common/sqlitedb`); CI pins
  `subaud-tools/tools-actions` `go-ci@v0.11.0`.
- Adopted the .tools family CI standard: the standard `justfile` (family
  `justfile.head` verbatim plus `tools-common` slots), `lefthook.yml`, a
  standard `ci.yml` (tools-actions `go-ci@v0.10.1` gate plus `extra` and
  `browser` jobs that fold in the stdlib-only guard, the `sqlitedb` module
  checks, and the `localweb/page` browser tests), and `.github/dependabot.yml`.
- Cleared the family Go gate's lint findings (bodyclose, errcheck, gosec,
  staticcheck, unparam) with no change to the exported API or behaviour.

## v0.11.0 (2026-09-28)

### Added
- `localweb/page`: `list({search: {placeholder?, value?, onInput}})`, a search
  field in the list header (kit tokens: mono, 6px, hairline), and the handle's
  `setSearch(text)` (no `onInput`). `onInput` fires on every input, no
  debounce. `/` focuses it: a family default registered only when the list
  has search, so a page's own `/` clashes. In the field only Esc acts: it
  clears the text first, then leaves the field.

## v0.10.1 (2026-09-28)

### Fixed
- `localweb/page` review fixes for v0.10.0:
  - `sheet({returnFocus})`: if the opener left the page while the sheet was
    open, focus goes to `returnFocus`, else the main region (`main`,
    `[role=main]` or `.kit-read`), else body, instead of nowhere.
  - `list.setItems` paints once, even when it drops rows that left the list.
  - The `?` overlay closes on a click anywhere in it again.
  - `Selection.range` docs: if either end is not in `orderedIds`, it toggles
    the target.
- Tests: the destroyed-list test now fails if `destroy()` doesn't unsubscribe,
  and the harness's `eq` refuses DOM nodes (it compared them as `{}`, so the
  focus assertions were vacuous; they now compare identity, and pass).

## v0.10.0 (2026-09-28)

### Added
- `localweb/page`: `createSelection()`, a selection store several views bind
  to (`ids`, `has`, `toggle`, `range(anchorId, id, orderedIds)`, `all`,
  `deselect`, `clear`, `anchor`, `onChange`), and `list({selection})`, plus the
  handle's `selection` and `destroy()`. A list without one creates its own, so
  existing callers are unchanged.
- `sheet({title, body, actions, onClose})` → `{el, close()}`: a modal sheet
  with a backdrop, Esc and backdrop-click to close, focus containment and
  return, and page keys suspended while open; `sheetOpen()`.

### Changed
- The list's toggle, range and by-id logic now lives in the selection store.
  A range anchor is an id, so shift-range works across a re-render.
- The `?` overlay is built on `sheet` (it gains the backdrop and focus
  handling); `?` or Esc still closes it.

### Fixed
- The kit's browser tests no longer flake when headless Chrome runs the page
  without window focus (focus events are fired explicitly in the tests).

## v0.9.1 (2026-09-28)

### Fixed
- `localweb/page`: a 401 poll is `stale` even if a stream opened while the
  poll was in flight (it used to be dropped as out of date, leaving `live`).
- `setLive` picks its label without relying on a second fallback; `staleText`
  applies only to `stale`.
- `.kit-app` scrolls sideways below its minimum width instead of overflowing
  (reading column minimum 320px). Removed a dead branch in the Esc binding.

## v0.9.0 (2026-09-28)

### Added
- `localweb/page`, for casebook's page and cull's review page:
  - Stale session: `ApiError.isStale`, `createApi({onStale})` (called once),
    a `stale` status from `live()` on a 401 poll (it stops for good), and
    `bar({staleText})` for the tool's own wording.
  - `.kit-app` grid (bar; list | reading column | optional `.kit-rail`).
  - Selection by row id across pages: `selectedIds()`, `selectAll(ids)`,
    `deselect(ids)`, `clearSelection()`. Tested to 500 rendered rows.
  - `setStatus(text, {tone})` and `setLive(state, text)`.

### Changed
- Keys: `⌥` bindings match the physical key (macOS changes the character);
  while the `?` overlay is open only `Esc` and `?` act; a key another handler
  already took (`preventDefault`) is left alone.
- List selection is by identity, so a row that leaves the list stays selected
  by id until `deselect`/`clearSelection`; `onSelect` fires when the id set or
  the rendered selection changes.

## v0.8.2 (2026-09-28)

### Fixed
- `man` escapes double quotes and a leading `.` or `'` on a line. A quoted
  synopsis (muster's `send <target> "body"`) had its quotes eaten by `.B` and
  was split into separate arguments; a help line starting with `.` would have
  been read as a roff request.
- `help <cmd>` and `<cmd> -h` print the command's one-line summary between the
  usage line and the long help (it was only in the grouped list).

## v0.8.1 (2026-09-28)

### Fixed
- A command that declares `Subcommands` gets `-h` from tools.App only as
  `<cmd> -h`. Any other first word goes to `Run`, so a mistyped sub-verb
  (`galley ledger bogus -h`) is rejected by the command instead of exiting 0
  with the parent's help (v0.8.0 intercepted it).

## v0.8.0 (2026-09-28)

### Added
- `Command.Subcommands`: a command's own sub-verbs (galley `ledger
  sync|rebuild|stats`, muster `standing ...`). `<cmd> -h` shows the command's
  help, now with a `subcommands:` line; `<cmd> <sub> ... -h` is passed through
  to `Run` so the sub-verb prints its own flags. `commands --json` carries a
  `subcommands` array. Before this, a command with sub-verbs had to leave its
  Synopsis and Help empty, or `-h` never reached the sub-verb.
- Additive: commands without Subcommands behave as before.

## v0.7.0 (2026-09-27)

### Added
- `Config.About`: an optional overview. `help` prints it above the command
  list, and `man` uses it as the DESCRIPTION (blank-line paragraphs become
  `.PP` breaks). Bare invocation stays the short usage on stderr, exit 2.
  galley uses it for its push/pull and channel guidance.
- Additive: without `About`, `help` and `man` are unchanged.

## v0.6.0 (2026-09-27)

### Added
- `Command.Aliases`: extra words that dispatch to the same command, resolved
  by `Dispatch`, `help <alias>` and `<alias> -h`. `HelpFor` prints an
  `aliases:` line and `CommandsJSON` an `aliases` array (empty when none);
  grouped usage and `man` list only the canonical name.
- `Register` panics when a name or alias is already taken by a different
  command. Re-registering a `Name` (overriding a built-in) replaces its
  aliases.
- Additive: nothing in v0.5.0 changes for tools that set no aliases.

### Docs
- README lists all five built-in commands (`man` and `commands` were missing).

## v0.5.0 (2026-09-27)

### Added
- New package `localweb/page`: the family's galley-style local page kit, for
  docket's workbench and cull's label page. `page.With(toolFS)` serves the
  kit's embedded assets under `/_kit/` beside a tool's own page
  (`localweb.Config{Assets: page.With(webFS)}`). The assets are plain CSS and
  vanilla ES modules, with no build step and no node:
  - `kit.css`, the only place the `--kit-*` tokens are declared (one
    `light-dark()` block). Tools set only `--tool-signal-*` and
    `--tool-agent-*`, which default to tackle rust and wire.
  - `theme`, `keys`, `api`, `live` (SSE with a 2 s poll fallback) and `dom`
    (bar, list panel, facts, cards, buttons, code block, fold, note field),
    re-exported by `kit.js` and typed by `kit.d.ts`.
- Additive: nothing in v0.4.0 changes, and the root module stays stdlib-only.

### CI
- The kit's JS tests run in headless Chrome from `go test`. The `test` job
  sets `KIT_BROWSER=required`, so a missing browser fails instead of skipping.

## sqlitedb v0.1.0 (2026-09-27)

### Added
- New module `github.com/schuettc/tools-common/sqlitedb`: the family's SQLite
  conventions in one place, from casebook's working-state database, galley's
  ledger index and muster's store. `Open(ctx, path, Options)` with WAL, a 5 s
  busy timeout, one connection, foreign keys (on unless `NoForeignKeys`), files
  `0600` and a `0700` parent directory; `user_version` migrations as `Step`s
  (`func(ctx, *sql.Tx) error`, with `SQL` for plain statements), one
  transaction each; `*NewerError` for a newer database; `AdoptUnversioned` and
  `ErrUnversioned` for existing unversioned databases; `(*DB).Tx` and
  `(*DB).Version`. Pins `modernc.org/sqlite` v1.59.0.
- Several processes may open one new database at the same moment: the switch
  to WAL is retried while SQLite reports it busy, and migrations take the
  write lock at the start of each step and re-read the version, so each step
  runs exactly once.
- Paths are percent-encoded into the SQLite URI, so `?`, `#` and `%` in a
  path name that exact file.

### CI
- New `sqlitedb` job (gofmt, vet, `test -race`, build in the submodule) and a
  `stdlib-only` job that fails if the root module gains a dependency.
