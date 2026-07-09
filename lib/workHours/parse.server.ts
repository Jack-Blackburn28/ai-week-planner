/**
 * Server-side work-hours parser. This is the ONLY module (besides
 * `lib/planner/server.ts`) that imports the Anthropic SDK or reads the API
 * key — it must never be imported from a `"use client"` component.
 *
 * Uses the real model when ANTHROPIC_API_KEY is set and the deterministic
 * mock parser otherwise, mirroring `lib/planner/server.ts`'s split.
 */
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { workHoursAiOutputSchema } from "./schema";
import { parseWorkHoursMock, summarizeRule } from "./parseMock";
import type { WorkHoursRule } from "./types";

const WORK_HOURS_MODEL = "claude-sonnet-5";
const WORK_HOURS_MAX_TOKENS = 1024;

export interface WorkHoursParseResult {
  reply: string;
  proposedRule?: WorkHoursRule;
}

export function hasApiKey(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

function systemPrompt(currentRule: WorkHoursRule | null): string {
  const currentSummary = currentRule ? summarizeRule(currentRule) : null;
  return [
    "You help a single user set their recurring weekly working hours for a personal week planner.",
    "Day indices are 0=Monday..6=Sunday. Minutes are minutes-since-midnight (0-1440), Pacific local time.",
    "Only respond about working hours — never offer to plan the week, propose tasks, or create events.",
    "If the user's message doesn't give you enough to confidently produce a full rule, set proposedRule to null and ask a clarifying question in reply instead of guessing.",
    "When you do have enough, set proposedRule to the parsed rule and, in reply, state a short plain-language summary and ask the user to confirm before saving.",
    currentSummary
      ? `The user's current working hours are: ${currentSummary}.`
      : "The user has no working hours configured yet.",
  ].join("\n");
}

async function callAnthropic(
  message: string,
  currentRule: WorkHoursRule | null,
): Promise<WorkHoursParseResult> {
  const client = new Anthropic();
  const result = await client.messages.parse({
    model: WORK_HOURS_MODEL,
    max_tokens: WORK_HOURS_MAX_TOKENS,
    system: systemPrompt(currentRule),
    messages: [{ role: "user", content: message }],
    output_config: { format: zodOutputFormat(workHoursAiOutputSchema) },
  });

  const out = result.parsed_output;
  if (!out) {
    return { reply: "Sorry — I couldn't quite parse that. Could you try rephrasing?" };
  }
  return {
    reply: out.reply,
    proposedRule: out.proposedRule ?? undefined,
  };
}

/** Parse a work-hours message into a reply + an optional proposed rule. */
export async function parseWorkHours(
  message: string,
  currentRule: WorkHoursRule | null,
): Promise<WorkHoursParseResult> {
  if (hasApiKey()) return callAnthropic(message, currentRule);
  return parseWorkHoursMock(message, currentRule);
}
