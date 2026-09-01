import { describe, it, expect, vi, beforeEach } from "vitest";
import { isDegradedResult } from "src/resilience";

// Mock chatCompletion to return canned tool_calls per WU-INT-06
vi.mock("src/mockrill/engine/llmGateway.js", () => ({
  chatCompletion: vi.fn(async () => ({
    content: "Great answer — let's continue.",
    tool_calls: [
      { id: "call_1", name: "select_question", arguments: { question_id: "fe-01", rationale: "Opening behavioral question in bank order", is_follow_up: false } },
      { id: "call_2", name: "score_answer", arguments: { structure: 4, specificity: 3, clarity: 4, relevance: 5, rationale: "Strong STAR and specific", quotes: [{ text: "I built an API", why: "shows specificity" }] } },
    ],
    raw: {},
    model: "dummy",
    degraded: false,
  })),
}));

import { callInterviewer } from "engine/agents/index.js";
import type { TranscriptTurn } from "src/mockrill/contracts";

describe("WU-INT-06 dialogue dispatch stubbed", () => {
  beforeEach(() => {
    process.env.MOCKRILL_LLM_MODEL = "dummy";
  });
  it("selects fe-01 and scores transcript via mocked chatCompletion", async () => {
    const fakeTurn: TranscriptTurn = {
      turn_order: 0,
      transcript: "When at my project I built an API. We shipped and reduced latency.",
      formatted: true,
      end_of_turn: true,
      end_of_turn_confidence: 0.9,
      words: [
        { text: "When", start: 0, end: 100, confidence: 0.99, word_is_final: true },
        { text: "API", start: 200, end: 300, confidence: 0.99, word_is_final: true },
      ],
      speaker: "candidate",
      received_at: new Date().toISOString(),
    };
    const result = await callInterviewer({ session_id: "s1", asked: [], last_turn: fakeTurn, role: "junior-frontend" });
    if (isDegradedResult(result)) throw new Error("callInterviewer returned DegradedResult unexpectedly — mock not applied");
    expect(result.question).not.toBeNull();
    expect(result.question!.id).toBe("fe-01");
    expect(result.score).not.toBeNull();
    expect(result.degraded).toBe(false);
  });
});
