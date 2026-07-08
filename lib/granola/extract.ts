/**
 * Action-item extraction: turn a meeting transcript into a list of concise action
 * items. SERVER-ONLY — this is the only Granola module that touches the Anthropic
 * SDK / API key (mirrors `lib/planner/server.ts`).
 *
 * Uses the real model when `ANTHROPIC_API_KEY` is set, and a deterministic mock
 * extractor otherwise, so the whole flow works offline. Resilient: a model error
 * degrades to `[]` for that transcript rather than throwing.
 */
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { mockExtract } from "./extract.mock";
import type { ExtractedActionItem, GranolaTranscript } from "./types";

const MODEL = "claude-sonnet-5";
const MAX_TOKENS = 1024;

const extractionSchema = z.object({
  items: z.array(z.object({ title: z.string() })),
});

const SYSTEM_PROMPT = [
  "You extract action items from a meeting transcript.",
  "Return ONLY concrete, actionable follow-ups that Jack himself should do.",
  "Each item is a short imperative phrase (e.g. 'Send the Q3 roadmap draft').",
  "Ignore chit-chat, decisions with no owner, and items clearly owned by others.",
  "If there are no clear action items for Jack, return an empty list.",
].join("\n");

export function hasApiKey(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

async function aiExtract(
  transcript: GranolaTranscript,
): Promise<ExtractedActionItem[]> {
  try {
    const client = new Anthropic();
    const message = await client.messages.parse({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Meeting: ${transcript.title}\n\nTranscript:\n${transcript.text}`,
        },
      ],
      output_config: { format: zodOutputFormat(extractionSchema) },
    });
    return message.parsed_output?.items ?? [];
  } catch (err) {
    console.error("[granola] AI extraction failed:", err);
    return [];
  }
}

/** Extract action items from a transcript (real model or deterministic mock). */
export function extractActionItems(
  transcript: GranolaTranscript,
): Promise<ExtractedActionItem[]> {
  return hasApiKey() ? aiExtract(transcript) : Promise.resolve(mockExtract(transcript));
}
