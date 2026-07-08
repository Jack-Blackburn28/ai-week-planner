"use client";

import { useState, useSyncExternalStore } from "react";
import type { CalendarBlock } from "@/lib/types";
import { initialBlocks } from "@/lib/mock-data";
import { Brand } from "@/components/Brand";
import { Calendar } from "@/components/Calendar/Calendar";

// Client-only flag via useSyncExternalStore: returns false during SSR/hydration,
// true once on the client. Lets us resolve `today` without a hydration mismatch
// and without calling setState inside an effect.
const subscribe = () => () => {};
function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}

/**
 * Top-level client component. Owns the app's in-memory state (calendar blocks
 * now; todos, chat, and the proposal are added in later tasks) and lays out the
 * three surfaces: calendar on the left, todo dashboard on the right, chat bubble
 * floating over both.
 *
 * `today` is resolved after mount so server and client render the same initial
 * markup (no hydration mismatch on date-dependent UI).
 */
export function DashboardShell() {
  const hydrated = useHydrated();
  const [blocks] = useState<CalendarBlock[]>(initialBlocks);

  if (!hydrated) {
    return (
      <div className="grid h-dvh place-items-center text-sm text-ink-soft">
        Loading your week…
      </div>
    );
  }

  const today = new Date();

  return (
    <div className="flex h-dvh flex-col bg-surface">
      <header className="flex items-center justify-between border-b border-hairline bg-panel px-4 py-3">
        <Brand />
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Calendar — dominant left surface */}
        <main className="min-w-0 flex-1 overflow-hidden p-4">
          <Calendar blocks={blocks} referenceDate={today} />
        </main>

        {/* Right column — todo dashboard lands here in Task 4.0 */}
        <aside className="hidden w-[360px] shrink-0 overflow-auto border-l border-hairline bg-panel p-4 md:block">
          <p className="text-sm text-ink-soft">
            Work &amp; School todos appear here.
          </p>
        </aside>
      </div>
    </div>
  );
}
