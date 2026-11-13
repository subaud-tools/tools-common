---
name: muda
summary: Finds waste in how your code gets delivered (slow or flaky CI, needless waits, cloud cost), measures it, and fixes it one pull request at a time.
weight: core
asks:
  - Use muda to measure this repository's delivery pipeline.
  - CI is slow here. Find out why with muda.
  - Check this pipeline design against muda's recipes before we build it.
  - Look for AWS cost waste with muda.
---

## When to reach for it

- CI in a GitHub repo feels slow, flaky or expensive, and you want numbers before changing anything.
- You're about to design a new pipeline or deploy (a new image, stack or workflow) and want it checked first.
- An AWS bill has a line you can't explain.

## When to skip it

- A repo with no CI runs yet: there's nothing to measure.
- One broken build: ask your agent to debug it directly.

## Where it sits

Beside the other work, not in its path. Reach for it when the pipeline itself is the problem; it hands its fixes back as ordinary pull requests.

## Pointers

- **Measure first.** muda starts with a baseline of your real CI runs over a window of time, then finds waste in it. It never believes a claim it hasn't measured.
- **Decide on muda's page.** Findings and their fixes arrive as cards with options and a recommendation; you choose there. If the agent asks in chat, tell it: "Ask me everything on muda's page, not in chat."
- **One finding, one pull request.** Each fix is its own PR, and it merges only when you say yes to it.
- **It keeps a record** in the repo, so a later session picks up where the last one stopped.
- **It needs a GitHub repo and access to it.** If it can't read the repo, the agent tells you what's missing.
- **Recipes come in packs.** muda's known fixes live in packs it downloads; with none, findings say so. Ask your agent to set them up.
- **Start small.** Measure one repo you know well before pointing it at many.
