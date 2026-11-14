# Your sessions with proj

**Goal:** Give your practice repo its own project and session with proj's page open beside the terminal: open the session in Chrome or Ghostty, save your layout and bring it back, and keep a note and a secret where your agent can use them.

## Walkthrough

1. **Open proj's page**

   proj keeps your projects and their sessions, and its page shows them in four tabs: folders, sessions, saved and servers.

   ```
   Open proj's page as a tab beside this terminal.
   ```

   **Claude runs:** `proj window --right` with the address of proj's page, which starts proj's server when it isn't running and opens the page as a tab on the right of this split page.

   This window is a split page: the terminal on the left, tabs on the right. The lesson is one tab; proj's page is another, and later lessons open diazo's and galley's beside them.

2. **Add the project**

   A project is a folder you work in; once proj knows it, the folder can have sessions of its own.

   ```
   I'm adding my subaud-practice folder on the folders tab of proj's page. Tell me when proj lists it.
   ```

   **Claude runs:** `proj list --json`, which shows subaud-practice among the projects once your add arrives.

   You did it on the page and the agent saw it from the terminal; asking the agent to add a folder works too, and the page shows it either way.

3. **Open a session**

   A session is one terminal for one piece of work, with an agent running in it and its own split page.

   ```
   Open a proj session called subaud-practice/try with Claude in it.
   ```

   **Claude runs:** `proj new subaud-practice/try --agent claude`, which opens it in the background.

   Your screen stays where it is, and the new session shows up on the sessions tab of proj's page; + new work at the top of the page opens one the same way.

4. **Open it in Chrome or Ghostty**

   A session's terminal lives in one place at a time: its Chrome window, with the split page and its tabs, or a Ghostty terminal, and moving it to one detaches it from the other.

   ```
   I'll press chrome on the try session on proj's sessions tab, then ghostty. Tell me what each one does.
   ```

   **Claude runs:** no command; it answers here while you press.

   Press chrome and the session's own window comes to the front with its split page; come back to this window the same way you'd switch to any other.

5. **Check the servers**

   Each tool with a page runs a small server on your machine, and the servers tab shows each one up or down, with its log, restart and stop.

   ```
   I'm looking at the servers tab on proj's page. Tell me in a line what each server there is for, and which say restart.
   ```

   **Claude runs:** no command; it answers from what you see.

   After an update, a running server says restart to run it: press restart there, or ask the agent to.

6. **Save your layout**

   proj remembers your sessions, and save layout on the saved tab keeps where they sit in Ghostty's windows and tabs too, so a restart doesn't scatter them.

   ```
   I pressed save layout on proj's saved tab. Also write the list of running sessions to a file in my practice repo, so I can restore from the terminal too.
   ```

   **Claude runs:** `proj live --json`, saving its list to `sessions.json` in your practice repo.

7. **Restore a session**

   A session that ends, after a restart or when you close it, stays on the saved tab, and restoring it brings back its agent's conversation where it left off.

   ```
   End my try session the way a restart would. Then I'll restore it, on proj's saved tab or by asking you here.
   ```

   **Claude runs:** ends the try session's terminal, and when you ask here, `proj restore --from` with `sessions.json`; a restore you press on the page reopens it the same way.

   Reap, on the sessions tab, is different: it kills a session and forgets it, so there's nothing to restore.

8. **Leave a note**

   The scratch pad is for things you'll need soon; your agent writes to the same pad you see.

   ```
   Put a note in my scratch pad: try the galley lesson after the diazo one.
   ```

   **Claude runs:** `scratch append` with your note, then `scratch print` to show the pad.

9. **Hand over a pretend secret**

   This key is made up, so nothing is at risk; type anything in the box that opens, and the value goes only into a .env file.

   ```
   I need to give you PRACTICE_KEY for my practice repo. Ask me for it with creel.
   ```

   **Claude runs:** creel, which opens a masked box for you; the agent reads back only "added".

   Whenever you're about to paste a real secret into the chat, ask for creel instead.
