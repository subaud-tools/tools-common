---
name: diazo
summary: The planning page: your agent lays out the choices in a change, you decide on the page, and it ends in a plan you approve before anything is built.
weight: core
asks:
  - Plan this with diazo: <your idea in a sentence>.
  - Plan this in diazo in a new session, and carry on with what you're doing here.
  - Pick up the diazo plan we started on <topic> and keep going.
  - What's waiting on me in diazo?
---

## When to reach for it

- A change with a real choice in it, where you want to see the options side by side before any code is written.
- Work that spans several repos, or more than an afternoon.
- Small changes too, when you'd like to look before the agent acts: people use it for a page layout or a button's behavior as often as for a big redesign.

## When to skip it

- A one-line fix with one obvious answer: just ask your agent to make it.
- A question you want answered, not a change you want made.

## Where it sits

First. A change usually starts here: you plan on diazo's page, polish any writing in galley, the agent's workers build the plan, and the release reaches you through kempt. diazo also shows the build as it goes, so you can come back to the same page to see where things stand.

## Pointers

- **Decide on the page, not in chat.** The agent posts each choice as a card with its options and its recommendation; you pick there. If it asks you a decision in the terminal instead, tell it: "Ask me that on diazo's page."
- **The plan grows in order.** First the agent says back what it understood, then the decisions, then a spec (what will change and why), then one or more plans of tasks. Each needs your approval before the next.
- **You can cut tasks.** Before you approve a plan, drop any task you don't want; it becomes a follow-up for later.
- **Your steps are listed.** Anything only you can do (a sign-in, a look at a page, a go-ahead to merge) shows under Your steps with how to do it.
- **When Send seems to go nowhere,** the session that owned the plan has probably ended. Ask a session: "Reopen the diazo plan on <topic>." The new session picks up every message you left.
- **Save an idea for later** by asking the agent to save it as planned; it waits on the front page without counting as work for you.
- **Share it.** The Record view shows the whole plan read-only, as one file you can send to someone.
