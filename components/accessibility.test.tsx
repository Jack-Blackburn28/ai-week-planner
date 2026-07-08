import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { ChatMessage, TodoItem } from "@/lib/types";
import { TodoSection } from "./TodoSection/TodoSection";
import { ChatDrawer } from "./Chat/ChatDrawer";
import { ChatBubble } from "./Chat/ChatBubble";
import { Legend } from "./Legend";

const TODAY = new Date(2026, 6, 8);

const items: TodoItem[] = [
  {
    id: "w1",
    section: "work",
    title: "Send Q3 roadmap draft",
    metaLabel: "Platform Sync",
    dueDate: "2026-07-09",
    done: false,
  },
];

const messages: ChatMessage[] = [{ id: "1", role: "assistant", text: "Hi" }];

describe("accessibility", () => {
  it("todo checkbox has an accessible name and is keyboard-activatable", async () => {
    const onToggle = vi.fn();
    render(
      <TodoSection title="Work" items={items} today={TODAY} onToggle={onToggle} />,
    );
    const checkbox = screen.getByRole("checkbox", {
      name: /Send Q3 roadmap draft/,
    });
    checkbox.focus();
    expect(checkbox).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    expect(onToggle).toHaveBeenCalledWith("w1");
  });

  it("chat action buttons expose accessible names", () => {
    render(
      <ChatDrawer
        open
        messages={messages}
        hasProposal
        onClose={() => {}}
        onSend={() => {}}
        onPropose={() => {}}
        onApprove={() => {}}
        onMakeChanges={() => {}}
      />,
    );
    expect(screen.getByRole("button", { name: "Send" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Approve" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Make changes" }),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText("Message the planner"),
    ).toBeInTheDocument();
  });

  it("chat bubble has a descriptive label", () => {
    render(<ChatBubble open={false} onClick={() => {}} />);
    expect(
      screen.getByRole("button", { name: "Open planner chat" }),
    ).toBeInTheDocument();
  });

  it("legend is labeled and does not rely on color alone (has text)", () => {
    render(<Legend />);
    const legend = screen.getByLabelText("Calendar color key");
    expect(legend).toBeInTheDocument();
    expect(legend).toHaveTextContent("Work");
    expect(legend).toHaveTextContent("Proposed");
  });
});
