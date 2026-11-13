# Plan a change on diazo's page

**Goal:** Take a one-line idea for your practice repo to an approved plan on diazo's page, and watch the agent build it.

## Walkthrough

1. **Say the idea**

   A plan starts from one sentence; this one is a README for your practice repo, the throwaway folder lesson 1 made for trying things.

   ```
   Plan this with diazo: add a README to my practice repo that says what the repo is for.
   ```

   **Claude runs:** `diazo_open`, which opens the plan's page as a tab beside this lesson.

   You could ask for a README with no plan at all; this lesson plans it so you see how the page works on something small.

2. **Guess what comes first**

   Before anything is written, think about what the agent should do first with your idea.

   ```
   I think it says back what it understood and waits for me to confirm, before it writes anything. Am I right?
   ```

   **Claude runs:** nothing; it checks your pick against what's on the page.

   **Choose:**

   - **It says back what it understood**: I think it says back what it understood and waits for me to confirm, before it writes anything. Am I right?
   - **It writes the README straight away**: I think it writes the README straight away and shows me the result. Am I right?
   - **It asks me questions here in the terminal**: I think it asks me its questions here in the terminal. Am I right?

3. **Confirm the understanding**

   The understanding is the agent's summary of what you want: the outcome, the limits, and how you'll know it worked. Correct anything that's off, then press Confirm on the page.

   ```
   Show me where the understanding is on diazo's page and what each point means.
   ```

   **Claude runs:** no command; it points you to the card on the page.

4. **Answer a decision**

   A decision card is one choice the change needs, with its options and the one the agent recommends. You pick on the page, not here.

   ```
   Walk me through the decision card on diazo's page; I'll pick there.
   ```

   **Claude runs:** `diazo_status`, to see which cards wait on you.

   A change this small may have no real choice in it; then the agent says so and you go straight on.

5. **Approve the spec**

   The spec says what will change and why, usually in less than a page. Read it, then press Approve on the page.

   ```
   I've read the spec on diazo's page. What should I check before I approve it?
   ```

   **Claude runs:** no command; it reads the spec with you.

6. **Approve the plan**

   A plan breaks the spec into tasks, and you can drop any task you don't want before you approve it.

   ```
   Explain each task in the plan, then I'll approve it on the page.
   ```

   **Claude runs:** no command; it explains the tasks.

7. **Build it**

   With the plan approved, the agent builds it and marks each task on the page as it goes.

   ```
   Build the approved plan.
   ```

   **Claude runs:** `diazo_update` to mark each task, then writes `README.md` and commits it in your practice repo.

   The next lesson opens that README in galley so you can edit it with the agent.
