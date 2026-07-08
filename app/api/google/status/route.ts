/**
 * GET /api/google/status — connection status for both accounts.
 * Returns ONLY booleans; token values never leave the server.
 */
import { NextResponse } from "next/server";
import { tokenStore } from "@/lib/google/tokenStore";

export async function GET() {
  return NextResponse.json(tokenStore.status());
}
