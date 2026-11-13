---
name: kempt
summary: Shows what's installed on your machine and keeps it current, reading every change to you before it makes it.
weight: core
asks:
  - Which subaud tools do I have, and are any out of date?
  - Bring my tools up to date with kempt.
  - Install the new ‹tool› release.
---

## When to reach for it

- A release has shipped and you want it on your machine.
- You want to know what you have and what's behind.
- Setting up a new machine like your old one.

## When to skip it

- A tool you're building and testing locally: your agent installs that build directly.

## Where it sits

Last. Once a change ships, kempt brings the new version to your machine; and every tool's agent skill reaches your agents the same way.

## Pointers

- **Read before it runs.** kempt shows every change it would make first, and changes nothing until you say yes.
- **Running it twice is safe.** If nothing changed, it does nothing.
- **It keeps itself current too,** along with the tools it installed.
- **One file describes your machine:** the tools, settings and files that make it yours, kept in a repo you can read.
