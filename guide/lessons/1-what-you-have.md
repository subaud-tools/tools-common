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

   kempt installed your tools, so it can tell you which ones you have.

   ```
   Which subaud tools do I have, and what is each one for, in a line each?
   ```

   **Claude runs:** `kempt plan`, which lists what's installed and changes nothing.

   You don't need all of them today; each lesson brings in one or two.

3. **Guess what happens next**

   Before checking for updates, think about what kempt does when it finds one.

   ```
   I think kempt shows me what it would change and waits for my yes. Am I right?
   ```

   **Claude runs:** nothing; it checks your pick against what kempt does.

   **Choose:**

   - **It shows me first and waits**: I think kempt shows me what it would change and waits for my yes. Am I right?
   - **It updates everything straight away**: I think kempt updates everything straight away. Am I right?
   - **It only tells me, and I update by hand**: I think kempt only tells me, and I have to update each tool by hand. Am I right?

4. **Check for updates**

   New versions ship often, and kempt is how they reach you.

   ```
   Are any of my tools out of date? If so, show me what would change before you update them.
   ```

   **Claude runs:** `kempt outdated`, then `kempt upgrade` only after you say yes.

   If everything is current, there's nothing to do; that's the usual answer.
