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
  const [googleBlocks, setGoogleBlocks] = useState<CalendarBlock[]>([]);
  const [allDayEvents, setAllDayEvents] = useState<AllDayEvent[]>([]);
  const [weekOffset, setWeekOffset] = useState(0);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [connected, setConnected] = useState<boolean | null>(null);
  // Work todos come from Granola (AI-generated from transcripts); School from Canvas.
  const [workTodos, setWorkTodos] = useState<TodoItem[]>([]);
  const [schoolTodos, setSchoolTodos] = useState<TodoItem[]>([]);
  const [canvasConnected, setCanvasConnected] = useState<boolean | null>(null);
  const [granolaConnected, setGranolaConnected] = useState<boolean | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [chatOpen, setChatOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mobileView, setMobileView] = useState<"calendar" | "todos">("calendar");
  const [thinking, setThinking] = useState(false);
  const idRef = useRef(0);

  const allBlocks = useMemo(
    () => [...googleBlocks, ...blocks],
    [googleBlocks, blocks],
  );
  const allTodos = useMemo(
    () => [...workTodos, ...schoolTodos],
    [workTodos, schoolTodos],
  );
  const hasProposal = blocks.some((b) => b.status === "proposed");

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

  const fetchEvents = useCallback(async (offset: number) => {
    setGoogleLoading(true);
    try {
      const res = await fetch(`/api/google/events?week=${offset}`);
      if (res.ok) {
        const data = (await res.json()) as {
          blocks?: CalendarBlock[];
          allDay?: AllDayEvent[];
        };
        setGoogleBlocks(Array.isArray(data.blocks) ? data.blocks : []);
        setAllDayEvents(Array.isArray(data.allDay) ? data.allDay : []);
      }
    } catch {
      /* leave prior events */
    } finally {
      setGoogleLoading(false);
    }
  }, []);

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

  // Fetch events for the displayed week (on mount and whenever the week changes).
  // setState runs only after the fetch resolves, guarded against unmount.
  useEffect(() => {
    let active = true;
    void (async () => {
      setGoogleLoading(true);
      try {
        const res = await fetch(`/api/google/events?week=${weekOffset}`);
        const data = res.ok
          ? ((await res.json()) as {
              blocks?: CalendarBlock[];
              allDay?: AllDayEvent[];
            })
          : null;
        if (active && data) {
          setGoogleBlocks(Array.isArray(data.blocks) ? data.blocks : []);
          setAllDayEvents(Array.isArray(data.allDay) ? data.allDay : []);
        }
      } catch {
        /* leave prior events */
      } finally {
        if (active) setGoogleLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [weekOffset]);
  const nextId = () => `m${idRef.current++}`;

  const pushMessage = (role: ChatRole, text: string) =>
    setMessages((prev) => [...prev, { id: nextId(), role, text }]);

  const toggleTodo = (id: string) => {
    const flip = (list: TodoItem[]) =>
      list.map((t) => (t.id === id ? { ...t, done: !t.done } : t));
    setWorkTodos(flip);
    setSchoolTodos(flip);
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
      await fetchEvents(weekOffset);
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

  const today = new Date();

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
              void fetchEvents(weekOffset);
              void fetchAssignments();
              void fetchActions();
            }}
            loading={googleLoading}
          />
        </main>

        {/* Right column — Work + School todo dashboard */}
        <aside
          className={`w-full shrink-0 flex-col gap-5 overflow-auto border-l border-hairline bg-panel p-4 md:flex md:w-[360px] ${
            mobileView === "todos" ? "flex" : "hidden"
          }`}
        >
          <TodoSection
            title="Work"
            items={workTodos}
            today={today}
            onToggle={toggleTodo}
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
            items={schoolTodos}
            today={today}
            onToggle={toggleTodo}
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
