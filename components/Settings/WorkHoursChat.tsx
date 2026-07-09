"use client";

/**
 * "Change work hours" — a small chat panel inline in the Settings drawer,
 * scoped ONLY to understanding and confirming working hours. It never offers
 * to plan the week or create events (that's the main planner chat's job).
 *
 * Reuses the main chat's bubble styling at a smaller scale, per the spec —
 * no separate visual design system, just a functionally separate
 * conversation with its own confirm-before-save step.
 */
import { useState } from "react";
import type { WorkHoursRule } from "@/lib/workHours/types";

interface ChatMsg {
  id: string;
  role: "user" | "assistant";
  text: string;
}

function summarizeRuleClient(rule: WorkHoursRule): string {
  const DAY_LABEL = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const formatClock = (minutes: number) => {
    const h24 = Math.floor(minutes / 60);
    const m = minutes % 60;
    const period = h24 >= 12 ? "pm" : "am";
    let h = h24 % 12;
    if (h === 0) h = 12;
    return m === 0 ? `${h}${period}` : `${h}:${String(m).padStart(2, "0")}${period}`;
  };
  const entries = Object.entries(rule.days) as [string, { startMinutes: number; endMinutes: number }][];
  if (entries.length === 0) return "no working hours set";
  return entries
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([day, h]) => `${DAY_LABEL[Number(day)]} ${formatClock(h.startMinutes)}-${formatClock(h.endMinutes)}`)
    .join(", ");
}

export function WorkHoursChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [draft, setDraft] = useState("");
  const [currentRule, setCurrentRule] = useState<WorkHoursRule | null>(null);
  const [pendingRule, setPendingRule] = useState<WorkHoursRule | null>(null);
  const [thinking, setThinking] = useState(false);
  const [saved, setSaved] = useState(false);
  const idRef = { current: 0 };
  const nextId = () => `wh${idRef.current++}`;

  const push = (role: ChatMsg["role"], text: string) =>
    setMessages((prev) => [...prev, { id: nextId(), role, text }]);

  const toggle = async () => {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    setSaved(false);
    let rule: WorkHoursRule | null = null;
    try {
      const res = await fetch("/api/work-hours");
      if (res.ok) rule = (await res.json()) as WorkHoursRule;
    } catch {
      /* fall back to a generic greeting */
    }
    setCurrentRule(rule);
    setMessages([]);
    setPendingRule(null);
    const hasHours = rule && Object.keys(rule.days).length > 0;
    push(
      "assistant",
      hasHours
        ? `Your hours are currently ${summarizeRuleClient(rule!)}. What would you like to change them to?`
        : "Hello! What would you like your working hours to be?",
    );
  };

  const send = async () => {
    const text = draft.trim();
    if (!text || thinking) return;
    push("user", text);
    setDraft("");
    setThinking(true);
    try {
      const res = await fetch("/api/work-hours/parse", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: text, currentRule }),
      });
      const data: { reply: string; proposedRule?: WorkHoursRule; error?: string } =
        await res.json();
      if (!res.ok) throw new Error(data.error ?? "parse failed");
      push("assistant", data.reply);
      setPendingRule(data.proposedRule ?? null);
    } catch {
      push("assistant", "Sorry — I couldn't reach the parser just now. Please try again.");
    } finally {
      setThinking(false);
    }
  };

  const save = async () => {
    if (!pendingRule) return;
    try {
      const res = await fetch("/api/work-hours", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(pendingRule),
      });
      if (!res.ok) throw new Error("save failed");
      setCurrentRule(pendingRule);
      setPendingRule(null);
      setSaved(true);
      push("assistant", "Saved ✓ Your working hours are updated.");
    } catch {
      push("assistant", "Sorry — I couldn't save that just now. Please try again.");
    }
  };

  const discard = () => {
    setPendingRule(null);
    push("assistant", "No problem — what would you like instead?");
  };

  return (
    <section aria-label="Work hours" className="flex flex-col gap-3">
      <div>
        <h3 className="text-sm font-semibold text-ink">Working hours</h3>
        <p className="text-xs text-ink-soft">
          Tell the AI your working hours so it never schedules personal
          tasks during them.
        </p>
      </div>

      <button
        type="button"
        onClick={toggle}
        className="self-start rounded-md border border-hairline bg-panel px-3 py-1.5 text-xs font-medium text-ink hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-work-ring"
      >
        {open ? "Close" : "Change work hours"}
      </button>

      {open && (
        <div
          data-testid="work-hours-chat"
          className="flex max-h-80 flex-col gap-2 rounded-lg border border-hairline bg-surface p-2"
        >
          <div className="flex-1 space-y-2 overflow-auto px-1 py-1">
            {messages.map((m) => (
              <div
                key={m.id}
                data-testid={`wh-msg-${m.role}`}
                className={m.role === "user" ? "flex justify-end" : "flex justify-start"}
              >
                <p
                  className={`max-w-[85%] rounded-xl px-2.5 py-1.5 text-xs leading-snug ${
                    m.role === "user" ? "bg-work text-white" : "bg-panel text-ink"
                  }`}
                >
                  {m.text}
                </p>
              </div>
            ))}
          </div>

          {pendingRule && (
            <div
              data-testid="wh-confirm-actions"
              className="flex items-center gap-2 border-t border-hairline pt-2"
            >
              <button
                type="button"
                onClick={save}
                className="rounded-md bg-personal px-2.5 py-1 text-xs font-medium text-white hover:opacity-90"
              >
                Save
              </button>
              <button
                type="button"
                onClick={discard}
                className="rounded-md border border-hairline bg-panel px-2.5 py-1 text-xs font-medium text-ink hover:bg-surface"
              >
                Discard
              </button>
            </div>
          )}

          <div className="flex items-end gap-2 border-t border-hairline pt-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void send();
                }
              }}
              disabled={thinking}
              placeholder="e.g. 9 to 5 Monday through Friday"
              aria-label="Describe your working hours"
              className="min-w-0 flex-1 rounded-md border border-hairline bg-panel px-2 py-1.5 text-xs text-ink outline-none focus-visible:ring-2 focus-visible:ring-work-ring disabled:opacity-50"
            />
            <button
              type="button"
              onClick={() => void send()}
              disabled={thinking}
              className="rounded-md bg-work px-2.5 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </div>
      )}
      {saved && !open && (
        <span className="text-xs font-medium text-personal">Saved ✓</span>
      )}
    </section>
  );
}
