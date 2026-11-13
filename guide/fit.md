# How they fit together

## You ask, the agent runs the tools, you decide on the page

You never need to learn a tool's commands. You tell your agent what you want in plain words ("plan this with diazo", "let's use galley to edit this"), it runs the tool, and the tool opens a page in your browser. You read and decide on that page; your answer goes straight back to the agent.

So when a page is waiting on you, answer it there, not in the terminal. And when you press Send and nothing happens, the session behind that page has usually ended: ask any session to reopen it.

## How a change usually goes

1. **Plan it on diazo's page.** The agent lays out the choices, you decide, and you approve a plan.
2. **Polish the writing in galley.** If the plan produced something people will read, you edit it with the agent in rounds.
3. **Workers build it.** The agent hands the plan's tasks to worker sessions and reviews what they make.
4. **Sessions talk over muster.** When two sessions work on related things, they send each other notes instead of you carrying messages between them.
5. **kempt installs the release.** Once it ships, kempt brings the new version to your machine and keeps it current.

Most changes don't need every step. A one-line fix needs none of them: just ask for it.

## Off to the side

- **muda** looks at the pipeline itself: slow or wasteful CI, or cloud cost. Reach for it when delivery is the problem, not the change.
- **proj** opens each project in its own session and window, with its pages beside the terminal. **scratch** holds quick notes and **creel** keeps secrets out of the chat.
- **casebook** sorts old branches, pull requests and repos, **sift** tidies your agent's instruction files, and **cull** weeds out tests that don't earn their place.

## One at a time

You don't need all of this on day one. When a request calls for a tool you haven't used, your agent will name it in a sentence and offer to show you; the Guide tab on any tool's page has the rest when you want it.
