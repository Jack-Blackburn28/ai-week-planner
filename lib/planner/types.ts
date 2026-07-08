/**
 * Planner request/response contract. Framework-free — shared by the server route,
 * the mock planner, and the client that calls the API.
 */
import type { BlockSource, CalendarBlock, ChatMessage, TodoItem } from "@/lib/types";

/** A snapshot of the week the planner reasons about. */
export interface WeekState {
  /** All current calendar blocks (immovable + approved); proposed blocks excluded. */
  blocks: CalendarBlock[];
  todos: TodoItem[];
}

/** A block the planner suggests (no id/status yet — the server assigns those). */
export interface ProposedBlock {
  title: string;
  source: BlockSource;
  /** 0 = Monday … 6 = Sunday. */
  day: number;
  startMinutes: number;
  endMinutes: number;
}

export interface PlannerProposal {
  summary: string;
  blocks: ProposedBlock[];
}

/** What the planner returns: always a reply, optionally a proposal. */
export interface PlannerResponse {
  reply: string;
  proposal?: PlannerProposal;
}

/** What the client sends to the planner. */
export interface PlannerRequest {
  messages: ChatMessage[];
  week: WeekState;
}
