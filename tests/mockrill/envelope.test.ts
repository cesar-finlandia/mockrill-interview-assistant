import { describe, it, expect } from "vitest";
import { makeEnvelope, resetEnvelopeSequence } from "src/mockrill/contracts/envelope.js";

describe("makeEnvelope", () => {
  it("fills timestamp, sequence, degraded defaults", () => {
    resetEnvelopeSequence();
    const turn = {
      turn_order: 0,
      transcript: "hello",
      formatted: true,
      end_of_turn: true,
      end_of_turn_confidence: 0.9,
      words: [{ text: "hello", start: 0, end: 200, confidence: 0.99, word_is_final: true }],
      speaker: "candidate" as const,
      received_at: new Date().toISOString(),
    };
    const a = makeEnvelope("transcript-final", "done", { turn });
    const b = makeEnvelope("transcript-final", "done", { turn });
    expect(a.step_id).toBe("transcript-final");
    expect(a.status).toBe("done");
    expect(a.sequence).toBe(0);
    expect(b.sequence).toBe(1);
    expect(a.degraded).toBe(false);
    expect(typeof a.timestamp).toBe("string");
    const c = makeEnvelope(
      "session-start",
      "started",
      { session_id: "s1", role: "fe", began_at: new Date().toISOString() },
      { sequence: 99, degraded: true, traceId: "tid" }
    );
    expect(c.sequence).toBe(99);
    expect(c.degraded).toBe(true);
    expect(c.trace_id).toBe("tid");
  });
});
