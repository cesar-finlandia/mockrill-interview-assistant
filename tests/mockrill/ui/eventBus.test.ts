import { describe, it, expect, vi } from "vitest";
import { createEventBus } from "src/mockrill/ui/eventBus.js";
import type { EventEnvelope } from "src/platform/transport";

function makeEnv(sequence: number, step_id = "test-step"): EventEnvelope {
  return {
    step_id,
    status: "done",
    payload: { sequence },
    timestamp: new Date().toISOString(),
    sequence,
  };
}

describe("createEventBus", () => {
  it("emit notifies subscribers in registration order", () => {
    const bus = createEventBus();
    const order: number[] = [];
    bus.subscribe(() => order.push(1));
    bus.subscribe(() => order.push(2));
    bus.subscribe(() => order.push(3));
    bus.emit(makeEnv(0));
    expect(order).toEqual([1, 2, 3]);
  });

  it("throwing subscriber is caught/logged and does not break others", () => {
    const bus = createEventBus();
    const order: number[] = [];
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    bus.subscribe(() => { throw new Error("boom"); });
    bus.subscribe(() => order.push(2));
    bus.subscribe(() => order.push(3));
    bus.emit(makeEnv(1));
    expect(order).toEqual([2, 3]);
    expect(consoleSpy).toHaveBeenCalledWith("[mockrillBus] subscriber threw", expect.any(Error));
    consoleSpy.mockRestore();
    // unsubscribe works
    const bus2 = createEventBus();
    const calls: number[] = [];
    const unsub = bus2.subscribe(() => calls.push(1));
    bus2.emit(makeEnv(2));
    expect(calls).toEqual([1]);
    unsub();
    bus2.emit(makeEnv(3));
    expect(calls).toEqual([1]);
  });

  it("snapshot returns copy not reference and reset clears", () => {
    const bus = createEventBus();
    const env0 = makeEnv(0);
    const env1 = makeEnv(1);
    bus.emit(env0);
    bus.emit(env1);
    const snap = bus.snapshot();
    expect(snap).toEqual([env0, env1]);
    // mutate returned copy does not affect internal
    snap.push(makeEnv(99));
    expect(bus.snapshot().length).toBe(2);
    // reset clears envelopes and subscribers
    const calls: number[] = [];
    bus.subscribe(() => calls.push(1));
    bus.reset();
    expect(bus.snapshot()).toEqual([]);
    bus.emit(makeEnv(10));
    expect(calls).toEqual([]);
    expect(bus.snapshot().length).toBe(1);
  });
});
