"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import type { CalendarBlock, ChatMessage, ChatRole, TodoItem } from "@/lib/types";
import {
  initialBlocks,
  initialMessages,
  initialTodos,
  mockProposal,
} from "@/lib/mock-data";
import { approveProposal, discardProposal } from "@/lib/planning";
import { Brand } from "@/components/Brand";
import { Calendar } from "@/components/Calendar/Calendar";
import { TodoSection } from "@/components/TodoSection/TodoSection";
import { ChatBubble } from "@/components/Chat/ChatBubble";
import { ChatDrawer } from "@/components/Chat/ChatDrawer";

const PLACEHOLDER_REPLY =
  "Thanks! I'm a placeholder for now — in Story 2 I'll actually plan around your week. Tap “Propose a plan” to preview how proposals work.";

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
  const idRef = useRef(0);

  const hasProposal = blocks.some((b) => b.status === "proposed");

  const pushMessage = (role: ChatRole, text: string) =>
    setMessages((prev) => [...prev, { id: `m${idRef.current++}`, role, text }]);

  const toggleTodo = (id: string) =>
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
    );

  const handleSend = (text: string) => {
    pushMessage("user", text);
    pushMessage("assistant", PLACEHOLDER_REPLY);
  };

  const handlePropose = () => {
    if (hasProposal) return;
    setBlocks((prev) => [...prev, ...mockProposal.blocks]);
    pushMessage(
      "assistant",
      `${mockProposal.summary} I've penciled it onto your calendar (dashed) — Approve to keep it, or Make changes.`,
    );
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
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Calendar — dominant left surface */}
        <main className="min-w-0 flex-1 overflow-hidden p-4">
          <Calendar blocks={blocks} referenceDate={today} />
        </main>

        {/* Right column — Work + School todo dashboard */}
        <aside className="hidden w-[360px] shrink-0 flex-col gap-5 overflow-auto border-l border-hairline bg-panel p-4 md:flex">
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
        onClose={() => setChatOpen(false)}
        onSend={handleSend}
        onPropose={handlePropose}
        onApprove={handleApprove}
        onMakeChanges={handleMakeChanges}
      />
    </div>
  );
}
