const SOURCES = [
  { label: "Work", swatch: "bg-work" },
  { label: "School", swatch: "bg-school" },
  { label: "Personal", swatch: "bg-personal" },
];

interface LegendProps {
  className?: string;
}

/** Small, unobtrusive color key for the calendar's source colors + proposed style. */
export function Legend({ className = "" }: LegendProps) {
  return (
    <ul
      aria-label="Calendar color key"
      className={`flex items-center gap-3 text-[11px] text-ink-soft ${className}`}
    >
      {SOURCES.map((s) => (
        <li key={s.label} className="flex items-center gap-1.5">
          <span className={`h-2.5 w-2.5 rounded-sm ${s.swatch}`} aria-hidden />
          {s.label}
        </li>
      ))}
      <li className="flex items-center gap-1.5">
        <span
          className="h-2.5 w-2.5 rounded-sm border-2 border-dashed border-ink-soft"
          aria-hidden
        />
        Proposed
      </li>
    </ul>
  );
}
