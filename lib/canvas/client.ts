/**
 * Canvas client: fetches raw assignments from whichever source is configured.
 * SERVER-ONLY (network + secret). Mirrors the `lib/google/client.ts` boundary:
 * an interface + a real implementation + a `resolveClient()` that swaps in the
 * demo fake when `CANVAS_MOCK=1`.
 */
import { getCanvasConfig, isMockMode, resolveMode } from "./config";
import { parseIcsAssignments } from "./ics";
import { createMockClient } from "./client.mock";
import { demoSeed } from "./demoSeed";
import type { CanvasAssignment, CanvasCourse } from "./types";

export interface CanvasClient {
  /** All raw assignments from the configured source (unfiltered, unmapped). */
  fetchAssignments(): Promise<CanvasAssignment[]>;
}

// --- Canvas REST API shapes (only the fields we read) ------------------------

interface RawCourse {
  id: number;
  name?: string;
}
interface RawSubmission {
  workflow_state?: string;
  submitted_at?: string | null;
}
interface RawAssignment {
  id: number;
  name?: string;
  due_at?: string | null;
  submission?: RawSubmission;
}

/** Pull the `next` page URL out of a Canvas `Link` header, if any. */
function nextLink(header: string | null): string | null {
  if (!header) return null;
  for (const part of header.split(",")) {
    const [url, rel] = part.split(";");
    if (rel && rel.includes('rel="next"')) return url.trim().replace(/[<>]/g, "");
  }
  return null;
}

// --- Real API-token client ---------------------------------------------------

function tokenClient(baseUrl: string, token: string): CanvasClient {
  const auth = { Authorization: `Bearer ${token}` };

  async function getAll<T>(path: string): Promise<T[]> {
    const out: T[] = [];
    let url: string | null = `${baseUrl}${path}`;
    while (url) {
      const res: Response = await fetch(url, { headers: auth });
      if (!res.ok) throw new Error(`Canvas API ${res.status} for ${path}`);
      const page: unknown = await res.json();
      if (Array.isArray(page)) out.push(...(page as T[]));
      url = nextLink(res.headers.get("link"));
    }
    return out;
  }

  return {
    async fetchAssignments() {
      // Active-enrollment courses = the "current term" scope (open question #2).
      const courses = await getAll<RawCourse>(
        "/api/v1/users/self/courses?enrollment_state=active&per_page=100",
      );
      const all: CanvasAssignment[] = [];
      for (const course of courses as CanvasCourse[]) {
        const assignments = await getAll<RawAssignment>(
          `/api/v1/courses/${course.id}/assignments?include[]=submission&per_page=100`,
        );
        for (const a of assignments) {
          const state = a.submission?.workflow_state;
          all.push({
            id: String(a.id),
            title: a.name ?? "Untitled assignment",
            courseName: course.name ?? "",
            dueAt: a.due_at ?? null,
            submitted:
              state === "submitted" || Boolean(a.submission?.submitted_at),
            graded: state === "graded",
          });
        }
      }
      return all;
    },
  };
}

// --- ICS fallback client -----------------------------------------------------

function icsClient(icsUrl: string): CanvasClient {
  return {
    async fetchAssignments() {
      const res = await fetch(icsUrl);
      if (!res.ok) throw new Error(`Canvas ICS ${res.status}`);
      return parseIcsAssignments(await res.text());
    },
  };
}

/** A client that returns nothing (used when Canvas is not configured). */
const emptyClient: CanvasClient = {
  async fetchAssignments() {
    return [];
  },
};

// --- Demo fake, shared across route modules (see lib/google/client.ts note) --

const mockHolder = globalThis as unknown as { __awpCanvasMock?: CanvasClient };

/** Resolve the client the routes should use (real source, or the demo fake). */
export function resolveClient(): CanvasClient {
  if (isMockMode()) {
    mockHolder.__awpCanvasMock ??= createMockClient(demoSeed());
    return mockHolder.__awpCanvasMock;
  }
  const { baseUrl, token, icsUrl } = getCanvasConfig();
  switch (resolveMode()) {
    case "token":
      return tokenClient(baseUrl, token);
    case "ics":
      return icsClient(icsUrl);
    default:
      return emptyClient;
  }
}
