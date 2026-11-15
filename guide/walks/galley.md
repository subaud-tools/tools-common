# galley's walk

Three clicks on the practice README in galley, from an instruction to an approved document. Each step has two notes: `prepare` shows while the agent is still getting the step ready, then the note once the control is there. The end card says what the learner learned and ends the walks.

## 1
tool: galley
target: add-instruction
look: Add instruction, after you select a sentence
agent: Write the practice README at the practice README path that proj guide start printed (outside the plan's folder: diazo keeps its own README.md there), ten lines as the spec says, and open it with galley_open.
prepare: Your agent is writing the README your plan asked for and opening it in galley. When it's there, you'll select a sentence and ask for a change.

Select a sentence in the README, then press Add instruction.
This is galley, where you and your agent revise a document together. Say what you'd change, like "make this shorter"; your agent does the rewriting. You can add several instructions before sending them.

## 2
tool: galley
target: revise
look: Revise at the top of the page
agent: Nothing: wait for the learner's click.
prepare: Nothing to prepare.

Press Revise.
Your instructions go to your agent together, as one round. It rewrites just those passages, and the new words stream into the page as you watch.

## 3
tool: galley
target: approve
look: Approve at the top of the page, once your agent has answered the round
agent: Make the round's changes to the README, then answer the round with galley_ack.
prepare: Your agent is rewriting the passages you marked. When it has answered, you'll read the result and approve it.

Read the rewrite, then press Approve.
Approving ends the review with the document as it stands. Every round is kept, so you can always see what changed between versions.

## end
learned: Select words and add an instruction to ask for a change.
learned: Revise sends your instructions as one round, and your agent rewrites.
learned: Approve ends the review with the document as it stands.
next: That's the walk. Press Guide any time to see what each tool is for and what to ask.
next_tool:
