import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WorkHoursChat } from "./WorkHoursChat";

interface MockRoutes {
  getRule?: { days: Record<string, { startMinutes: number; endMinutes: number }> };
  parseReply?: { reply: string; proposedRule?: unknown };
}

function mockFetch({ getRule, parseReply }: MockRoutes) {
  const postCalls: { url: string; body: unknown }[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      if (init?.method === "POST") {
        postCalls.push({ url, body: init.body ? JSON.parse(init.body as string) : null });
        if (url === "/api/work-hours/parse") {
          return { ok: true, json: async () => parseReply ?? { reply: "..." } };
        }
        return { ok: true, json: async () => ({ ok: true }) };
      }
      // GET /api/work-hours
      return { ok: true, json: async () => getRule ?? { days: {} } };
    }) as unknown as typeof fetch,
  );
  return postCalls;
}

afterEach(() => vi.unstubAllGlobals());

describe("WorkHoursChat", () => {
  it("greets generically when no rule is set yet", async () => {
    mockFetch({ getRule: { days: {} } });
    render(<WorkHoursChat />);
    await userEvent.click(screen.getByRole("button", { name: "Change work hours" }));
    await waitFor(() =>
      expect(screen.getByTestId("wh-msg-assistant")).toHaveTextContent(
        "What would you like your working hours to be?",
      ),
    );
  });

  it("references the current hours when a rule is already set", async () => {
    mockFetch({
      getRule: { days: { "0": { startMinutes: 540, endMinutes: 1020 } } },
    });
    render(<WorkHoursChat />);
    await userEvent.click(screen.getByRole("button", { name: "Change work hours" }));
    await waitFor(() =>
      expect(screen.getByTestId("wh-msg-assistant")).toHaveTextContent(
        /Your hours are currently Mon 9am-5pm/,
      ),
    );
  });

  it("shows a summary and Save/Discard after a parsed reply, and Save persists it", async () => {
    const postCalls = mockFetch({
      getRule: { days: {} },
      parseReply: {
        reply: "Got it — Mon-Fri 9am-5pm. Save this?",
        proposedRule: { days: { "0": { startMinutes: 540, endMinutes: 1020 } } },
      },
    });
    render(<WorkHoursChat />);
    await userEvent.click(screen.getByRole("button", { name: "Change work hours" }));
    await waitFor(() => screen.getByTestId("work-hours-chat"));

    await userEvent.type(
      screen.getByLabelText("Describe your working hours"),
      "9 to 5 Monday through Friday{Enter}",
    );

    await waitFor(() => expect(screen.getByTestId("wh-confirm-actions")).toBeInTheDocument());
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(postCalls.some((c) => c.url === "/api/work-hours")).toBe(true),
    );
    const saveCall = postCalls.find((c) => c.url === "/api/work-hours")!;
    expect(saveCall.body).toEqual({ days: { "0": { startMinutes: 540, endMinutes: 1020 } } });
  });

  it("Discard clears the pending proposal without persisting it", async () => {
    const postCalls = mockFetch({
      getRule: { days: {} },
      parseReply: {
        reply: "Got it — Mon-Fri 9am-5pm. Save this?",
        proposedRule: { days: { "0": { startMinutes: 540, endMinutes: 1020 } } },
      },
    });
    render(<WorkHoursChat />);
    await userEvent.click(screen.getByRole("button", { name: "Change work hours" }));
    await waitFor(() => screen.getByTestId("work-hours-chat"));

    await userEvent.type(
      screen.getByLabelText("Describe your working hours"),
      "9 to 5 Monday through Friday{Enter}",
    );
    await waitFor(() => expect(screen.getByTestId("wh-confirm-actions")).toBeInTheDocument());
    await userEvent.click(screen.getByRole("button", { name: "Discard" }));

    expect(screen.queryByTestId("wh-confirm-actions")).not.toBeInTheDocument();
    expect(postCalls.some((c) => c.url === "/api/work-hours")).toBe(false);
  });
});
