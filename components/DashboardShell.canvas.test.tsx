import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DashboardShell } from "./DashboardShell";
import type { TodoItem } from "@/lib/types";

/**
 * Proves the School section is driven by the Canvas endpoints: submitted items
 * render checked, undated items show "No due date", the "Connect Canvas" empty
 * state shows when disconnected, and Refresh re-fetches assignments. `fetch` is
 * mocked per-URL — no real route is involved.
 */

const ASSIGNMENTS: TodoItem[] = [
  {
    id: "canvas-1",
    section: "school",
    title: "Submitted essay",
    metaLabel: "HIST 202",
    dueDate: "2026-07-10",
    done: true,
  },
  {
    id: "canvas-2",
    section: "school",
    title: "Undated discussion",
    metaLabel: "CS 350",
    done: false,
  },
];

/** Route fetch responses by URL so each endpoint returns its own shape. */
function mockFetchByUrl(opts: { canvasConnected: boolean; assignments: TodoItem[] }) {
  const fn = vi.fn(async (url: string) => {
    const ok = (body: unknown) => ({ ok: true, json: async () => body });
    if (url.startsWith("/api/canvas/status"))
      return ok({ connected: opts.canvasConnected, mode: opts.canvasConnected ? "token" : "none" });
    if (url.startsWith("/api/canvas/assignments")) return ok(opts.assignments);
    if (url.startsWith("/api/google/status")) return ok({ work: false, personal: false });
    if (url.startsWith("/api/google/events")) return ok({ blocks: [], allDay: [] });
    return ok({});
  });
  vi.stubGlobal("fetch", fn);
  return fn;
}

afterEach(() => vi.unstubAllGlobals());

describe("DashboardShell — Canvas School section", () => {
  it("renders assignments from Canvas: submitted checked, undated labeled", async () => {
    mockFetchByUrl({ canvasConnected: true, assignments: ASSIGNMENTS });
    render(<DashboardShell />);

    const school = await screen.findByTestId("todo-section-school");
    await within(school).findByText("Submitted essay");

    // Submitted assignment renders as checked.
    const submitted = within(school).getByRole("checkbox", {
      name: /Submitted essay/,
    });
    expect(submitted).toHaveAttribute("aria-checked", "true");

    // Undated assignment shows the "No due date" label.
    within(school).getByText("Undated discussion");
    expect(within(school).getByText("No due date")).toBeInTheDocument();
  });

  it("shows the Connect Canvas empty state when not connected", async () => {
    mockFetchByUrl({ canvasConnected: false, assignments: [] });
    render(<DashboardShell />);

    const school = await screen.findByTestId("todo-section-school");
    await waitFor(() =>
      expect(
        within(school).getByText(/Connect Canvas to see your assignments/i),
      ).toBeInTheDocument(),
    );
  });

  it("re-fetches assignments when Refresh is pressed", async () => {
    const fn = mockFetchByUrl({ canvasConnected: true, assignments: ASSIGNMENTS });
    render(<DashboardShell />);
    await screen.findByText("Submitted essay");

    const before = fn.mock.calls.filter(
      (c) => typeof c[0] === "string" && c[0].startsWith("/api/canvas/assignments"),
    ).length;

    await userEvent.click(screen.getByRole("button", { name: /refresh/i }));

    await waitFor(() => {
      const after = fn.mock.calls.filter(
        (c) => typeof c[0] === "string" && c[0].startsWith("/api/canvas/assignments"),
      ).length;
      expect(after).toBeGreaterThan(before);
    });
  });
});
