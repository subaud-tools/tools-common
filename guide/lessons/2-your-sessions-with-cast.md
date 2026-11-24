# Your sessions with cast

**Goal:** Give your practice repo its own project and session with cast's page open beside the terminal: open the session in Chrome or Ghostty, save your layout and bring it back, and keep a note and a secret where your agent can use them.

## Walkthrough

1. **Open cast's page**

   cast keeps your projects and their sessions, and its page shows them in four tabs: folders, sessions, saved and servers.

   ```
   Open cast's page as a tab beside this terminal.
   ```

   **Claude runs:** a check that `~/subaud/practice` exists, saying so if it doesn't, then `cast window --socket ‹socket› --pane ‹pane› --right ‹cast's page›`, with this session's tmux socket and pane from `$TMUX` and `$TMUX_PANE`, which starts cast's server when it isn't running and opens the page as a tab on the right of this split page.

   This window is a split page: the terminal on the left, tabs on the right. The lesson is one tab; cast's page is another, and later lessons open diazo's and galley's beside them.

2. **Add the project**

   A project is a folder you work in. cast finds projects inside the folders you give it, so you add the subaud folder and your practice repo shows up as a project in it. On the right, open the cast tab, then its folders tab; under add a root, type `~/subaud` and press add root. Then send this.

   ```
   I added ~/subaud on the folders tab of cast's page. Tell me when cast lists practice as a project.
   ```

   **Claude runs:** `cast window --socket ‹socket› --pane ‹pane› --right ‹cast's page›` first if cast's page isn't open as a tab, the same as step 1, then `cast list --json`, which shows practice among the projects once your add arrives.

   You did it on the page and the agent saw it from the terminal; asking the agent to add a folder works too, and the page shows it either way.

3. **Open a session**

   A session is one terminal for one piece of work, with an agent running in it and its own split page.

   ```
   Open a cast session called practice/try with Claude in it.
   ```

   **Claude runs:** `cast new practice/try --agent claude`, which opens it in the background.

   Your screen stays where it is, and the new session shows up on the sessions tab of cast's page; + new work at the top of the page opens one the same way.

4. **Open it in Chrome or Ghostty**

   A session's terminal lives in one place at a time: its Chrome window, with the split page and its tabs, or a Ghostty terminal, and moving it to one detaches it from the other.

   ```
   I'll press chrome on the try session on cast's sessions tab, then ghostty. Tell me what each one does.
   ```

   **Claude runs:** no command; it answers here while you press.

   Press chrome and the session's own window comes to the front with its split page; come back to this window the same way you'd switch to any other.

5. **Check the servers**

   Each tool with a page runs a small server on your machine, and the servers tab shows each one up or down, with its log, restart and stop.

   ```
   I'm looking at the servers tab on cast's page. Tell me in a line what each server there is for, and which say restart.
   ```

   **Claude runs:** `cast servers --json`, which lists the same servers the tab shows, each up or down and whether a newer build waits for a restart.

   After an update, a running server says restart to run it: press restart there, or ask the agent to.

6. **Save your layout**

   cast remembers your sessions, and save layout on the saved tab keeps where they sit in Ghostty's windows and tabs too, so a restart doesn't scatter them.

   ```
   I pressed save layout on cast's saved tab. Also write the list of running sessions to a file in my practice repo, so I can restore from the terminal too.
   ```

   **Claude runs:** `cast live --json`, saving its list to `sessions.json` in your practice repo.

7. **Restore a session**

   A session that ends, after a restart or when you close it, stays on the saved tab, and restoring it brings back its agent's conversation where it left off.

   ```
   End my try session the way a restart would. Then I'll restore it, on cast's saved tab or by asking you here.
   ```

   **Claude runs:** ends the try session's terminal, and when you ask here, `cast restore --from` with `sessions.json`; a restore you press on the page reopens it the same way.

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
