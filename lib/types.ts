/**
 * Domain types shared across the app. Framework-free on purpose — these are
 * reused by the UI now and by the Story 2 server-side planner later.
 */

/** What life-area a block belongs to. Drives its color. */
export type BlockSource = "work" | "school" | "personal";

/**
 * Whether a block is committed or just a pending suggestion.
 * `approved` renders solid; `proposed` renders dashed + faded.
 */
export type BlockStatus = "approved" | "proposed";

/**
 * A block drawn on the week calendar.
 *
 * Times are minutes-from-midnight so positioning is pure arithmetic against the
 * configured window. `day` is the column index within the displayed week
 * (0 = Monday … 6 = Sunday), which keeps blocks anchored to "this week"
 * regardless of the real date.
 */
export interface CalendarBlock {
  id: string;
  title: string;
  source: BlockSource;
  status: BlockStatus;
  /** Column index 0..6 (Mon..Sun). */
  day: number;
  /** Start time, minutes from midnight (e.g. 9:00 AM = 540). */
  startMinutes: number;
  /** End time, minutes from midnight (must be > startMinutes). */
  endMinutes: number;
  /** True for work hours and class times — the AI must never schedule over these. */
  immovable?: boolean;
  /** For meetings shown nested inside a parent work-hours block. */
  parentId?: string;
  /** Optional short detail (e.g. a location or note). */
  detail?: string;
  /** Google event id, when this block came from / was written to Google Calendar. */
  googleEventId?: string;
  /** The Google calendar this block came from (source tagging + busy model). */
  calendarId?: string;
}

/** Which todo list an item belongs to. */
export type TodoSectionKey = "work" | "school";

/** A single todo (Work action item or School assignment). */
export interface TodoItem {
  id: string;
  section: TodoSectionKey;
  title: string;
  /** The one-line context: source meeting (Work) or course (School). */
  metaLabel: string;
  /**
   * ISO date (YYYY-MM-DD). Optional since Story 4: real Canvas assignments may
   * have no due date, in which case the UI shows "No due date" and the item is
   * simply checkable. Work items and most School items still carry one.
   */
  dueDate?: string;
  done: boolean;
}

/** Chat message role. */
export type ChatRole = "user" | "assistant";

/** A single chat message in the planner drawer. */
export interface ChatMessage {
  id: string;
  role: ChatRole;
  text: string;
}

/** A plan the AI (mocked in Story 1) proposes for review. */
export interface Proposal {
  id: string;
  /** Short human summary shown in chat. */
  summary: string;
  /** The suggested blocks — all with status "proposed". */
  blocks: CalendarBlock[];
}
