---
name: billet
summary: Project workspaces in your own AWS account: a machine per project with your repos, the suite and your agent, opened from a browser or your phone.
weight: light
beta: true
asks:
  - Set up billet in my AWS account.
  - Update billet.
  - Move this plan to my billet workspace.
---

## When to reach for it

- You want to work on a project away from your laptop: from another computer, or from your phone.
- A plan should keep running on a machine that stays up when your laptop sleeps.
- Other people should work in the same project: each gets their own home on its workspace, with their own GitHub login.

## When to skip it

- All your work happens on one Mac: the suite there is enough.
- You don't have an AWS account you can deploy into, with a Route 53 domain for the start page.

## Where it sits

Under everything else. billet gives a project its machine; proj, diazo, galley and the rest run on it as they do on your Mac. A diazo plan moves from your Mac to a workspace and back through GitHub, from the plan's own page.

## Pointers

- **One deploy, then the start page.** Your agent deploys billet into the AWS account you're signed in to and opens its start page, where you make each workspace.
- **Sign in with a passkey,** in any browser or on your phone.
- **A workspace opens on proj,** with your repos cloned and the suite kept current by kempt.
- **A workspace costs only while it runs.** Stop one from the start page when you're done with it.
- **Each person on a workspace needs their own suite,** as on any shared machine.
