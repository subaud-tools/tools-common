---
name: muster
summary: Lets your agent sessions send each other messages and tasks, so you don't carry text between terminals.
weight: core
asks:
  - Tell the ‹session› session: ‹message›.
  - Ask another session to review this branch, and bring me its verdict.
  - Who else is on the bus, and what are they working on?
  - Write a handoff for the next session: where things stand and what's left.
---

## When to reach for it

- Two or more sessions on related work: a producer and its consumer, two repos that share a contract.
- A second opinion: one session writes the code and another, with no stake in it, reviews it.
- Ending a session: it writes what the next one needs to know, and the next one can ask it questions.

## When to skip it

- A single session: there's no one to talk to.
- A question for you: the agent asks you in the terminal or on a tool's page, not over muster.

## Where it sits

Between sessions. When the agent hands a plan's tasks to worker sessions, they report back over muster, and you only step in where they need you.

## Pointers

- **Sessions are addressed by name,** usually the session's ‹project›/‹work› name, so give work a name that says what it is.
- **A message wakes the other session.** It reads its mail at its next turn, even if you're looking at a different terminal.
- **A message is for telling, a task is for doing.** Tasks track who claimed them and whether they're done.
- **Mail survives restarts.** A resumed session keeps its name and its unread messages.
- **To watch the whole bus,** ask your agent to open muster's station view in a new window.
