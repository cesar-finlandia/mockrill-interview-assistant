// Composition root for one screening call.
//
// This is the single place where the four voice-layer pieces are assembled and pointed at
// each other: MicSource -> StreamingClient -> TurnController -> MockrillEventBus, with
// /api/turn as the interviewer brain. Every other module stays unaware of the others, which
// is what §3a asks for — but something has to do the wiring, and if nothing does, the app
// compiles into three disconnected half-features.
import { makeEnvelope } from "src/mockrill/contracts";
import type { TranscriptTurn } from "src/mockrill/contracts";
import {
  createMicSource,
  createSpeaker,
  createStreamingClient,
  createSimMicSource,
  createSimStreamingClient,
  createTurnController,
} from "src/mockrill/voice";
import type { MicSource, StreamingClient, TurnController } from "src/mockrill/voice";
import type { InterviewerAction, TurnRequest } from "src/mockrill/engine/types.js";
import type { MockrillEventBus } from "./eventBus.js";

export type SessionMode = "live" | "sim";

/**
 * POST /api/turn. NFR-02: this never throws — a failed request degrades into the same
 * bridge action the server returns when the LLM Gateway is unreachable, so the interview
 * keeps moving and the failure shows up as a degraded badge instead of a blank screen.
 */
export async function requestTurn(req: TurnRequest): Promise<InterviewerAction> {
  const degraded: InterviewerAction = {
    say: "Let's continue — could you elaborate on that?",
    question: null,
    score: null,
    done: false,
    degraded: true,
  };
  try {
    const resp = await fetch("/api/turn", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
    });
    if (!resp.ok) return degraded;
    return (await resp.json()) as InterviewerAction;
  } catch {
    return degraded;
  }
}

/**
 * Rung 2 of the fallback ladder, decided before a microphone is ever requested.
 *
 * A live session needs a streaming token. If the token endpoint degrades — no key configured,
 * RES_FORCED_DEGRADED=1 in the serving environment, AssemblyAI unreachable — then opening a
 * socket is pointless and asking for the mic is worse than pointless: the judge grants
 * permission and then watches nothing happen. Probing first lets the app fall back to the
 * golden session and say so, which is the designed behaviour, not an apology.
 */
export async function resolveEffectiveMode(requested: SessionMode): Promise<{ mode: SessionMode; reason: string | null }> {
  if (requested === "sim") return { mode: "sim", reason: null };
  try {
    const resp = await fetch("/api/aai-token", { headers: { "Cache-Control": "no-store" } });
    if (resp.ok) return { mode: "live", reason: null };
    const body = (await resp.json().catch(() => null)) as { reason?: string } | null;
    return { mode: "sim", reason: body?.reason ?? `token_endpoint_${resp.status}` };
  } catch (e) {
    return { mode: "sim", reason: `token_endpoint_unreachable: ${String(e)}` };
  }
}

export type StartedSession = {
  controller: TurnController;
  stop: () => Promise<void>;
};

function readStoredId(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * Build and start a session. Rejects only when the microphone is unavailable in live mode —
 * every other failure path degrades inside the controller.
 */
export async function startSession(opts: {
  role: string;
  bus: MockrillEventBus;
  mode: SessionMode;
  micDeviceId?: string | null;
  voiceURI?: string | null;
  nextAction?: (req: TurnRequest) => Promise<InterviewerAction>;
}): Promise<StartedSession> {
  const { role, bus } = opts;
  const storedMic = readStoredId("mockrill:micDeviceId");
  const micDeviceId = opts.micDeviceId ?? storedMic ?? undefined;
  const storedVoice = readStoredId("mockrill:voiceURI");
  const voiceURI = opts.voiceURI ?? storedVoice ?? undefined;
  const { mode, reason } = await resolveEffectiveMode(opts.mode);
  if (reason !== null) {
    // NFR-02/NFR-03: surfaced as a degraded envelope so the banner explains itself and the
    // session still runs end to end off the golden cache.
    bus.emit(
      makeEnvelope("mic-capture", "started", { sample_rate: 16000, muted: false, error: reason }, { degraded: true }),
    );
  }
  let mic: MicSource;
  try {
    mic = mode === "sim" ? createSimMicSource() : await createMicSource({ sampleRate: 16000, deviceId: micDeviceId });
  } catch (e) {
    // FR-01 / T3: a denied microphone is a first-class UI state, not an exception.
    bus.emit(
      makeEnvelope("mic-capture", "error", { sample_rate: 16000, muted: true, error: String((e as Error)?.name ?? e) }),
    );
    throw e;
  }

  const speaker = createSpeaker({ voiceURI: voiceURI ?? null });
  // The controller is created after the client because the client needs the controller's
  // handlers; the indirection through `controller` keeps that knot untied.
  let controller: TurnController | null = null;
  const clientOpts = {
    onBegin: (id: string) => void controller?.handleBegin(id),
    onPartial: (turn: TranscriptTurn) => controller?.handlePartial(turn),
    onFinal: (turn: TranscriptTurn) => controller?.handleFinal(turn) ?? Promise.resolve(),
    onTermination: () => {},
    onDegraded: (d: { reason: string }) => controller?.handleDegraded(d.reason),
  };
  const client: StreamingClient =
    mode === "sim" ? createSimStreamingClient(clientOpts) : createStreamingClient(clientOpts);

  controller = createTurnController({
    mic,
    client,
    speaker,
    bus,
    role,
    nextAction: opts.nextAction ?? requestTurn,
  });

  // R-03: billing runs on socket-open time, so the socket must be closed even when the tab
  // is closed mid-interview rather than stopped from the UI.
  const onUnload = () => void controller?.stop();
  if (typeof window !== "undefined") window.addEventListener("beforeunload", onUnload);

  await controller.start();

  return {
    controller,
    stop: async () => {
      if (typeof window !== "undefined") window.removeEventListener("beforeunload", onUnload);
      await controller?.stop();
      try {
        await client.terminate();
      } catch {
        /* already closed */
      }
      try {
        mic.stop();
      } catch {
        /* already stopped */
      }
    },
  };
}
