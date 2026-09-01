import type { TranscriptTurn } from "src/mockrill/contracts";
import { withResilience, isDegradedResult, makeDegradedResult } from "src/resilience";
import type { DegradedResult } from "src/resilience";

export function buildStreamingUrl(
  base: string,
  token: string,
  opts: { speechModel?: string; keyterms?: string[] },
): string {
  // Justification per non-default value (one sentence each):
  // end_of_turn_confidence_threshold=0.45 (vs default 0.4) -> slightly higher threshold reduces premature end-of-turn fires on hesitations, improving evidence timestamps for filler detection.
  // min_turn_silence=560 (vs no default published) -> 560 ms balances not cutting off slow speakers against not waiting too long before scoring.
  // max_turn_silence=1536 (default 1536) -> keep default; documents we intentionally did not shorten, so long pauses become pause EvidenceQuotes.
  // vad_threshold=0.2 (default 0.2) -> keep default; sensitive enough for quiet mics in bootcamp laptops without false triggering on room noise.
  // interruption_delay=300 (vs 0-1000 range) -> 300 ms allows natural barge-in for interviewer without cutting candidate off on filler words.
  // mode=balanced (vs default not stated) -> balanced latency/accuracy is correct for coaching where both word timing and transcript quality matter.
  // format_turns=true (vs default false) -> we need formatted turns for scoring; only formatted Turns are final.
  // speech_model=universal-3-5-pro (vs other universals) -> Pro gives best word-level timestamps needed for evidence.
  const params: [string, string][] = [];
  params.push(["token", token]);
  params.push(["speech_model", opts.speechModel ?? "universal-3-5-pro"]);
  params.push(["sample_rate", "16000"]);
  params.push(["encoding", "pcm_s16le"]);
  params.push(["format_turns", "true"]);
  params.push(["end_of_turn_confidence_threshold", "0.45"]);
  params.push(["min_turn_silence", "560"]);
  params.push(["max_turn_silence", "1536"]);
  params.push(["vad_threshold", "0.2"]);
  params.push(["interruption_delay", "300"]);
  params.push(["mode", "balanced"]);
  if (opts.keyterms && opts.keyterms.length > 0) {
    for (const k of opts.keyterms) params.push(["keyterms_prompt", k]);
  }
  const qs = params.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join("&");
  return `${base}?${qs}`;
}

export function mapTurnToTranscriptTurn(payload: {
  turn_order: number;
  turn_is_formatted: boolean;
  end_of_turn: boolean;
  transcript: string;
  utterance?: string;
  end_of_turn_confidence: number;
  words: { text: string; start: number; end: number; confidence: number; word_is_final: boolean }[];
}): TranscriptTurn {
  return {
    turn_order: payload.turn_order,
    transcript: payload.transcript,
    formatted: payload.turn_is_formatted,
    end_of_turn: payload.end_of_turn,
    end_of_turn_confidence: payload.end_of_turn_confidence,
    words: payload.words.map((w) => ({
      text: w.text,
      start: w.start,
      end: w.end,
      confidence: w.confidence,
      word_is_final: w.word_is_final,
    })),
    speaker: "candidate" as const,
    received_at: new Date().toISOString(),
  };
}

export function handleMessage(
  raw: string,
  opts: {
    onBegin: (id: string) => void;
    onPartial: (turn: TranscriptTurn) => void;
    onFinal: (turn: TranscriptTurn) => void;
    onTermination: (s: { audio_duration_seconds: number; session_duration_seconds: number }) => void;
  },
): void {
  const msg = JSON.parse(raw);
  if (msg.type === "Begin") {
    opts.onBegin(msg.id);
    return;
  }
  if (msg.type === "Turn") {
    const turn = mapTurnToTranscriptTurn(msg);
    if (msg.end_of_turn === false) {
      opts.onPartial(turn);
    } else if (msg.end_of_turn === true && msg.turn_is_formatted === true) {
      opts.onFinal(turn);
    } else if (msg.end_of_turn === true && msg.turn_is_formatted === false) {
      // Turn with end_of_turn=true && turn_is_formatted=false is partial, not final
      opts.onPartial(turn);
    }
    return;
  }
  if (msg.type === "Termination") {
    opts.onTermination({
      audio_duration_seconds: msg.audio_duration_seconds,
      session_duration_seconds: msg.session_duration_seconds,
    });
    return;
  }
}

export type StreamingClientOptions = {
  tokenUrl?: string;
  speechModel?: string;
  keyterms?: string[];
  sessionId?: string;
  onPartial: (turn: TranscriptTurn) => void;
  onFinal: (turn: TranscriptTurn) => void;
  onBegin: (id: string) => void;
  onTermination: (s: { audio_duration_seconds: number; session_duration_seconds: number }) => void;
  onDegraded: (d: DegradedResult<unknown>) => void;
};

