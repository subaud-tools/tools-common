# The getting-started walk

Nine clicks on the real pages, each lit by a ring on the control and a two-line note beside it: the first line says what to press, the second why. The agent does each step's work first, then lights it; the learner's click moves the walk on. Each step names its tool, the control's `data-walk` hook, what the agent does first and the control in words. The click itself moves the walk on: the page posts it to proj's split page, so no step waits on a tool's channel. While the agent is still preparing a step, its note says so, off the page's text, and the ring lands the moment the control appears. Galley ends at Revise, then Approve: History hides Approve, so reading what changed is the Guide's.

## 1
tool: proj
target: split
press: ok
look: the split page, your agent on the left
agent: Nothing more: proj guide start made the walk's scratch place in proj's state and opened the split page beside this terminal.

This is your agent on the left, its pages on the right.
Next, a practice plan opens on diazo's page.

## 2
tool: diazo
target: reply
look: the box under the agent's take, and Send
agent: Open the practice plan with diazo_open on the practice plan's folder that proj guide start printed, titled Practice plan, and post a short take on a ten-line README with one recommended direction.

Type a few words in the box under the take, like: Sounds good. Then press Send.
Your agent reads every reply before it goes on.

## 3
tool: diazo
target: direction
look: This is the direction under the take
agent: Answer the reply in the take's thread with diazo_reply, in one sentence.

Press This is the direction.
The take reads right, so you tell your agent to go ahead.

## 4
tool: diazo
target: choose
look: Choose on the recommended option of the decision card
agent: Post one decision card with diazo_update: two options for the README's tone and your recommendation.

Press Choose on the option your agent recommends.
That sends your choice: decisions are yours, your agent only recommends.

## 5
tool: diazo
target: approve-spec
look: Approve on the spec
agent: Write a short spec.md for the README in the practice plan's folder and print it with diazo_print_spec.

Press Approve on the spec.
Nothing is planned until you agree with what will change.

## 6
tool: diazo
target: approve-plan
look: Approve on the plan
agent: Declare one plan, write it with one task (write the README) and print it with diazo_print_plan.

Press Approve on the plan.
Nothing is built until you approve the plan.

## 7
tool: galley
target: add-instruction
look: Add instruction, after you select a sentence
agent: Write the practice README at the practice README path that proj guide start printed (outside the plan's folder: diazo keeps its own README.md there), ten lines as the spec says, and open it with galley_open.

Select a sentence in the README, then press Add instruction.
Say what to change, like: make this shorter. Your agent does the rewriting.

## 8
tool: galley
target: revise
look: Revise at the top of the page
agent: Nothing: wait for the learner's click.

Press Revise.
Your instructions go to your agent, which rewrites those passages.

## 9
tool: galley
target: approve
look: Approve at the top of the page, once your agent has answered the round
agent: Make the round's changes to the README, then answer the round with galley_ack.

Read the rewrite, then press Approve.
That seals the README, and the walk is done.
