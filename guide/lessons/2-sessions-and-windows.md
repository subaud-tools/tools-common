# Sessions and windows

**Goal:** Open a session for your practice repo, leave yourself a note in its scratch pad, and hand your agent a pretend secret without it seeing the value.

## Walkthrough

1. **Add the project**

   proj keeps a list of the folders you work in, so each can have its own sessions.

   ```
   Add my subaud-practice folder to proj's projects.
   ```

   **Claude runs:** adds the folder to proj's list of project folders.

2. **Open a session**

   A session is one terminal for one piece of work, with an agent running in it and its pages beside it.

   ```
   Open a proj session called subaud-practice/try with Claude in it, and tell me how to switch to it.
   ```

   **Claude runs:** `proj new subaud-practice/try --agent claude`, which opens it in the background.

   Your screen stays where it is; you switch when you're ready, and come back here the same way.

3. **Leave a note**

   The scratch pad is for things you'll need soon; your agent writes to the same pad you see.

   ```
   Put a note in my scratch pad: try the galley lesson after the diazo one.
   ```

   **Claude runs:** `scratch append` with your note, then `scratch print` to show the pad.

4. **Guess who sees the secret**

   Your agent sometimes needs a key or a password; think about where the value goes.

   ```
   I think the key goes into a .env file and you only hear that it was added. Am I right?
   ```

   **Claude runs:** nothing; it checks your pick against how creel works.

   **Choose:**

   - **Only the .env file gets it**: I think the key goes into a .env file and you only hear that it was added. Am I right?
   - **You see it and save it**: I think you see the key and save it for me. Am I right?
   - **It stays in the chat**: I think the key stays in our chat so you can use it later. Am I right?

5. **Hand over a pretend secret**

   This key is made up, so nothing is at risk; type anything in the box that opens.

   ```
   I need to give you PRACTICE_KEY for my practice repo. Ask me for it with creel.
   ```

   **Claude runs:** creel, which opens a masked box for you; the agent reads back only "added".

   Whenever you're about to paste a real secret into the chat, ask for creel instead.
