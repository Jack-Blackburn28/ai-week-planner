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

  it("auto-expands the window to fit an early event, re-anchoring offsets", () => {
    const early: CalendarBlock = {
      id: "early",
      title: "Early flight",
      source: "personal",
      status: "approved",
      day: 1,
      startMinutes: 5 * 60,
      endMinutes: 6 * 60,
    };
    const { container } = render(
      <Calendar blocks={[...blocks, early]} referenceDate={REFERENCE} />,
    );
    // With a 5am event the window now starts at 5am, so 9:00 AM sits 4 hours down.
    const work = container.querySelector('[data-block-id="w"]') as HTMLElement;
    expect(work.style.top).toBe(`${4 * HOUR_PX}px`);
  });

  it("labels day columns with real dates for the displayed week", () => {
    const { container } = render(
      <Calendar blocks={[]} referenceDate={REFERENCE} weekOffset={0} />,
    );
    const headers = container.querySelectorAll('[data-testid="day-header"]');
    // Mon 2026-07-06 … Sun 2026-07-12.
    expect(headers[0].getAttribute("data-date")).toBe("2026-07-06");
    expect(headers[6].getAttribute("data-date")).toBe("2026-07-12");
  });

  it("renders an all-day event in the top strip, not on the hourly grid", () => {
    const { container } = render(
      <Calendar
        blocks={[]}
        referenceDate={REFERENCE}
        allDayEvents={[
          { id: "bday", title: "Mom's birthday", day: 2, source: "personal" },
        ]}
      />,
    );
    const strip = container.querySelector('[data-testid="all-day-strip"]');
    expect(strip).toBeInTheDocument();
    expect(strip?.textContent).toContain("Mom's birthday");
    // It is not rendered as a timed calendar block.
    expect(container.querySelector('[data-block-id="bday"]')).toBeNull();
  });

  it("confines the now-line inside the grid body, structurally separate from the header/strip", () => {
    // 6:00 AM — the start of the default visible window, the scroll position
    // most likely to have bled into the header under the old shared-scroll
    // implementation (see Spec 08).
    const nowAtWindowStart = new Date(2026, 6, 8, 6, 0, 0);
    const { container } = render(
      <Calendar blocks={[]} referenceDate={nowAtWindowStart} />,
    );
    const gridBody = container.querySelector(
      '[data-testid="grid-body"]',
    ) as HTMLElement;
    const nowLine = container.querySelector(
      '[data-testid="now-line"]',
    ) as HTMLElement;
    const header = container.querySelector(
      '[data-testid="day-header"]',
    ) as HTMLElement;

    expect(gridBody).toBeInTheDocument();
    expect(nowLine).toBeInTheDocument();
    // The now-line lives inside the grid body's own scroll region...
    expect(gridBody.contains(nowLine)).toBe(true);
    // ...which is a structurally separate subtree from the header, so the
    // two can never occupy the same DOM (and thus visual) region.
    expect(gridBody.contains(header)).toBe(false);
    expect(header.contains(gridBody)).toBe(false);
  });
});
