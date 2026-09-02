/** @vitest-environment jsdom */
import { describe, it, expect, afterEach } from "vitest";
import { render, act, cleanup } from "@testing-library/react";

afterEach(() => cleanup());
import { createEventBus } from "src/mockrill/ui/eventBus.js";
import { useMockrillEvents } from "src/mockrill/ui/useMockrillEvents.js";
import { makeEnvelope, resetEnvelopeSequence } from "src/mockrill/contracts";

function Probe({ bus, url }: { bus?: ReturnType<typeof createEventBus>; url?: string }) {
  const { envelopes, degraded, status } = useMockrillEvents({ source: "live", bus, url });
  return (
    <div>
      <span data-testid="count">{envelopes.length}</span>
      <span data-testid="degraded">{String(degraded)}</span>
      <span data-testid="status">{status}</span>
      <span data-testid="seqs">{envelopes.map((e) => e.sequence).join(",")}</span>
    </div>
  );
}

describe("useMockrillEvents", () => {
  it("accumulates envelopes sorted by sequence on every emit", () => {
    resetEnvelopeSequence();
    const bus = createEventBus();
    const { getByTestId } = render(<Probe bus={bus} />);
    expect(getByTestId("count").textContent).toBe("0");
    expect(getByTestId("status").textContent).toBe("open");
    expect(getByTestId("degraded").textContent).toBe("false");
    act(() => {
      bus.emit(makeEnvelope("session-start", "done", { session_id: "s1", role: "eng", began_at: new Date().toISOString() }, { sequence: 2 }));
    });
    expect(getByTestId("count").textContent).toBe("1");
    expect(getByTestId("seqs").textContent).toBe("2");
    act(() => {
      bus.emit(makeEnvelope("mic-capture", "done", { sample_rate: 16000, muted: false }, { sequence: 0 }));
    });
    expect(getByTestId("count").textContent).toBe("2");
    expect(getByTestId("seqs").textContent).toBe("0,2");
    act(() => {
      bus.emit(makeEnvelope("transcript-final", "done", { turn: { turn_order: 0, transcript: "hi", words: [], started_at: "", ended_at: "", is_final: true } } as unknown as Record<string, unknown> as never, { sequence: 1 }));
    });
    expect(getByTestId("count").textContent).toBe("3");
    expect(getByTestId("seqs").textContent).toBe("0,1,2");
  });

  it("derives degraded true when any envelope has degraded===true", () => {
    resetEnvelopeSequence();
    const bus = createEventBus();
    const { getByTestId } = render(<Probe bus={bus} />);
    expect(getByTestId("degraded").textContent).toBe("false");
    act(() => {
      bus.emit(makeEnvelope("session-start", "done", { session_id: "s2", role: "eng", began_at: new Date().toISOString() }, { sequence: 0 }));
    });
    expect(getByTestId("degraded").textContent).toBe("false");
    act(() => {
      bus.emit(makeEnvelope("mic-capture", "done", { sample_rate: 16000, muted: false }, { sequence: 1, degraded: true }));
    });
    expect(getByTestId("degraded").textContent).toBe("true");
    expect(getByTestId("count").textContent).toBe("2");
  });
});
