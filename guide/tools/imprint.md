---
name: imprint
summary: Lets your agent do the npm steps (log in, publish, set a trusted publisher, deprecate) and tells you when each one has landed.
weight: light
asks:
  - Publish this package to npm with imprint.
  - Make ‹owner/repo›'s release workflow the trusted publisher for ‹package›.
  - Deprecate ‹package› with a message saying where it moved.
  - Did ‹version› of ‹package› land on npm, signed by its CI?
---

## When to reach for it

- Publishing a package to npm, its first version or a new one.
- Setting or moving a package's trusted publisher: the one CI workflow allowed to publish it.
- Renaming or retiring a package, so its old name points people to the new one.
- Checking that a version your CI released reached npm, signed by the right repo.

## When to skip it

- Packages you only install: imprint is for packages you own.
- A registry other than npm.

## Where it sits

At the end, when a build ships as an npm package. A plan's release task hands the npm steps to imprint, and your part is the approvals.

## Pointers

- **You approve; the agent does the rest.** imprint opens each npm approval page in your browser the moment npm asks, and the agent says which step it belongs to.
- **An approval page expires after a few minutes.** imprint reports it, and the agent runs only that step again.
- **Done means the registry shows it.** A new version takes 3 to 6 minutes to appear on npm; imprint says when it is live.
- **When a step fails,** imprint gives npm's error with what it usually means.
