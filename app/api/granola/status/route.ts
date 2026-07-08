/**
 * GET /api/granola/status — Granola connection status. Returns ONLY `{ connected }`;
 * the API key never leaves the server. Connected = a `GRANOLA_API_KEY` is set
 * (or demo mode).
 */
import { NextResponse } from "next/server";
import { isGranolaConfigured, isMockMode } from "@/lib/granola/config";
import type { GranolaStatus } from "@/lib/granola/types";

export async function GET() {
  if (isMockMode()) {
    return NextResponse.json<GranolaStatus>({ connected: true });
  }
  return NextResponse.json<GranolaStatus>({ connected: isGranolaConfigured() });
}
