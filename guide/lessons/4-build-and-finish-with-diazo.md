# Build and finish with diazo

**Goal:** Watch the agent build the plan you approved in lesson 3 with diazo's page open beside the terminal: do the one step only you can do, sign it off, read the wrap-up, share the record, and pick the plan up from a new session.

## Walkthrough

1. **Build it**

   With the plan approved, the agent builds it task by task, and the Build view on diazo's page marks each one as it starts and finishes.

   ```
   Build the plan I approved, and mark each task on diazo's page as you go.
   ```

   **Claude runs:** a check that `~/subaud/practice` exists, saying so if it doesn't, then `diazo_update` to mark each task building, then writes the files, commits them in your practice repo, and marks the task done with what it did.

   The track at the top of the page counts the tasks done, so you can glance at it rather than ask.

2. **Ask how it's going**

   You don't have to watch the page: a question typed here gets the same answer the page shows.

   ```
   Which tasks are done and which is running? Give me the link to the build on diazo's page.
   ```

   **Claude runs:** `diazo_status`, then answers here with a link that opens the Build view.

   A note on the build's card on the page works the same way: it arrives here as a message, and the agent answers in the card's thread.

3. **Do a step only you can do**

   Some things only you can do, such as reading a file, signing in or saying go, so the agent posts them as steps under Your steps and waits.

   ```
   Post a step on diazo's page asking me to add my first line to the notes file, and wait for me.
   ```

   **Claude runs:** `diazo_update` with the step, its why and how, then waits for your answer.

   Add the line, then press Done on the step, or just say "done" here: the step closes either way, and the page marks it answered in the terminal when you say it here.

4. **Sign it off**

   When everything is built, a sign-off card lists what to try; press Sign off when it works, or Needs changes with a note when it doesn't.

   ```
   Post the sign-off on diazo's page. I'll try what it lists and answer there.
   ```

   **Claude runs:** `diazo_update` with the sign-off card: what was built, and what to try.

   Needs changes sends the change back to the earliest stage it touches, a decision, the spec or a new task, and the sign-off comes back once that's built.

5. **Read the wrap-up**

   After you sign off, the agent writes a short wrap-up for you: what you can do now, what came out of it, and what went differently from the plan.

   ```
   Write the wrap-up, and tell me what's waiting under Pick up next.
   ```

   **Claude runs:** writes `wrap-up.md` and prints it with `diazo_print_wrapup`, which marks the plan Completed.

   The license task you dropped in lesson 3 waits under Pick up next, with a Start a plan button for when you want it.

6. **Share the record**

   The Record switch on the plan's page shows the whole plan in one view, and the same record sits in the plan's folder as a page you can send, one that opens from disk with no server.

   ```
   Commit the plan's folder in my practice repo, and tell me which file to send someone who wants to read the plan.
   ```

   **Claude runs:** commits the folder, then points you to its `record.html`; its `README.md` is the same record for reading on GitHub.

7. **Pick it up in a new session**

   A plan isn't tied to the session that started it: any session can open it again and carry on, and whatever you left unanswered comes to that session.

   ```
   Open a new cast session called practice/later with Claude in it. I'll ask it there to pick up my practice-repo plan.
   ```

   **Claude runs:** `cast new practice/later --agent claude`, which opens it in the background.

   Switch to it and say "pick up my practice-repo plan with diazo"; it runs `diazo_open` on the same folder, and the page talks to it from then on.
