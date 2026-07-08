import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Brand } from "./Brand";

describe("Brand", () => {
  it("renders the app name", () => {
    render(<Brand />);
    expect(screen.getByText("AI Week Planner")).toBeInTheDocument();
  });
});
