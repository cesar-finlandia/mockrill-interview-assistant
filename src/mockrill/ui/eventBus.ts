// stub for DP-TURNTAKING M22/M23 compile — real implementation owned by DP-UI
import type { EventEnvelope } from "src/platform/transport";
export type MockrillEventBus = {
  emit(env: EventEnvelope): void;
  subscribe(cb: (env: EventEnvelope) => void): () => void;
  snapshot(): EventEnvelope[];
  reset(): void;
};
export function createEventBus(): MockrillEventBus {
  const envelopes: EventEnvelope[] = [];
  const subs: ((env: EventEnvelope) => void)[] = [];
  return {
    emit(env: EventEnvelope) {
      envelopes.push(env);
      for (const cb of [...subs]) try { cb(env); } catch (e) { console.error("[mockrillBus] subscriber threw", e); }
    },
    subscribe(cb: (env: EventEnvelope) => void) {
      subs.push(cb);
      return () => {
        const i = subs.indexOf(cb);
        if (i !== -1) subs.splice(i, 1);
      };
    },
    snapshot() { return [...envelopes]; },
    reset() { envelopes.length = 0; subs.length = 0; },
  };
}
export const mockrillBus = createEventBus();
