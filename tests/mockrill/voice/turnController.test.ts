import { describe, it, expect } from "vitest";
import { createTurnController } from "src/mockrill/voice/turnController.js";
import type { SessionState } from "src/mockrill/contracts";
import type { StreamingClient } from "src/mockrill/voice/streamingClient.js";

// prove type imports resolve
const _typeCheck: SessionState = "idle";
const _clientType: StreamingClient | null = null;
void _typeCheck; void _clientType;

describe("turnController state machine skeleton", () => {
  it("visits idle -> connecting -> speaking -> listening -> thinking -> speaking -> listening", async () => {
    // The probe samples c.state after each step AND subscribes to transitions, so the same
    // state is recorded twice at a step boundary. Collapse consecutive duplicates here, in
    // the test, rather than by patching Array.prototype in production code.
    const raw: string[] = [];
    const visited = {
      push(s: string) {
        if (raw[raw.length - 1] !== s) raw.push(s);
      },
      join(sep: string) {
        return raw.join(sep);
      },
    };
    const bus: any = { emit: () => {}, subscribe: () => () => {}, snapshot: () => [], reset: () => {} };
    const speaker: any = { available: true, get speaking() { return false; }, speak: async (t: string) => {}, cancel: () => {} };
    const mic: any = { onChunk: () => {}, setMuted: () => {}, stop: () => {} };
    const client: any = { state: "closed", sendAudio: () => {}, updateConfiguration: () => {}, forceEndpoint: () => {}, terminate: async () => {}, connect: async () => { client.state = "open"; } };
    const c = createTurnController({
      mic,
      client,
      speaker,
      bus,
      nextAction: async () => ({ say: "Q1?", question: { id: "q1", text: "Q1?", competency: "behavioral", difficulty: 1, follow_ups: [], keyterms: [] }, score: null, done: false, degraded: false }) as any,
    });
    c.on((s) => visited.push(s));
    visited.push(c.state);
    await c.start();
    visited.push(c.state);
    if ((c as any)._testHandleBegin) await (c as any)._testHandleBegin("id1");
    visited.push(c.state);
    if ((c as any)._testSpeakerFinished) (c as any)._testSpeakerFinished();
    visited.push(c.state);
    const turn = {
      turn_order: 0,
      transcript: "hello world answer",
      formatted: true,
      end_of_turn: true,
      end_of_turn_confidence: 0.9,
      words: [
        { text: "hello", start: 0, end: 200, confidence: 0.9, word_is_final: true },
        { text: "world", start: 200, end: 400, confidence: 0.9, word_is_final: true },
        { text: "answer", start: 400, end: 600, confidence: 0.9, word_is_final: true },
      ],
      speaker: "candidate" as const,
      received_at: new Date().toISOString(),
    };
    if ((c as any)._testHandleFinal) await (c as any)._testHandleFinal(turn);
    visited.push(c.state);
    const line = visited.join(" -> ");
    console.log(line);
    // T4 is real now: when the interviewer's utterance ends the machine unmutes and
    // returns to listening on its own — without that final transition a live session
    // would ask question 1 and never hear the answer.
    expect(line).toBe("idle -> connecting -> speaking -> listening -> thinking -> speaking -> listening");
  });
});
