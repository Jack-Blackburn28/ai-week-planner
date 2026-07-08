import { Brand } from "@/components/Brand";

/**
 * Story 1 scaffold placeholder. The real three-surface shell (calendar, todo
 * dashboard, chat) is assembled in later tasks (3.0–6.0) via <DashboardShell />.
 */
export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <Brand />
      <p className="max-w-md text-sm text-ink-soft">
        Project scaffold is running. The week calendar, todo dashboard, and chat
        planner are assembled in the following Story 1 tasks.
      </p>
    </main>
  );
}
