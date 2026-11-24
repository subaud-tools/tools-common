# galley's walk

Four clicks on the practice README in galley, from an instruction to an approved document and its Share menu. Each step has two notes: `prepare` shows while the agent is still getting the step ready, then the note once the control is there (or, with `ready`, once that element is: galley's Add instruction appears only after a selection). The end card says what the learner learned and ends the walks. The intro card opens the walk: what the tool is for and what the learner will do, with Start, while the agent prepares step 1.

## intro
title: galley: edit with your agent.
text: galley is where you and your agent revise a document together. Your agent is writing the README your plan asked for. In four clicks you'll ask for a change, send it, approve the result, and see how to share it.

## 1
tool: galley
target: add-instruction
ready: select-passage
look: Add instruction, after you select a sentence
agent: Write the practice README at the practice README path that cast guide start printed (outside the plan's folder: diazo keeps its own README.md there), ten lines as the spec says, and open it with galley_open.
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

## 4
tool: galley
target: share
look: Share at the bottom of the document, beside the time you approved it
agent: Nothing: wait for the learner's click.
prepare: Your approval is being saved. When it is, a Share button appears at the bottom of the document, beside the time you approved it.

Press Share.
Share hands the approved document to someone else. Download saves it as a web page or as Markdown. On a Mac, Share HTML and Share Markdown put the file on your clipboard, so pasting into a chat attaches it. Close the menu when you've looked.

## end
learned: Select words and add an instruction to ask for a change.
learned: Revise sends your instructions as one round, and your agent rewrites.
learned: Approve ends the review with the document as it stands.
learned: Share hands the approved document to a reader, as a page or as Markdown.
learned: To work on any document with your agent, tell it: "Edit ‹file› in galley."
next: That's the walk, and you're set up. Next, read the subaud guide at subaud.tools/guide/, starting with Working this way: how a project goes from here to a release. Each tool's Guide button is there for later.
next_tool:
