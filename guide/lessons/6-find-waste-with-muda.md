# Find waste with muda

**Goal:** Measure one repository's CI, read what muda found, and decide on one finding on its page.

**Offered when:** you work in a GitHub repo with CI runs to measure.

## Walkthrough

1. **Start the measurement**

   muda looks at your real CI runs over a stretch of time before it says anything about them.

   ```
   Use muda to measure this repository's delivery pipeline.
   ```

   **Claude runs:** `muda_open`, which opens muda's page as a tab beside this lesson, then reads the repo's workflows.

2. **Check what it read**

   Before measuring, muda says what it found in the repo and what it will do because of it; correct it on the page if it's wrong.

   ```
   Walk me through what muda read about this repo; I'll answer on the page.
   ```

   **Claude runs:** `muda_status`, to see what waits on you.

3. **Guess what comes first**

   Think about what muda does before it suggests any fix.

   ```
   I think it records a baseline of real runs first, and only then looks for waste. Am I right?
   ```

   **Claude runs:** nothing; it checks your pick.

   **Choose:**

   - **A baseline first**: I think it records a baseline of real runs first, and only then looks for waste. Am I right?
   - **A fix first**: I think it suggests fixes straight away from the workflow files. Am I right?

4. **Decide on a finding**

   A finding is one piece of waste, with what it costs, its fixes and the one muda recommends; you choose on the page.

   ```
   Explain the first finding on muda's page; I'll choose there.
   ```

   **Claude runs:** `muda_post` to post the findings, then waits for your choice.

   If you choose a fix, it comes back as one pull request, and it merges only when you say yes.
