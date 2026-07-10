/**
 * Zod schema for the Anthropic structured-output parse result, mirroring
 * `lib/planner/schema.ts`'s pattern.
 *
 * `proposedDays` is an ARRAY of per-day entries, not a `days`-keyed record —
 * confirmed by direct testing that Anthropic's structured output reliably
 * populates a plain array of typed objects, but silently returns an empty
 * object for a dynamic-keyed `z.record()` shape (a confident-sounding reply
 * paired with zero actual entries). `parse.server.ts` converts this array
 * into the app's `WorkHoursRule.days` record shape.
 */
import { z } from "zod";

const dayEntrySchema = z.object({
  day: z.number().int().min(0).max(6),
  startMinutes: z.number().int().min(0).max(1440),
  endMinutes: z.number().int().min(0).max(1440),
});

export const workHoursAiOutputSchema = z.object({
  reply: z.string(),
  proposedDays: z.array(dayEntrySchema).nullable(),
});

export type WorkHoursAiOutput = z.infer<typeof workHoursAiOutputSchema>;
