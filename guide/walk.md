# The getting-started walk

Ten clicks on the real pages, each lit by a ring on the control and a two-line note beside it: the first line says what to press, the second why. The agent does each step's work first, then lights it; the learner's click moves the walk on. Each step names its tool, the control's `data-walk` hook, what the agent does first, what to look for when the control isn't on the page, and the tool event that means the click landed.

## 1
tool: proj
target: split
press: ok
look: the split page, your agent on the left
agent: Nothing more: proj guide start made the walk's scratch place in proj's state and opened the split page beside this terminal.
advance: proj: the learner presses ok on the note.

This is your agent on the left, its pages on the right.
Next, a practice plan opens on diazo's page.

## 2
tool: diazo
target: reply
look: Reply under the agent's take
agent: Open the practice plan with diazo_open in the scratch place proj guide start named, titled Practice plan, and post a short take on a ten-line README with one recommended direction.
advance: diazo: the learner's reply to the take arrives on diazo's channel.

Press Reply under the take and send a few words, like: Sounds good.
Your agent reads every reply before it goes on.

## 3
tool: diazo
target: direction
look: This is the direction under the take
agent: Answer the reply in the take's thread with diazo_reply, in one sentence.
advance: diazo: the take's This is the direction arrives on diazo's channel.

Press This is the direction.
The take reads right, so you tell your agent to go ahead.

## 4
tool: diazo
target: choose
look: Choose on the decision card
agent: Post one decision card with diazo_update: two options for the README's tone and your recommendation.
advance: diazo: the decision's choice arrives on diazo's channel.

Press Choose on the option you like.
Decisions are yours; your agent recommends one and waits.

## 5
tool: diazo
target: approve-spec
look: Approve on the spec
agent: Write a short spec.md for the README and print it with diazo_print_spec.
advance: diazo: the spec's approval arrives on diazo's channel.

Press Approve on the spec.
Nothing is planned until you agree with what will change.

## 6
tool: diazo
target: approve-plan
look: Approve on the plan
agent: Declare one plan, write it with one task (write the README) and print it with diazo_print_plan.
advance: diazo: the plan's approval arrives on diazo's channel.

Press Approve on the plan.
Nothing is built until you approve the plan.

## 7
tool: galley
target: add-instruction
look: Add instruction, after you select a sentence
agent: Write the practice README in the scratch place, ten lines as the spec says, and open it with galley_open.
advance: galley: the instruction is saved on galley's page.

Select a sentence in the README, then press Add instruction.
Say what to change, like: make this shorter. Your agent does the rewriting.

## 8
tool: galley
target: revise
look: Revise at the top of the page
agent: Nothing: wait for the learner's click.
advance: galley: the round arrives on galley's channel.

Press Revise.
Your instructions go to your agent, which rewrites those passages.

## 9
tool: galley
target: history
look: History at the top of the page
agent: Make the round's changes to the README, then answer the round with galley_ack.
advance: galley: the history opens on galley's page.

Press History and read what changed.
Each round shows exactly what your agent rewrote.

## 10
tool: galley
target: approve
look: Approve at the top of the page
agent: Nothing: wait for the learner's click.
advance: galley: the approval arrives on galley's channel.

Press Approve.
That seals the README, and the walk is done.
