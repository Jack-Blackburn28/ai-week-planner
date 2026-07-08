import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DashboardShell } from "./DashboardShell";

/**
 * Integration proof of the wired planner loop: a message calls /api/plan, the
 * reply renders, a returned proposal shows as dashed blocks, Approve commits and
 * Make changes discards, and an endpoint error is surfaced without changing blocks.
 * `fetch` is mocked — no real route/AI is involved.
 */

const PROPOSAL_RESPONSE = {
  reply: "Here's a plan.",
  proposal: {
    summary: "Gym Friday evening.",
    blocks: [
      { title: "Gym", source: "personal", day: 4, startMinutes: 1080, endMinutes: 1140 },
    ],
  },
};

function mockFetch(body: unknown, ok = true) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({ ok, json: async () => body }),
  );
}

async function openChatAndPlan() {
  await userEvent.click(screen.getByRole("button", { name: "Open planner chat" }));
  await userEvent.click(screen.getByRole("button", { name: /Plan my week/ }));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("DashboardShell — planner loop", () => {
  it("sends a request, renders the reply, and shows the proposal as dashed blocks", async () => {
    mockFetch(PROPOSAL_RESPONSE);
    const { container } = render(<DashboardShell />);

    await openChatAndPlan();

    await screen.findByText("Here's a plan.");
    // Request went to the planner endpoint with week + messages. (The shell also
    // calls /api/google/status and /api/google/events on mount, so find the
    // planner call specifically rather than assuming it is first.)
    expect(fetch).toHaveBeenCalledWith(
      "/api/plan",
      expect.objectContaining({ method: "POST" }),
    );
    const planCall = (fetch as ReturnType<typeof vi.fn>).mock.calls.find(
      (c) => c[0] === "/api/plan",
    );
    expect(planCall).toBeDefined();
    const body = JSON.parse(planCall![1].body);
    expect(Array.isArray(body.messages)).toBe(true);
    expect(body.week).toBeDefined();

    await waitFor(() =>
      expect(
        container.querySelectorAll('[data-status="proposed"]'),
      ).toHaveLength(1),
    );
  });

  it("Approve commits the proposal (proposed → approved)", async () => {
    mockFetch(PROPOSAL_RESPONSE);
    const { container } = render(<DashboardShell />);
    await openChatAndPlan();
    await waitFor(() =>
      expect(container.querySelectorAll('[data-status="proposed"]')).toHaveLength(1),
    );

    await userEvent.click(screen.getByRole("button", { name: "Approve" }));

    await waitFor(() =>
      expect(container.querySelectorAll('[data-status="proposed"]')).toHaveLength(0),
    );
    const block = container.querySelector('[data-block-id="prop-0"]') as HTMLElement;
    expect(block?.dataset.status).toBe("approved");
  });

  it("Make changes discards the proposal without committing", async () => {
    mockFetch(PROPOSAL_RESPONSE);
    const { container } = render(<DashboardShell />);
    await openChatAndPlan();
    await waitFor(() =>
      expect(container.querySelectorAll('[data-status="proposed"]')).toHaveLength(1),
    );

    await userEvent.click(screen.getByRole("button", { name: "Make changes" }));

    await waitFor(() =>
      expect(container.querySelectorAll('[data-status="proposed"]')).toHaveLength(0),
    );
    expect(container.querySelector('[data-block-id="prop-0"]')).toBeNull();
  });

  it("surfaces a friendly error and leaves the calendar unchanged on failure", async () => {
    mockFetch({ error: "boom" }, false);
    const { container } = render(<DashboardShell />);

    await openChatAndPlan();

    await screen.findByText(/couldn't reach the planner/i);
    expect(container.querySelectorAll('[data-status="proposed"]')).toHaveLength(0);
  });
});
