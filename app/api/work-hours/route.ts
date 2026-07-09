import { NextResponse } from "next/server";
import { workHoursConfig } from "@/lib/workHours/config";
import type { WorkHoursRule } from "@/lib/workHours/types";

/** Basic shape guard: a rule is just a `days` object (validated further downstream). */
function isValidRule(body: unknown): body is WorkHoursRule {
  if (typeof body !== "object" || body === null) return false;
  const b = body as Record<string, unknown>;
  return typeof b.days === "object" && b.days !== null;
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
      { error: "Request must include a days object." },
      { status: 400 },
    );
  }

  await workHoursConfig.set(body);
  return NextResponse.json({ ok: true });
}