export type StreamingClient = {
  connect(): Promise<void | DegradedResult<never>>;
  sendAudio(pcm: Int16Array): void;
  updateConfiguration(patch: Record<string, unknown>): void;
  forceEndpoint(): void;
  terminate(): Promise<void>;
  readonly state: "closed" | "connecting" | "open";
  readonly droppedChunks: number;
};

/**
 * RES_FORCED_DEGRADED=1 makes withResilience return cached DegradedResult automatically — no extra code beyond isDegradedResult check.
 * Create a browser-native AssemblyAI Universal-Streaming client (audio never proxies through serverless).
 *
 * Invariants: audio never proxies; raw key never in client or query string (token only via /api/aai-token);
 * resilience config is literal { timeout_ms:15000, retries:1, fallback_chain:{order:["cache","none"]} }.
 *
 * MUST be called on unmount/beforeunload because billing is on total socket-open time.
 * Call `terminate()` in your component cleanup and also register
 * `window.addEventListener("beforeunload", () => client.terminate())`.
 * The socket is billed for as long as it is open (auto-close after 3h default, Mockrill caps at 1800s via max_session_duration_seconds).
 */
export function createStreamingClient(opts: StreamingClientOptions): StreamingClient {
  // Internal mutable state per A6/A7
  let _state: "closed" | "connecting" | "open" = "closed";
  let _droppedChunks = 0;
  let ws: WebSocket | null = null;
  let _reconnectAttempted = false;
  let _pendingTerminateResolve: (() => void) | null = null;
  let _isTerminating = false;

  function handleMessageInternal(raw: string): void {
    const msg = JSON.parse(raw) as Record<string, unknown>;
    if (msg["type"] === "Begin") {
      opts.onBegin(msg["id"] as string);
      return;
    }
    if (msg["type"] === "Turn") {
      const turn = mapTurnToTranscriptTurn(msg as Parameters<typeof mapTurnToTranscriptTurn>[0]);
      if ((msg as { end_of_turn: boolean }).end_of_turn === false) {
        opts.onPartial(turn);
      } else if (
        (msg as { end_of_turn: boolean; turn_is_formatted: boolean }).end_of_turn === true &&
        (msg as { turn_is_formatted: boolean }).turn_is_formatted === true
      ) {
        opts.onFinal(turn);
      } else if (
        (msg as { end_of_turn: boolean; turn_is_formatted: boolean }).end_of_turn === true &&
        (msg as { turn_is_formatted: boolean }).turn_is_formatted === false
      ) {
        // Turn with end_of_turn=true && turn_is_formatted=false is partial, not final
        opts.onPartial(turn);
      }
      return;
    }
    if (msg["type"] === "Termination") {
      const m = msg as { audio_duration_seconds: number; session_duration_seconds: number };
      opts.onTermination({
        audio_duration_seconds: m.audio_duration_seconds,
        session_duration_seconds: m.session_duration_seconds,
      });
      if (_pendingTerminateResolve) {
        _pendingTerminateResolve();
        _pendingTerminateResolve = null;
      }
      return;
    }
  }

  async function _openSocket(url: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const socket = new WebSocket(url);
      ws = socket;
      socket.binaryType = "arraybuffer";
      socket.onopen = () => {
        _state = "open";
        // _reconnectAttempted stays as-is per A7: reset only on successful open? spec says onopen set false? handled via flag reset originally false after success — keep spec: reset to false on open
        // For single-reconnect semantics, reset flag only after successful open? But spec shows onopen: _reconnectAttempted = false
        _reconnectAttempted = false;
        resolve();
      };
      socket.onmessage = (ev: MessageEvent) => {
        if (typeof ev.data === "string") {
          try {
            handleMessageInternal(ev.data as string);
          } catch {
            // ignore malformed
          }
        }
      };
      socket.onclose = (ev: CloseEvent) => {
        const wasTerminating = _isTerminating;
        _state = "closed";
        ws = null;
        if (_pendingTerminateResolve) {
          _pendingTerminateResolve();
          _pendingTerminateResolve = null;
        }
        if (wasTerminating) {
          _isTerminating = false;
          return;
        }
        if (!_reconnectAttempted) {
          _reconnectAttempted = true;
          setTimeout(() => {
            void connect().catch(() => {});
          }, 1000);
        } else {
          opts.onDegraded(
            makeDegradedResult({
              reason: "aai_socket_lost",
              fallback_source: "none",
              original_error: `close ${ev.code}`,
            }),
          );
        }
      };
      socket.onerror = () => {
        // onclose will follow; no-op
      };
    });
  }

  async function connect(): Promise<void | DegradedResult<never>> {
    if (_state !== "closed") return;
    _state = "connecting";
    const tokenFetch = withResilience(
      async () => {
        const url = opts.tokenUrl ?? "/api/aai-token";
        const resp = await fetch(url, { method: "GET", headers: { "Cache-Control": "no-store" } as unknown as Record<string, string> });
        if (!resp.ok) throw new Error(`token fetch ${resp.status}`);
        return (await resp.json()) as { token: string; expires_in_seconds: number };
      },
      { timeout_ms: 15000, retries: 1, fallback_chain: { order: ["cache", "none"] } },
    );
    const tokenResult = (await tokenFetch()) as unknown as { token: string; expires_in_seconds: number } | DegradedResult<unknown>;
    if (isDegradedResult(tokenResult)) {
      // cache key convention mockrill-session-<sessionId> — written by DP-DEMOPROOF via createGoldenCache().put(deriveKey({explicitKey:"mockrill-session-"+sessionId}))
      // RES_FORCED_DEGRADED=1 makes withResilience return cached DegradedResult automatically — no extra code beyond isDegradedResult check
      const cached = (tokenResult as DegradedResult<unknown>).data;
      if (Array.isArray(cached) && (cached as unknown[]).length > 0) {
        for (const t of cached as TranscriptTurn[]) {
          opts.onFinal(t as TranscriptTurn);
        }
        _state = "closed";
        return tokenResult as DegradedResult<never>;
      }
      const dr = (tokenResult as DegradedResult<unknown>).reason
        ? (tokenResult as DegradedResult<never>)
        : makeDegradedResult({
            reason: "aai_token_unavailable",
            fallback_source: "none",
            original_error: String(tokenResult),
          });
      opts.onDegraded(dr as DegradedResult<unknown>);
      _state = "closed";
      return dr as DegradedResult<never>;
    }
    const token = (tokenResult as { token: string }).token;
    const url = buildStreamingUrl("wss://streaming.assemblyai.com/v3/ws", token, {
      speechModel: opts.speechModel,
      keyterms: opts.keyterms,
    });
    try {
      await _openSocket(url);
    } catch (e) {
      const dr = makeDegradedResult({
        reason: "aai_socket_lost",
        fallback_source: "none",
        original_error: String(e),
      });
      opts.onDegraded(dr);
      _state = "closed";
      return dr as DegradedResult<never>;
    }
    return;
  }

  function sendAudio(pcm: Int16Array): void {
    if (_state !== "open" || !ws || ws.readyState !== WebSocket.OPEN) {
      _droppedChunks++;
      return;
    }
    const buf = pcm.buffer.slice(pcm.byteOffset, pcm.byteOffset + pcm.byteLength) as ArrayBuffer;
    try {
      ws.send(buf);
    } catch {
      _droppedChunks++;
    }
  }

  function updateConfiguration(patch: Record<string, unknown>): void {
    if (_state !== "open" || !ws) return;
    ws.send(JSON.stringify({ type: "UpdateConfiguration", ...patch }));
  }

  function forceEndpoint(): void {
    if (_state !== "open" || !ws) return;
    ws.send(JSON.stringify({ type: "ForceEndpoint" }));
  }

  async function terminate(): Promise<void> {
    if (!ws || _state === "closed") return;
    _isTerminating = true;
    try {
      ws.send(JSON.stringify({ type: "Terminate" }));
    } catch {}
    await new Promise<void>((resolve) => {
      let done = false;
      const timer = setTimeout(() => {
        if (!done) {
          done = true;
          resolve();
        }
      }, 2000);
      _pendingTerminateResolve = () => {
        if (!done) {
          done = true;
          clearTimeout(timer);
          resolve();
        }
      };
    });
    try {
      ws.close(1000, "terminate");
    } catch {}
    _state = "closed";
    _isTerminating = false;
  }

  // expose internal fields for verification (not part of public type but accessible via any)
  const client: StreamingClient & {
    ws: WebSocket | null;
    _reconnectAttempted: boolean;
    _pendingTerminateResolve: (() => void) | null;
    _isTerminating: boolean;
  } = {
    connect,
    sendAudio,
    updateConfiguration,
    forceEndpoint,
    terminate,
    get state() {
      return _state;
    },
    get droppedChunks() {
      return _droppedChunks;
    },
    get ws() {
      return ws;
    },
    set ws(v: WebSocket | null) {
      ws = v;
    },
    get _reconnectAttempted() {
      return _reconnectAttempted;
    },
    set _reconnectAttempted(v: boolean) {
      _reconnectAttempted = v;
    },
    get _pendingTerminateResolve() {
      return _pendingTerminateResolve;
    },
    set _pendingTerminateResolve(v: (() => void) | null) {
      _pendingTerminateResolve = v;
    },
    get _isTerminating() {
      return _isTerminating;
    },
    set _isTerminating(v: boolean) {
      _isTerminating = v;
    },
  };

  return client;
}
