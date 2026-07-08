/**
 * Planner configuration — single source of truth for model choice and limits.
 * Swap PLANNER_MODEL to "claude-opus-4-8" for the most capable model (higher cost).
 */
export const PLANNER_MODEL = "claude-sonnet-5";

/** Max output tokens for a planning turn (well under the streaming threshold). */
export const PLANNER_MAX_TOKENS = 4096;
