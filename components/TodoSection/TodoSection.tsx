import type { ReactNode } from "react";
import type { TodoItem as Item } from "@/lib/types";
import { TodoItem } from "./TodoItem";

interface TodoSectionProps {
  title: string;
  items: Item[];
  today: Date;
  onToggle: (id: string) => void;
  /** Shown in place of the default "Nothing here yet." when the list is empty. */
  emptyState?: ReactNode;
}

export function TodoSection({
  title,
  items,
  today,
  onToggle,
  emptyState,
}: TodoSectionProps) {
  const openCount = items.filter((i) => !i.done).length;

  return (
    <section
      data-testid={`todo-section-${title.toLowerCase()}`}
      className="flex min-h-0 flex-1 flex-col"
    >
      <header className="mb-1 flex shrink-0 items-center gap-2 px-2">
        <h3 className="text-sm font-semibold tracking-tight text-ink">{title}</h3>
        <span
          data-testid="count-badge"
          className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-surface px-1.5 text-xs font-medium text-ink-soft"
        >
          {openCount}
        </span>
      </header>
      {/* Scrolls independently so a long list never pushes the other section off. */}
      <div className="min-h-0 flex-1 overflow-auto">
        {items.length === 0 ? (
          emptyState ?? (
            <p className="px-2 py-2 text-sm text-ink-soft">Nothing here yet.</p>
          )
        ) : (
          <ul className="flex flex-col">
            {items.map((item) => (
              <TodoItem
                key={item.id}
                item={item}
                today={today}
                onToggle={onToggle}
              />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
