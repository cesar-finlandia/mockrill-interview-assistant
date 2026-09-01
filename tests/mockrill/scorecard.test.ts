import { describe, it, expect } from "vitest";
import { buildScorecard, selectWeakest } from "src/mockrill/scoring/scorecard.js";
function mkTurn(words: { text: string; start: number; end: number }[], turn_order = 0) {
  return {
    turn_order,
    transcript: words.map((w) => w.text).join(" "),
    formatted: true,
    end_of_turn: true,
    end_of_turn_confidence: 0.9,
    words: words.map((w) => ({ ...w, confidence: 0.99, word_is_final: true })),
    speaker: "candidate" as const,
    received_at: new Date().toISOString(),
  };
}
function mkScore(id: string, overall: number, turn_order: number): any {
  return { question_id: id, turn_order, axes: { structure: 3, specificity: 3, clarity: 3, relevance: 3 }, overall, rationale: "r", evidence: [], source: "deterministic" };
}
describe("buildScorecard+selectWeakest", () => {
  it("builds scorecard", () => {
    const t1 = mkTurn([{ text: "hi", start: 0, end: 100 }, { text: "there", start: 200, end: 300 }], 0);
    const t2 = mkTurn([{ text: "um", start: 1000, end: 1100 }], 1);
    const s1 = mkScore("q1", 4.0, 0);
    const s2 = mkScore("q2", 2.0, 1);
    const sc = buildScorecard({ session_id: "s1", started_at: 0, scores: [s1, s2], turns: [t1, t2], degraded: false });
    expect(sc.duration_ms).toBe(1100);
    expect(sc.overall).toBe(3.0);
    expect(sc.filler_total).toBe(1);
    expect(sc.weakest_question_id).toBe("q2");
    expect(sc.degraded).toBe(false);
  });
  it("empty scorecard", () => {
    const sc = buildScorecard({ session_id: "s", started_at: 1000, scores: [], turns: [], degraded: true });
    expect(sc.overall).toBe(0);
    expect(sc.weakest_question_id).toBeNull();
    expect(selectWeakest(sc)).toBeNull();
    expect(sc.degraded).toBe(true);
  });
  it("tie break earliest turn_order", () => {
    const sc: any = {
      per_question: [mkScore("qA", 2.0, 5), mkScore("qB", 2.0, 2)],
      overall: 2,
      filler_total: 0,
      filler_top: [],
      weakest_question_id: null,
      degraded: false,
      session_id: "s",
      created_at: new Date().toISOString(),
      duration_ms: 0,
    };
    expect(selectWeakest(sc)).toBe("qB");
  });
});
