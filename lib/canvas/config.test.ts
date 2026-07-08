import { afterEach, describe, expect, it } from "vitest";
import { isCanvasConfigured, isMockMode, resolveMode } from "./config";

/**
 * Source-selection precedence is the heart of Unit 1: token beats ICS beats
 * none. Env is mutated per-case and cleared afterwards.
 */
const CANVAS_VARS = [
  "CANVAS_BASE_URL",
  "CANVAS_API_TOKEN",
  "CANVAS_ICS_URL",
  "CANVAS_MOCK",
] as const;

afterEach(() => {
  for (const v of CANVAS_VARS) delete process.env[v];
});

describe("resolveMode", () => {
  it("selects token when base URL + token are set", () => {
    process.env.CANVAS_BASE_URL = "https://school.instructure.com";
    process.env.CANVAS_API_TOKEN = "secret-token";
    expect(resolveMode()).toBe("token");
    expect(isCanvasConfigured()).toBe(true);
  });

  it("prefers token over ICS when both are present", () => {
    process.env.CANVAS_BASE_URL = "https://school.instructure.com";
    process.env.CANVAS_API_TOKEN = "secret-token";
    process.env.CANVAS_ICS_URL = "https://school.instructure.com/feeds/calendars/u.ics";
    expect(resolveMode()).toBe("token");
  });

  it("falls back to ICS when only an ICS URL is set", () => {
    process.env.CANVAS_ICS_URL = "https://school.instructure.com/feeds/calendars/u.ics";
    expect(resolveMode()).toBe("ics");
    expect(isCanvasConfigured()).toBe(true);
  });

  it("needs a base URL alongside the token (token alone is not enough)", () => {
    process.env.CANVAS_API_TOKEN = "secret-token";
    expect(resolveMode()).toBe("none");
    expect(isCanvasConfigured()).toBe(false);
  });

  it("is 'none' when nothing is configured", () => {
    expect(resolveMode()).toBe("none");
    expect(isCanvasConfigured()).toBe(false);
  });
});

describe("isMockMode", () => {
  it("is true only when CANVAS_MOCK=1", () => {
    expect(isMockMode()).toBe(false);
    process.env.CANVAS_MOCK = "1";
    expect(isMockMode()).toBe(true);
  });
});
