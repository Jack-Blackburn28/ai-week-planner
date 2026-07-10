import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "wh-route-"));
  process.env.WORK_HOURS_CONFIG_FILE = join(dir, ".work-hours.json");
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
  delete process.env.WORK_HOURS_CONFIG_FILE;
});

describe("GET/POST /api/work-hours", () => {
  it("GET returns an empty rule when nothing has been saved", async () => {
    const { GET } = await import("./route");
    const res = await GET();
    expect(await res.json()).toEqual({ days: {} });
  });

  it("POST persists a rule, and a later GET returns it", async () => {
    const { GET, POST } = await import("./route");
    const rule = { days: { "0": { startMinutes: 540, endMinutes: 1020 } } };

    const postRes = await POST(
      new Request("http://localhost/api/work-hours", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(rule),
      }),
    );
    expect(postRes.status).toBe(200);

    const getRes = await GET();
    expect(await getRes.json()).toEqual(rule);
  });

  it("POST rejects a malformed body", async () => {
    const { POST } = await import("./route");
    const res = await POST(
      new Request("http://localhost/api/work-hours", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ notARule: true }),
      }),
    );
    expect(res.status).toBe(400);
  });

  it("POST rejects an empty days object instead of silently saving nothing", async () => {
    const { POST } = await import("./route");
    const res = await POST(
      new Request("http://localhost/api/work-hours", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ days: {} }),
      }),
    );
    expect(res.status).toBe(400);
  });
});
