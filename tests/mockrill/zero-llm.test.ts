import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeDegradedResult, isDegradedResult } from "src/resilience";

vi.mock("src/mockrill/engine/llmGateway.js", () => ({
  chatCompletion: vi.fn(async () => makeDegradedResult({ reason: "llm_unavailable", fallback_source: "none" })),
}));

import { callInterviewer } from "engine/agents/index.js";
import type { TranscriptTurn } from "src/mockrill/contracts";

describe("WU-INT-07 zero-LLM deterministic fallback", () => {
  beforeEach(() => {
    process.env.ASSEMBLYAI_API_KEY = "";
    process.env.MOCKRILL_LLM_MODEL = "dummy";
    // Do NOT set RES_FORCED_DEGRADED so inner deterministic fallback is exercised, not outer wrapper
  });
  it("runs 4 sequential turns degraded with deterministic scores and done only on 4th", async () => {
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
    const asked: string[] = [];
    for (let i = 0; i < 4; i++) {
      const turn = { ...fakeTurn, turn_order: i, received_at: new Date().toISOString() };
      const result = await callInterviewer({ session_id: "s1", asked: [...asked], last_turn: turn, role: "junior-frontend" }) as unknown as import("src/mockrill/engine/types.js").InterviewerAction | ReturnType<typeof makeDegradedResult>;
      if (isDegradedResult(result)) throw new Error(`turn ${i} returned DegradedResult wrapper instead of degraded InterviewerAction`);
      const action = result as import("src/mockrill/engine/types.js").InterviewerAction;
      // question not null except possibly done (4th may still have question fe-04)
      if (i < 3) {
        expect(action.question, `turn ${i} question should not be null`).not.toBeNull();
      } else {
        // 4th turn may still have question or null on done - allow either but if not done picks will be fe-04
        expect(action.done, "4th turn done should be true").toBe(true);
      }
      expect(action.score, `turn ${i} score should not be null when transcript present`).not.toBeNull();
      expect(action.score!.source, `turn ${i} score source should be deterministic`).toBe("deterministic");
      expect(action.degraded, `turn ${i} degraded should be true`).toBe(true);
      if (i < 3) expect(action.done, `turn ${i} done should be false`).toBe(false);
      else expect(action.done).toBe(true);
      if (action.question) asked.push(action.question.id);
      else {
        // if question null on done, still count as done, break
        expect(i).toBe(3);
      }
    }
    expect(asked.length).toBeGreaterThanOrEqual(3);
    expect(asked.length).toBeLessThanOrEqual(4);
  });
});
