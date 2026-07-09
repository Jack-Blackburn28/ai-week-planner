"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { CalendarBlock, ChatMessage, ChatRole, TodoItem } from "@/lib/types";
import { initialMessages } from "@/lib/mock-data";
import { approveProposal, discardProposal } from "@/lib/planning";
import { toCalendarBlocks } from "@/lib/planner/validate";
import { toWeekState } from "@/lib/planner/week";
import type { PlannerResponse } from "@/lib/planner/types";
import type { AllDayEvent } from "@/lib/google/eventMap";
import { Brand } from "@/components/Brand";
import { Calendar } from "@/components/Calendar/Calendar";
import { TodoSection } from "@/components/TodoSection/TodoSection";
import { ChatBubble } from "@/components/Chat/ChatBubble";
import { ChatDrawer } from "@/components/Chat/ChatDrawer";
import { GoogleConnect } from "@/components/Settings/GoogleConnect";
import { CanvasConnect } from "@/components/Settings/CanvasConnect";
import { GranolaConnect } from "@/components/Settings/GranolaConnect";
import { CompletedView } from "@/components/CompletedView";
import type { CompletedItem } from "@/lib/todos/completions";
import { nowInPacific } from "@/lib/timezone";

const ERROR_REPLY =
  "Sorry — I couldn't reach the planner just now. Please try again in a moment.";

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
  // Local blocks: proposals + locally-approved. Real Google events live in
  // `googleBlocks`; the calendar renders the two merged.
  const [blocks, setBlocks] = useState<CalendarBlock[]>([]);
  // Per-week cache of Google events so flipping weeks is instant (cached weeks
  // render immediately; a background re-fetch keeps them fresh). Neighbors are
  // prefetched. `cachedRef`/`fetchingRef` avoid loading flicker + duplicate fetches.
  const [weekCache, setWeekCache] = useState<
    Record<number, { blocks: CalendarBlock[]; allDay: AllDayEvent[] }>
  >({});
  const cachedRef = useRef<Set<number>>(new Set());
  const fetchingRef = useRef<Set<number>>(new Set());
  const [weekOffset, setWeekOffset] = useState(0);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [connected, setConnected] = useState<boolean | null>(null);
  // Work todos come from Granola (AI-generated from transcripts); School from Canvas.
  const [workTodos, setWorkTodos] = useState<TodoItem[]>([]);
  const [schoolTodos, setSchoolTodos] = useState<TodoItem[]>([]);
  const [canvasConnected, setCanvasConnected] = useState<boolean | null>(null);
  const [granolaConnected, setGranolaConnected] = useState<boolean | null>(null);
  const [completedItems, setCompletedItems] = useState<CompletedItem[]>([]);
  const [todoView, setTodoView] = useState<"active" | "completed">("active");
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [chatOpen, setChatOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mobileView, setMobileView] = useState<"calendar" | "todos">("calendar");
  const [thinking, setThinking] = useState(false);
  const idRef = useRef(0);

  const allDayEvents = weekCache[weekOffset]?.allDay ?? [];
  const allBlocks = useMemo(
    () => [...(weekCache[weekOffset]?.blocks ?? []), ...blocks],
    [weekCache, weekOffset, blocks],
  );
  // Completed ids exclude cleared items from the active lists (and the planner).
  const completedIds = useMemo(
    () => new Set(completedItems.map((i) => i.id)),
    [completedItems],
  );
  const activeWork = useMemo(
    () => workTodos.filter((t) => !completedIds.has(t.id)),
    [workTodos, completedIds],
  );
  const activeSchool = useMemo(
    () => schoolTodos.filter((t) => !completedIds.has(t.id)),
    [schoolTodos, completedIds],
  );
  const allTodos = useMemo(
    () => [...activeWork, ...activeSchool],
    [activeWork, activeSchool],
  );
  const hasProposal = blocks.some((b) => b.status === "proposed");

  // Load the combined Completed archive (Work + School), most-recent-first.
  const fetchCompleted = useCallback(async () => {
    try {
      const res = await fetch("/api/todos/completed");
      if (res.ok) {
        const items = (await res.json()) as CompletedItem[];
        setCompletedItems(Array.isArray(items) ? items : []);
      }
    } catch {
      /* leave prior completed */
    }
  }, []);

  // Pull Work action items from Granola (status drives the empty state).
  const fetchActions = useCallback(async () => {
    try {
      const [statusRes, itemsRes] = await Promise.all([
        fetch("/api/granola/status"),
        fetch("/api/granola/actions"),
      ]);
      if (statusRes.ok) {
        const s = (await statusRes.json()) as { connected: boolean };
        setGranolaConnected(Boolean(s.connected));
      }
      if (itemsRes.ok) {
        const items = (await itemsRes.json()) as TodoItem[];
        setWorkTodos(Array.isArray(items) ? items : []);
      }
    } catch {
      /* leave prior actions */
    }
  }, []);

  // Pull School assignments from Canvas (status drives the empty state).
  const fetchAssignments = useCallback(async () => {
    try {
      const [statusRes, itemsRes] = await Promise.all([
        fetch("/api/canvas/status"),
        fetch("/api/canvas/assignments"),
      ]);
      if (statusRes.ok) {
        const s = (await statusRes.json()) as { connected: boolean };
        setCanvasConnected(Boolean(s.connected));
      }
      if (itemsRes.ok) {
        const items = (await itemsRes.json()) as TodoItem[];
        setSchoolTodos(Array.isArray(items) ? items : []);
      }
    } catch {
      /* leave prior assignments */
    }
  }, []);

  const fetchWeek = useCallback(
    async (offset: number, opts?: { showLoading?: boolean }) => {
      if (fetchingRef.current.has(offset)) return;
      fetchingRef.current.add(offset);
      if (opts?.showLoading) setGoogleLoading(true);
      try {
        const res = await fetch(`/api/google/events?week=${offset}`);
        if (res.ok) {
          const data = (await res.json()) as {
            blocks?: CalendarBlock[];
            allDay?: AllDayEvent[];
          };
          cachedRef.current.add(offset);
          setWeekCache((prev) => ({
            ...prev,
            [offset]: {
              blocks: Array.isArray(data.blocks) ? data.blocks : [],
              allDay: Array.isArray(data.allDay) ? data.allDay : [],
            },
          }));
        }
      } catch {
        /* keep prior cached week */
      } finally {
        fetchingRef.current.delete(offset);
        if (opts?.showLoading) setGoogleLoading(false);
      }
    },
    [],
  );

  // Check connection once on mount.
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const res = await fetch("/api/google/status");
        const s = res.ok ? ((await res.json()) as { work: boolean; personal: boolean }) : null;
        if (active) setConnected(s ? s.work || s.personal : false);
      } catch {
        if (active) setConnected(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Fetch Canvas assignments + Granola actions once on mount (refreshed via Refresh).
  useEffect(() => {
    void (async () => {
      await fetchAssignments();
    })();
  }, [fetchAssignments]);

  useEffect(() => {
    void (async () => {
      await fetchActions();
    })();
  }, [fetchActions]);

  useEffect(() => {
    void (async () => {
      await fetchCompleted();
    })();
  }, [fetchCompleted]);

  // Show the current week instantly if cached, refresh it in the background, and
  // prefetch the neighboring weeks so ‹ / › flips feel instant (no reload flicker).
  useEffect(() => {
    void fetchWeek(weekOffset, { showLoading: !cachedRef.current.has(weekOffset) });
    void fetchWeek(weekOffset - 1);
    void fetchWeek(weekOffset + 1);
  }, [weekOffset, fetchWeek]);
  const nextId = () => `m${idRef.current++}`;

  const pushMessage = (role: ChatRole, text: string) =>
    setMessages((prev) => [...prev, { id: nextId(), role, text }]);

  // Clearing an item = complete it: it leaves the active list, is remembered
  // (persisted) so it never regenerates, and appears in the Completed archive.
  const completeTodo = (id: string) => {
    const item = [...workTodos, ...schoolTodos].find((t) => t.id === id);
    if (!item) return;
    // Optimistic: drop from active + add to the Completed archive immediately.
    setCompletedItems((prev) =>
      prev.some((c) => c.id === id)
        ? prev
        : [
            {
              id,
              source: item.section,
              title: item.title,
              metaLabel: item.metaLabel,
              completedAt: new Date().toISOString(),
            },
            ...prev,
          ],
    );
    void fetch("/api/todos/complete", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        id,
        source: item.section,
        title: item.title,
        metaLabel: item.metaLabel,
      }),
    }).catch(() => {
      /* optimistic state already updated; a later refresh reconciles */
    });
  };

  /** Send a message to the AI planner and apply its reply + proposal. */
  const handleSend = async (text: string) => {
    if (thinking) return;
    const userMsg: ChatMessage = { id: nextId(), role: "user", text };
    const conversation = [...messages, userMsg];
    setMessages(conversation);
    setThinking(true);
    try {
      const res = await fetch("/api/plan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          messages: conversation,
          week: toWeekState(allBlocks, allTodos),
        }),
      });
      const data: PlannerResponse & { error?: string } = await res.json();
      if (!res.ok) throw new Error(data.error ?? "planner failed");

      pushMessage("assistant", data.reply);
      if (data.proposal && data.proposal.blocks.length > 0) {
        const proposed = toCalendarBlocks(data.proposal.blocks);
        // Replace any prior pending proposal with the new one.
        setBlocks((prev) => [
          ...prev.filter((b) => b.status !== "proposed"),
          ...proposed,
        ]);
      }
    } catch {
      pushMessage("assistant", ERROR_REPLY);
    } finally {
      setThinking(false);
    }
  };

  const handleApprove = async () => {
    const proposed = blocks.filter((b) => b.status === "proposed");
    // No Google connected → keep the Story 2 local behavior (proposed → approved).
    if (!connected || proposed.length === 0) {
      setBlocks((prev) => approveProposal(prev));
      pushMessage("assistant", "Done — added to your calendar. ✅");
      return;
    }
    // Connected → write the approved blocks to the personal "AI Calendar",
    // then re-fetch so they render from Google (and are excluded from busy time).
    try {
      const res = await fetch("/api/google/commit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ blocks: proposed, weekOffset }),
      });
      if (!res.ok) throw new Error("commit failed");
      setBlocks((prev) => prev.filter((b) => b.status !== "proposed"));
      await fetchWeek(weekOffset);
      pushMessage("assistant", "Done — added to your AI Calendar. ✅");
    } catch {
      // Fall back to a local approve so nothing is lost if the write fails.
      setBlocks((prev) => approveProposal(prev));
      pushMessage(
        "assistant",
        "Added to your calendar (couldn't sync to Google just now).",
      );
    }
  };

  const handleMakeChanges = () => {
    setBlocks((prev) => discardProposal(prev));
    pushMessage("assistant", "No problem — I've cleared that draft. What should change?");
  };

  if (!hydrated) {
    return (
      <div className="grid h-dvh place-items-center text-sm text-ink-soft">
        Loading your week…
      </div>
    );
  }

  const today = nowInPacific();

  return (
    <div className="flex h-dvh flex-col bg-surface">
      <header className="flex items-center justify-between border-b border-hairline bg-panel px-4 py-3">
        <Brand />
        <div className="flex items-center gap-2">
          {/* Mobile-only view switcher (side-by-side on desktop) */}
          <div
            role="tablist"
            aria-label="Switch view"
            className="flex rounded-lg border border-hairline bg-surface p-0.5 text-sm md:hidden"
          >
            {(["calendar", "todos"] as const).map((view) => (
              <button
                key={view}
                type="button"
                role="tab"
                aria-selected={mobileView === view}
                onClick={() => setMobileView(view)}
                className={`rounded-md px-3 py-1 font-medium capitalize focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-work-ring ${
                  mobileView === view
                    ? "bg-panel text-ink shadow-sm"
                    : "text-ink-soft"
                }`}
              >
                {view === "todos" ? "Todos" : "Calendar"}
              </button>
            ))}
          </div>
          <button
            type="button"
            aria-label="Settings"
            onClick={() => setSettingsOpen(true)}
            className="rounded-md border border-hairline bg-surface px-2.5 py-1.5 text-sm text-ink-soft hover:bg-panel focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-work-ring"
          >
            ⚙︎
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Calendar — dominant left surface */}
        <main
          className={`min-w-0 flex-1 flex-col overflow-hidden p-4 md:flex ${
            mobileView === "calendar" ? "flex" : "hidden"
          }`}
        >
          {connected === false && (
            <div className="mb-3 flex items-center justify-between gap-3 rounded-lg border border-hairline bg-panel px-3 py-2 text-sm">
              <span className="text-ink-soft">
                Connect your Google accounts to see your real calendar.
              </span>
              <button
                type="button"
                onClick={() => setSettingsOpen(true)}
                className="shrink-0 rounded-md bg-work px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-work-ring"
              >
                Connect
              </button>
            </div>
          )}
          <Calendar
            blocks={allBlocks}
            referenceDate={today}
            allDayEvents={allDayEvents}
            weekOffset={weekOffset}
            onWeekOffsetChange={setWeekOffset}
            onRefresh={() => {
              void fetchWeek(weekOffset, { showLoading: true });
              void fetchAssignments();
              void fetchActions();
              void fetchCompleted();
            }}
            loading={googleLoading}
          />
        </main>

        {/* Right column — Work + School todo dashboard */}
        <aside
          className={`w-full shrink-0 flex-col gap-3 overflow-hidden border-l border-hairline bg-panel p-4 md:flex md:w-[360px] ${
            mobileView === "todos" ? "flex" : "hidden"
          }`}
        >
          {/* Active | Completed toggle */}
          <div
            role="tablist"
            aria-label="Todo view"
            className="flex shrink-0 rounded-lg border border-hairline bg-surface p-0.5 text-sm"
          >
            {(["active", "completed"] as const).map((v) => (
              <button
                key={v}
                type="button"
                role="tab"
                aria-selected={todoView === v}
                onClick={() => setTodoView(v)}
                className={`flex-1 rounded-md px-3 py-1 font-medium capitalize focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-work-ring ${
                  todoView === v ? "bg-panel text-ink shadow-sm" : "text-ink-soft"
                }`}
              >
                {v === "active"
                  ? "Active"
                  : `Completed${completedItems.length ? ` (${completedItems.length})` : ""}`}
              </button>
            ))}
          </div>

          {todoView === "completed" ? (
            <section
              aria-label="Completed"
              className="flex min-h-0 flex-1 flex-col overflow-auto"
            >
              <CompletedView items={completedItems} />
            </section>
          ) : (
            <>
          <TodoSection
            title="Work"
            items={activeWork}
            today={today}
            onToggle={completeTodo}
            emptyState={
              granolaConnected === false ? (
                <div className="flex items-center justify-between gap-3 rounded-lg border border-hairline bg-surface px-3 py-2 text-sm">
                  <span className="text-ink-soft">
                    Connect Granola to generate action items.
                  </span>
                  <button
                    type="button"
                    onClick={() => setSettingsOpen(true)}
                    className="shrink-0 rounded-md bg-work px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-work-ring"
                  >
                    Connect
                  </button>
                </div>
              ) : undefined
            }
          />
          <TodoSection
            title="School"
            items={activeSchool}
            today={today}
            onToggle={completeTodo}
            emptyState={
              canvasConnected === false ? (
                <div className="flex items-center justify-between gap-3 rounded-lg border border-hairline bg-surface px-3 py-2 text-sm">
                  <span className="text-ink-soft">
                    Connect Canvas to see your assignments.
                  </span>
                  <button
                    type="button"
                    onClick={() => setSettingsOpen(true)}
                    className="shrink-0 rounded-md bg-work px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-work-ring"
                  >
                    Connect
                  </button>
                </div>
              ) : undefined
            }
          />
            </>
          )}
        </aside>
      </div>

      {/* Settings drawer — Google account connections (+ calendar mapping) + Canvas status */}
      {settingsOpen && (
        <div
          className="fixed inset-0 z-40 flex justify-end bg-black/30"
          onClick={() => setSettingsOpen(false)}
        >
          <div
            role="dialog"
            aria-label="Settings"
            className="flex h-full w-full max-w-sm flex-col gap-4 overflow-auto bg-panel p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-ink">Settings</h2>
              <button
                type="button"
                aria-label="Close settings"
                onClick={() => setSettingsOpen(false)}
                className="rounded-md border border-hairline px-2 py-1 text-sm text-ink-soft hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-work-ring"
              >
                ✕
              </button>
            </div>
            <GoogleConnect />
            <div className="h-px bg-hairline" />
            <CanvasConnect />
            <div className="h-px bg-hairline" />
            <GranolaConnect />
          </div>
        </div>
      )}

      {/* Chat — the only way to interact with the planner */}
      <ChatBubble open={chatOpen} onClick={() => setChatOpen((o) => !o)} />
      <ChatDrawer
        open={chatOpen}
        messages={messages}
        hasProposal={hasProposal}
        isThinking={thinking}
        onClose={() => setChatOpen(false)}
        onSend={handleSend}
        onPropose={() => handleSend("Plan my week")}
        onApprove={handleApprove}
        onMakeChanges={handleMakeChanges}
      />
    </div>
  );
}
