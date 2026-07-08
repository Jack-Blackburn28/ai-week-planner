/**
 * GET /api/google/status — connection status for both accounts.
 * Returns ONLY booleans; token values never leave the server.
 */
import { NextResponse } from "next/server";
import { isMockMode } from "@/lib/google/client";
import { tokenStore } from "@/lib/google/tokenStore";

export async function GET() {
  if (isMockMode()) {
    // Demo mode: report both accounts connected so the full flow is usable.
    return NextResponse.json({ work: true, personal: true });
  }
  return NextResponse.json(tokenStore.status());
}
