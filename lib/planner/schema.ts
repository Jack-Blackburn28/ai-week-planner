/**
 * Zod schema for the AI's structured output, used with the Anthropic SDK's
 * structured-outputs helper so the model returns validated JSON (not free text).
 * `proposal` is nullable (a fixed shape) so the schema stays strict: the model
 * sets it to null when it is only chatting or asking about a conflict.
 */
import { z } from "zod";

export const proposedBlockSchema = z.object({
  title: z.string(),
  source: z.enum(["work", "school", "personal"]),
  day: z.number().int().min(0).max(6),
  startMinutes: z.number().int().min(0).max(1440),
  endMinutes: z.number().int().min(0).max(1440),
});

export const plannerAiOutputSchema = z.object({
  reply: z.string(),
  proposal: z
    .object({
      summary: z.string(),
      blocks: z.array(proposedBlockSchema),
    })
    .nullable(),
});

export type PlannerAiOutput = z.infer<typeof plannerAiOutputSchema>;
