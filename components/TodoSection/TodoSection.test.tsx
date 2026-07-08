import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { TodoItem } from "@/lib/types";
import { TodoSection } from "./TodoSection";

const TODAY = new Date(2026, 6, 8); // 2026-07-08

const workItems: TodoItem[] = [
  {
    id: "w1",
    section: "work",
    title: "Send Q3 roadmap draft",
    metaLabel: "Platform Sync",
    dueDate: "2026-07-09", // tomorrow
    done: false,
  },
  {
    id: "w2",
    section: "work",
    title: "Review PR #482",
    metaLabel: "Eng Sync",
    dueDate: "2026-07-11",
    done: true,
  },
];

const schoolItems: TodoItem[] = [
  {
    id: "s1",
    section: "school",
    title: "Reading: chapters 4–5",
    metaLabel: "HIST 202",
    dueDate: "2026-07-06", // overdue
    done: false,
  },
];

describe("TodoSection", () => {
  it("shows a Work item's source meeting and a due label", () => {
    render(
      <TodoSection title="Work" items={workItems} today={TODAY} onToggle={() => {}} />,
    );
    expect(screen.getByText("Platform Sync")).toBeInTheDocument();
    expect(screen.getByText("Send Q3 roadmap draft")).toBeInTheDocument();
    // due tomorrow
    expect(screen.getByText("Tomorrow")).toBeInTheDocument();
  });

  it("shows a School item's course and due date", () => {
    render(
      <TodoSection
        title="School"
        items={schoolItems}
        today={TODAY}
        onToggle={() => {}}
      />,
    );
    expect(screen.getByText("HIST 202")).toBeInTheDocument();
    expect(screen.getByText(/chapters 4–5/)).toBeInTheDocument();
  });

  it("count badge reflects only the open (not done) items", () => {
    render(
      <TodoSection title="Work" items={workItems} today={TODAY} onToggle={() => {}} />,
    );
    // 2 items, 1 done → 1 open
    expect(screen.getByTestId("count-badge")).toHaveTextContent("1");
  });

  it("emphasizes an overdue item's due date", () => {
    render(
      <TodoSection
        title="School"
        items={schoolItems}
        today={TODAY}
        onToggle={() => {}}
      />,
    );
    const dueLabel = screen.getByTestId("due-label");
    expect(dueLabel.className).toContain("text-danger");
    expect(dueLabel.textContent).toContain("overdue");
  });

  it("toggles an item via its checkbox", async () => {
    const onToggle = vi.fn();
    render(
      <TodoSection title="Work" items={workItems} today={TODAY} onToggle={onToggle} />,
    );
    const checkbox = screen.getByRole("checkbox", {
      name: /Send Q3 roadmap draft/,
    });
    await userEvent.click(checkbox);
    expect(onToggle).toHaveBeenCalledWith("w1");
  });

  it("marks a done item's checkbox as checked", () => {
    render(
      <TodoSection title="Work" items={workItems} today={TODAY} onToggle={() => {}} />,
    );
    const done = screen.getByRole("checkbox", { name: /Review PR #482/ });
    expect(done).toHaveAttribute("aria-checked", "true");
  });
});
