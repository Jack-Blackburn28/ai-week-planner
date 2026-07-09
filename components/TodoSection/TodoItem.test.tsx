import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { TodoItem as Item } from "@/lib/types";
import { TodoItem } from "./TodoItem";

const TODAY = new Date(2026, 6, 8); // 2026-07-08

const shortItem: Item = {
  id: "short",
  section: "work",
  title: "Send Q3 roadmap draft",
  metaLabel: "Platform Sync",
  dueDate: "2026-07-09",
  done: false,
};

const longItem: Item = {
  id: "long",
  section: "work",
  title:
    "Prepare a demo of the automated deployment pipeline for the platform review meeting with the full engineering leadership team",
  metaLabel: "Forge Standup",
  dueDate: undefined,
  done: false,
};

describe("TodoItem — title wrap and click-to-expand", () => {
  it("renders a short title with no visible difference from a plain clamp", () => {
    render(<TodoItem item={shortItem} today={TODAY} onToggle={() => {}} />);
    const title = screen.getByRole("button", { name: shortItem.title });
    expect(title).toBeInTheDocument();
    expect(title.className).toContain("line-clamp-2");
    expect(title).toHaveAttribute("aria-expanded", "false");
  });

  it("clamps a long title to 2 lines by default", () => {
    render(<TodoItem item={longItem} today={TODAY} onToggle={() => {}} />);
    const title = screen.getByRole("button", { name: longItem.title });
    expect(title.className).toContain("line-clamp-2");
    expect(title).toHaveAttribute("aria-expanded", "false");
  });

  it("expands a long title on click, and collapses again on a second click", async () => {
    render(<TodoItem item={longItem} today={TODAY} onToggle={() => {}} />);
    const title = screen.getByRole("button", { name: longItem.title });

    await userEvent.click(title);
    expect(title).toHaveAttribute("aria-expanded", "true");
    expect(title.className).not.toContain("line-clamp-2");

    await userEvent.click(title);
    expect(title).toHaveAttribute("aria-expanded", "false");
    expect(title.className).toContain("line-clamp-2");
  });

  it("clicking the title does not toggle the done checkbox", async () => {
    const onToggle = vi.fn();
    render(<TodoItem item={longItem} today={TODAY} onToggle={onToggle} />);
    const title = screen.getByRole("button", { name: longItem.title });
    await userEvent.click(title);
    expect(onToggle).not.toHaveBeenCalled();
  });
});
