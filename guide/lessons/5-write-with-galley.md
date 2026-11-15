# Write with galley

**Goal:** Revise the README your plan built, in rounds with your agent, with galley's page open beside the terminal: mark it up on the page, talk it over in either place, read what changed, approve it and share it as a finished page.

## Walkthrough

1. **Open the README**

   galley opens a document in your browser for the two of you to revise in rounds; this one is the README lesson 4 built.

   ```
   Let's use galley to edit README.md in my practice repo.
   ```

   **Claude runs:** a check that `~/subaud/practice` exists, saying so if it doesn't, then `galley_open`, which opens the real review page as a tab on the right, beside the terminal.

2. **Ask for a change on a passage**

   Select a few words and press Add instruction beside them, then write what you'd like, such as "say who this is for".

   ```
   I'm adding instructions on the README in galley. Wait until I press Revise.
   ```

   **Claude runs:** nothing yet; instructions wait on the page until you send them.

3. **Fix a word yourself**

   A fix that's quicker to type than to explain goes straight into the document, and shows as your edit in the Instructions tab, with Revert if you change your mind.

   ```
   I changed a word in the README myself. Keep my edit when you rewrite.
   ```

   **Claude runs:** nothing yet; your edit goes with the round, and the agent won't undo it.

4. **Ask for a change to the whole document**

   An instruction about the whole thing goes in the box under On the whole document, at the top of the Instructions tab.

   ```
   I added an instruction on the whole README in galley. Tell me how you'll read it next to the ones on passages.
   ```

   **Claude runs:** no command; it answers here while you keep writing.

5. **Ask a question in Chat**

   The Chat tab is for questions, and it never changes the document, so you can ask without starting a round.

   ```
   I'm asking you something in galley's Chat tab. Answer me there.
   ```

   **Claude runs:** `galley_reply`, which puts its answer under your message in Chat.

   Ask for a change in Chat and the agent will ask you to make it an instruction instead.

6. **Revise**

   Press Revise on the page: your instructions and your edits go to the agent together, and the rewrite streams into the page as you watch.

   ```
   I pressed Revise in galley. When you're done, tell me in a line what you changed.
   ```

   **Claude runs:** edits `README.md` for each instruction, keeping your edits, then answers the round with `galley_ack`.

   You asked on the page and the answer landed in the document in front of you, while the terminal showed the agent working through it.

   While a round runs you can talk to the agent in the terminal too, about why it's making a change or what to keep; the page shows its progress under the round.

7. **Read what changed**

   History, above the document, keeps every round as a version, and shows each one as changes or side by side.

   ```
   Point me to History in galley so I can read your changes side by side.
   ```

   **Claude runs:** no command; it points you to History.

8. **Approve it**

   When the README reads right, press Approve: the review ends with the document as it stands. Saying so in the terminal works too: the agent approves it for you and the page locks the same way.

   ```
   When I approve the README in galley, commit it in my practice repo.
   ```

   **Claude runs:** commits `README.md` once your approval arrives from the page.

9. **Share it**

   An approved document can leave as a finished page: Share, in the bar under the document, downloads it or puts it on your clipboard, as HTML or Markdown.

   ```
   Which of galley's Share options should I pick to send this README to someone who'll only read it?
   ```

   **Claude runs:** no command; it tells you which fits, usually Share HTML for a reader and Markdown for someone who'll edit it.
