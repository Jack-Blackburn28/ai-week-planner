# Product Vision

## The problem

Jack's week is a mix of **immovable commitments** (a full-time job at Liatrio, plus
university classes) and **everything else he wants to fit around them** — homework, gym,
golf, personal tasks. Planning that by hand across two calendars, a school portal, and
meeting notes is tedious and easy to get wrong.

## The product

A single-page dashboard that plans the week **through conversation**. The AI knows the
fixed skeleton of the week and proposes where the flexible stuff should go. Jack stays in
control: nothing lands on his real calendar until he approves it.

### Three surfaces

- **Week calendar (left, dominant).** Mon–Sun, 6am–10pm. Immovable work hours and class
  times are drawn first; work meetings nest inside the work block. AI-planned blocks fill
  the free space. Color is by **source**: Work = blue, School = purple, Personal = green.
- **Todo dashboard (right).** Two Things3-style lists — **Work** (action items from
  Granola meetings) and **School** (assignments from Canvas). Every item always shows a
  due date; due-soon and overdue items are emphasized.
- **Chat (floating bubble → right drawer).** The only way to interact with the planner.

### The planning loop

1. Jack tells the AI what he wants ("fit 3 gym sessions and finish my essay this week").
2. The AI proposes a plan — blocks appear on the calendar in a **dashed/pending** style.
3. Jack reviews on the calendar and hits **Approve** or **Make Changes**.
4. On approve, blocks become solid and (from Story 3) are written to his personal Google
   Calendar.

## Non-negotiable rules

1. **Never schedule over an immovable block.** Work hours and class times are sacred.
2. **Approval before commit.** The AI proposes; Jack approves. Nothing is written without
   an explicit approval.
3. **Conflicts are surfaced, not guessed.** If a request doesn't fit, the AI stops and
   asks how to resolve it, offering concrete options.

## Who it's for

One user (Jack). Single-user by design. The deployed version gets simple password
protection — no multi-user accounts.

## What "done" looks like

Jack opens the app, sees an accurate, current week, tells the AI how he wants to spend
his free time, reviews the proposal on the calendar, approves, and the plan is on his
real calendar — on desktop or phone.
