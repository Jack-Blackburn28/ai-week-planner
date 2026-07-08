/**
 * GET /api/google/calendars — list calendars for each connected account
 * (id + name), so the user can map them to work / personal / ignored.
 */
import { NextResponse } from "next/server";
import { isMockMode, resolveClient } from "@/lib/google/client";
import { tokenStore } from "@/lib/google/tokenStore";
import type { GoogleAccount } from "@/lib/google/types";

export async function GET() {
  const client = resolveClient();
  const status = tokenStore.status();
  const connected = (account: GoogleAccount) => isMockMode() || status[account];

  const out: Record<GoogleAccount, unknown[]> = { work: [], personal: [] };
  for (const account of ["work", "personal"] as GoogleAccount[]) {
    if (!connected(account)) continue;
    try {
      out[account] = await client.listCalendars(account);
    } catch {
      out[account] = [];
    }
  }
  return NextResponse.json(out);
}
