/**
 * POST /api/granola/disconnect — forget the stored Granola refresh token.
 */
import { NextResponse } from "next/server";
import { granolaTokenStore } from "@/lib/granola/tokenStore";

export async function POST() {
  granolaTokenStore.disconnect();
  return NextResponse.json({ ok: true });
}
