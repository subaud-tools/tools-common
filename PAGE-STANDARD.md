# The standard for a tool's server and page

Every .tools server and page follows this file. Each rule names the shared part that delivers it, so a tool gets the rule by using the part, and a session reads this file instead of another tool's code. What a second server would need goes to tools-common first.

Releases: "this release" is the tools-common release that first carries this file. "The kit parts release" is [tools-common PR #64](https://github.com/subaud-tools/tools-common/pull/64), not merged when this was written, so the parts it adds are not in the kit yet.

## Server rules

Every server gets these from `pageserve.Run` with no code of its own. `conformance.Check` in `pageserve/conformance` tests each from outside, and a tool's own CI runs it against its own binary.

| Rule | Delivered by | Since |
|---|---|---|
| It never exits for being idle. | `pageserve.Run`. `Options.Idle` and `Options.Busy` are gone. | this release |
| It keeps its token across restarts, so open tabs keep working. | `pageserve.Run`, in `StateDir/token`. `Options.Token` is gone. | this release |
| It notices a newly installed binary and marks itself stale, and the next channel call restarts it. | `pageserve.Run` sets `Entry.Stale` and emits a `stale` event. `pageserve.Channel` calls `Client.Fresh` before each tool call. | this release |
| It reuses an open tab rather than opening another. | `pageserve.Run` makes `localweb.Tabs`, keeps them in `StateDir/tabs.json` and wires them to `Events`. `Options.Tabs` hands the list to the tool, which asks it with `Tabs.Pick`. | this release |
| Open pages notice a new serve. | `pageserve.BuildHeader` (`X-Tool-Build`) on every API response, read by `createApi`'s `onNewBuild`. `live`'s `onNewBuild` hears the `stale` event, which comes while serve is still the old build: say a newer build is installed, but don't reload then, since a reload brings back the same page (diazo re-reads its view). Reload on the header's change. | this release |
| Every server with a channel ships a skill. | `pageserve.SkillsCommand` | already released |
| A channel is the shared one: `<tool> channel` from `pageserve.Commands`, with `Around` for anything the tool does around it, `--scope` for the session's folder, and `Spec.Scope` to name a root without gating the loop. | `pageserve.Commands.ChannelCommand` | 0.44.0 |
| A page opens as a tab of its session's split page, beside the terminal, when the session has a window; otherwise it reuses an open tab, or opens one. | `pageserve.Show` over `proj window` and `proj terminal`: `proj window --right` opens the page as a tab with `splitpage.Open` on proj's page server, which serves the session's window as `splitpage`'s page. The channel sends the session's tmux location (`Identity.Where`, `Where.Into` on a tool's open call) | 0.46.0; as a split page tab, 0.52.0 with proj 0.21.0 |
| Only the token header can stop a server: a page served by the tool can't. | `POST /api/stop` refuses a request without `X-Local-Token`; checked by `conformance.Check` | 0.46.0 |
| A restart never overlaps a server still writing: running requests and the tool's `OnStop` finish (bounded at 4.5 s) before the entry goes. | `pageserve.Run`, `Options.OnStop` | 0.46.0 |
| A skill not named after its tool is installed, refreshed and checked like any other. | `Commands.SkillName`, `conformance.Server.SkillName` | 0.46.0 |

A tool with `Options.Stream` answers `/api/events` itself, so it must put the `stale` event on its own stream. `/api/poll` always carries it.

Session colour applies only to a page that one session owns, such as a diazo plan.

## Page rules

Every page takes these from the kit, `localweb/page`. Page shape has no test: it comes from using the kit's parts, and from looking at the page.

