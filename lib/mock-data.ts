/**
 * Realistic seed data for Story 1. No backend yet — this is the in-memory world
 * the UI renders. Blocks are anchored to the displayed week by `day` index
 * (0 = Mon … 6 = Sun), and todo due dates are computed relative to today so the
 * demo always looks current (one overdue, a couple due-soon).
 *
 * The mock Proposal is hand-placed in free space and is asserted to avoid every
 * immovable block in the tests (previewing the Story 2 "never overlap" rule).
 */
import type {
  CalendarBlock,
  ChatMessage,
  Proposal,
  TodoItem,
} from "@/lib/types";
import { addDays, isoDate } from "@/lib/date";

/** minutes-from-midnight helper: `hm(9, 30)` → 570. */
const hm = (h: number, m = 0): number => h * 60 + m;

// Day column indices (Mon..Sun).
const MON = 0;
const TUE = 1;
const WED = 2;
const THU = 3;
const FRI = 4;
const SAT = 5;
const SUN = 6;

// --- Immovable skeleton: work hours (Mon–Fri 9–5) + evening classes ---------

const workHours: CalendarBlock[] = [MON, TUE, WED, THU, FRI].map((day) => ({
  id: `work-${day}`,
  title: "Work",
  source: "work",
  status: "approved",
  day,
  startMinutes: hm(9),
  endMinutes: hm(17),
  immovable: true,
}));

const classes: CalendarBlock[] = [
  {
    id: "class-hist-tue",
    title: "HIST 202",
    source: "school",
    status: "approved",
    day: TUE,
    startMinutes: hm(18),
    endMinutes: hm(19, 30),
    immovable: true,
    detail: "Lecture Hall B",
  },
  {
    id: "class-hist-thu",
    title: "HIST 202",
    source: "school",
    status: "approved",
    day: THU,
    startMinutes: hm(18),
    endMinutes: hm(19, 30),
    immovable: true,
    detail: "Lecture Hall B",
  },
  {
    id: "class-math-wed",
    title: "MATH 301",
    source: "school",
    status: "approved",
    day: WED,
    startMinutes: hm(19),
    endMinutes: hm(20, 15),
    immovable: true,
    detail: "Online",
  },
];

// --- Meetings nested inside the work-hours block (parentId links them) -------

const meetings: CalendarBlock[] = [
  {
    id: "mtg-platform-sync",
    title: "Platform Sync",
    source: "work",
    status: "approved",
    day: MON,
    startMinutes: hm(10),
    endMinutes: hm(10, 30),
    parentId: "work-0",
  },
  {
    id: "mtg-standup",
    title: "Weekly Standup",
    source: "work",
    status: "approved",
    day: TUE,
    startMinutes: hm(13),
    endMinutes: hm(13, 45),
    parentId: "work-1",
  },
  {
    id: "mtg-1on1",
    title: "1:1 w/ Manager",
    source: "work",
    status: "approved",
    day: THU,
    startMinutes: hm(15),
    endMinutes: hm(15, 30),
    parentId: "work-3",
  },
];

// --- Already-approved flexible blocks in the free space ----------------------

const approvedFlexible: CalendarBlock[] = [
  {
    id: "gym-mon",
    title: "Gym",
    source: "personal",
    status: "approved",
    day: MON,
    startMinutes: hm(18),
    endMinutes: hm(19),
  },
  {
    id: "gym-wed",
    title: "Gym",
    source: "personal",
    status: "approved",
    day: WED,
    startMinutes: hm(7),
    endMinutes: hm(8),
  },
  {
    id: "golf-sat",
    title: "Golf",
    source: "personal",
    status: "approved",
    day: SAT,
    startMinutes: hm(9),
    endMinutes: hm(11),
  },
  {
    id: "hw-math-sun",
    title: "MATH 301 problem set",
    source: "school",
    status: "approved",
    day: SUN,
    startMinutes: hm(16),
    endMinutes: hm(17, 30),
  },
];

/** All calendar blocks that make up the initial (pre-proposal) week. */
export const initialBlocks: CalendarBlock[] = [
  ...workHours,
  ...classes,
  ...meetings,
  ...approvedFlexible,
];

// --- Todos -------------------------------------------------------------------

const today = new Date();

export const initialTodos: TodoItem[] = [
  // Work (from Granola meetings, later). metaLabel = source meeting.
  {
    id: "todo-w1",
    section: "work",
    title: "Send Q3 roadmap draft",
    metaLabel: "Platform Sync",
    dueDate: isoDate(addDays(today, 1)),
    done: false,
  },
  {
    id: "todo-w2",
    section: "work",
    title: "Review PR #482",
    metaLabel: "Eng Sync",
    dueDate: isoDate(addDays(today, 2)),
    done: false,
  },
  {
    id: "todo-w3",
    section: "work",
    title: "Follow up with Acme vendor",
    metaLabel: "Weekly Standup",
    dueDate: isoDate(addDays(today, 4)),
    done: false,
  },
  // School (from Canvas, later). metaLabel = course.
  {
    id: "todo-s1",
    section: "school",
    title: "Reading: chapters 4–5",
    metaLabel: "HIST 202",
    dueDate: isoDate(addDays(today, -1)),
    done: false,
  },
  {
    id: "todo-s2",
    section: "school",
    title: "Essay: Cold War causes",
    metaLabel: "HIST 202",
    dueDate: isoDate(addDays(today, 1)),
    done: false,
  },
  {
    id: "todo-s3",
    section: "school",
    title: "Problem set 5",
    metaLabel: "MATH 301",
    dueDate: isoDate(addDays(today, 6)),
    done: false,
  },
];

// --- Chat --------------------------------------------------------------------

export const initialMessages: ChatMessage[] = [
  {
    id: "msg-welcome",
    role: "assistant",
    text: "Hi Jack — tell me how you want to spend your free time this week and I'll draft a plan around your work and classes. (I'm a placeholder for now; the real planner arrives in Story 2.)",
  },
];

// --- The scripted mock proposal (all blocks in free space) -------------------

export const mockProposal: Proposal = {
  id: "proposal-1",
  summary:
    "Here's a draft: essay writing Thu evening, a Friday gym session, and MATH review Wed before class.",
  blocks: [
    {
      id: "prop-essay-thu",
      title: "Write essay draft",
      source: "school",
      status: "proposed",
      day: THU,
      startMinutes: hm(20),
      endMinutes: hm(21, 30),
    },
    {
      id: "prop-gym-fri",
      title: "Gym",
      source: "personal",
      status: "proposed",
      day: FRI,
      startMinutes: hm(18),
      endMinutes: hm(19),
    },
    {
      id: "prop-math-wed",
      title: "MATH 301 review",
      source: "school",
      status: "proposed",
      day: WED,
      startMinutes: hm(17, 30),
      endMinutes: hm(18, 30),
    },
  ],
};
