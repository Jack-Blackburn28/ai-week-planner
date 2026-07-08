import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DashboardShell } from "./DashboardShell";
import type { TodoItem } from "@/lib/types";

/**
 * Proves the clear → Completed archive flow: clicking a Work (Granola) item
 * removes it from the Active list and surfaces it under the Completed tab, and a
 * POST is sent to persist the clear. `fetch` is mocked per-URL.
 */
const WORK: TodoItem[] = [
  { id: "granola-m1-0", section: "work", title: "Send the roadmap", metaLabel: "Platform Sync", done: false },
];

function mockFetch() {
  const state = { postedComplete: false };
  const fn = vi.fn(async (url: string, init?: RequestInit) => {
    const ok = (body: unknown) => ({ ok: true, json: async () => body });
    if (url.startsWith("/api/granola/status")) return ok({ connected: true });
    if (url.startsWith("/api/granola/actions")) return ok(WORK);
    if (url.startsWith("/api/canvas/status")) return ok({ connected: false, mode: "none" });
    if (url.startsWith("/api/canvas/assignments")) return ok([]);
    if (url.startsWith("/api/todos/completed")) return ok([]);
    if (url.startsWith("/api/todos/complete")) {
      if (init?.method === "POST") state.postedComplete = true;
      return ok({ ok: true });
    }
    if (url.startsWith("/api/google/status")) return ok({ work: false, personal: false });
    if (url.startsWith("/api/google/events")) return ok({ blocks: [], allDay: [] });
    return ok({});
  });
  vi.stubGlobal("fetch", fn);
  return state;
}

afterEach(() => vi.unstubAllGlobals());

describe("DashboardShell — clear to Completed archive", () => {
  it("clearing a Work item removes it from Active and shows it under Completed", async () => {
    const state = mockFetch();
    render(<DashboardShell />);

    const work = await screen.findByTestId("todo-section-work");
    await within(work).findByText("Send the roadmap");

    await userEvent.click(
      within(work).getByRole("checkbox", { name: /Send the roadmap/ }),
    );

    // Leaves the active Work list.
    await waitFor(() =>
      expect(within(work).queryByText("Send the roadmap")).toBeNull(),
    );
    // Persisted via POST.
    await waitFor(() => expect(state.postedComplete).toBe(true));

    // Appears under the Completed tab.
    await userEvent.click(screen.getByRole("tab", { name: /Completed/ }));
    const completed = await screen.findByTestId("completed-list");
    expect(within(completed).getByText("Send the roadmap")).toBeInTheDocument();
  });
});
