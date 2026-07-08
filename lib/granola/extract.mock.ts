/**
 * Deterministic mock action-item extractor, used when no `ANTHROPIC_API_KEY` is
 * set (demo mode / tests). It pulls bullet- and action-prefixed lines out of a
 * transcript — a stand-in for what the real AI extractor produces from free text.
 */
import type { ExtractedActionItem, GranolaTranscript } from "./types";

const ACTION_PREFIX = /^(?:action item|action|todo)\s*[:\-]\s*/i;
const BULLET_PREFIX = /^[-*]\s+/;

export function mockExtract(transcript: GranolaTranscript): ExtractedActionItem[] {
  return transcript.text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => ACTION_PREFIX.test(l) || BULLET_PREFIX.test(l))
    .map((l) => ({ title: l.replace(ACTION_PREFIX, "").replace(BULLET_PREFIX, "").trim() }))
    .filter((i) => i.title.length > 0);
}
