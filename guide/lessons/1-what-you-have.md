# What you have

**Goal:** Make a practice repo to try things in, see which tools are on your machine, and check they're current.

## Walkthrough

1. **Make a practice repo**

   The lessons need a place to try things where nothing matters, so the first step makes one: a new folder with git in it, on your machine only.

   ```
   Make me a practice repo for these lessons: a new folder called subaud-practice in my home folder, with git set up in it.
   ```

   **Claude runs:** `mkdir ~/subaud-practice` and `git init` in it.

   You can delete it when the lessons are done; nothing is sent to GitHub.

2. **See what's installed**

   Each tool answers with its version when asked, so your agent can tell you which ones you have.

   ```
   Which subaud tools do I have, and what is each one for, in a line each?
   ```

   **Claude runs:** each tool's `version`, for every subaud tool it finds on your machine; it changes nothing.

   You don't need all of them today; each lesson brings in one or two.

3. **Guess what happens next**

   Before checking for updates, think about what happens when a new version of a tool comes out.

   ```
   I think nothing changes until I ask my agent to update. Am I right?
   ```

   **Claude runs:** nothing; it checks your pick against how the tools update.

   **Choose:**

   - **Nothing changes until I ask**: I think nothing changes until I ask my agent to update. Am I right?
   - **The tools update themselves**: I think the tools update themselves in the background. Am I right?
   - **I reinstall from the website**: I think I have to reinstall each tool from its website. Am I right?

4. **Check for updates**

   New versions ship often, and your agent brings them in when you ask.

   ```
   Are any of my tools out of date? If so, tell me which before you update them.
   ```

   **Claude runs:** each tool's `update` after you say yes, or `kempt update` when kempt manages this machine.

   If everything is current, there's nothing to do; that's the usual answer.
