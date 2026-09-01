import type { EventEnvelope } from "src/platform/transport";
import type { MockrillStepId, StepPayloads } from "./steps.js";

let _seq = 0;

export function makeEnvelope<K extends MockrillStepId>(
  stepId: K,
  status: EventEnvelope["status"],
  payload: StepPayloads[K],
  opts?: { traceId?: string; sequence?: number; degraded?: boolean }
): EventEnvelope {
  const sequence = opts?.sequence !== undefined ? opts.sequence : _seq++;
  const timestamp = new Date().toISOString();
  const degraded = opts?.degraded ?? false;
  return {
    step_id: stepId,
    status,
    payload: payload as Record<string, unknown>,
    timestamp,
    sequence,
    ...(opts?.traceId ? { trace_id: opts.traceId } : {}),
    degraded,
  };
}

// test seam — internal-but-exported for tests only
export function resetEnvelopeSequence(): void {
  _seq = 0;
}
