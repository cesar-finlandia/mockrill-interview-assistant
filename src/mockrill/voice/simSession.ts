// Deterministic in-browser stand-in for the microphone and the AssemblyAI
// Universal-Streaming socket.
//
// Why this exists: FR-01/FR-02 (getUserMedia + wss://streaming.assemblyai.com) are the two
// pieces of the app that a headless browser and a CI machine physically cannot exercise —
// there is no microphone and there must be no billed socket. Everything downstream of them
// (the turn state machine, mute discipline, barge-in, /api/turn, the deterministic scoring,
// the scorecard and the re-drill loop) is the part that actually breaks, and it is real code
// that deserves real browser coverage.
//
// So simulation replaces exactly two seams — MicSource and StreamingClient — with objects
// that satisfy the same contracts and replay `fixtures/mockrill/session-golden.json`. The
// StreamingClient contract is honoured literally: Begin arrives on connect, partial Turns
// tick word-by-word, and a formatted end_of_turn Turn finalizes, driven by the very
// sendAudio() calls the controller makes. Nothing else in the app knows it is in simulation.
//
// It is also rung 3 of the demo ladder from a judge's point of view: ?sim=1 on the public
// URL gives a full interview with no microphone permission and no API key.
import type { TranscriptTurn } from "src/mockrill/contracts";
import type { MicSource } from "./mic.js";
import type { StreamingClient, StreamingClientOptions } from "./streamingClient.js";
import golden from "fixtures/mockrill/session-golden.json" with { type: "json" };

/** Chunks of PCM the controller must forward before the sim emits the next partial. */
const CHUNKS_PER_PARTIAL = 2;
/** Number of partials before the turn is finalized. */
const PARTIALS_PER_TURN = 3;

export const SIM_CHUNK_MS = 60;
const SAMPLES_PER_CHUNK = 3200; // 200 ms of 16 kHz mono, same as the real AudioWorklet

export function simTurns(): TranscriptTurn[] {
  return (golden as unknown as { turns: TranscriptTurn[] }).turns;
}

/**
 * A MicSource that never touches getUserMedia. It emits low-amplitude PCM on a timer so the
 * controller's mute discipline and chunk forwarding run exactly as they do with a real mic,
 * but stays below BARGE_IN_PEAK so it cannot self-trigger barge-in.
 */
export function createSimMicSource(opts?: { chunkMs?: number }): MicSource {
  const chunkMs = opts?.chunkMs ?? SIM_CHUNK_MS;
  let muted = false;
  let cb: ((pcm: Int16Array) => void) | null = null;
  const timer = setInterval(() => {
    if (muted || !cb) return;
    cb(new Int16Array(SAMPLES_PER_CHUNK));
  }, chunkMs);

  return {
    stream: null as unknown as MediaStream,
    deviceId: null,
    label: "Simulated microphone",
    onChunk(next) {
      cb = next;
    },
    setMuted(m: boolean) {
      muted = m;
    },
    stop() {
      clearInterval(timer);
      cb = null;
    },
  };
}

/**
 * A StreamingClient that replays the golden session instead of opening a billed socket.
 * Emits Begin on connect, then partial/final Turns paced by the controller's own sendAudio
 * calls — so a controller that forgets to unmute after speaking simply never advances, which
 * is precisely the regression this seam is here to catch.
 */
export function createSimStreamingClient(opts: StreamingClientOptions): StreamingClient {
  const turns = simTurns();
  let state: "closed" | "connecting" | "open" = "closed";
  let dropped = 0;
  let turnIndex = 0;
  let chunks = 0;
  let partialsSent = 0;
  let busy = false;

  function partialAt(turn: TranscriptTurn, fraction: number): TranscriptTurn {
    const count = Math.max(1, Math.ceil(turn.words.length * fraction));
    const words = turn.words.slice(0, count);
    return {
      ...turn,
      transcript: words.map((w) => w.text).join(" "),
      formatted: false,
      end_of_turn: false,
      words,
      received_at: new Date().toISOString(),
    };
  }

  return {
    async connect() {
      state = "connecting";
      await new Promise<void>((r) => setTimeout(r, 0));
      state = "open";
      opts.onBegin(`sim-${Date.now()}`);
      return;
    },
    sendAudio() {
      if (state !== "open") {
        dropped++;
        return;
      }
      if (busy) return;
      chunks++;
      if (chunks < CHUNKS_PER_PARTIAL) return;
      chunks = 0;
      // Past the scripted four turns (a re-drill attempt) the last turn is replayed, so the
      // drill loop produces a real finalized Turn and a real re-score.
      const turn = turns[Math.min(turnIndex, turns.length - 1)]!;
      partialsSent++;
      if (partialsSent < PARTIALS_PER_TURN) {
        opts.onPartial(partialAt(turn, partialsSent / PARTIALS_PER_TURN));
        return;
      }
      partialsSent = 0;
      turnIndex++;
      busy = true;
      // onFinal is async in the controller (it awaits /api/turn); guard against re-entry so
      // a second turn is never finalized while the first is still being handled.
      void Promise.resolve(opts.onFinal({ ...turn, received_at: new Date().toISOString() })).finally(() => {
        busy = false;
      });
    },
    updateConfiguration() {
      /* no socket to reconfigure */
    },
    forceEndpoint() {
      /* no socket to endpoint */
    },
    async terminate() {
      state = "closed";
      opts.onTermination({ audio_duration_seconds: 0, session_duration_seconds: 0 });
    },
    get state() {
      return state;
    },
    get droppedChunks() {
      return dropped;
    },
  };
}
