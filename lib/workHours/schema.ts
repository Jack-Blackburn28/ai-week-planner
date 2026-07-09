/**
 * Zod schema for the Anthropic structured-output parse result, mirroring
 * `lib/planner/schema.ts`'s pattern. `proposedRule` is nullable (a fixed
 * shape) so the schema stays strict: the model sets it to null when it
 * can't confidently parse working hours from the message.
 */
import { z } from "zod";

const dayHoursSchema = z.object({
  startMinutes: z.number().int().min(0).max(1440),
  endMinutes: z.number().int().min(0).max(1440),
});

/** Keyed by "0".."6" (0 = Monday … 6 = Sunday) since Zod object keys are strings. */
export const workHoursRuleSchema = z.object({
  days: z.record(z.string(), dayHoursSchema),
});

export const workHoursAiOutputSchema = z.object({
  reply: z.string(),
  proposedRule: workHoursRuleSchema.nullable(),
});

export type WorkHoursAiOutput = z.infer<typeof workHoursAiOutputSchema>;
