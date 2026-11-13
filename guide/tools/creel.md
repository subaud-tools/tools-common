---
name: creel
summary: Hands your agent an API key or password without the value ever entering the chat.
weight: core
asks:
  - I need to give you ‹KEY_NAME›. Ask me for it with creel.
  - Run ‹command› with ‹KEY_NAME› from the .env, without reading the key yourself.
---

## When to reach for it

- Your agent needs a key, token or password to do its work.
- Any time you're about to paste a secret into the chat: ask for creel instead.

## When to skip it

- Values that aren't secret, such as a region or a port: just say them.

## Where it sits

Whenever a step needs a secret. A small masked box opens for you to type or paste the value, and it goes straight into a local .env file.

## Pointers

- **The agent never sees the value.** It gets back only "added" or "updated".
- **Type it in the box, not the chat.** If you've already pasted a secret into the chat, change the secret.
- **The key stays in the .env file.** When a command needs it, your agent runs the command with the key handed straight to it, never reading it back.
- **It changes one line.** The rest of your .env is left as it was.
