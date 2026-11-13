# Review writing in galley

**Goal:** Edit the README your plan produced, in rounds with your agent, and approve it.

## Walkthrough

1. **Open the README**

   galley opens a document in your browser for the two of you to revise; this one is the README lesson 3 built.

   ```
   Let's use galley to edit README.md in my practice repo.
   ```

   **Claude runs:** `galley_open`, which opens the document as a tab beside this lesson.

2. **Ask for a change**

   Select a few words in the README and Add instruction appears beside them; write what you'd like changed, such as "say who it's for".

   ```
   I've added an instruction on the page. What happens to it when I press Revise?
   ```

   **Claude runs:** no command; it explains while you add the instruction.

3. **Fix something yourself**

   Small fixes are quicker to type than to ask for: click in the document and change a word.

   ```
   I changed a word myself. Will you keep my edit when you rewrite?
   ```

   **Claude runs:** no command; it answers from how galley works.

4. **Guess what Revise does**

   Before you press it, think about what reaches the agent.

   ```
   I think my instruction and my own edit go to you together, and your rewrite appears on the page. Am I right?
   ```

   **Claude runs:** nothing; it checks your pick.

   **Choose:**

   - **Both go together**: I think my instruction and my own edit go to you together, and your rewrite appears on the page. Am I right?
   - **Only the instruction goes**: I think only my instruction goes to you, and my own edit is lost. Am I right?
   - **I have to paste it into the chat**: I think I have to paste my instruction into the chat for you. Am I right?

5. **Revise**

   Press Revise on the page; the rewrite streams in as you watch.

   ```
   I pressed Revise. Tell me what you changed.
   ```

   **Claude runs:** reads the round galley sends, rewrites the README, and answers it with `galley_ack`.

   History on the page shows each version and what changed between them.

6. **Approve it**

   When it reads right, approving ends the review with the document as it stands.

   ```
   I approve the document.
   ```

   **Claude runs:** `galley_approve`, then commits the README in your practice repo.

   That's the walk. The Guide tab on any tool's page has the rest when you want it, and two more lessons wait until they're useful: sessions talking to each other once you run two, and finding waste once you work in a repo with CI.
