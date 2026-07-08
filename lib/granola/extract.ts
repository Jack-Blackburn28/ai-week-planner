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
// Generous cap: a busy meeting can yield many action items, and the structured
// JSON must not be truncated mid-string (that fails parsing → the meeting yields
// nothing). 1024 was too tight for long transcripts.
const MAX_TOKENS = 4096;

const extractionSchema = z.object({
  items: z.array(z.object({ title: z.string() })),
});

function systemPrompt(owner?: { name?: string; email?: string }): string {
  const who = owner?.name || owner?.email || "the note owner";
  const email = owner?.email ? ` (${owner.email})` : "";
  return [
    `You extract action items from a meeting transcript for ${who}${email}.`,
    `The transcript is speaker-labeled; "${who}" is the person we extract FOR.`,
    `Return ONLY tasks that ${who} personally committed to or was explicitly`,
    "  assigned. Include an item ONLY if the transcript makes clear it is THIS",
    `  person's responsibility (they said "I'll…", or were assigned it by name).`,
    "STRICTLY EXCLUDE: anything owned by other people, group decisions with no",
    "  clear owner, vague musings ('we should maybe…'), and FYI/status updates.",
    "Some meetings (retros, standups, listen-only calls) legitimately have ZERO",
    `  action items for ${who} — in that case return an empty list. NEVER invent`,
    "  or pad items to fill space.",
    "Each item is a short imperative phrase (e.g. 'Send the Q3 roadmap draft').",
  ].join("\n");
}

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
      system: systemPrompt(transcript.owner),
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
