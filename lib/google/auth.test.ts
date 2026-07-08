import { beforeEach, describe, expect, it } from "vitest";
import { getAuthUrl } from "./auth";

beforeEach(() => {
  process.env.GOOGLE_CLIENT_ID = "test-client-id.apps.googleusercontent.com";
  process.env.GOOGLE_CLIENT_SECRET = "test-secret";
  process.env.GOOGLE_REDIRECT_URI = "http://localhost:3000/api/google/callback";
});

describe("getAuthUrl", () => {
  it("requests offline access and forces the consent prompt (to get a refresh token)", () => {
    const url = new URL(getAuthUrl("personal"));
    expect(url.searchParams.get("access_type")).toBe("offline");
    expect(url.searchParams.get("prompt")).toBe("consent");
  });

  it("carries the account in `state` so the callback knows where to store the token", () => {
    expect(new URL(getAuthUrl("work")).searchParams.get("state")).toBe("work");
    expect(new URL(getAuthUrl("personal")).searchParams.get("state")).toBe(
      "personal",
    );
  });

  it("uses the read-only calendar scope for work", () => {
    const scope = new URL(getAuthUrl("work")).searchParams.get("scope") ?? "";
    expect(scope).toContain("calendar.readonly");
    expect(scope).not.toContain("auth/calendar ");
  });

  it("uses the full calendar scope for personal (needed to create the AI Calendar)", () => {
    const scope =
      new URL(getAuthUrl("personal")).searchParams.get("scope") ?? "";
    expect(scope).toContain("https://www.googleapis.com/auth/calendar");
    expect(scope).not.toContain("calendar.readonly");
  });
});
