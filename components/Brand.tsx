/**
 * Small brand/wordmark used in the app header. Kept as its own component so it
 * is trivially testable and reused across the shell.
 */
export function Brand() {
  return (
    <div className="flex items-center gap-2">
      <span
        aria-hidden
        className="inline-block h-6 w-6 rounded-lg bg-work"
        style={{
          background:
            "linear-gradient(135deg, var(--color-work), var(--color-school))",
        }}
      />
      <span className="text-lg font-semibold tracking-tight text-ink">
        AI Week Planner
      </span>
    </div>
  );
}
