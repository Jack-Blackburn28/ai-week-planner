import { NextResponse } from "next/server";
import { runPlanner } from "@/lib/planner/server";
import type { PlannerRequest } from "@/lib/planner/types";

/** Basic shape guard for the incoming request body. */
function isValidRequest(body: unknown): body is PlannerRequest {
  if (typeof body !== "object" || body === null) return false;
  const b = body as Record<string, unknown>;
  const week = b.week as Record<string, unknown> | undefined;
  return (
    Array.isArray(b.messages) &&
    typeof week === "object" &&
    week !== null &&
    Array.isArray(week.blocks) &&
    Array.isArray(week.todos)
  );
}

export async function POST(req: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!isValidRequest(body)) {
    return NextResponse.json(
      { error: "Request must include messages[] and week{ blocks[], todos[] }." },
      { status: 400 },
    );
  }

  try {
    const result = await runPlanner(body);
    return NextResponse.json(result);
  } catch (err) {
    // Log detail server-side only; never leak the key or a stack trace to the client.
    console.error("[/api/plan] planner error:", err);
    return NextResponse.json(
      { error: "The planner is unavailable right now. Please try again." },
      { status: 502 },
    );
  }
}
