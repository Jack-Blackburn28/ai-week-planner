interface ChatBubbleProps {
  open: boolean;
  onClick: () => void;
}

/** Floating corner button that opens/closes the planner chat drawer. */
export function ChatBubble({ open, onClick }: ChatBubbleProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={open ? "Close planner chat" : "Open planner chat"}
      aria-expanded={open}
      className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-work-ring"
      style={{
        background:
          "linear-gradient(135deg, var(--color-work), var(--color-school))",
      }}
    >
      {open ? (
        <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden>
          <path
            d="M6 6l12 12M18 6L6 18"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden>
          <path
            d="M4 5h16v10H8l-4 4V5z"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  );
}
