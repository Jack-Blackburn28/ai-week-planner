import { afterEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { createGoogleConfig, ensureAiCalendar, AI_CALENDAR_NAME } from "./config";
import { createMockClient } from "./client.mock";

const dirs: string[] = [];
function tempConfig() {
  const dir = mkdtempSync(join(tmpdir(), "gcfg-ai-"));
  dirs.push(dir);
  return createGoogleConfig({ filePath: join(dir, ".google-config.json") });
}
afterEach(() => dirs.splice(0).forEach((d) => rmSync(d, { recursive: true, force: true })));

describe("ensureAiCalendar", () => {
  it("creates the AI Calendar once and reuses its id thereafter (idempotent)", async () => {
    const client = createMockClient();
    const cfg = tempConfig();

    const first = await ensureAiCalendar(client, cfg);
    const second = await ensureAiCalendar(client, cfg);

    expect(first).toBe(second);
    expect(client.createdCount()).toBe(1); // created only on the first call
    expect(cfg.get().aiCalendarId).toBe(first);
  });

  it("reuses an existing calendar named 'AI Calendar' without creating a new one", async () => {
    const client = createMockClient({
      calendars: {
        personal: [
          { id: "personal-primary", name: "Personal", primary: true },
          { id: "existing-ai", name: AI_CALENDAR_NAME },
        ],
      },
    });
    const cfg = tempConfig();

    const id = await ensureAiCalendar(client, cfg);
    expect(id).toBe("existing-ai");
    expect(client.createdCount()).toBe(0); // found existing, created nothing
  });
});
