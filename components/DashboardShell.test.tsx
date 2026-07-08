import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { DashboardShell } from "./DashboardShell";
import { mockProposal } from "@/lib/mock-data";

/**
 * Integration proof of the core loop and the "approval before commit" rule:
 * proposing shows dashed blocks; Approve commits them (proposed→approved);
 * Make changes discards them (commits nothing).
 */
async function openChatAndPropose(container: HTMLElement) {
  await userEvent.click(screen.getByRole("button", { name: "Open planner chat" }));
  await userEvent.click(screen.getByRole("button", { name: /Propose a plan/ }));
  return container.querySelectorAll('[data-status="proposed"]');
}

describe("DashboardShell — proposal loop", () => {
  it("proposing adds pending (dashed) blocks to the calendar", async () => {
    const { container } = render(<DashboardShell />);
    expect(container.querySelectorAll('[data-status="proposed"]')).toHaveLength(0);

    const proposed = await openChatAndPropose(container);
    expect(proposed).toHaveLength(mockProposal.blocks.length);
  });

  it("Approve commits the proposal (proposed → approved)", async () => {
    const { container } = render(<DashboardShell />);
    await openChatAndPropose(container);

    await userEvent.click(screen.getByRole("button", { name: "Approve" }));

    // No pending blocks remain, and a previously-proposed block is now approved.
    expect(container.querySelectorAll('[data-status="proposed"]')).toHaveLength(0);
    const firstProposedId = mockProposal.blocks[0].id;
    const nowApproved = container.querySelector(
      `[data-block-id="${firstProposedId}"]`,
    ) as HTMLElement;
    expect(nowApproved).not.toBeNull();
    expect(nowApproved.dataset.status).toBe("approved");
  });

  it("Make changes commits nothing (proposed blocks removed)", async () => {
    const { container } = render(<DashboardShell />);
    await openChatAndPropose(container);

    await userEvent.click(screen.getByRole("button", { name: "Make changes" }));

    expect(container.querySelectorAll('[data-status="proposed"]')).toHaveLength(0);
    const firstProposedId = mockProposal.blocks[0].id;
    expect(
      container.querySelector(`[data-block-id="${firstProposedId}"]`),
    ).toBeNull();
  });
});
