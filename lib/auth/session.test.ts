import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  checkPassword,
  createSessionValue,
  verifySessionValue,
} from "./session";

const saved: Record<string, string | undefined> = {};
beforeEach(() => {
  saved.APP_PASSWORD = process.env.APP_PASSWORD;
  saved.SESSION_SECRET = process.env.SESSION_SECRET;
  process.env.APP_PASSWORD = "correct horse battery staple";
  process.env.SESSION_SECRET = "test-session-secret-not-for-prod";
});
afterEach(() => {
  process.env.APP_PASSWORD = saved.APP_PASSWORD;
  process.env.SESSION_SECRET = saved.SESSION_SECRET;
});

describe("checkPassword", () => {
  it("accepts the correct password", async () => {
    expect(await checkPassword("correct horse battery staple")).toBe(true);
  });

  it("rejects a wrong password", async () => {
    expect(await checkPassword("wrong")).toBe(false);
    expect(await checkPassword("")).toBe(false);
  });

  it("fails closed when APP_PASSWORD is not configured", async () => {
    delete process.env.APP_PASSWORD;
    expect(await checkPassword("anything")).toBe(false);
  });

  it("fails closed when SESSION_SECRET is not configured", async () => {
    delete process.env.SESSION_SECRET;
    expect(await checkPassword("correct horse battery staple")).toBe(false);
  });
});

describe("session value sign/verify", () => {
  it("verifies a value it just minted", async () => {
    const value = await createSessionValue();
    expect(await verifySessionValue(value)).toBe(true);
  });

  it("rejects an empty or malformed value", async () => {
    expect(await verifySessionValue(undefined)).toBe(false);
    expect(await verifySessionValue("")).toBe(false);
    expect(await verifySessionValue("garbage")).toBe(false);
    expect(await verifySessionValue("v1.")).toBe(false);
  });

  it("rejects a tampered signature", async () => {
    const value = await createSessionValue();
    const tampered = value.slice(0, -1) + (value.endsWith("0") ? "1" : "0");
    expect(await verifySessionValue(tampered)).toBe(false);
  });

  it("rejects a value signed with a different secret", async () => {
    const value = await createSessionValue();
    process.env.SESSION_SECRET = "a-different-secret";
    expect(await verifySessionValue(value)).toBe(false);
  });
});
