/**
 * Server-side planner. This is the ONLY module that imports the Anthropic SDK or
 * reads the API key — it must never be imported from a client component.
 *
 * `runPlanner` uses the real model when ANTHROPIC_API_KEY is set and the deterministic
 * mock planner otherwise, then enforces the core rule on whatever comes back: every
 * proposed block is re-validated against the week's immovable blocks (AI output is
 * untrusted), and a proposal with nothing left standing is downgraded to a plain reply.
 */
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { PLANNER_MAX_TOKENS, PLANNER_MODEL } from "./config";
import { plannerAiOutputSchema } from "./schema";
import { buildSystemPrompt, serializeWeek } from "./prompt";
import { toCalendarBlocks, validateProposedBlocks } from "./validate";
import { mockPlanner } from "./mock";
import type { PlannerProposal, PlannerRequest, PlannerResponse } from "./types";

export function hasApiKey(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

/** Call the Anthropic API with structured output and normalize to PlannerResponse. */
async function callAnthropic(req: PlannerRequest): Promise<PlannerResponse> {
  const client = new Anthropic();
  const message = await client.messages.parse({
    model: PLANNER_MODEL,
    max_tokens: PLANNER_MAX_TOKENS,
    thinking: { type: "adaptive" },
    system: buildSystemPrompt(),
    messages: [
      { role: "user", content: `Here is my current week:\n\n${serializeWeek(req.week)}` },
      ...req.messages.map((m) => ({ role: m.role, content: m.text })),
    ],
    output_config: { format: zodOutputFormat(plannerAiOutputSchema) },
  });

  const out = message.parsed_output;
  if (!out) {
    return { reply: "Sorry — I couldn't put a plan together just now. Try again?" };
  }
  return {
    reply: out.reply,
    proposal: out.proposal ?? undefined,
  };
}

/**
 * Turn week state + conversation into a validated planner response.
 * Enforces "never overlap an immovable block" regardless of where the proposal
 * came from (real model or mock).
 */
export async function runPlanner(req: PlannerRequest): Promise<PlannerResponse> {
  const raw = hasApiKey() ? await callAnthropic(req) : mockPlanner(req);

  if (!raw.proposal) {
    return { reply: raw.reply };
  }

  const safe = validateProposedBlocks(
    toCalendarBlocks(raw.proposal.blocks),
    req.week.blocks,
  );

  if (safe.length === 0) {
    // Nothing survived validation — surface the reply without an (empty) proposal.
    return { reply: raw.reply };
  }

  const proposal: PlannerProposal = {
    summary: raw.proposal.summary,
    blocks: safe.map((b) => ({
      title: b.title,
      source: b.source,
      day: b.day,
      startMinutes: b.startMinutes,
      endMinutes: b.endMinutes,
    })),
  };
  return { reply: raw.reply, proposal };
}
