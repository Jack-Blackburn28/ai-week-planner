/**
 * POST /api/google/disconnect/[account] — forget a connected account
 * (clears its stored refresh token).
 */
import { NextResponse } from "next/server";
import { tokenStore } from "@/lib/google/tokenStore";
import { isGoogleAccount } from "@/lib/google/types";

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ account: string }> },
) {
  const { account } = await ctx.params;
  if (!isGoogleAccount(account)) {
    return NextResponse.json({ error: "unknown account" }, { status: 400 });
  }
  await tokenStore.disconnect(account);
  return NextResponse.json({ ok: true });
}
