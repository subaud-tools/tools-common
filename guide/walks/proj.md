# proj's walk

Six clicks on the split page and proj's own page. Each step has two notes: `prepare` shows while the agent is still getting the step ready (what it is doing, what the learner will do next; "Nothing to prepare." means the step has none), then the note once the control is there: its first line is what to press, the rest what is happening. The end card says what the learner learned and leads to the next walk.

## 1
tool: proj
target: split
press: ok
look: the divider between the terminal and the tabs
agent: Nothing more: proj guide start opened this split page beside the terminal.
prepare: Nothing to prepare.

Press OK.
This window is a session: a terminal for one piece of work in one project, named after both, like project/work. Your agent runs on the left. The session keeps running even if you close this window, so you can step away and come back to it.

## 2
tool: proj
target: proj-tab
look: the tab of proj's page in the tab bar
agent: Nothing: proj opens its own page as a tab of this split page when the walk reaches this step.
prepare: Your agent is opening proj's own page as a tab on the right. When it's there, you'll press its tab.

Press the proj tab.
The right side holds the pages your agent opens for this session, one tab each: a plan, a document, this list. Terminal on the left, pages on the right, in one Chrome window: that's the split page. Every session can have one.

## 3
tool: proj
target: sessions-tab
look: the sessions tab on proj's page
agent: Nothing: wait for the learner's click.
prepare: Nothing to prepare.

Press sessions.
These are the sessions running now, grouped by project; the one you're in is among them. Starting a new piece of work starts a new session, so each keeps its own terminal and pages. A session waiting on you is marked needs you, so you can see where you're wanted.

## 4
tool: proj
target: open-ghostty
press: ok
look: ghostty and chrome on your session's row
agent: Nothing: wait for the learner's click.
prepare: Nothing to prepare.

Press OK; no need to press ghostty now.
Every session can be shown two ways. Chrome, this window, puts the terminal beside its pages. Ghostty shows the same session in a plain terminal app, without the pages; use it for work that only needs a terminal. A session shows in one place at a time: pressing ghostty moves it there, and chrome brings it back with its pages where you left them.

## 5
tool: proj
target: folders-tab
look: the folders tab on proj's page
agent: Nothing: wait for the learner's click.
prepare: Nothing to prepare.

Press folders.
These are the folders proj knows. A folder of projects, like your GitHub folder, makes each folder inside it a project. A single project is one folder on its own. A workspace is a single project that holds several repos, so one session can work across all of them. Ask your agent to add a folder.

## 6
tool: proj
target: saved-tab
look: the saved tab on proj's page
agent: Nothing: wait for the learner's click.
prepare: Nothing to prepare.

Press saved.
proj remembers every session it has seen. After a restart, restore brings one back in its folder, and its agent picks up the conversation where it left off. Closing a window never ends a session; only reap does. Save layout keeps how your Ghostty windows were arranged.

## end
learned: A session is a terminal for one piece of work in one project, and it keeps running when you close its window.
learned: In Chrome a session has its pages beside it; in Ghostty it's a plain terminal. It shows in one at a time.
learned: proj's page lists your projects, your live sessions and the saved ones.
learned: After a restart, saved sessions come back with their conversations.
learned: A workspace is one project holding several repos, so one session can work across them.
next: Plan a small change on diazo's page.
next_tool: diazo
