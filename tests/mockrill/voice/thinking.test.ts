import { describe, it, expect, vi } from "vitest";
import { createTurnController } from "src/mockrill/voice/turnController.js";

describe("thinking timeout bridge", () => {
  it("bridge line after 12000", async () => {
    vi.useFakeTimers();
    const spoken: string[] = [];
    const speaker: any = { available: true, speaking: false, speak: async (t: string) => { spoken.push(t); }, cancel: () => {} };
    const mic: any = { onChunk: () => {}, setMuted: () => {}, stop: () => {} };
    const bus: any = { emit: vi.fn(), subscribe: () => () => {}, snapshot: () => [], reset: () => {} };
    const client: any = { state: "open", sendAudio: () => {}, updateConfiguration: () => {}, forceEndpoint: () => {}, terminate: async () => {}, connect: async () => {} };
    const c = createTurnController({ mic, client, speaker, bus, nextAction: () => new Promise(() => {}) });
    (c as any)._testSetState?.("listening");
    const turn = { turn_order: 0, transcript: "answer", formatted: true, end_of_turn: true, end_of_turn_confidence: 0.9, words: [{ text: "answer", start: 0, end: 100, confidence: 0.9, word_is_final: true }], speaker: "candidate", received_at: new Date().toISOString() };
    const p = (c as any)._testHandleFinal(turn);
    await vi.advanceTimersByTimeAsync(12000);
    await p;
    expect(spoken[0]).toBe("Let me follow up on that.");
    vi.useRealTimers();
  });
});
