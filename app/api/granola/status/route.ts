/**
 * GET /api/granola/status — Granola connection status. Returns ONLY `{ connected }`;
 * the refresh token never leaves the server.
 */
import { NextResponse } from "next/server";
import { isMockMode } from "@/lib/granola/config";
import { granolaTokenStore } from "@/lib/granola/tokenStore";
import type { GranolaStatus } from "@/lib/granola/types";

export async function GET() {
  if (isMockMode()) {
    return NextResponse.json<GranolaStatus>({ connected: true });
  }
  return NextResponse.json<GranolaStatus>(granolaTokenStore.status());
}
