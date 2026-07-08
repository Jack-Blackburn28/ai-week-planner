/**
 * GET /api/canvas/status — Canvas connection status.
 * Returns ONLY `{ connected, mode }`; the token / ICS URL never leave the server.
 */
import { NextResponse } from "next/server";
import { isMockMode, resolveMode } from "@/lib/canvas/config";
import type { CanvasStatus } from "@/lib/canvas/types";

export async function GET() {
  if (isMockMode()) {
    // Demo mode: report connected via the (fake) token path so the flow is usable.
    return NextResponse.json<CanvasStatus>({ connected: true, mode: "token" });
  }
  const mode = resolveMode();
  return NextResponse.json<CanvasStatus>({ connected: mode !== "none", mode });
}
