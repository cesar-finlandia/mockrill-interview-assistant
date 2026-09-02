import { describe, it, expect, vi } from "vitest";
import { createTurnController, BARGE_IN_MIN_WORDS, BARGE_IN_PEAK } from "src/mockrill/voice/turnController.js";

describe("barge-in", () => {
  it("word count triggers", async () => {
    const bus: any = { emit: vi.fn(), subscribe: () => () => {}, snapshot: () => [], reset: () => {} };
    const speaker: any = { available: true, speaking: true, speak: async () => {}, cancel: vi.fn() };
    const mic: any = { onChunk: () => {}, setMuted: vi.fn(), stop: () => {} };
    const client: any = { state: "open", sendAudio: vi.fn(), updateConfiguration: () => {}, forceEndpoint: () => {}, terminate: async () => {}, connect: async () => {} };
    const c = createTurnController({ mic, client, speaker, bus, nextAction: async () => ({} as any) });
    (c as any)._testSetState?.("speaking");
    expect(c.state).toBe("speaking");
    expect(BARGE_IN_MIN_WORDS).toBe(3);
    const partial = {
      turn_order: 0,
      transcript: "hello world again",
      formatted: false,
      end_of_turn: false,
      end_of_turn_confidence: 0.3,
      words: [
        { text: "hello", start: 0, end: 100, confidence: 0.9, word_is_final: false },
        { text: "world", start: 100, end: 200, confidence: 0.9, word_is_final: false },
        { text: "again", start: 200, end: 300, confidence: 0.9, word_is_final: false },
      ],
      speaker: "candidate",
      received_at: new Date().toISOString(),
    };
    (c as any)._testHandlePartial(partial);
    expect(c.state).toBe("listening");
    expect(speaker.cancel).toHaveBeenCalled();
    expect(mic.setMuted).toHaveBeenCalledWith(false);
  });

  it("amplitude triggers after 3 peaks", async () => {
    const bus: any = { emit: vi.fn(), subscribe: () => () => {}, snapshot: () => [], reset: () => {} };
    const speaker: any = { available: true, speaking: true, speak: async () => {}, cancel: vi.fn() };
    const mic: any = { onChunk: () => {}, setMuted: vi.fn(), stop: () => {} };
    const client: any = { state: "open", sendAudio: vi.fn(), updateConfiguration: () => {}, forceEndpoint: () => {}, terminate: async () => {}, connect: async () => {} };
    const c = createTurnController({ mic, client, speaker, bus, nextAction: async () => ({} as any) });
    (c as any)._testSetState?.("speaking");
    expect(c.state).toBe("speaking");
    expect(BARGE_IN_PEAK).toBe(0.15);
    // 8000 > 0.15*32767 ≈ 4915, so peak > threshold
    const loud = new Int16Array([0, 8000, -8000, 100]);
    (c as any)._testHandleMicChunk(loud);
    expect(c.state).toBe("speaking");
    (c as any)._testHandleMicChunk(loud);
    expect(c.state).toBe("speaking");
    (c as any)._testHandleMicChunk(loud);
    expect(c.state).toBe("listening");
    expect(speaker.cancel).toHaveBeenCalled();
    expect(mic.setMuted).toHaveBeenCalledWith(false);
  });
});
