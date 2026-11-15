# Plan with diazo

**Goal:** Take an idea for your practice repo to an approved spec and plan with diazo's page open beside the terminal: answer on the page or in the terminal, whichever is nearer, and watch each answer land on the other side.

## Walkthrough

1. **Say the idea**

   A plan starts from one sentence typed here; this one has a few real choices in it, so the page has something to show.

   ```
   Plan this with diazo: in my practice repo, add a README that says what the repo is for, a notes file for what I learn in each lesson, and a license.
   ```

   **Claude runs:** a check that `~/subaud/practice` exists, saying so if it doesn't, then `diazo_open`, which opens the plan's real page as a tab on the right, beside the terminal, then posts its first take on the idea there.

   You asked in the terminal and the answer landed on the page; the rest of the lesson works the same way.

2. **Reply to the take**

   The start goes in rounds: each take ends in one direction the agent recommends, and you reply on the page until it reads right.

   ```
   I'm replying to your take on diazo's page. Answer my reply with your next round.
   ```

   **Claude runs:** `diazo_update` with its next round, when your reply arrives from the page.

   Try a reply such as "the notes file should have one heading per lesson" and watch the next round take it in.

3. **Set the direction**

   When a round reads right, press This is the direction under it; the agent then writes down what it understood and the choices still open.

   ```
   When I press This is the direction on diazo's page, write the understanding and the decisions from that round.
   ```

   **Claude runs:** `diazo_update` with the understanding card and a card for each decision.

4. **Check the understanding**

   The understanding lists the outcome, the limits and how you'll know it worked, each marked as something you said or something the agent assumed.

   ```
   Tell me which points of the understanding on diazo's page you assumed, so I can check those before I press Looks right.
   ```

   **Claude runs:** `diazo_status`, then reads the assumed points back to you.

   Correct a point on the page if it's wrong; press Looks right when it isn't.

5. **Ask about a decision**

   A decision card is one choice with its options and the agent's recommendation, and the buttons under it ask for more without leaving the page.

   ```
   I'll press Explain this more on a decision card on diazo's page. Answer me in the card's thread.
   ```

   **Claude runs:** `diazo_reply`, which puts its answer in the card's thread.

   Is there a smaller option? works the same way: the agent adds a smaller option or says why there isn't one. Press Choose when you've picked.

6. **Answer one in the terminal instead**

   You don't have to click: an answer typed here lands on the page as yours, marked as given in the terminal, and every card that rests on it updates.

   ```
   On the license decision, I'll take your recommendation. Record it on diazo's page.
   ```

   **Claude runs:** `diazo_update`, which records your choice with your words on the card; watch it change on the right.

   The same goes the other way: anything you write on the page arrives here as a message, so use whichever side you're already looking at.

7. **Leave a note that becomes a rule**

   A note on a card can say something that holds for the whole plan, and the agent keeps it as a principle.

   ```
   I left a note on diazo's page: keep every file short enough to read in a minute. Treat it as a rule for the whole plan.
   ```

   **Claude runs:** `diazo_update`, which adds it under Principles and revises any card it changes.

   Press Strike on a principle if you change your mind; the agent stops applying it.

8. **Reverse a call**

   The agent settles small choices itself and lists them as calls, each with what you'd get instead, so it only asks you about real choices.

   ```
   Show me your calls on diazo's page. I'll press Reverse on one I'd rather go the other way.
   ```

   **Claude runs:** `diazo_status` to find the calls, then `diazo_update` to take the other path once your Reverse arrives.

9. **Approve the spec**

   With every decision chosen, the agent writes the spec: what will change and why, usually in less than a page.

   ```
   Write the spec from what I decided. I'll read it and press Approve on diazo's page.
   ```

   **Claude runs:** writes `spec.md` and prints it with `diazo_print_spec`.

   Lesson 6 comes back to this spec to tighten its wording in galley.

10. **Drop a task, approve the plan**

   The plan breaks the spec into tasks, and you can drop any you don't want now before you approve it; a dropped task waits under Later.

   ```
   Write the plan. I'll drop the license task on diazo's page and approve the rest.
   ```

   **Claude runs:** writes the plan and prints it with `diazo_print_plan`; your Drop and Approve arrive from the page.

   Nothing is built yet: lesson 4 builds what you approved, and you watch it on the same page.
