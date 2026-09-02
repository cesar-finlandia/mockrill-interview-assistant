import { describe, it, expect } from "vitest";
import { createTurnController } from "src/mockrill/voice/turnController.js";

describe("latency_ms NFR-06", () => {
  it("logs latency_ms", async () => {
    const envelopes: any[] = [];
    const bus: any = { emit: (e: any) => envelopes.push(e), subscribe: () => () => {}, snapshot: () => [], reset: () => {} };
    const speaker: any = { available: true, speaking: false, speak: async (t: string) => {}, cancel: () => {} };
    const mic: any = { onChunk: () => {}, setMuted: () => {}, stop: () => {} };
    const client: any = { state: "open", sendAudio: () => {}, updateConfiguration: () => {}, forceEndpoint: () => {}, terminate: async () => {}, connect: async () => {} };
    const c = createTurnController({
      mic,
      client,
      speaker,
      bus,
      nextAction: async () => ({ say: "Next question?", question: { id: "q2", text: "Next?", competency: "technical", difficulty: 2, follow_ups: [], keyterms: [] }, score: null, done: false, degraded: false }) as any,
    });
    (c as any)._testSetState?.("listening");
    const turn = { turn_order: 0, transcript: "my answer", formatted: true, end_of_turn: true, end_of_turn_confidence: 0.9, words: [{ text: "my", start: 0, end: 100, confidence: 0.9, word_is_final: true }], speaker: "candidate", received_at: new Date().toISOString() };
    await (c as any)._testHandleFinal(turn);
    const qa = envelopes.find((e) => e.step_id === "question-asked");
    expect(qa).toBeDefined();
    expect(typeof qa.payload.latency_ms).toBe("number");
    expect(qa.payload.latency_ms).toBeGreaterThanOrEqual(0);
    expect(qa.payload.latency_ms).toBeLessThan(2000);
  });
});
