import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { CalendarBlock } from "@/lib/types";
import { HOUR_PX } from "@/lib/time";
import { Calendar } from "./Calendar";

const REFERENCE = new Date(2026, 6, 8); // Wed 2026-07-08

const blocks: CalendarBlock[] = [
  {
    id: "w",
    title: "Work",
    source: "work",
    status: "approved",
    day: 0,
    startMinutes: 9 * 60,
    endMinutes: 17 * 60,
    immovable: true,
  },
  {
    id: "m",
    title: "Sync",
    source: "work",
    status: "approved",
    day: 0,
    startMinutes: 10 * 60,
    endMinutes: 10 * 60 + 30,
    parentId: "w",
  },
  {
    id: "p",
    title: "Gym",
    source: "personal",
    status: "proposed",
    day: 2,
    startMinutes: 18 * 60,
    endMinutes: 19 * 60,
  },
];

describe("Calendar", () => {
  it("renders the week grid with 7 day headers", () => {
    const { container } = render(
      <Calendar blocks={blocks} referenceDate={REFERENCE} />,
    );
    expect(screen.getByTestId("calendar")).toBeInTheDocument();
    expect(container.querySelectorAll('[data-testid="day-header"]')).toHaveLength(7);
  });

  it("positions a 9:00 AM block three hours below the 6am start", () => {
    const { container } = render(
      <Calendar blocks={blocks} referenceDate={REFERENCE} />,
    );
    const work = container.querySelector('[data-block-id="w"]') as HTMLElement;
    expect(work.style.top).toBe(`${3 * HOUR_PX}px`);
  });

  it("renders a proposed block with the dashed/pending style", () => {
    const { container } = render(
      <Calendar blocks={blocks} referenceDate={REFERENCE} />,
    );
    const proposed = container.querySelector('[data-block-id="p"]') as HTMLElement;
    expect(proposed.dataset.status).toBe("proposed");
    expect(proposed.className).toContain("border-dashed");
  });

  it("marks meetings with a parentId as nested", () => {
    const { container } = render(
      <Calendar blocks={blocks} referenceDate={REFERENCE} />,
    );
    const meeting = container.querySelector('[data-block-id="m"]') as HTMLElement;
    expect(meeting.dataset.nested).toBe("true");
  });

  it("highlights today's column", () => {
    const { container } = render(
      <Calendar blocks={blocks} referenceDate={REFERENCE} />,
    );
    const todays = container.querySelectorAll(
      '[data-testid="day-header"][data-today="true"]',
    );
    expect(todays).toHaveLength(1);
    expect(todays[0].textContent).toContain("8"); // the 8th
  });

  it("is window-agnostic: a wider window re-anchors block offsets", () => {
    const { container } = render(
      <Calendar
        blocks={blocks}
        referenceDate={REFERENCE}
        window={{ startHour: 5, endHour: 23 }}
      />,
    );
    const work = container.querySelector('[data-block-id="w"]') as HTMLElement;
    // 9:00 AM is now 4 hours below a 5am start.
    expect(work.style.top).toBe(`${4 * HOUR_PX}px`);
  });
});
