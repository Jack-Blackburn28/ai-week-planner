import { NextResponse } from "next/server";
import { workHoursConfig } from "@/lib/workHours/config";
import type { WorkHoursRule } from "@/lib/workHours/types";

/**
 * Basic shape guard: a rule is just a `days` object (validated further
 * downstream) with at least one entry. There's no "clear all hours" flow
 * today, so an empty `days` here is always a parsing bug upstream, never a
 * legitimate save — reject it loudly instead of silently persisting nothing.
 */
function isValidRule(body: unknown): body is WorkHoursRule {
  if (typeof body !== "object" || body === null) return false;
  const b = body as Record<string, unknown>;
  return (
    typeof b.days === "object" &&
    b.days !== null &&
    Object.keys(b.days).length > 0
  );
}

export async function GET(): Promise<Response> {
  const rule = await workHoursConfig.get();
  return NextResponse.json(rule);
}

export async function POST(req: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!isValidRule(body)) {
    return NextResponse.json(
      { error: "Request must include a days object with at least one entry." },
      { status: 400 },
    );
  }

  await workHoursConfig.set(body);
  return NextResponse.json({ ok: true });
}
