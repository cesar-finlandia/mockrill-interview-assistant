// Minimal MOCK-01 runner for demodrive feeder — provides runMock used by src/ideation/demodrive/feeder.ts
// This is a shim to satisfy DP-DEMOPROOF mock feeder without requiring full chassis MOCK implementation.
import { readFileSync } from "node:fs";
import type { CollectablePublisher } from "../../platform/transport/publisher.js";
import { makeEnvelope } from "../../mockrill/contracts/index.js";

export interface RunMockOptions {
  scriptPath?: string;
  realtime?: boolean;
  publisher: CollectablePublisher;
}

export async function runMock(opts: RunMockOptions): Promise<void> {
  const scriptPath = opts.scriptPath ?? "fixtures/mockrill/session-golden.json";
  const realtime = opts.realtime ?? true;
  let data: { turns: unknown[]; actions: unknown[]; scorecard: unknown };
  try {
    const raw = readFileSync(scriptPath, "utf8");
    data = JSON.parse(raw) as typeof data;
  } catch {
    // Fallback: generate minimal synthetic session if fixture missing
    data = { turns: [], actions: [], scorecard: { overall: 0 } as unknown };
  }

  const traceId = `demodrive-${Date.now()}`;

  // Build same replay plan as scripts/mockrill-mock-publish.ts but simplified
  const turns = (data.turns as unknown[]) ?? [];
  const actions = (data.actions as unknown[]) ?? [];
  const scorecard = data.scorecard;

  async function delay(ms: number): Promise<void> {
    if (ms <= 0 || !realtime) return;
    await new Promise<void>((r) => setTimeout(r, ms));
  }

  // Emit a small sequence of envelopes
  await opts.publisher.publish({ stepId: "session-start", status: "started", payload: {}, traceId });
  await delay(100);

  for (let i = 0; i < Math.min(turns.length, 4); i++) {
    const turn = turns[i];
    // Validate via makeEnvelope before publish
    try {
      makeEnvelope("transcript-final" as never, "done", { turn } as never, { traceId });
    } catch {}
    await opts.publisher.publish({ stepId: "transcript-final", status: "done", payload: { turn }, traceId });
    await delay(200);
    // Try to emit corresponding score
    if (i < actions.length) {
      await opts.publisher.publish({ stepId: "answer-scored", status: "done", payload: { score: {} }, traceId });
      await delay(100);
    }
  }

  if (scorecard) {
    try {
      makeEnvelope("scorecard-ready" as never, "done", { scorecard } as never, { traceId });
    } catch {}
    await opts.publisher.publish({ stepId: "scorecard-ready", status: "done", payload: { scorecard }, traceId });
    await delay(100);
  }
  await opts.publisher.publish({ stepId: "session-end", status: "done", payload: { session_id: traceId }, traceId });
}
