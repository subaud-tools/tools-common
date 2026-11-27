# Changelog

Root module releases are tagged `vX.Y.Z`; the separate `sqlitedb` and
`mermaidkit` modules are tagged `sqlitedb/vX.Y.Z` and `mermaidkit/vX.Y.Z`. Releases before this file are described by their
tags and PRs.

## 0.135.0

### Added
- page kit: `sourceLine(source, {tags, word, url})` draws a source on one line under the text it backs: its tags first (`{text, tone}`, tone `ok` or `signal`), then every http(s) address as its own short link (the host and the last path segment, or the last three when that one is a number; the full address on hover; a new tab) and the words between as words, or the caller's own Node through `word`. Long pieces wrap instead of spilling past the column. A source with no address is kept as written.

### Changed
- page kit: `evidenceList` draws each entry's text, then its source line under it, then the output fold. A source that starts with an address and says more is no longer one link to a broken address; `o.source` is now called on each run of words rather than the whole source, and a url that is not the web shows as words. The `.kit-source` class is gone.

## 0.134.0

### Added
- splitpage: pasting an image (PNG, JPEG, GIF or WebP) into the split page's terminal now gives the program there the image's path, as pi does on a Mac: the page sends the image to its server, which saves it in the system temp folder as `paste-<random>.<ext>`, readable only by you, and the page types the path as a paste, with no Enter. pi and Claude Code attach an image named by its path. A paste with text goes to the terminal as before; a failed save types nothing and says why in the browser console.
- splitpage: `POST /api/split/paste` in `Tabs.Handler` (the image's bytes with its Content-Type; 415 for anything but those four types, checked against the bytes too, 413 over 20 MB) and `PasteResponse` on the wire. Every tool that mounts `Tabs.Handler` gets it with this update.

## 0.133.0

### Added
- page kit: `repoPick(o)`, the repo picker any page that selects repos reaches for: a search, owner chips with counts, a "Tick all N" line that half-ticks and covers every page, ten to a page, repos already chosen ticked and greyed, an optional "Not in the list?" field taking `owner/name`, a repo's link or an org's link (which ticks that owner's listed repos), and an optional single mark (a ★). The page hands it the list and reads back what is ticked. On the demo page inline and in a wide sheet.
- page kit: `sheet({ wide: true })`, a sheet `min(720px, 92vw)` wide whose element marked `kit-sheet-scroll` is the only part that scrolls, so its head and buttons stay in view. Sheets without it are unchanged.

## 0.132.0

### Changed
- splitpage: the terminal's × leaves the split page: the browser tab goes to the page showing on the right, or with none to the place's home, else the server's `/`. The divider's ◀ and the Terminal button still collapse the terminal.
- splitpage: a tool press in the bar's switch always shows that tool's front page, the same as the button on the tool's own page: the tool's tab moves to its front page in place (same id) and loads afresh, so a press after clicking into a page inside the frame still lands on the front page.

## 0.131.0

### Added
- splitpage: one bar across the top of the split page, the kit's own bar: the workspace, the diazo | cast | galley switch and a Terminal button. The switch shows the tool's tab, or opens its front page, without leaving the split. A host fills it with two hooks, `Tabs.Place` (the workspace, its link and each tool's address and whether it is up) and `Tabs.Start` (start a tool that is down); with no place the bar shows only the Terminal button.
- splitpage: `GET /api/split/place` and `POST /api/split/tool` (show the tool's first tab, else start it if it is down and Start is set, one start per tool at a time, then open its front page in front); `Place`, `PlaceTool`, `ToolRequest` and `Tab.Tool` on the wire.
- splitpage: the terminal has its own header with ×. × and the Terminal button close and open the terminal through the same layout as the divider's ◀ ▶, which stay.

### Changed
- splitpage: the tab row is now a slim row of only the pages that aren't a tool's tab (each tool's tab is the first one on its host); it shows only while one is open. At phone width the bar's ▣ and switch replace the Terminal / Pages row.
- kit: inside a frame the bar leaves out its workspace and switch, which the split page's bar carries; a page on its own is unchanged.

## 0.130.0

### Added
- kit: a two-column layout for iPad widths. `narrowMode` now has three layouts: one at a time at 999px or less (the old 1080 rule, moved), two columns from 1000 to 1319px (the middle with one side open beside it at 288px or 384px, the other a 44px strip with its count; an item page opens with its right side open, a front page with its left; pressing a strip swaps sides, pressing the open side's toggle leaves two strips; nothing is remembered), and three columns from 1320px, unchanged. The page gets `kit-two` with `kit-two-left` or `kit-two-right`.
- kit: `KIT_WIDTHS` (`{ oneAtATime: 999, twoColumns: 1319 }`), exported from `frame.js` and typed in `kit.d.ts`: the one source for the width lines. A tool with a width rule of its own uses it instead of a copy.
- kit: `narrowMode().centre()`: back to the middle in one at a time, nothing in two columns or wide. `recordPage` uses it on load, on a hash change and on a search pick. A tool that calls `show(null)` to mean "back to the middle" should call `centre()`: in two columns `show(null)` folds both sides.
- kit: on a touch screen (`pointer: coarse`) every column toggle takes a press 44px across and down, and every closed strip is 44px wide with no scrollbar gutter, so classic scrollbars don't cut the target. With a mouse nothing is drawn differently.

### Changed
- `PAGE-STANDARD.md`, the laying-out-a-page skill (its Phone row, and check widths that add 1180px and 1032px), the layout starter at `/_kit/layout/` and the README describe the three layouts.

## 0.129.0

### Added
- `tools.CastName` ("cast"), `tools.CastSocketPrefix` ("cast-"), `tools.LegacySocketPrefix` ("proj-", still read for sessions started before the rename) and `tools.CastSettingsDir` ("cast", the folder under ~/.config and ~/.local/state), with `tools.CastSocketProject(socket) (project, ok)`: whether a tmux socket name or path belongs to the tool under either prefix, and its project.

### Changed
- guide: `Family` and `WalkTools` name the tool `cast` in place of `proj` (its section and walk are `guide/tools/cast.md` and `guide/walks/cast.md`), and the guide's words say cast throughout: the intro, fit, the tool sections, the walks, the lessons (`lessons/2-your-sessions-with-cast.md`), the skill templates and the commands they name (`cast guide start`, `cast guide show`, `cast new`).
- The getting-started walk's hook `proj-tab` is now `cast-tab`: the tool's page carries `data-walk="cast-tab"`, and walk steps and the spotlight's `tool` say `cast`. The page's own tool must match (tackle's cast page).
- Prose and comments in the README, PAGE-STANDARD.md, the kit's CSS and JS and pageserve say cast in place of proj.
- pageserve: the hosted switch lists `cast` in place of `proj` (`place.tools[].name` and its `cast.<ws>.<domain>` page), and `pageserve.Proj` runs the `cast` binary.
- harness: `Capture.Project`'s doc names both socket prefixes.

## 0.128.0

### Added
- pageserve: on a hosted machine (`PAGE_PUBLIC_DOMAIN` set to `<ws>.<domain>`) the answer to `GET /api/kit/guide` carries `place`: `{workspace, home, tools}`, where `home` is billet's start page for the workspace (`https://<domain>/?w=<ws>`) and `tools` is diazo, proj and galley in order, each with its page (`localweb.PublicOrigin(name) + "/"`) and `current` on the serve's own tool. The list is one slice, `switchTools`, in `pageserve/place.go`. On a device the answer has no `place` key, and `guide.GuideData` is unchanged.
- kit: the bar draws `place`: first `a.kit-bar-ws`, the workspace's name linking to `home` (with " ›" after it), then `span.kit-bar-switch`, one link per tool with the page's tool filled in (`.on`, `aria-current="page"`); both links open in the top window. When the page's tool is in the switch its brand is hidden, the filled tool taking its place; a tool outside it (cull on a machine) keeps its brand after the switch. On a phone the workspace goes into the bar's ⋯ and the switch stays; beside a brand that shows, the switch gives way and scrolls sideways like the sections, so the primary stays whole. On a device both stay hidden and the bar draws as before.
- kit: the bar fetches the guide once for the beta mark and the place (`guideForBar`, `markIfBeta` in `guide.js`; `badgeIfBeta` keeps its signature). `bar` takes `guideUrl` (tests; `/api/kit/guide` by default) and its handle has `place`, a promise that settles once the place is drawn or known absent. `GuideData` in `kit.d.ts` gains `place?: GuidePlace`.
- `PAGE-STANDARD.md`: a row for the workspace and the switch; the layout skill's Bar and Phone rows say the same.

## 0.127.0

### Added
- kit: `card({ stack: true })` gives its body the class `kit-stack`: 12px between the body's parts, paragraphs with no margins of their own, and a fold's label without its own 22px above. A hidden part leaves no gap (`.kit-card-body.kit-stack > :not([hidden]) ~ *`). A card without `stack` draws as before.
- kit: a `.kit-input` in a `.kit-next` row grows into the room the row's other parts leave, down to a 220px basis, then the row wraps (`flex: 1 1 220px; width: auto; min-width: 0`): a search beside a count and a button on one line.
- kit: `tick({ label, checked, value, onChange })` in `dom.js` returns `{ el, input }`: a checkbox and its words in one `label.kit-tick` (`inline-flex`, 8px gap, centred), so the box sits on the words' middle. The class alone works on a hand-made label.
- `PAGE-STANDARD.md`: a row for the three.

## 0.126.0

### Fixed
- kit: `[hidden]` always hides. `kit.css` has one rule near its top, `[hidden] { display: none !important; }`, so a part with a display of its own (a `cardLine`, which is flex) no longer shows while it carries `hidden`; before, a hidden card line, such as a search's non-matching row, still drew. The per-part rules that did the same for one part each (`.kit-ctl`, `.kit-live`, `.kit-primary`, `.kit-bar-tray`, `.kit-also`, `.kit-pick-pop > [hidden]`, `.kit-row-pop`, `.kit-needs`, `.kit-spot-ring`, `.kit-spot-card`, `.kit-spot-acts`, `.kit-grow`) are gone. The bar's rule that hides its sections when all their children are hidden stays. A tool's own rule that shows an element carrying `hidden` no longer can: take `hidden` off it instead.

## 0.125.0

### Added
- `localweb/page/build/test-kit.mjs`: a node loader, run as `node --import ./build/test-kit.mjs`, that resolves each `/_kit/<file>` import to the page kit's file in the tools-common module the tool's `go.mod` pins (found with `go list -m`), as serve does for the page. A tool's node tests, probes and gates of modules that import `/_kit/kit.js` run on the kit itself. Taken from diazo's `web/test-kit.mjs`; a tool's build copies it like the other `build/` files.

### Changed
- kit: the comments in `share.js`, `share.css` and `kit.d.ts` no longer say galley bundles `share.js` alone without `kit.css`: every page takes it from `/_kit/kit.js`, styled by `share.css` through `kit.css`.

## 0.124.0

### Added
- kit: `sortedList` takes `pick: { selection, id(item) }`: each row (class `kit-pickrow`, `sel` while ticked) starts with the kit's tick box (`span.kit-box`, role `checkbox`), bound to a `createSelection` store by `id(item)`. Each group's head gets a box between its grip and its fold, and with no groups the card opens with a `div.kit-group-line` holding one box and then `title`'s heading; a head's box ticks every row under it, or unticks them all when all are, and reads `aria-checked="mixed"` while only some are. A press on a box neither opens a row nor folds a group. Shift-click on a row's box sets the rows showing from the store's anchor to it (a folded group's rows are left out). Ticks are kept by id across presses and `set`, and after each draw an id no item drawn has is deselected. The kit adds no actions: the page reads `selection.ids()`.
- kit: `sortedList` takes `groupings: [{ value, label, groups }]` (`groups: null` for one card): a group switch (`sortSwitch` labelled group) before the sort switch, over the cards or, given a band, in its sort place, which is then `div.kit-band-sorts` holding `div.kit-band-sort.kit-band-group` (the chips and their own compact picker for a phone) and the sort's `div.kit-band-sort`. A press regroups in place as `set(items, groups)` does, keeping the sort, each grouping's kept order and folds, and the ticks; the sort reads "sort in groups" while the grouping chosen has groups. The choice is remembered under `<name>.group`, the first grouping when none is or the one remembered is gone. With `groupings`, `groups` is ignored, in the call and in `set`.
- A `sortedList` given neither draws exactly as before.

### Changed
- `PAGE-STANDARD.md`: the front-page rule lets a list offer several groupings on a group switch before the sort in the band's sort place, one of which may be by a left-column filter, since the reader chooses it (`sortedList`'s `groupings`). The layout skill's second line's end says the same.
- `PAGE-STANDARD.md`: a new rule says picking several rows of a front page's list is the list's tick boxes (`sortedList`'s `pick`), with the actions on what is picked in the band (the main one a fold entry at the end of the title line, the rest in the band's ⋯), never in a toolbar over the list. The layout skill's middle column and its list of what never goes where say the same.

## 0.123.0

### Added
- guide: entries for billet (beta) and imprint, so their pages' Guide content, billet's beta mark and the using-the-tools skill know them. Both join `guide.Family`.

## 0.122.0

### Added
- `claudeplugin`: `Spec.NoMod` renders a plugin with its manifest and `.mcp.json` and no mod, for a tool that has tools and no page or events: no `hooks/hooks.json`, no `hooks/register.js`, and nothing runs `<bin> watch`. `AssertCurrent` on such a spec also fails when the plugin's directory holds a `hooks` directory, which Claude Code would load. A spec without `NoMod` renders byte for byte as before.

## 0.121.0

### Changed
- kit: the band moves its fold into its ⋯ on any width where the title would go under its floor with the fold on the line, not only on a phone. The floor is 320px, or the title's own width when shorter. A band with fold entries on the page watches its title line (a ResizeObserver, and its window's resize) and its fold's nodes (a MutationObserver, for a control such as Cancel coming or going inside one with no setter), and measures again on each setter; short of room it is `header.kit-band.kit-band-folded`: the fold and an end fold hide, their items show first in the ⋯, and a ⋯ that holds only them shows, as on a phone. It unfolds as soon as the fold fits again, at the same width it folded, so a short title keeps its controls on the line where a long title loses them. A band taken off the page stops watching; one put on the page watches from a microtask after it was made or set, or from its next setter. The phone rules are as they were.
- kit: `span.kit-band-fold` beside the title is `display: contents`: its nodes are laid out on the title line itself, each whole (`flex: none`), so the fold's box can no longer shrink past what it holds. A tool's own rules on `.kit-band-fold`'s box (`flex`, `min-width`, `margin-left`) no longer apply; put them on its nodes. The end fold keeps its box.

### Added
- kit: a `band()` fold entry takes `shrink: true`: its node (class `kit-band-shrink`) gives way with an ellipsis, down to nothing, after what is beside the title and the search and before the title. The order things give way on the title line is now: the last beside node, the search to 96px, the shrink fold entries, then the title to its floor.

## 0.120.0

### Changed
- `update` (`SelfUpdate`) installs a release only when its signed receipt verifies. Beside the file and its `.sha256` it fetches `<file>.receipt` and `<file>.receipt.sig`, and the receipt must be signed by one of the two keys the family trusts (the release key, or the offline backup key) and name this tool, this version, this file and its checksum. When `latest` is older than the running version (an rc is older than its final version), as for an rc or a local build ahead of the latest release, it installs nothing, prints `<tool> <version> is newer than the latest release <latest>; nothing to do` and exits 0, where before it replaced the running binary with the older release; `SelfUpdate` then returns `false` and the latest release's version. A dev build always updates. On macOS it refuses a binary that is not signed by the family's Apple Developer ID. A refusal is one line, `<tool> update: update refused: <which check failed>`, and leaves the running binary as it was. Nothing skips a check. A release that publishes no receipts can no longer be installed by `update`.

- `update` takes the binary out of a release's tarball only as a regular, non-empty file named exactly `<tool>`. A release packed any other way (the binary in a directory, a link, an empty file) is refused with `update refused: the download holds no regular file named "<tool>"` or `update refused: the file "<tool>" in the download is empty`, where before the first entry with that base name was installed, whatever it was.

### Added
- `receipt`: `Check` and `Verify` (a release file against its signed receipt), `Older` (the downgrade rule), `Extract` (the binary out of a release's tarball) and `CheckSigner` (the macOS Developer ID check), for kempt, which installs the other tools.

## 0.119.0

### Changed
- kit: on a phone (640px or less) the top bar keeps one 52px line in every tool. Its status, the also-open switcher, the live pill, Guide and theme move into one bar ⋯ before the primary, each still working from there, and go back whenever the ⋯ closes (the bar leaving the page or the window growing past 640px included). The section buttons keep their whole labels, in a `span.kit-bar-sections` (no box of its own wider than a phone) that scrolls sideways when they don't fit; nothing is past the window's edge. Wider, the bar is as before.
- kit: the right column's tabs (`railTabs`) start 16px under the band, as a thread's first label does, with the column's hide toggle on their line (they were 41px under it).
- kit: the band's title is the last thing on its line to shrink: what is beside it gives way first, then the search, down to 96px. The search is 240px wide when there is room, and the band's ⋯ has the bordered control look. `.kit-band-end` is `display: contents`.
- kit: a left section whose label has an action puts its label 16px under the band, the action centred on its line (it was 20.5px).

### Added
- kit: `popOut` takes `onClose`, which hears every close, quiet ones included.
- kit: a `band()` fold entry takes `at: 'end'` to sit in the title line's end place on a wide page; on a phone it is in the band's ⋯, as other fold entries are.

## 0.117.0

### Added
- kit: one page layout for every tool, so changing screens moves nothing. `band()` is 104px at every width, a phone included, and gains named places: `end` (the title line's right end), `search` (a field there), `underEnd` and `sort` (the second line's right end), `fold` (title-line nodes that move into the band's one ⋯ on a phone, each with the menu item it becomes) and `menu`, with setters to match. A band given none of them draws what it drew before.
- kit: `sortedList({ band })` puts its sort switch in the band's sort place, a compact picker on a phone, instead of over its cards.
- kit: `frame()`'s handle has `wide(on)`: the middle column runs over the right column's space, the band and the left column unchanged.
- kit: the mockup starter at `/_kit/layout/`: the bar, the band and the columns drawn with the kit's classes, each place labelled, as a front page (`?page=front`) or an item page.
- guide: a third family skill, `laying-out-a-page`, installed by every tool: where each thing on a page goes and the kit part that puts it there.
- PAGE-STANDARD.md: the layout's rules, and a Layout column in Where each server stands.

### Changed
- kit: every middle-column card has the kit's shape (14px by 16px padding, 8px corner) and one cap, 1100px, left-aligned; the two separate 1100px rules are one. A side column's first label sits 16px under the band (the thread's moves from 14px). `.kit-band` keeps its height with `overflow: hidden`.

## 0.116.1

### Fixed
- kit: the frame's centre column (`.kit-mid`) is `position: relative`, as its side columns are. A `.kit-label-hidden` inside it (a `pickField` or `chipPick` with `labelHidden`) was placed against the page, so on a long view the document grew and scrolled while the column did not. Found putting proj's Settings in the frame: 11 hidden labels made the document scroll 329px.

## 0.116.0

### Added
- kit: `bar`'s handle has `setSections(sections, active?)`, which redraws the section buttons in place: between the brand and the status text, with the same `kit-ctl` look and the bar's `onSection`, so one bar kept across pages can show Plans · Later on one page and Plan · Record on another. `active` is the button that is on (none without it). The new buttons keep `setSectionsShown`'s state, and `setSection` and `setCount` act on them. Nothing else in the bar is redrawn: the brand and every control right of the status keep their nodes and their place.

## 0.115.1

### Fixed
- kit: on a phone (640px or less) a `settingLine` with a control gives its name all of the first row that the side does not take. Before, the control under the name put its own least width into the side's column, so a name could be cut with room beside it: "Claude Code permissions" read "Claude Code p…" over a dropdown with a long choice and no side. Now, with no side the name has the whole row; with a side it has the row less the actions, and the meta takes what the name leaves, cut with an ellipsis. The line's height is the same with a side and without, as before. The wide layout, a line with no control and `cardLine` are unchanged.

## 0.115.0

### Added
- kit: `settingLine({ name, hint?, control?, meta?, actions?, id? })`, the line a settings card is made of: a card line (`div.kit-card-line.kit-setting-line`, with cardLine's rule, paddings and type) whose height is the same with a meta or actions and without, at every width, so nothing under it moves when "changed here · Reset" appears or goes. Its children are `span.kit-setting-line-name` (holding `span.kit-setting-line-label` and, with a hint, `small.kit-setting-line-hint`), `span.kit-setting-line-control` when there is a control (the line then carries `with-control`), and `span.kit-card-line-side.kit-setting-line-side` when there is a meta or an action (`small.kit-card-line-meta`, then `span.kit-setting-line-acts` holding the `button.kit-card-line-act`s). Wide, with a control, it is one row: the name in a 200px first column (`--kit-setting-name`) so the controls of consecutive lines share a left edge, the control at most 320px wide (`--kit-setting-control`), the side at the right end. When the window is 640px wide or less (the kit's phone breakpoint) the name and the side share the first row and the control is under them at full width. The side never goes under the control: its actions keep their width, and its meta takes the room left, cut with an ellipsis with its whole text in `title`. The name is one line, cut with an ellipsis when it doesn't fit, with its whole text in `title`. With no control the name and the side share one row at every width, and actions that don't fit beside the name go under it (and wrap there if the card is narrower than they are), whatever the meta. A control with no name of its own (the control when it is an input, select, textarea, button or has a `role`, else the one input, select or textarea inside it, with no `aria-label`, `aria-labelledby` or `label`) is named by the setting's name through `aria-labelledby`; a pickField, chipPick or textField keeps its own label. Shown on the demo page's `?view=page`, and a rule in `PAGE-STANDARD.md`.
- kit: a `cardLine` or `settingLine` action takes `data: { action: 'clear-setting' }`, set as `data-*` attributes on its button, so a page no longer tags the buttons after building the line. `cardLine` draws exactly what it drew before for what it was given before.

## 0.114.0

### Changed
- kit: the stage track and the status pills draw as one joined bar. `stageTrack` puts its stages in `span.kit-stages-bar` inside `nav.kit-stages`: no `.kit-arrow` spans between them and no gaps, one border and a 6px radius round the segments with a hairline between them. Done segments are green with ✓, `now` is filled in the signal colour, `now.other` is outlined on a tint, `flagged` keeps its agent tint, `live` keeps its dot, and `.parked` greys the segments as before. A caller's element in `stages` takes its place in the bar; `after` follows the bar on the line after a gap. On a narrow page the bar wraps onto a second line with every border kept, and in a `band`'s under line on a phone (640px or less) it wraps instead of scrolling. `statusPills` draws in the same bar and writes its count after a dot, `Open · 8` (`span.kit-pill-n` now holds ` · 8`, with no margin of its own). Classes, `data-stage`/`data-value`, `aria-current`/`aria-pressed`, the buttons and the ⓘ tips are as they were. What a page that uses them sees: the new look on its next kit bump, and a page that read `nav.kit-stages`'s children directly finds the stages one level down, in `.kit-stages-bar`. `.kit-arrow` keeps its muted colour for a caller that draws its own.

### Added
- kit: `sortedList` takes `groups: { name, key(item) → { key, label }, order, uncounted?, folded? }`. With it the list draws the sort switch, then one folding `section.kit-card.kit-group` per group with rows, in the kept order, rows sorted inside each by the chosen order. Each heading (`div.kit-group-line`) has a drag grip (`span.kit-group-grip`, ⠿), the fold (`button.kit-group-head`) reading `label · n` (no count for a key in `uncounted`) and a `rowMenu` ⋯ with Move up, Move down, Move to top and Reset order, each with a detail line naming where the group goes. A drag or a move redraws in the new order and keeps it under `<listname>.order.<groups.name>` (a JSON array, removed when it equals the default); Reset order removes it. A kept key that no longer exists is left out of what is drawn, but never from what is kept: a move keeps each group a filter hides in its kept place; a key of `order` missing from the kept order goes right after the key before it in `order`, and keys `order` doesn't name follow the rest, A to Z. A group with no rows is hidden and keeps its place. Folds are kept under `<listname>.folded.<key>` (`'1'` folded, `''` open); a key in `groups.folded` starts folded while nothing is kept. `set(items, groups?)` redraws with new items and, when given, another grouping with its own kept order, keeping the sort. Without `groups` the list draws exactly as before. Shown on the demo page's `?view=parts`.

## 0.113.0

### Added
- kit: `viewer.js`, the ⤢ "see it bigger" viewer ported from diazo's (without its mockup frames). `zoomable(holder, pic, caption, { markOnly })` puts a `button.kit-grow` ⤢ on the holder's top-right corner and returns it, so a page can hide it (`mark.hidden`) while it isn't wanted; with `markOnly` only the mark opens the viewer and a click on the holder stays the holder's. `viewer(el, caption, back)` covers the window (`.kit-viewer`, dark backdrop) with the caption and a Close button: an SVG or image fills the window, and any other element (a table) is deep-copied, without ids or `contenteditable`, onto a white panel at most the window's width that scrolls both ways. Close, Esc or a click outside the picture closes it and returns focus to `back`. For galley's wide tables; diazo moving onto it is a follow-up.

## 0.112.0

### Added
- kit: `pickField` takes `size: 'compact'`, the dropdown for a bar or a band: the field carries `kit-pick-compact` and its button is 28px high with 12px words and no padding above or below. The menu's rows are an ordinary dropdown's. The button is as wide as the field, so the page gives the field (`el`) its width. Left out, nothing changes.
- kit: `pickField` takes `reads`, what the button shows instead of the current choice's label: a string, or a function `(choice) => string` given the current choice (`undefined` when the value is none of the choices). It is asked at the start and again on every pick and every `set(value)`, so `set(field.value)` reads again; the arrows move the focus and change no words. With `reads` the button's `title` is always those words in full, set again on every pick and `set` (a page's own `title` on the button would be replaced), and the button is named by its label then those words (`aria-labelledby` the label and `span.kit-pick-label`, both given ids by the kit). The menu reads each choice's own label. Without `reads` the button has no `title` and no `aria-labelledby`, as before.
- kit: `pickField` takes `onCurrent(value)`: a press, Enter or Space on the choice that is already the current one calls it once, after the menu has closed and the button has the focus back; `onPick` is not called. Without it that press closes the menu and calls nothing, as before.

## 0.111.0

### Added
- kit: `.kit-progress`, a thin bar (5px, `--kit-line` track, 3px radius, 160px wide, inline-block) whose filled part is an inner `i` (`--kit-ok`); the caller sets its width inline (`<span class="kit-progress"><i style="width:28%"></i></span>`). Shown on the demo page's `?view=page`.

## 0.110.0

### Changed
- kit: `rowMenu`'s menu opens in the top layer, placed from its ⋯ button the way `pickField`'s is, so opening or closing it moves nothing on the page. Before, the menu hung inside the page: near the foot it made the page longer and `rowMenu` then scrolled it into view (a pane's menu at the foot of proj's Settings moved everything up 158px). What a page that uses `rowMenu` sees after this release:
  - Nothing to change in its calls: the options, the items (`detail`, `{ heading }`, links, separators, disabled), `onMenu`, `open` and `buttonClass` are as they were, and so is the markup (`div.kit-row-menu` holding the ⋯ button and `div.kit-row-pop`, which has `hidden` while closed). One pop-out is open at a time; a press outside or Esc closes it. The menu's width is what it had inside the wrapper: 140px at least, no wider than the wrapper unless a word needs it, and `min(340px, 100vw - 16px)` at most with details.
  - `.kit-row-pop` now carries `popover="manual"` and is `position: fixed` in the top layer, over any card, sheet or `overflow` that clipped it before. Opening it no longer changes the page's height or scroll position; `rowMenu` no longer calls `scrollIntoView`.
  - It hangs 4px below the ⋯ button on the button's right edge, as before (it was 4px below the wrapper, which in a block wrapper is a pixel or two lower). New: when the right edge would run it past the window's left it goes on the button's left edge (neither fitting, the edge with more room, wrapped); when it does not fit below and there is more room above, it opens above the button; it is never taller than the room and scrolls inside itself. It follows its button when the page or a container scrolls and when the window is resized.
  - `rowMenu` sets `top`, `left`, `right`, `bottom`, `width`, `max-width` and `max-height` on the menu's style, so a page's own CSS for those on `.kit-row-pop` no longer has an effect (`min-width` and the rest still do). A page that left-aligned a menu with `left: 0; right: auto` gets it on the button's right edge wherever that fits.
  - A menu drawn with `open` before it is in the page shows a moment after it is added (a microtask, before the page is next drawn), not in the same call; `hidden` is off at once, as before, and a focus given to one of its items as soon as the row is in lands as before.
  - An open menu whose row is taken off the page with no replacement closes; `onMenu` is not told.
- kit: `popOut` takes `place(e?)`: called once the pop shows, and again when the window is resized or anything but the pop scrolls. A pop with the `popover` attribute opened before it is in the page, or put back in the page after being moved, shows in the top layer once it is there. `pickField` places its menu through it, unchanged, and a `pickField` menu whose field is moved in the page while open is shown again at its button (before, the browser dropped it from the top layer and it stayed open but not drawn). An open pop taken off the page and not put back by the end of that change is closed quietly (no `onToggle`), and its scroll, resize, click and key listeners go with it. A top-layer pop opened before it is in the page is an ordinary fixed, undrawn element until it is (its `popover` attribute is off for that moment), so a focus the caller gives one of its lines as soon as the row is in lands.
- kit: a walk's ring and note (`.kit-spot-ring`, `.kit-spot-card`, the intro and end cards) and the tour's overlay (`.kit-tour`) carry `popover="manual"` and show in the top layer, so they stay above an open row menu or dropdown (which would otherwise cover them, being in the top layer themselves) and above a sheet; `popOut` puts them in again when a menu opens after them, keeping their focus and scroll. Their API, placing and pointer behaviour are as before: the ring lets a press through, the tour's overlay takes every one.

### Added
- kit: `placePop(btn, pop, { right? })`, the placement `pickField` and `rowMenu` share: a top-layer pop 4px below its button, or above it when there is more room above, never taller than the room. The default is `pickField`'s (the button's left edge first, within the nearest card or sheet, never narrower than the button); `right` is a row menu's (the button's right edge first, within the window).

## 0.109.0

### Added
- kit: `confirm({ title, body, action: { label, tone }, run, disabled? })`, a `sheet` that asks one question: the title asks it, the body (text or a node) says what it does, then the action button (tone `danger` or `fill`) and Cancel. Focus starts on the action. Esc, a backdrop click or Cancel closes it with `run` not called. Pressing the action disables it and awaits `run()`: a resolved promise closes the sheet; a rejected one shows its message in the sheet's `.kit-sheet-error`, enables the action again and keeps the sheet open. `disabled` starts the action off; the handle's `setDisabled(boolean)` turns it off and on (it stays off while `run` runs), and `close()` closes it.

## 0.108.0

### Added
- kit: `chipPick({ label, chips, chosen, many?, labelHidden?, onToggle, onRemove? })`, a group of chips to choose from, named by its label (`div.kit-chip-pick`, role group): one `button.kit-chip` per chip (`{ value, label, remove? }`), those in `chosen` on with `aria-pressed`. One-of (the default): a press on the chip that is on does nothing, a press on another calls `onToggle(value)`. `many`: every press calls `onToggle(value)`. A chip with `remove` gets a ✕ button beside it (`button.kit-chip-x`, a sibling of the chip's button, named by `remove`) that calls `onRemove(value)`. The caller keeps the state and redraws; when the press had the focus and the group is redrawn during it, the chip pressed gets the focus back. It returns the element.
- kit: `pickField` takes `more: { label, choices }`: the menu ends with one line reading the label, under a rule, that the arrows reach like a choice. A press, Enter or Space on it picks nothing and leaves the menu open: the line is replaced by `more.choices`, the menu is placed again and the focus goes to the first of them. The menu opens collapsed every time, unless the current value is only in `more.choices`, when it opens on the longer list so the current choice is in the menu. `value` and `set(value)` take a value from `more.choices`. With `more.choices` empty no line is drawn.
- kit: `pickField` and `chipPick` take `labelHidden`: the label stays in the page for a screen reader (`kit-label-hidden`) and is not drawn, for a grid or a table cell that already names the control.

## 0.107.0

### Changed
- guide: a core tool lists at least 2 asks, with no maximum (it was 2 to 4); the page's render tests still catch an ask list that overflows at desktop or phone width.
- guide: diazo's section names its three kinds: a feature (what should we build?), an investigation (why does this happen?) and a system design (what could this be?), with an ask for each, how to pick the kind or let the agent, and a When to skip line that no longer says diazo isn't for exploring an idea.

## 0.106.0

### Added
- kit: `rowMenu` items may carry a `detail`, a muted line under the label (`<span class="kit-row-detail">`, drawn like `pickField`'s choice detail), on buttons and links alike; a menu holding any caps its width at `min(340px, 100vw - 16px)` so the lines wrap on a phone. `{ heading: '...' }` is a heading over the items after it: a `<div class="kit-row-head" role="presentation">` in a small muted mono label, not a menuitem and never focused, and a press on it leaves the menu open. An item with no `detail` draws as before. `kit.d.ts` adds `detail?` to `RowMenuButton` and `RowMenuLink` and `RowMenuHeading` to the `RowMenuItem` union.

## 0.105.0

### Added
- channelmcp: `Outside(source, author, text)` marks text that someone outside the session wrote (a pull request's title or body, an issue, a label) as data. It returns the text inside `<outside-text source="..." author="...">` and `</outside-text>`, under a line saying that someone outside the session wrote it and that it is data to read, not instructions to follow. The text cannot end the block or open another: the `<` of `<outside-text` or `</outside-text` inside it (any case, spaces around the slash) becomes `&lt;`; in the source and the author `<`, `>` and `"` are escaped and a line break becomes a space. Empty text gives the empty string.

## 0.104.0

### Added
- kit: `pickField({ label, choices, value?, id?, onPick? })`, the kit's dropdown: a label over a button drawn as `kit-input` with a chevron, naming the current choice, that opens the row menu's surface (`kit-row-pop`) listing each choice (`{ value, label, detail?, blank? }`) with its muted detail line and the current one in the soft signal fill; a `blank` choice (one that stands for nothing picked yet) reads muted on the button. The menu shows in the top layer, so no card or sheet clips it: 4px below the button on its left edge, or its right edge when the left would run past the nearest card, sheet or window, never narrower than the button; above the button when there is more room above, and capped to the window's room with the menu scrolling inside, the focused choice kept in view. Enter, Space or an arrow opens it on the current choice, arrows move, Enter, Space or a press picks, Esc closes it (and not the sheet it is in) and returns the focus to the button; a press outside closes it. `onPick` hears a changed value; it returns `{ el, button, value, set(value) }`.
- kit: `popOut({ wrap, btn, pop, onToggle? })`, the open and close of a button's pop-out that `rowMenu` and `pickField` share: one pop-out open on the page at a time, closed by a press outside or Esc; a `pop` with the `popover` attribute shows in the top layer.

### Changed
- kit: `rowMenu` opens and closes through `popOut`; what it does is unchanged, and opening a `pickField` closes an open row menu (and the other way round).

## 0.103.1

### Fixed
- pageserve: `Process.Start` runs serve in a session of its own (`Setsid`, was `Setpgid`), so a serve started from a session's channel no longer keeps that session's controlling terminal. An interactive shell serve ran could try to take the terminal and fail (`can't set tty pgrp`), and closing the terminal sent serve a SIGHUP.

## 0.103.0

### Added
- kit: `sortSwitch({ orders, chosen, onPick, label? })`, the line over a list that orders it: the muted label (`sort`), then one `.kit-chip` per order, the chosen one on. The caller keeps the choice and redraws. Its look is proj's Saved view's sort line, under `kit-sort` names.
- kit: `sortedList({ name, orders, items, row, empty, label?, title? })`, the sort switch over one card of rows in the chosen order (each order with its `compare`), or the empty line with none. The choice is remembered under `<name>.sort`, the first order by default; it returns `{ el, set(items) }`. An optional `title(n)` heads the card (`.kit-label.kit-group-head`) for the n rows shown, redrawn on every press and `set`. After a press with the focus in the switch, the redrawn switch's chosen chip has it, as it does for a caller of `sortSwitch` that redraws at once.
- kit: `indexRow`'s `place`, a muted line of its own between the title and the meta (`.kit-meta.kit-place`), saying where the row lives.
- kit: `indexRow`'s `found` (a node or text), a line of its own inside the row's button after the meta (`.kit-found`, 12px, muted), saying where a search matched; a `<mark>` in it has the signal-soft ground.
- kit: `filterRow` items take `subs`, rows of their own drawn indented (`li.kit-sub`) right after their item while it or one of them is chosen. All counts the top items only; one level only; with no `subs` the rows are as before.

### Changed
- PAGE-STANDARD: a front page whose left column filters shows one list in the sort switch's order, each row naming its place; folding groups only group by something the left column doesn't filter.

## 0.102.0

### Changed
- kit: a beta tool's mark is the kit's muted meta text, " · beta" (`.kit-meta`), after its name in the bar, its Guide heading and its pick in the Guide's side list, and nothing more. `betaMark()` replaces `betaBadge(small)`; the `.kit-beta` tag and its amber are gone, and so is the Guide's "‹tool› is beta: it works, but it is still changing." line (`.kit-guide-beta`).

### Added
- kit: `BarHandle.beta`, a promise that settles once the bar has asked the guide whether the page's tool is beta.

## 0.101.1

### Fixed
- kit: the bar asks for the guide (for the beta badge) only on a page served over http(s). A downloaded Record opened from disk asked for file:///api/kit/guide, which the browser logs as a console error. `badgeIfBeta(el, { url, protocol })` takes an options object.

## 0.101.0

### Added
- guide: an optional `beta: true` in a tool's front matter, parsed into `Tool.Beta` and carried to the Guide data as `beta`. casebook, sift, cull and muda are beta; a test pins exactly those four.
- kit: the bar puts a `.kit-beta` badge after the tool's name when the guide data says the page's tool is beta (`badgeIfBeta`, which loads /api/kit/guide; no entry or no guide draws nothing). The Guide tab badges a beta tool's heading, opens its section with "‹tool› is beta: it works, but it is still changing.", and puts the small badge (`.kit-beta.sm`) beside beta tools in its side list. One amber outlined tag, lower case, the same for every tool.
- using-the-tools skill: "(beta)" after a beta tool's name, and a line telling the agent to say a tool is beta the first time it introduces it.

## 0.100.2

### Fixed
- kit: the bar fits a phone. At 640px or less it is tighter (6px apart, 12px sideways padding, 8px inside its controls, 12px inside the primary) and an empty status takes no room, so the brand, Guide, theme, a menu and the primary sit on one line at 390px; the primary was cut off at the right edge.

## 0.100.1

### Fixed
- kit: on the app grid the band is placed in row 2 and every other child after the bar in the last row, so a band appended after the columns still sits right under the bar and the columns start under it (on wide pages as on narrow ones).
- kit: the last item beside the band's title shrinks first, with an ellipsis, so a long email beside a title on a phone keeps the title whole and ends inside the band's edge.
- kit: frame's centre (`.kit-mid`) is always the app grid's middle column, so a page with no left column (a centre and a band only) gets the full width instead of the narrow first column.

## 0.100.0

### Added
- kit: `band({ title, beside, under })` in dom.js, the strip under the bar with the page's title, copied from diazo's: an 18px bold `h1.kit-band-title` (line height 1.3, letter-spacing -0.01em, ellipsis on one line), `beside` nodes on its 28px line 12px apart (a state pill, a size, an email), and `under` a 28px row 12px below (a stage track, filter pills, a back link), on the panel ground with 16px 24px padding (12px sideways at 640px or less) over a hairline. With a row under it the band is 104px high, as diazo's is. A pill, stage or working line in it is 24px. On the app grid it spans every column and the columns start under it. `setTitle`, `setBeside` and `setUnder` change one part in place; an empty `beside` or `under` draws no container.
- kit: `indexRow` takes `mark` (✓, ●, ○, ✕) and `markState` (`done`, `now`, `later`, `fail`): a `kit-index-mark` before the title in the ok, signal, muted or danger colour, the meta lined up under the title. A row without a mark draws as before.
- kit: `cardLine({ main, meta, actions })`, one line in a card: its words left, small mono meta and link-buttons right (`danger`, `disabled`, `title` as its aria-label), a rule between lines. `textField({ label, value, placeholder, mono, hint, id, onInput })` returns `{ el, input }`: a mono label over a text input in the kit's tokens, with an optional hint. `confirmBox({ tone, body, buttons })`, a signal (default) or danger tinted box with its words and a button row. `emptyCard({ text, action })`, a centred line of muted words and one button. Sized from billet's own `bl-line`, `bl-field`, `bl-input`, `bl-confirm`, `bl-zone` and `bl-empty`.
- kit: `keyedRows(container, { key, draw, update })` keeps a list's rows by key: `set(items)` draws new keys, removes gone ones, calls `update(row, item)` only for an item whose data (as JSON) changed, and moves rows into order (with `moveBefore` where the browser has it), so an open menu, details or input in an unchanged row is never replaced. Without `update` a changed row is drawn anew in its place. `get(key)` returns a row.
- kit demo: `?view=page`, a page in the family shape with the band, a marked step list and the new card parts.

## 0.99.0

### Changed
- auth: the setup line names the account page's **Set up a machine** (it was Add or sign in a machine, a button the page no longer has): `SetupLine`, so `ErrNotSignedIn`, `ErrSignInRefused` and `login`'s output, and `login`'s help.

## 0.98.0

### Changed
- kit: `live()` holds its stream only while the page is visible and shown. proj's split page now posts `{type: "kit.shown", shown}` to each tab's frame when it loads and when the selection changes, and `live()` takes it from its parent window only: an unselected split tab takes the hidden-tab path (closes its stream, checks in once a minute, reopens from its cursor when selected), so split tabs no longer use up the browser's six connections to a tool. A page never told counts as shown. `LiveOptions` types the injectable `document` and `window`.

## 0.97.0

### Added
- kit: `rowMenu` items may be links, separators or disabled: an item with `href` is an `<a role="menuitem">` styled like the buttons (keeping `data-action` and `data-walk`; `run` is optional and runs once the menu closes), `{ separator: true }` is an `<hr role="separator">`, and a `disabled` button reads muted and never runs. `kit.d.ts` types `RowMenuItem` as the union `RowMenuButton | RowMenuLink | RowMenuSeparator`.
- kit: `rowMenu({ open: true })` draws the menu already open, as the one open menu on the page (closing any other, with outside press and Esc wired), without scrolling it into view or taking focus, so a caller that redraws its rows keeps an open menu open; `onMenu` hears only its closing. `buttonClass` replaces `kit-row-more` on the ⋯ button (for example `kit-ctl` for a header's bordered look).

## 0.96.0

### Added
- pageserve: `PageURL(tool, url)`, the address a tool hands out for a page of its loopback server (the URL `OnStart` and `Ready` get, or one under it): with `PAGE_PUBLIC_DOMAIN` set, the tool's public origin with the URL's path and query, token and all; unset, the URL unchanged. Run's entry URL is built with it. A tool keeps the loopback URL for its own calls on the machine.

## 0.95.0

### Added
- kit: `rowMenu({ label, items, onMenu })` in frontpage.js, moved from diazo's front page: a row's ⋯ button (`aria-label` the label, `aria-haspopup="menu"`, `aria-expanded`) and its `role="menu"` pop-out, hidden until pressed. Items are `{ label, run, danger?, action?, walk? }`, each a `role="menuitem"` button; `action` and `walk` become `data-action` and `data-walk`, and a `danger` one reads in `--kit-danger`. A press on an item closes the menu, then runs it; a press outside or Esc closes it, and one menu is open on the page at a time. Styled by `kit-row-menu`, `kit-row-more` and `kit-row-pop`.

## 0.94.0

### Added
- kit: `sheet()` takes `canDismiss`, asked before Esc or a backdrop click closes the sheet; when it returns false the sheet stays open (a draft to keep). `close()`, and so every button that calls it, still always closes. A sheet without it closes as before.
- kit: a sheet with actions ends its button row with an error spot, an empty `<p class="kit-sheet-error" role="alert">`, and the handle gains `error(msg)`: a message shows it in 12px mono danger text beside the buttons, an empty or missing one clears it. Empty it adds no height, and a one-line message doesn't change the sheet's height. `buttons()` is unchanged for other callers.

## 0.93.0

### Changed
- **Breaking:** login: `login` no longer signs a machine in. The device-code sign-in is gone (`auth.Client.Login`, `auth.Client.LoginWait`, the `pending` file, the `/machine/start` and `/machine/poll` calls, `Client.Sleep`, and `login`'s `--name` and `--wait` flags). `login` now prints `This machine isn't signed in to subaud.tools. Get your setup line at https://subaud.tools/account/ (Add or sign in a machine) and paste it in a terminal on this machine.` and exits 1, or, on a machine that keeps a token, says it is signed in and how to sign it in again (exit 0); any argument is a usage error (exit 2). The setup line from the account page is the one way to sign a machine in.
- auth: `ErrNotSignedIn` and `ErrSignInRefused` say the same (refused: `subaud.tools refused this machine's sign-in.` then the same pointer), exported as `auth.SetupLine`; `update` on a gated tool returns them as they are instead of naming `<tool> login`. `logout` and `Link` don't change. New: `auth.Client.SignedIn`.

## 0.92.0

### Changed
- kit: after a successful Sign in again, the pill reads `Opened a signed-in tab.` and the page checks `GET /api/poll` once a second for up to a minute; the new tab's sign-in sets the cookie for the whole browser. On the first answer that isn't 401 (localweb checks the token before routing, so a tool without `/api/poll` answers 404 once signed in) the page calls `window.close()`, and reloads when it is still open a moment later (the browser refused, or it is inside a frame). After a minute of 401s or network errors the line reads `Opened a signed-in tab. You can close this one.` A failed press shows its failure line and checks nothing. `bar`'s `signIn` option swaps the fetch, timer, close and reload it uses (tests).

## 0.91.0

### Added
- localweb: `POST /signin` opens a signed-in tab of a signed-out page. It needs the page's own Origin, takes the page's path, and calls `Config.Open` (the system opener when nil) with that page and `t=<token>`; the token never appears in a response or a cookie. It refuses a page off this host (including encoded `//` and backslashes), under `/api/`, or `/signin` itself. pageserve passes `Options.Open`, else the tool's `Commands.Open`, else the system opener.
- kit: a 401 (`setLive('stale')` with no text) now shows `signed out` with a Sign in again button, whatever the tool's staleText; after the press it says a signed-in tab opened. Since the token is kept across restarts, a 401 means the page's sign-in no longer matches, not that the server restarted. live() still reports `stale` on a 401; the newer-build notice (`setLive('stale', text)`) is unchanged.

### Fixed
- localweb: the `?t=` sign-in redirect can no longer point at another host when the path starts with an encoded slash or backslash.

## 0.90.0

### Changed
- guide: the last walk (galley's) ends by naming what comes next, the subaud guide at subaud.tools/guide/ starting with Working this way, and the getting-started skill's closing line says the same; each tool's Guide button is mentioned for later.

## 0.89.0

### Changed
- login: when its output is a terminal, `login` signs in in one run, as `--wait` does: it prints `Go to <url> and type <CODE>`, then `Waiting for you to allow this machine…`, and saves the token once the machine is allowed. When the output is not a terminal (an agent's shell) it keeps the two short runs and their exact lines. `--wait` still forces waiting. The waiting run's denied and expired errors say what to do, and it reuses a pending sign-in that carries its code (as install.sh now saves it).
- update: an ungated build refused by its site (HTTP 403 or 404) says only what to do: install it again with the site's `install.sh`, which signs the machine in if it needs to. The account-page pointer is gone.
- guide: the using-the-tools skill names the Guide button (the control a person sees) instead of the Guide tab, and offers a tool's walk ("Show me around ‹tool›.") for the tools in `WalkTools` when introducing one the user hasn't met.
- README: documents the guide package (tool sections, the Guide tab, the walks, the two family skills, the lessons) and links to subaud.tools/start for a person's first walk.

## 0.88.0

### Added
- skills: `InstallFiles` and `RefreshFiles` install and refresh a skill made of several files (a map of file name to body that must hold `SKILL.md`; every other name is one plain file name). The directory is the tool's when its `SKILL.md` is, as before; each extra file is written as `SKILL.md` is (through the skill directory's root, never through a symlink, to an O_EXCL temp file renamed into place, keeping an existing file's mode), and before `SKILL.md`. Refresh rewrites each file that differs or is missing and returns each path; it never creates an uninstalled skill, skips another skill's directory, and deletes nothing. `Install` and `Refresh` now call them with `SKILL.md` alone.
- pageserve: `Commands.SkillFiles`, set instead of `Skill` when the skill has more than one file; the channel's refresh and `skills install` use it when set, so a refresh no longer leaves an old `feature.md` beside a new `SKILL.md`. `Skill` is unchanged for single-file tools.

## 0.87.0

### Changed
- localweb/page: a stage still to come draws outlined with no fill, its border `color-mix(in srgb, var(--kit-muted) 70%, var(--kit-card))`, 3.20:1 against `--kit-card` in light and 3.71:1 in dark (the `--kit-line` border it had was 1.26:1). Done and current stages are unchanged.
- localweb/page: `StageValue` gains `other`, a current stage whose move is someone else's; `stagePill` adds the class `other`, and `.kit-stage.now.other` draws outlined in `--kit-signal` on a 12% signal tint with signal text, and its `live` dot in signal, so it no longer reads as the filled stage that is the reader's move. A tool that doesn't set it draws as before.

## 0.86.0

### Changed
- guide: each walk opens on an intro card, an `## intro` block in its `guide/walks/<tool>.md` with `title:` and `text:` (the words approved with PLAN6): what the tool is for and what the learner will do in it. `Walk` gains `Intro` (`WalkIntro{Tool, Title, Text}`), and the loader refuses a walk with no intro card, an intro with no title or text or with something to type, and an intro after a step.
- localweb/page: a spotlight body `{"intro": {tool, title, text}}` draws a walk's intro card, built like the end card: centred, no ring, the tool, the title, the text and one filled button, Start, which clears it and posts `{type: "kit:walk-start", tool}` to `window.parent`. proj's split page shows it when a walk begins while the agent prepares step 1; Start shows step 1.
- guide: diazo's and galley's end cards close on how to start each yourself, by asking your agent: "To plan your own change, tell your agent: "Start a new planning session in diazo for ‹your idea›."" and "To work on any document with your agent, tell it: "Edit ‹file› in galley."". The loader takes them as they are: a quoted request to the agent is not a command to type.
- guide: the getting-started skill says each walk opens on its intro card and that `proj guide start` and `show` print step 1 while it shows, so the agent prepares step 1 while the learner reads.

## 0.85.0

### Changed
- guide: galley's walk is four clicks: step 4 lights Share (`share`), at the bottom of the document beside the time it was approved, once the approval is saved; the step ends when the menu opens, so nothing is downloaded or copied. Its end card gains "Share hands the approved document to a reader, as a page or as Markdown."
- guide: diazo's steps 4 and 5 tell the agent exactly what diazo accepts: the spec's sections after Goal end "Rests on: DCSN1" and are printed citing the tone decision, the plan's one task opens with "**Serves:** DCSN1" and is printed serving it, and neither cites the direction (DIRN), which diazo refuses as not a decision.
- localweb/page: a step whose control is a text box is also done when another `data-walk` control in the box's form is pressed, and `kit:spotlight-done` then carries `also` with that control's hook. diazo's "This is the direction" under the reply box sends the words typed and settles the direction in one press, which is no submit, so the walk stayed on the reply step; proj now counts it and passes over the direction step.

## 0.84.0

### Changed
- guide: the getting-started walk is three walks, one per tool, in `guide/walks/proj.md`, `diazo.md` and `galley.md` (replacing `walk.md`), with the words approved in review. proj's walk is six clicks on the split page and proj's own page (`split`, `proj-tab`, `sessions-tab`, `open-ghostty`, `folders-tab`, `saved-tab`); diazo's is five, galley's three. Each step has two notes: `prepare:`, what the agent is getting ready and what the learner will do next ("Nothing to prepare." for none), and the note once the control is there, its first line what to press and the rest what is happening. Each walk ends on an end card: `learned:` lines, `next:` and `next_tool:` (diazo after proj, galley after diazo, none after galley). The loader refuses a step with no prepare line or no explanation, a step of another tool, a walk with no end card and a next_tool that isn't another walk.
- guide: `guide.Walks()` (proj, diazo, galley) and `guide.WalkFor(tool)` replace `guide.Walk()`; `Walk{Tool, Steps, End}`, `WalkStep` gains `Press` and `Prepare` (its hook field is `Target`, still `walk` in JSON, and N and Of count within its walk), and `EndCard{Tool, Learned, Next, NextTool}`.
- guide: the getting-started skill runs all three walks on "Get me started with subaud." (`proj guide start`) and one on "Show me around ‹tool›." (`proj guide start ‹tool›`), and lists each walk's steps and end card.
- localweb/page: the spotlight shows a step's preparing line, with no ring, while its control isn't on the page, then switches to the title and note and rings the control when it appears. A note taller than about 40% of the window scrolls inside itself; the placement still keeps it off the control and the page's text.
- localweb/page: a spotlight body `{"end": {tool, learned, next, next_tool}}` draws a walk's end card in the middle of the window with no ring: "You learned", the lines, what is next and one button, "Go on to ‹next_tool›" or Done, which posts `{type: "kit:walk-next", tool, next_tool}` to `window.parent`.
- localweb/page: when every place for a step's note covers some words, the note covers what is around the page (a header's labels) before the words around its control (the take above a reply box, the spec above Approve), and words a scroller or an overflow-hidden box clips out of sight no longer count as under it. Before, it took the least text by area, which put the longer notes over a line of the take or the middle of the spec the step asks the learner to read.
- guide, localweb/page: a step may carry `ready: ‹data-walk hook›`, an element on the page once the step is ready though its control appears only after the learner acts. While neither is there the spotlight shows the preparing line; once the ready element is, it shows the title and note, with no ring or ok button and placed as the preparing line is; the ring lands when the control appears. galley's first step has `ready: select-passage` (its editor), so the note asks for a selection once the README is on screen instead of staying on "Your agent is writing the README…" until Add instruction appears, which needs the selection. `WalkStep` gains `Ready` (`ready` in JSON), and the loader refuses a ready that isn't a hook.
- pageserve: `POST /api/kit/spotlight` carries a step's `press`, `prepare` and `ready`, and takes an end card (`{"end": …}`, needing learned and next) as well as a step.

## 0.83.0

### Changed
- guide: the walk is nine clicks: galley ends at Revise, then Approve (History hides Approve, so reading what changed is the Guide's). Step 2's note names what is there, a box and Send. Step 4's Choose sends the choice (diazo makes the walk's press the whole step). The agent lines name the practice plan's folder and the practice README, the two paths `proj guide start` prints, never the scratch place itself: diazo keeps its own README.md in a plan's folder. Step 9 waits for the agent's answer to the round before Approve lights.
- guide: the getting-started skill keeps the terminal to one short line per step and names the two paths `proj guide start` prints.
- localweb/page: the spotlight's note never covers what the learner reads or selects. It goes beside the control on a side with no text (right, left, below, above), else in the window's margin at the control's height, else in a corner; the waiting note takes the corner with the least text under it, not the middle of the page.
- localweb/page: the lit control carries `data-walk-lit` while its step shows and through the click that ends it, so a tool can make the walk's press do the whole step.
- splitpage: `Tabs.Open` moves a tab showing a server's front page to a page of the same server in place (one tab per tool), as a tool's front-page browser tab is moved to a page; a reload of the split page brings it back on that page.

## 0.82.0

### Added
- guide: `walk.md` and `guide.Walk()`, the getting-started walk as ten clicks on the real pages (proj `split`; diazo `reply`, `direction`, `choose`, `approve-spec`, `approve-plan`; galley `add-instruction`, `revise`, `history`, `approve`). Each `WalkStep` names its tool, the control's `data-walk` hook, a two-line note (what to press, why), the control in words and what the agent does first. No step names a tool event: the learner's click moves the walk on, and the loader refuses an `advance:` line. The loader refuses an unknown tool, a bad hook, a note over two lines, anything in a note for the learner to type, and a placeholder. A step's JSON is the spotlight body.
- localweb/page: `spotlight.js`, `spotlight(step)` and `clearSpotlight()`: the tour's ring on `[data-walk=…]` with the note and "n of N" beside it, following the page on scroll, resize and layout changes, never blocking it. The learner's click is the signal: a click on the control (for a text box or form, its form's submit; for a step with `ok`, the note's ok button) clears it and posts `{type: "kit:spotlight-done", n, tool, walk}` to `window.parent`, in the capture phase so the tool's own handler still runs. While the control isn't on the page the note sits in the middle with "Your agent is getting this ready…", and a MutationObserver rings the control the moment it appears. `live()` draws every `spotlight` event itself (they never reach `onEvent`), and when its stream first opens draws the step the serve holds (`resumeSpotlight`; `spotlight: false` turns it off), so every kit page gets it with no tool code. The tab a step names as `forward` focuses its window and posts `{type: "kit.forward", tool}` to its parent frame.
- pageserve: `POST /api/kit/spotlight` (token header only) takes a step's JSON and sends it to the page's open tabs as a `spotlight` event, naming the tab showing its `page` (else the front-page tab, moved there) as `forward`, and answers `{"forward": tab}`; an empty body clears it (the event's data is `{}`). `GET /api/kit/spotlight` answers the step shown now, or 204.
- record: `ClearLessons()` forgets every finished lesson and keeps the tools used and features reached.

### Changed
- guide: the getting-started-with-subaud skill runs the walk: `proj guide start`, then `proj guide show`, which names the current step and its agent line, and that step's agent work; the agent never watches a tool's events to move the walk, since the learner's click does; back, skip and stop run `proj guide back`, `skip` and `stop`. The learner never types anything. The lessons are gone from the skill, and using-the-tools no longer offers lessons (the lesson files stay for proj until it drops the lesson tab).

### Fixed
- guide: lessons 2 to 6 start by checking that `~/subaud/practice` exists, and say so when it doesn't.
- guide: when the learner presses the recap's start lesson N button, it sends "Lesson M is done. Start lesson N of the getting-started walk.", and the agent runs `proj guide done --lesson M`, then `proj guide start --lesson N`.

## 0.81.0

### Removed (breaking)
- pageserve: the channel's long poll. `Spec.Stream` is gone: every channel loop (`<tool> channel` under pi, `<tool> watch` under Claude Code) posts presence, holds serve's `GET /api/events` open and claims with `POST /api/agent/claim` when it connects and on every `deliver` event; it never calls `GET /api/agent/wait`. `Spec.Wake` reads the claim's 200 body. A tool drops `Stream: true` from its spec and can delete its wait route. `Channel.Poll` no longer does anything; it stays so a caller that sets it still builds.
- conformance: `Server.Delivery` is gone. The `delivers` rule runs for every `Server` with `Channel` set, and fails, naming `Server.Send`, when `Send` isn't set.

### Added
- pageserve: `WaitOne(ctx, c, Wait{Session, Harness, Label, Root, Deadline})`, one Send for a tool's `wait` command (a session with no channel): it posts presence and keeps it fresh, listens on `/api/events`, claims on connect and on each `deliver`, and returns the first claimed body. At `Deadline` it returns `ErrNothingSent`; any other failure, a stream that ends included, it returns as it is.

## 0.80.1

### Fixed
- guide: lesson 2's servers step has the agent run `proj servers --json` (proj 0.36.0 and later) instead of asking the learner to read the servers tab out.

## 0.80.0

### Added
- guide: the getting-started walk has an intro, `guide/intro.md`, shown before lesson 1: what subaud.tools are, why you're here, what you'll make, how it works and the six lessons. `guide.Intro()` returns its title and markdown body. The loader refuses an intro with no title, a `<word>` placeholder outside code, a line telling the user to type a family command, or a lesson listed by number whose title doesn't match that core lesson's.
- guide: the getting-started skill says that when the walk starts at lesson 1 the lesson tab shows the intro first; the agent points to it in one line and waits for the learner to press Start.
- guide: the getting-started skill runs `proj guide start --lesson N` when the learner sends "Start lesson N of the getting-started walk." from a recap's start lesson N button.

### Fixed
- guide: lesson 2's add-the-project step opens proj's page as a tab first if it isn't open (the same `proj window` line as step 1), so the step works when step 1's tab was closed or never opened.

## 0.79.2

### Fixed
- guide: lesson 2's add-the-project step says where to do it: open the proj tab, then its folders tab, type `~/subaud` under add a root and press add root, then send the ask, which now says it's done.
- guide: the getting-started skill starts the walk at lesson 1 when the practice repo `~/subaud/practice` doesn't exist, rather than resuming at a later lesson that needs it.

## 0.79.1

### Fixed
- guide: lesson 2 works as written. proj treats a folder added on its page as a folder of projects, so the practice repo now lives at `~/subaud/practice`: lesson 1 makes it there, lesson 2 adds `~/subaud` and opens `practice/try`, and lesson 4 opens `practice/later`. Lesson 2's `proj window` line names the `--socket` and `--pane` it needs.

## 0.79.0

### Added
- pageserve: `Where.Session` (`tmux_session`), the tmux session a pane belongs to. When it is set, `TerminalOf` and `TerminalGo` pass `proj terminal --session`, so proj (0.34.0 and later) opens that session's main pane when the pane id is gone or now belongs to another session.

## 0.78.0

### Added
- localweb/page: `guideAsks(el, o)` draws what an empty front page says: the page tool's one-line summary from the guide, its asks each with Copy (the Guide's ask rows), and More in the Guide, which opens `openGuide()`. It loads the same `/api/kit/guide` as the Guide, and leaves `el` as it was (resolving `false`) when the guide has no section for the tool or doesn't load. PAGE-STANDARD.md: an empty front page shows its tool's asks.

### Changed
- guide: the getting-started walk is a tutorial, not a quiz. The loader refuses a `**Choose:**` list, `Step` has no choices, and every lesson's choose step is gone, its point folded into the step after it. The core walk is six lessons going through proj, diazo and galley: lesson 3 is now Plan with diazo (the start's rounds, the understanding, decisions, a principle from a note, reversing a call, the spec, dropping a task) and lesson 5 Write with galley (instructions on a passage and the whole document, a hand edit, Chat, Revise, History, Approve, Share). Lesson 2 is now Your sessions with proj (proj's page and its tabs, a project and its session, Chrome or Ghostty, the servers, saving a layout and restoring a session, scratch and creel), lesson 4 Build and finish with diazo (the Build view, a step only you can do, sign-off, the wrap-up, sharing the record, picking a plan up in a new session) and lesson 6 diazo and galley together (the spec reviewed in galley as a diazo step, approved there, shown on diazo's page as edited after approval with its diff). Every lesson from 2 on keeps the tool's real page open beside the terminal and goes back and forth on purpose, and the getting-started skill says so. Sessions talk and Find waste with muda, still offered, are lessons 7 and 8.

## 0.77.0

### Added
- pageserve: stream-and-claim delivery, opt-in. With `Spec.Stream` set, the channel loop (`<tool> channel` under pi, `<tool> watch` under Claude Code) stops long-polling `GET /api/agent/wait`: it keeps posting presence, holds serve's `GET /api/events` open with its token, and calls `POST /api/agent/claim` (`{session, root}`) once each time the stream opens and on every `deliver` event, claiming again until serve answers 204, and pushes each claimed Send through `Push` as the long poll did. An idle channel asks serve nothing but presence. A dropped stream or a new serve goes through the loop's existing retry, and the claim on connect brings anything sent meanwhile. `Client.Listen` reads the stream; it gives up a stream quiet past serve's heartbeats.
- pageserve: `Delivery`, serve's half, wired with the tool's own `Claim` and `Covered`: `ServeClaim` is the claim route (the tool's claim body with 200, or 204), `Touch`/`Present`/`Sessions` keep presence in memory with a TTL (`DefaultPresenceTTL`, 90s), a session's covered scopes are found once and kept until it lapses or `Forget`, `Deliver` emits `deliver` (the tool calls it when it records a Send or takes a delivery back) and closes `Wake` (for a tool's kept long poll), and one timer, set to the next presence lapse, emits `deliver` so a gone owner's project can be taken over, and once more a TTL later for a takeover the store still held at the lapse. Nothing ticks per session. `Take` is one claim, for a tool's own route.
- conformance: the `delivers` rule, for a `Server` with `Delivery` and a `Send` hook: two `<tool> watch` sessions on a fresh serve; three Sends queued before they connect all arrive, a Send reaches exactly one, after the session that took it is killed the next reaches the other within `PresenceTTL` and 5s, and a Send recorded as serve restarts arrives. `Folder` makes the project folder.

Nothing changes for a tool that doesn't set `Spec.Stream` or `Server.Delivery`.

## 0.76.3

### Changed
- localweb: the sign-in cookie lasts a year (`Max-Age`), so a page's sign-in survives quitting the browser and a bookmarked page works after a restart. It stays `HttpOnly`, `SameSite=Strict`, per port, on 127.0.0.1 only.

## 0.76.2

### Fixed
- guide: the two family skills load in pi. Their descriptions held ": " in an unquoted YAML value, so the front matter didn't parse and pi dropped both skills; a description is now written as a quoted string, and a test checks every front-matter value. `using-the-tools`' description now names the tools rather than the template text that was meant to list them.

## 0.76.1

### Fixed
- guide: lesson 1 no longer assumes kempt set up the machine. A suite installed through each tool's install line has no kempt.toml, so `kempt plan` and `kempt outdated` failed there; the lesson now asks each tool for its version, and updates through each tool's `update` (or `kempt update` where kempt manages the machine).

## 0.76.0

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
