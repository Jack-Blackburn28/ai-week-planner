import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { GoogleConnect } from "./GoogleConnect";

function mockStatus(status: { work: boolean; personal: boolean }) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok: true,
      json: async () => status,
    })) as unknown as typeof fetch,
  );
}

afterEach(() => vi.unstubAllGlobals());

describe("GoogleConnect", () => {
  it("shows Connect actions for both accounts when disconnected", async () => {
    mockStatus({ work: false, personal: false });
    render(<GoogleConnect />);
    await waitFor(() => {
      expect(screen.getByTestId("connect-work")).toHaveAttribute(
        "href",
        "/api/google/connect/work",
      );
    });
    expect(screen.getByTestId("connect-personal")).toHaveAttribute(
      "href",
      "/api/google/connect/personal",
    );
  });

  it("shows a Connected badge for a connected account", async () => {
    mockStatus({ work: true, personal: false });
    render(<GoogleConnect />);
    await waitFor(() =>
      expect(screen.getByTestId("status-work")).toHaveTextContent("Connected"),
    );
    // Personal still offers Connect.
    expect(screen.getByTestId("connect-personal")).toBeInTheDocument();
  });
});
