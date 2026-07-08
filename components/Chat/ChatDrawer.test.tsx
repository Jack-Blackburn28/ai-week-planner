import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { ChatMessage } from "@/lib/types";
import { ChatDrawer } from "./ChatDrawer";

const messages: ChatMessage[] = [
  { id: "1", role: "assistant", text: "Hi Jack" },
  { id: "2", role: "user", text: "Plan my week" },
];

function setup(overrides: Partial<Parameters<typeof ChatDrawer>[0]> = {}) {
  const props = {
    open: true,
    messages,
    hasProposal: false,
    onClose: vi.fn(),
    onSend: vi.fn(),
    onPropose: vi.fn(),
    onApprove: vi.fn(),
    onMakeChanges: vi.fn(),
    ...overrides,
  };
  render(<ChatDrawer {...props} />);
  return props;
}

describe("ChatDrawer", () => {
  it("renders the message history", () => {
    setup();
    expect(screen.getByText("Hi Jack")).toBeInTheDocument();
    expect(screen.getByText("Plan my week")).toBeInTheDocument();
  });

  it("sends a typed message", async () => {
    const props = setup();
    await userEvent.type(
      screen.getByLabelText("Message the planner"),
      "fit in some gym",
    );
    await userEvent.click(screen.getByRole("button", { name: "Send" }));
    expect(props.onSend).toHaveBeenCalledWith("fit in some gym");
  });

  it("shows the Propose button (not the action bar) with no proposal", () => {
    const props = setup({ hasProposal: false });
    expect(screen.queryByTestId("proposal-actions")).not.toBeInTheDocument();
    userEvent.click(screen.getByRole("button", { name: /Propose a plan/ }));
    expect(props.onPropose).toBeDefined();
  });

  it("shows Approve / Make changes when a proposal is pending", async () => {
    const props = setup({ hasProposal: true });
    expect(screen.getByTestId("proposal-actions")).toBeInTheDocument();
    // Propose button is hidden while a proposal is active.
    expect(
      screen.queryByRole("button", { name: /Propose a plan/ }),
    ).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Approve" }));
    expect(props.onApprove).toHaveBeenCalledTimes(1);

    await userEvent.click(screen.getByRole("button", { name: "Make changes" }));
    expect(props.onMakeChanges).toHaveBeenCalledTimes(1);
  });
});
