# diazo's walk

Five clicks on a practice plan on diazo's page, from the agent's take to an approved plan. Each step has two notes: `prepare` shows while the agent is still getting the step ready, then the note once the control is there. The end card says what the learner learned and leads to galley. The intro card opens the walk: what the tool is for and what the learner will do, with Start, while the agent prepares step 1.

## intro
title: diazo: plan before you build.
text: diazo is where you and your agent agree on a change before anything is built. Your agent is opening a small practice plan for a ten-line README. In five clicks you'll answer its take, make a decision, and approve a spec and a plan.

## 1
tool: diazo
target: reply
look: the reply box under the agent's take, and Send
agent: Open the practice plan with diazo_open on the practice plan's folder that proj guide start printed, titled Practice plan, and post a short take on a ten-line README with one recommended direction.
prepare: Your agent is opening a practice plan and writing a short take on it: what it understood you want, and the way it would go. When it's there, you'll reply to it.

Type a few words in the box under the take, like "Sounds good", then press Send.
This is diazo's page, where you and your agent plan a change before anything is built. The take is its first read of what you want. Your agent reads every reply before it goes on, so this is the moment to correct it.

## 2
tool: diazo
target: direction
look: This is the direction, under the take
agent: Answer the reply in the take's thread with diazo_reply, in one sentence.
prepare: Your agent is reading your reply and answering it. When it has, you'll tell it to go ahead.

Press This is the direction.
The take reads right, so you settle where the plan is headed. Your agent now works out the choices inside it and brings each one to you.

## 3
tool: diazo
target: choose
look: Choose on the recommended option of the decision card
agent: Post one decision card with diazo_update: two options for the README's tone and your recommendation.
prepare: Your agent is laying out a decision: two ways to write the README's tone, with the one it recommends. When the card is there, you'll pick one.

Press Choose on the option your agent recommends.
Each real choice in a change comes to you as a card like this, with its options side by side. Your agent recommends; you decide. You can pick another option just as easily.

## 4
tool: diazo
target: approve-spec
look: Approve on the spec
agent: Write a short spec.md for the README in the practice plan's folder and print it with diazo_print_spec. Its sections, in order: Goal (with no Rests on line), one on what the README says, Left out, and How we'll know it works. Every section after Goal ends with the line "Rests on: DCSN1" and is printed citing DCSN1, the tone decision. Cite no other id: the direction (DIRN) is not a decision, and diazo refuses a spec that cites it.
prepare: Your agent is writing a short spec from your decision: what will change and why. When it's there, you'll read it and approve it.

Press Approve on the spec.
The spec says in plain words what will change. Nothing is planned until you agree with it, so this is where you catch a misunderstanding before any work starts.

## 5
tool: diazo
target: approve-plan
look: Approve on the plan
agent: Declare PLAN1 with diazo_update (topic write-readme, covering the README), write plans/1-write-readme.md in the practice plan's folder with "# PLAN1: Write the README" and the sections Spec, The change, Left out and Where, then one task, "### Task 1: Write the README", opening with the lines **Does:**, **Files:**, **Checks:** and "**Serves:** DCSN1", and print it with diazo_print_plan as TASK1 serving DCSN1. Cite no other id: the direction (DIRN) is not a decision, and diazo refuses a plan that cites it.
prepare: Your agent is turning the spec into a plan with one task: write the README. When it's there, you'll approve it.

Press Approve on the plan.
The plan lists the tasks your agent will build. Nothing is built until you approve it, and before you do, you can drop any task you don't want.

## end
learned: Your agent's take comes first, and your reply is what it builds on.
learned: Choices come to you as cards: your agent recommends, you decide.
learned: A spec, then a plan, each waits for your approval before anything is built.
learned: To plan your own change, tell your agent: "Start a new planning session in diazo for ‹your idea›."
next: Your agent writes the README now; edit it with galley.
next_tool: galley
