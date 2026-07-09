import { useState } from "react";
import type { TodoItem as Item } from "@/lib/types";
import { classifyDue, formatDueLabel, type DueStatus } from "@/lib/date";

const DUE_CLASS: Record<DueStatus, string> = {
  overdue: "text-danger font-medium",
  soon: "text-warn font-medium",
  normal: "text-ink-soft",
};

interface TodoItemProps {
  item: Item;
  today: Date;
  onToggle: (id: string) => void;
}

export function TodoItem({ item, today, onToggle }: TodoItemProps) {
  // Canvas assignments (Story 4) may have no due date — show a muted "No due
  // date" label and skip the overdue/soon emphasis.
  const due: DueStatus = item.dueDate ? classifyDue(item.dueDate, today) : "normal";
  const dueLabel = item.dueDate
    ? formatDueLabel(item.dueDate, today)
    : "No due date";
  const [expanded, setExpanded] = useState(false);

  return (
    <li className="flex items-start gap-3 rounded-lg px-2 py-2 hover:bg-surface">
      <button
        type="button"
        role="checkbox"
        aria-checked={item.done}
        aria-label={`Mark "${item.title}" ${item.done ? "not done" : "done"}`}
        onClick={() => onToggle(item.id)}
        className={`mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
          item.done
            ? "border-work bg-work text-white"
            : "border-hairline bg-panel hover:border-work"
        }`}
      >
        {item.done && (
          <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" aria-hidden>
            <path
              d="M2 6l2.5 2.5L10 3"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>

      <div className="min-w-0 flex-1">
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((e) => !e)}
          className={`block w-full text-left text-sm leading-snug ${
            expanded ? "" : "line-clamp-2"
          } ${item.done ? "text-ink-soft line-through" : "text-ink"}`}
        >
          {item.title}
        </button>
        <p className="truncate text-xs leading-snug">
          <span className="text-ink-soft">{item.metaLabel}</span>
          <span className="text-ink-soft"> · </span>
          <span data-testid="due-label" className={DUE_CLASS[due]}>
            {dueLabel}
          </span>
        </p>
      </div>
    </li>
  );
}
