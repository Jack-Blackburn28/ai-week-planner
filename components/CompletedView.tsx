import type { CompletedItem } from "@/lib/todos/completions";

interface CompletedViewProps {
  items: CompletedItem[];
}

const SOURCE_LABEL: Record<CompletedItem["source"], string> = {
  work: "Work",
  school: "School",
};
const SOURCE_CLASS: Record<CompletedItem["source"], string> = {
  work: "bg-work-soft text-work",
  school: "bg-school-soft text-school",
};

function clearedLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/**
 * The combined Completed archive: everything cleared across Work (Granola) and
 * School (Canvas), most-recent-first, labeled by source. Read-only review.
 */
export function CompletedView({ items }: CompletedViewProps) {
  if (items.length === 0) {
    return (
      <p className="px-2 py-2 text-sm text-ink-soft">
        Nothing completed yet. Items you check off appear here.
      </p>
    );
  }

  return (
    <ul className="flex flex-col" data-testid="completed-list">
      {items.map((item) => (
        <li
          key={item.id}
          className="flex items-start gap-3 rounded-lg px-2 py-2 hover:bg-surface"
        >
          <span
            aria-hidden
            className="mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-2 border-work bg-work text-white"
          >
            <svg viewBox="0 0 12 12" className="h-2.5 w-2.5">
              <path
                d="M2 6l2.5 2.5L10 3"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm leading-snug text-ink-soft line-through">
              {item.title}
            </p>
            <p className="flex items-center gap-1.5 truncate text-xs leading-snug">
              <span
                className={`rounded px-1 py-0.5 text-[10px] font-medium ${SOURCE_CLASS[item.source]}`}
              >
                {SOURCE_LABEL[item.source]}
              </span>
              <span className="text-ink-soft">{item.metaLabel}</span>
              {clearedLabel(item.completedAt) && (
                <>
                  <span className="text-ink-soft">·</span>
                  <span className="text-ink-soft">
                    cleared {clearedLabel(item.completedAt)}
                  </span>
                </>
              )}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
