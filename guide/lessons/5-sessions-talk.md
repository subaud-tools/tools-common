# Sessions talk

**Goal:** Have one session send another a message and get its answer, with no copying between terminals.

**Offered when:** you have two sessions running.

## Walkthrough

1. **See who's there**

   Every session that can use muster joins it when it starts, under its session's name.

   ```
   Who else is on the bus, and what is each session working on?
   ```

   **Claude runs:** `list_agents`, which lists the sessions and whether each is busy.

2. **Send a note**

   A message goes to a session by name, and wakes it at its next turn.

   ```
   Ask the ‹other session› session what it's working on, and tell me when it answers.
   ```

   **Claude runs:** `send_message` to that session.

3. **Guess where the answer lands**

   Think about how the answer reaches this session.

   ```
   I think the answer comes back on the same thread, and you tell me when it arrives. Am I right?
   ```

   **Claude runs:** nothing; it checks your pick.

   **Choose:**

   - **Back on the same thread**: I think the answer comes back on the same thread, and you tell me when it arrives. Am I right?
   - **In the other terminal only**: I think the answer only shows in the other terminal, and I have to go and read it. Am I right?
   - **It goes to me by email**: I think the answer comes to me by email. Am I right?

4. **Read the answer**

   The other session answers when it's free; if it's busy, give it a minute.

   ```
   Has it answered? Read me the thread.
   ```

   **Claude runs:** `get_inbox`, then `get_thread` to read the answer.

   From here on, when two sessions need to agree on something, ask one to tell the other, rather than carrying it yourself.
