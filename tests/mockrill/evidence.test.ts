import { describe, it, expect } from "vitest";
import { buildEvidence, MAX_EVIDENCE, PAUSE_MS } from "src/mockrill/scoring/evidence.js";
import { detectFillers } from "src/mockrill/scoring/fillers.js";
import { formatTimestamp } from "src/mockrill/contracts";

function mkTurnFixture() {
  const words = [
    { text: "Um", start: 0, end: 200, confidence: 0.5, word_is_final: true },
    { text: "I", start: 300, end: 400, confidence: 0.99, word_is_final: true },
    { text: "built", start: 500, end: 700, confidence: 0.99, word_is_final: true },
    { text: "an", start: 800, end: 900, confidence: 0.99, word_is_final: true },
    { text: "API.", start: 1000, end: 1200, confidence: 0.99, word_is_final: true },
    { text: "Then", start: 3000, end: 3200, confidence: 0.99, word_is_final: true },
    { text: "we", start: 3300, end: 3400, confidence: 0.99, word_is_final: true },
    { text: "shipped", start: 3500, end: 3700, confidence: 0.99, word_is_final: true },
  ];
  return {
    turn_order: 0,
    transcript: "Um I built an API. Then we shipped.",
    formatted: true,
    end_of_turn: true,
    end_of_turn_confidence: 0.9,
    words,
    speaker: "candidate" as const,
    received_at: new Date().toISOString(),
  };
}

describe("buildEvidence", () => {
  it("priority ladder max 4", () => {
    const turn = mkTurnFixture();
    const hits = detectFillers(turn);
    const ev = buildEvidence(turn, hits);
    expect(ev.length).toBeGreaterThan(0);
    expect(ev.length).toBeLessThanOrEqual(MAX_EVIDENCE);
    expect(PAUSE_MS).toBe(1500);
    const filler = ev.find((e) => e.kind === "filler");
    if (filler) expect(filler.note).toMatch(/said ".*" \d+x here/);
    expect(ev[0]!.label).toBe(formatTimestamp(ev[0]!.start_ms));
  });
  it("uses formatTimestamp for pause label", () => {
    const turn = mkTurnFixture();
    const ev = buildEvidence(turn, []);
    const pause = ev.find((e) => e.kind === "pause");
    if (pause) expect(pause.label).toBe(formatTimestamp(pause.start_ms));
  });
});