| Rule | Delivered by | Since |
|---|---|---|
| The three-column frame, with the thread on the right. The thread column is always present on an item page, and stays where the reader left it; a front page has none. | `frame`, `collapsible`, `thread` | needs adopting from 0.41.0; no thread on a front page from 0.117.0 |
| Changing screens moves nothing: the bar, the band, the columns' left edges and each column's first item sit at the same place on a tool's front page and its item pages, and the same from tool to tool. It comes from the rows below; the laying-out-a-page skill and the mockup starter at `/_kit/layout/` keep new pages and mockups on it. | `bar`, `band`, `frame`, the `laying-out-a-page` family skill, `/_kit/layout/` | needs adopting from 0.117.0 |
| The band under the bar is 104px high at every width, a phone included, with or without its second line; a tool sets no height of its own. Its places, the same on every page: on the title line the title, beside it its place and state (`beside`), nodes that go into the band's ⋯ on a phone (`fold`), and at the line's right end the page's actions (`end`), a front page's search (`search`) and the band's one ⋯ (`menu`); on the second line the stage track on an item page or the status pills on a front page (`under`), and at its right end the needs-you pill (`underEnd`) and a front page's sort (`sort`). A fold entry with `at: 'end'` sits in the title line's end place on a wide page. The title is the last thing on its line to shrink: what is beside it gives way first, then the search, down to 96px. On a phone the second line stays one line that scrolls sideways, and the fold's nodes move into the ⋯. | `band` | needs adopting from 0.117.0 |
| Search and sort go only through the band, and nothing sits between the band and the columns: a front page's search is `band`'s `search`, its sort is `sortedList` given the band, drawn as its switch at the second line's end and as a compact picker on a phone. | `band`'s `search`, `sortedList`'s `band` | needs adopting from 0.117.0 |
| Each column's first item starts at one place under the band: a side column's first label 16px under it, the middle column's first card 24px under it. The left column is 288px. No tool CSS moves them. | `frame`, `indexSection`, `filterRow`, `thread` | needs adopting from 0.117.0 |
| Every card in the middle column has one shape, 14px by 16px padding and an 8px corner, and fills the column up to 1100px, left-aligned; a tool's own card class sets neither. The empty-state card (`emptyCard`) keeps its own padding, 26px by 10px, and the cap. | `.kit-mid .kit-card` in `kit.css`, with `card` and `sortedList` | needs adopting from 0.117.0 |
| A front page has no right column: its middle column runs to the window's edge, and its cards stop at the 1100px cap. | `frame` with no `right` | needs adopting from 0.117.0 |
| One wide view, a system design's topic chat, runs the middle column over the right column's space, its cards uncapped; the band, the left column and the middle's left edge and first item stay where they are. No other page widens its middle. | `frame`'s `wide` | needs adopting from 0.117.0 |
| One thing at a time at 1080 wide or less, on a page that turns it on, with a count on each strip. | `narrowMode` | adopted by diazo |
| One primary action on the top bar, on the far right. | `bar`, through its `primary` | already released |
| The top bar is one 52px line at every width. On a phone (640px wide or less) the brand, the section buttons and the primary stay, and the status, the also-open switcher, the live pill, Guide and theme go into the bar's one ⋯, just before the primary; the section buttons shrink with an ellipsis first, so nothing ends past the window's right edge. A tool adds no bar wrapping rule of its own. | `bar` (no code of the tool's) | 0.119.0 |
| The fixed card header. | `card`, through its `head` | already released |
| The stage track, whose stages are the tool's own, drawn as one joined bar; status pills draw the same way. | `stageTrack`, `statusPills` | needs adopting from 0.41.0; one joined bar from 0.114.0 |
| Drafts that go out together on Send. The bar sits locked to the middle column's foot: a band the column's full width on its bottom edge, on a short page too, with the page scrolling above it and nothing under it at the end. The page keeps the kit's middle-column side padding (24px) for the band to span the column. | `sendBar`, placed with `frame`'s `foot(bar)`, with the drafts held by `createDrafts`, or by the tool's own store where a draft lives in the content (galley's instructions anchored in the document) | needs adopting from 0.41.0; the locked foot from 0.74.0 |
| A right column with more than the thread shows it as tabs with counts, one open at a time; the reader's choice is remembered, a tool's switch isn't. Drafts listed there show their quoted item, edit in place and delete, and keep the reader's typing through a redraw. | `railTabs`, `draftList` (mount its `el` once and call `redraw`) | 0.47.0 |
| A switcher in the top bar lists the tool's other pages, kept current. | `bar`'s `setElsewhere`, kept by `keepElsewhere(bar, read)` | 0.44.0 |
| A front page lists the tool's pages with filters and status pills (the pills on the band's second line). Its centre is one list in the sort switch's order (the switch in the band's sort place), each row naming its place, or groups that fold and move with rows in the sort switch's order inside each, grouped by something the left column doesn't filter, or by a left-column filter when the chosen pill leaves a single status. | `filterRow` (with `subs`), `statusPills`, `sortedList` (with `groups`), `sortSwitch` | 0.44.0; one sorted list from 0.103.0; groups that fold and move from 0.114.0 |
| A count of what needs the reader is a button that goes there: one item opens on a press, several open a menu naming each; after an answer the page stays and says how many are left, with a Next button naming the next; opening a thing shows it with its answer control on screen, and focuses a reply box. What is on the list is the tool's. | `needsPill` (mount its `el` again on a redraw and call `set`), `nextLine`, `arrive` (mark the control `data-answer`) | 0.48.0 |
| A setting is one line of a settings card: its name, its control, and on the right its mark ("changed here") and actions (Reset). The line is the same height with the mark and without, at every width, so nothing under it moves when a mark appears or goes; a mark too long for its row is cut with an ellipsis. | `settingLine`, in a `card` | 0.115.0 |
| The message states. | `msgstate`, in Go and in the kit | already released |
| A Guide button on every page's top bar, left of the theme control. It opens the family guide over the page, on the tool you're in: when to reach for it, when to skip it, and its asks with Copy, with where it sits and pointers behind More. The other installed tools (their command on PATH) are down the side, core first and the rest under Also installed, then How they fit together and one link to subaud.tools. `/_kit/guide/` shows the same as a page. What the guide says is tools-common's `guide` package, not the tool's. | `bar` (no code of the tool's), `openGuide`/`guideView`, over `GET /api/kit/guide` from `pageserve.Run` | this release |
| An empty front page shows its tool's asks: the tool's one-line summary from the guide, its asks each with Copy, and More in the Guide, so the empty page and the Guide say the same thing. When the page's list fills, the page draws its list instead. Which front pages, and when one counts as empty, are the tool's. On a hosted workspace, whose sessions start from the page itself, the empty front page shows no asks and points at the page's own way to start instead. | `guideAsks(el)`, over the same `GET /api/kit/guide` as the Guide | this release |
| A page with controls a new user should find registers a Show me around tour: one control outlined at a time with a note beside it, → goes on, Esc skips, shown once per tool and offered again on the page's own section of the Guide. Which controls, and their notes, are the tool's. | `tour(steps, o)` (`startOnce()` for the first visit), `placeNote` | this release |
| A control the getting-started walk lights carries its `data-walk` hook (diazo: `reply`, `direction`, `choose`, `approve-spec`, `approve-plan`; galley: `add-instruction`, `revise`, `approve`, `share`; proj: `split`, `proj-tab`, `sessions-tab`, `open-ghostty`, `folders-tab`, `saved-tab`). When the walk sends a step, the page rings that control with a two-line note beside it (n of N), following the page as it moves; nothing blocks the page. The learner's click on the control is the step done (a text box or form's hook counts its form's submit, so put the hook on the form; a press on another `data-walk` control in that form counts too, and the message names it as `also`): the ring goes and the page posts `{type: "kit:spotlight-done", n, tool, walk}` to its parent, proj's split page. The note never covers the page's text: beside the control on a side with no text, else in the margin, else a corner. The lit control carries `data-walk-lit` through the click that ends the step, so the tool can make that press do the whole step. While the control isn't on the page the note shows the step's preparing line (what the agent is doing, what the learner will do next) in a corner off the text with no ring. A step with `ready` names a hook that is on the page once the step is ready: when it is there the note switches to the doing note (what to do and what is happening), still with no ring. When the control appears the note says what to press and what is happening, and the ring lands. A walk's intro card (`{"intro": {tool, title, text}}`) shows centred with what the tool is for, what the learner will do and one button, Start, which posts `{type: "kit:walk-start", tool}` to the parent; proj's split page draws it when a walk begins. A walk's end card (`{"end": …}`) shows centred with what the learner learned and a button, "Go on to ‹tool›" or Done, which posts `{type: "kit:walk-next", tool, next_tool}` to the parent. Which controls are the walks' is tools-common's `guide/walks/<tool>.md`. | `live()` draws `spotlight` events (no code of the tool's), `spotlight`/`clearSpotlight`, over `POST`/`GET /api/kit/spotlight` from `pageserve.Run` | this release |
| Messages, Sends and who gets them follow one delivery rule: a Send goes whole, a session can hold several, the owner belongs to the scope and a takeover brings its unanswered messages, and a reply settles all or none. | `threadstore` (`threadstore/v0.1.0`), and `msgstate.Message` on the wire. A page keeping its messages elsewhere (diazo's `decisions.json`, galley's review) follows the same rule. | this release |

## What stays each tool's own

- Its stages, and what its left rows and cards hold.
- casebook's bulk group decisions, and cull's blind mode.
- diazo's folder watch, its Record view and its cards.

There are no exceptions: a page whose content doesn't fit this shape changes, or the standard changes for every page. galley's editor takes it with its documents as the left index, the editor as the centre card, its comment rail as the thread, Revise as the drafts sent together, and review rounds as the stage track.

A page with no agent conversation behind it, such as billet's hosted start, workspace, setup and account pages, takes no frame, thread, drafts or stage track, since it has nothing to put in them. It keeps every other page rule: the kit's bar with its Guide and one primary, the kit's tokens and parts.

## Where each server stands

Read from each repo's `origin/main`, the version and tools-common pin in the first column. "uses" means its source calls the part; how the page looks is not checked here. A cell conforms or says what it waits on; This session updates the table as each server adopts, and removes it once every cell conforms.

Server rules:

| Server (tools-common pin) | No idle exit | Kept token | Stale mark | Tab reuse | Build header | Skill |
|---|---|---|---|---|---|---|
| diazo 0.52.0 (0.45.1) | conforms | conforms | conforms | conforms | conforms | conforms |
| sift 0.9.0, in tackle (0.71.0) | conforms | conforms | conforms | conforms | conforms | conforms |
| cull, in tackle (0.40.0) | `Idle: 8h` | new each start | none | none | none | no skills command |
| casebook 0.29.0 (0.72.0) | conforms | conforms | conforms | conforms | conforms | conforms |
| galley 0.22.0 (0.33.0) | own server, through its PLAN1 | own server, through its PLAN1 | own server, through its PLAN1 | own server, through its PLAN1 | own server, through its PLAN1 | own command over `skills.Install` |
| muda 0.5.0 (0.30.0) | no server yet | no server yet | no server yet | no server yet | no server yet | own command, no channel yet |
| proj, in tackle (0.40.0) | not decided | not decided: new each start, on `localweb` directly | not decided | not decided | not decided | no channel |
| imprint, in tackle (0.40.0) | no server | no server | no server | no server | no server | conforms |

Page rules:

| Page | Frame and thread | Top bar | Card header | Stage track | Drafts | Message states | Layout |
|---|---|---|---|---|---|---|---|
| diazo | conforms | conforms | conforms | conforms | conforms | conforms | needs adopting from 0.117.0 |
| sift | conforms | conforms | conforms | conforms | conforms | conforms | needs adopting from 0.117.0 |
| cull | needs adopting from 0.41.0 | uses `bar` | uses `card` | needs adopting from 0.41.0 | needs adopting from 0.41.0 | uses `msgstate` | needs adopting from 0.117.0 |
| casebook | conforms | conforms | conforms | conforms | conforms | conforms | needs adopting from 0.117.0 |
| galley | through its PLAN2 | through its PLAN2 | through its PLAN2 | through its PLAN2 | through its PLAN2 | uses `msgstate` | needs adopting from 0.117.0 |
| muda | no page yet: its PLAN1 builds on the kit parts | no page yet | no page yet | no page yet | no page yet | no page yet | needs adopting from 0.117.0 |
| proj | not decided | not decided | not decided | not decided | not decided | not decided | needs adopting from 0.117.0 |
| imprint | no page | no page | no page | no page | no page | no page | needs adopting from 0.117.0 |
| billet (no agent conversation) | none: no conversation | through its UX review PLAN1 | not used | none: no conversation | none: no conversation | not used | needs adopting from 0.117.0 |
