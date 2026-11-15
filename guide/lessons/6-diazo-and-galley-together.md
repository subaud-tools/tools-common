# diazo and galley together

**Goal:** Tighten the wording of lesson 3's spec in galley, with diazo's and galley's pages open side by side as tabs beside the terminal, approve it in galley, and see diazo show the edit against the spec you approved.

## Walkthrough

1. **Ask for a review of the spec**

   A spec is writing too, and galley is where wording gets tightened; diazo can hand it over as a step of yours that galley's approval closes.

   ```
   Post a step on diazo's page to review my practice-repo spec in galley, and open the spec in galley for me.
   ```

   **Claude runs:** a check that `~/subaud/practice` exists, saying so if it doesn't, then `diazo_update` with a step linked to `spec.md`, then `galley_open`, which opens the spec as a galley tab on the right, beside diazo's.

   Both pages are tabs on the same split page now; switch between them as you would any tabs.

2. **Mark up the wording**

   Select a sentence that says more than it needs and add an instruction such as "say it in half the words"; add one on the whole document too, such as "cut anything that repeats".

   ```
   I'm marking up the spec in galley. Keep what it says; only tighten how it says it.
   ```

   **Claude runs:** nothing yet; your instructions wait on the page until you press Revise.

   What you type here goes with the round too: the agent reads it next to your instructions.

3. **Revise and read what changed**

   Press Revise: the agent rewrites the passages you marked, and History shows the spec before and after, side by side.

   ```
   I pressed Revise on the spec in galley. Tell me in a line what you cut.
   ```

   **Claude runs:** edits `spec.md` for each instruction, then answers the round with `galley_ack`.

4. **Approve it in galley**

   When the spec reads right, press Approve in galley, or say so here and the agent approves it for you.

   ```
   The spec reads right now. Approve it in galley.
   ```

   **Claude runs:** `galley_approve` on `spec.md`, then `diazo_update`, which closes the review step on diazo's page as approved in galley.

   Press Approve on the page instead and the step closes the same way; either side catches up.

5. **See the edit on diazo's page**

   The spec stays approved through an edit that keeps its meaning, and diazo marks it edited after approval, with a diff of what changed against the text you approved above it.

   ```
   Give me the link to the spec on diazo's page so I can read the diff.
   ```

   **Claude runs:** `diazo_status`, then answers here with a link that opens the spec's section.

   That's the walk. The Guide tab on any tool's page has the rest when you want it, and two more lessons wait until they're useful: sessions talking to each other once you run two, and finding waste once you work in a repo with CI.
