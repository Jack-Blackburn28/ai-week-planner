"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import type { CalendarBlock, ChatMessage, ChatRole, TodoItem } from "@/lib/types";
import { initialBlocks, initialMessages, initialTodos } from "@/lib/mock-data";
import { approveProposal, discardProposal } from "@/lib/planning";
import { toCalendarBlocks } from "@/lib/planner/validate";
import { toWeekState } from "@/lib/planner/week";
import type { PlannerResponse } from "@/lib/planner/types";
import { Brand } from "@/components/Brand";
import { Calendar } from "@/components/Calendar/Calendar";
import { TodoSection } from "@/components/TodoSection/TodoSection";
import { ChatBubble } from "@/components/Chat/ChatBubble";
import { ChatDrawer } from "@/components/Chat/ChatDrawer";

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
  const [blocks, setBlocks] = useState<CalendarBlock[]>(initialBlocks);
  const [todos, setTodos] = useState<TodoItem[]>(initialTodos);
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [chatOpen, setChatOpen] = useState(false);
  const [mobileView, setMobileView] = useState<"calendar" | "todos">("calendar");
  const [thinking, setThinking] = useState(false);
  const idRef = useRef(0);

  const hasProposal = blocks.some((b) => b.status === "proposed");
  const nextId = () => `m${idRef.current++}`;

  const pushMessage = (role: ChatRole, text: string) =>
    setMessages((prev) => [...prev, { id: nextId(), role, text }]);

  const toggleTodo = (id: string) =>
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
    );

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
          week: toWeekState(blocks, todos),
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

  const handleApprove = () => {
    setBlocks((prev) => approveProposal(prev));
    pushMessage("assistant", "Done — added to your calendar. ✅");
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
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Calendar — dominant left surface */}
        <main
          className={`min-w-0 flex-1 flex-col overflow-hidden p-4 md:flex ${
            mobileView === "calendar" ? "flex" : "hidden"
          }`}
        >
          <Calendar blocks={blocks} referenceDate={today} />
        </main>

        {/* Right column — Work + School todo dashboard */}
        <aside
          className={`w-full shrink-0 flex-col gap-5 overflow-auto border-l border-hairline bg-panel p-4 md:flex md:w-[360px] ${
            mobileView === "todos" ? "flex" : "hidden"
          }`}
        >
          <TodoSection
            title="Work"
            items={todos.filter((t) => t.section === "work")}
            today={today}
            onToggle={toggleTodo}
          />
          <TodoSection
            title="School"
            items={todos.filter((t) => t.section === "school")}
            today={today}
            onToggle={toggleTodo}
          />
        </aside>
      </div>

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
