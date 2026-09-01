import { describe, it, expect } from "vitest";
import { mapTurnToTranscriptTurn } from "src/mockrill/voice/streamingClient.js";
import type { TranscriptTurn } from "src/mockrill/contracts";
const FIXTURE = { type:"Turn" as const, turn_order:3, turn_is_formatted:true, end_of_turn:true, transcript:"hello world", utterance:"hello world", end_of_turn_confidence:0.92, words:[{text:"hello",start:0,end:200,confidence:0.99,word_is_final:true},{text:"world",start:200,end:450,confidence:0.98,word_is_final:true}] };
describe("mapTurn", () => {
  it("maps fixture field by field", () => {
    const t: TranscriptTurn = mapTurnToTranscriptTurn(FIXTURE);
    expect(t.turn_order).toBe(3); expect(t.transcript).toBe("hello world"); expect(t.formatted).toBe(true); expect(t.end_of_turn).toBe(true);
    expect(t.end_of_turn_confidence).toBe(0.92); expect(t.speaker).toBe("candidate");
    expect(t.words.length).toBe(2); expect(t.words[0].text).toBe("hello"); expect(t.words[1].start).toBe(200);
    expect(typeof t.received_at).toBe("string"); expect(() => new Date(t.received_at).toISOString()).not.toThrow();
  });
  it("unformatted end_of_turn goes to partial (routing test via helper)", async () => {
    const unformatted = { ...FIXTURE, turn_is_formatted:false };
    const t = mapTurnToTranscriptTurn(unformatted);
    expect(t.formatted).toBe(false); // caller routing must treat as partial, not final
  });
});
