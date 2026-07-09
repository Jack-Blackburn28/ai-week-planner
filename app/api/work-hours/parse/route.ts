import { NextResponse } from "next/server";
import { parseWorkHours } from "@/lib/workHours/parse.server";
import type { WorkHoursRule } from "@/lib/workHours/types";

interface ParseRequestBody {
  message: string;
  currentRule?: WorkHoursRule | null;
}

/** Basic shape guard for the incoming request body. */
function isValidRequest(body: unknown): body is ParseRequestBody {
  if (typeof body !== "object" || body === null) return false;
  const b = body as Record<string, unknown>;
  return typeof b.message === "string" && b.message.trim().length > 0;
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
      { error: "Request must include a non-empty message string." },
      { status: 400 },
    );
  }

  try {
    const result = await parseWorkHours(body.message, body.currentRule ?? null);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[/api/work-hours/parse] parse error:", err);
    return NextResponse.json(
      { error: "The work-hours parser is unavailable right now. Please try again." },
      { status: 502 },
    );
  }
}
