import { describe, it, expect } from "vitest";
import { mergeScores } from "src/mockrill/scoring/rubric.js";
import type { AnswerScore } from "src/mockrill/contracts";

function mkScore(overrides: Partial<AnswerScore> & { axes: Record<string, number> }): AnswerScore {
  return {
    question_id: "q1",
    turn_order: 0,
    axes: { structure: 3, specificity: 3, clarity: 3, relevance: 3, ...overrides.axes },
    overall: 3,
    rationale: "det rationale",
    evidence: [{ kind: "quote", text: "hi", start_ms: 0, end_ms: 100, label: "00:00", note: 'said: "hi"' }],
    source: "deterministic" as const,
    ...overrides,
  } as AnswerScore;
}

describe("mergeScores", () => {
  it("null llm returns det", () => {
    const det = mkScore({ axes: { structure: 4, specificity: 4, clarity: 4, relevance: 4 } });
    expect(mergeScores(null, det)).toBe(det);
  });
  it("averages per axis and keeps det evidence", () => {
    const det = mkScore({
      axes: { structure: 2, specificity: 2, clarity: 2, relevance: 2 },
      evidence: [{ kind: "filler", text: "um", start_ms: 0, end_ms: 100, label: "00:00", note: 'said "um" 2x here' }] as any,
    });
    const llm = mkScore({
      axes: { structure: 4, specificity: 4, clarity: 4, relevance: 4 },
      rationale: "llm rationale",
      source: "llm" as const,
    });
    const m = mergeScores(llm, det);
    expect(m.axes.structure).toBe(3);
    expect(m.axes.clarity).toBe(3);
    expect(m.evidence).toBe(det.evidence);
    expect(m.rationale).toBe("llm rationale");
    expect(m.source).toBe("llm");
  });
});
