import type { EventEnvelope } from "src/platform/transport";
export type MockrillEventBus = {
  emit(env: EventEnvelope): void;
  subscribe(cb: (env: EventEnvelope) => void): () => void;
  snapshot(): EventEnvelope[];
  reset(): void;
};
export function createEventBus(): MockrillEventBus {
  const envelopes: EventEnvelope[] = [];
  const subscribers: ((env: EventEnvelope) => void)[] = [];
  return {
    emit(env: EventEnvelope) {
      envelopes.push(env);
      for (const cb of [...subscribers]) try { cb(env); } catch (e) { console.error("[mockrillBus] subscriber threw", e); }
    },
    subscribe(cb: (env: EventEnvelope) => void) {
      subscribers.push(cb);
      return () => {
        const i = subscribers.indexOf(cb);
        if (i !== -1) subscribers.splice(i, 1);
      };
    },
    snapshot() { return [...envelopes]; },
    reset() { envelopes.length = 0; subscribers.length = 0; },
  };
}
// the only singleton in the app — shared by voice layer and React tree without prop-drilling.
export const mockrillBus = createEventBus();
