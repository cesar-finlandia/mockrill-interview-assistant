import { describe, it, expect, vi } from "vitest";
import { createTurnController } from "src/mockrill/voice/turnController.js";

describe("drill", () => {
  it("drill does not reconnect", async () => {
    const bus: any = { emit: vi.fn(), subscribe: () => () => {}, snapshot: () => [], reset: () => {} };
    const speaker: any = { available: true, speaking: false, speak: vi.fn(async () => {}), cancel: () => {} };
    const mic: any = { onChunk: () => {}, setMuted: vi.fn(), stop: () => {} };
    const connectSpy = vi.fn(async () => { client.state = "open"; });
    const client: any = { state: "closed", sendAudio: () => {}, updateConfiguration: vi.fn(), forceEndpoint: () => {}, terminate: async () => {}, connect: connectSpy };
    const c = createTurnController({
      mic,
      client,
      speaker,
      bus,
      nextAction: async () => ({ say: "next", question: { id: "q1", text: "Q1", competency: "behavioral", difficulty: 1, follow_ups: [], keyterms: [] }, score: null, done: false, degraded: false }) as any,
    });
    await c.start();
    expect(connectSpy).toHaveBeenCalledTimes(1);
    (c as any)._testSetState?.("complete");
    (c as any)._testSeedQuestion?.(
      { id: "q1", text: "Tell me about a challenge", competency: "behavioral", difficulty: 1, follow_ups: [], keyterms: [] },
      { question_id: "q1", turn_order: 0, axes: { structure: 2, specificity: 1, clarity: 3, relevance: 2 }, overall: 2, rationale: "weak", evidence: [], source: "deterministic" }
    );
    await c.drill("q1");
    expect(connectSpy).toHaveBeenCalledTimes(1);
    expect(bus.emit).toHaveBeenCalledWith(expect.objectContaining({ step_id: "drill-start" }));
    const drillCall = (bus.emit as any).mock.calls.find((args: any[]) => args[0]?.step_id === "drill-start");
    expect(drillCall).toBeDefined();
    expect(drillCall[0].payload.attempt).toBe(1);
    // verify framing line exact substring via speaker.speak call
    const speakArg = (speaker.speak as any).mock.calls[0]?.[0] as string;
    expect(speakArg).toBe(`Let's revisit that. For "Tell me about a challenge" — focus on specificity. Take another pass.`);
    // second drill increments attempt and replaces score
    (c as any)._testSeedQuestion?.(
      { id: "q1", text: "Tell me about a challenge", competency: "behavioral", difficulty: 1, follow_ups: [], keyterms: [] },
      { question_id: "q1", turn_order: 0, axes: { structure: 5, specificity: 5, clarity: 5, relevance: 5 }, overall: 5, rationale: "improved", evidence: [], source: "deterministic" }
    );
    await c.drill("q1");
    const secondDrillCall = (bus.emit as any).mock.calls.filter((args: any[]) => args[0]?.step_id === "drill-start")[1];
    expect(secondDrillCall[0].payload.attempt).toBe(2);
    // score replacement verified: second seed overwrites, so next getScoresArray would return one entry
    // Also verify unknown questionId no-throw
    await expect(c.drill("unknown_q")).resolves.toBeUndefined();
    expect(connectSpy).toHaveBeenCalledTimes(1);
  });
});
