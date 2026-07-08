"use client";

import { useState } from "react";
import type { ChatMessage } from "@/lib/types";

interface ChatDrawerProps {
  open: boolean;
  messages: ChatMessage[];
  /** True while a proposal is pending review (dashed blocks on the calendar). */
  hasProposal: boolean;
  /** True while awaiting a planner response — shows a thinking indicator. */
  isThinking?: boolean;
  onClose: () => void;
  onSend: (text: string) => void;
  onPropose: () => void;
  onApprove: () => void;
  onMakeChanges: () => void;
}

/**
 * Right slide-in chat drawer — the only way to interact with the planner. Sized
 * to cover the todo column on desktop (full-screen on mobile, Task 6) so the
 * calendar stays visible while proposals appear on it.
 */
export function ChatDrawer({
  open,
  messages,
  hasProposal,
  isThinking = false,
  onClose,
  onSend,
  onPropose,
  onApprove,
  onMakeChanges,
}: ChatDrawerProps) {
  const [draft, setDraft] = useState("");

  const send = () => {
    if (isThinking) return;
    const text = draft.trim();
    if (!text) return;
    onSend(text);
    setDraft("");
  };

  return (
    <aside
      role="dialog"
      aria-label="AI planner chat"
      aria-hidden={!open}
      className={`fixed right-0 top-0 z-40 flex h-dvh w-full flex-col border-l border-hairline bg-panel shadow-xl transition-transform duration-200 md:w-[360px] ${
        open ? "translate-x-0" : "translate-x-full"
      }`}
    >
      {/* Header */}
      <header className="flex items-center justify-between border-b border-hairline px-4 py-3">
        <h2 className="text-sm font-semibold text-ink">Plan with AI</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close planner chat"
          className="rounded-md px-2 py-1 text-ink-soft hover:bg-surface"
        >
          ✕
        </button>
      </header>

      {/* Messages */}
      <div className="flex-1 space-y-3 overflow-auto px-4 py-4">
        {messages.map((m) => (
          <div
            key={m.id}
            data-testid={`msg-${m.role}`}
            className={m.role === "user" ? "flex justify-end" : "flex justify-start"}
          >
            <p
              className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-snug ${
                m.role === "user"
                  ? "bg-work text-white"
                  : "bg-surface text-ink"
              }`}
            >
              {m.text}
            </p>
          </div>
        ))}
        {isThinking && (
          <div data-testid="thinking" className="flex justify-start">
            <p
              aria-label="Planner is thinking"
              className="flex items-center gap-1 rounded-2xl bg-surface px-3 py-2 text-ink-soft"
            >
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-soft [animation-delay:-0.2s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-soft [animation-delay:-0.1s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-soft" />
            </p>
          </div>
        )}
      </div>

      {/* Proposal action bar */}
      {hasProposal && (
        <div
          data-testid="proposal-actions"
          className="flex items-center gap-2 border-t border-hairline bg-work-soft/40 px-4 py-3"
        >
          <span className="mr-auto text-xs text-ink-soft">
            Draft on your calendar
          </span>
          <button
            type="button"
            onClick={onApprove}
            className="rounded-md bg-personal px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
          >
            Approve
          </button>
          <button
            type="button"
            onClick={onMakeChanges}
            className="rounded-md border border-hairline bg-panel px-3 py-1.5 text-sm font-medium text-ink hover:bg-surface"
          >
            Make changes
          </button>
        </div>
      )}

      {/* Composer */}
      <div className="border-t border-hairline px-4 py-3">
        <div className="flex items-end gap-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            rows={1}
            disabled={isThinking}
            placeholder="Tell the planner what you need…"
            aria-label="Message the planner"
            className="min-h-[38px] flex-1 resize-none rounded-lg border border-hairline bg-panel px-3 py-2 text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-work-ring disabled:opacity-50"
          />
          <button
            type="button"
            onClick={send}
            disabled={isThinking}
            className="rounded-lg bg-work px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            Send
          </button>
        </div>
        {!hasProposal && (
          <button
            type="button"
            onClick={onPropose}
            disabled={isThinking}
            className="mt-2 rounded-full border border-work/40 bg-work-soft px-3 py-1 text-xs font-medium text-work hover:opacity-90 disabled:opacity-50"
          >
            ✦ Plan my week
          </button>
        )}
      </div>
    </aside>
  );
}
