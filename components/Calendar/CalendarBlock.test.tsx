import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { CalendarBlock as Block } from "@/lib/types";
import { defaultWindow } from "@/lib/time";
import { CalendarBlock } from "./CalendarBlock";

function block(overrides: Partial<Block>): Block {
  return {
    id: "b",
    title: "Test block",
    source: "work",
    status: "approved",
    day: 0,
    startMinutes: 9 * 60,
    endMinutes: 10 * 60,
    ...overrides,
  };
}

describe("CalendarBlock — darker per-category outline + shadow/hover polish", () => {
  it("renders a work-source block with the work outline class", () => {
    render(<CalendarBlock block={block({ source: "work" })} window={defaultWindow} />);
    expect(screen.getByTestId("calendar-block").className).toContain(
      "border-work-outline",
    );
  });

  it("renders a school-source block with the school outline class", () => {
    render(<CalendarBlock block={block({ source: "school" })} window={defaultWindow} />);
    expect(screen.getByTestId("calendar-block").className).toContain(
      "border-school-outline",
    );
  });

  it("renders a personal-source block with the personal outline class", () => {
    render(
      <CalendarBlock block={block({ source: "personal" })} window={defaultWindow} />,
    );
    expect(screen.getByTestId("calendar-block").className).toContain(
      "border-personal-outline",
    );
  });

  it("keeps the dashed border on proposed blocks alongside the new outline color", () => {
    render(
      <CalendarBlock
        block={block({ source: "school", status: "proposed" })}
        window={defaultWindow}
      />,
    );
    const el = screen.getByTestId("calendar-block");
    expect(el.className).toContain("border-dashed");
    expect(el.className).toContain("border-school-outline");
  });

  it("uses the outline color (not the base border color) for nested blocks", () => {
    render(
      <CalendarBlock
        block={block({ source: "personal", parentId: "parent" })}
        window={defaultWindow}
        nested
      />,
    );
    expect(screen.getByTestId("calendar-block").className).toContain(
      "border-personal-outline",
    );
  });

  it("has the subtle shadow/hover polish classes", () => {
    render(<CalendarBlock block={block({})} window={defaultWindow} />);
    const el = screen.getByTestId("calendar-block");
    expect(el.className).toContain("shadow-sm");
    expect(el.className).toContain("hover:shadow-md");
    expect(el.className).toContain("transition-shadow");
  });
});
