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
    <section data-testid={`todo-section-${title.toLowerCase()}`}>
      <header className="mb-1 flex items-center gap-2 px-2">
        <h3 className="text-sm font-semibold tracking-tight text-ink">{title}</h3>
        <span
          data-testid="count-badge"
          className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-surface px-1.5 text-xs font-medium text-ink-soft"
        >
          {openCount}
        </span>
      </header>
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
    </section>
  );
}
