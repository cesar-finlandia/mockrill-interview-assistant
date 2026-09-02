import { useEventStream } from "src/platform/transport";
import type { UseEventStreamResult } from "src/platform/transport";
import type { EventEnvelope } from "src/platform/transport";
import { mockrillBus } from "./eventBus.js";
import type { MockrillEventBus } from "./eventBus.js";
import { useEffect, useState } from "react";

export function resolveMockrillSource(): "live" | "stream" {
  if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("source") === "stream") return "stream";
  if ((import.meta as unknown as { env: Record<string, string | undefined> }).env?.MOCKRILL_SOURCE === "stream") return "stream";
  return "live";
}

export function useMockrillEvents(opts?: { source?: "live" | "stream"; bus?: MockrillEventBus; url?: string }): UseEventStreamResult {
  const source = opts?.source ?? resolveMockrillSource();
  const url = opts?.url ?? "/events/stream";
  const bus = opts?.bus ?? mockrillBus;
  const streamResult = useEventStream({ url });
  const [liveEnvelopes, setLiveEnvelopes] = useState<EventEnvelope[]>(() => [...bus.snapshot()].sort((a, b) => a.sequence - b.sequence));
  useEffect(() => {
    const unsub = bus.subscribe((env) => setLiveEnvelopes((prev) => [...prev, env].sort((a, b) => a.sequence - b.sequence)));
    return unsub;
  }, [bus]);
  if (source === "stream") return streamResult;
  const degraded = liveEnvelopes.some((e) => e.degraded === true);
  return { envelopes: liveEnvelopes, status: "open", error: null, degraded, reconnect: () => bus.reset() };
}
