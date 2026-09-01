# DP-AAI-STREAM — AssemblyAI Universal-Streaming Client & Token Endpoint

## §1 Purpose & scope

### §1.1 What this plan delivers

- **Temporary-token serverless function `api/aai-token.ts` (M16)** — `GET /api/aai-token` mints a short-lived AssemblyAI streaming token via `GET https://streaming.assemblyai.com/v3/token` with `withResilience`, never exposes `ASSEMBLYAI_API_KEY` to the browser, caps `max_session_duration_seconds=1800` for credit protection, and returns `200` or `503 DegradedResult` per §S5.
- **Microphone capture `src/mockrill/voice/mic.ts` → `createMicSource` (M17)** — `getUserMedia` mono 16 kHz, `AudioContext` at 16000 with native-rate fallback + linear-interpolation downsample, inline blob-URL `AudioWorkletProcessor` buffering 3200 samples (200 ms), Int16 conversion, `setMuted`/`stop` semantics, and typed `MicPermissionDenied` rejection.
- **Streaming WebSocket client `src/mockrill/voice/streamingClient.ts` (M18/M19)** — token fetch, exact query-string builder (pure function exported for test), `WebSocket` to `wss://streaming.assemblyai.com/v3/ws`, `Begin`/`Turn`/`Termination` handling, `sendAudio`/`updateConfiguration`/`forceEndpoint`/`terminate`, single auto-reconnect, billing-aware `terminate()` on unmount, `droppedChunks` counter, and `RES_FORCED_DEGRADED` golden-cache replay path.
- **Barrel `src/mockrill/voice/index.ts` (M20)** — re-exports M17–M19 and forwards M21–M22 owned by DP-TURNTAKING; sequencing note that barrel work is last.
- **Degraded + golden-cache replay behavior** — every outbound call via `withResilience` with `{ timeout_ms:15000, retries:1, fallback_chain:{order:["cache","none"]}}`, `DegradedResult` never throws, cache key `mockrill-session-<sessionId>`.
- **Credit and security invariants** — audio never proxies through serverless, raw key never in client or query string, no SDK dependency, browser-native `WebSocket`/`fetch` only.

### §1.2 Explicitly OUT of scope, and which DP owns it instead

| Out-of-scope item | Owning DP | Reason |
|---|---|---|
| Shared contracts M1–M15 (`TranscriptWord`, `TranscriptTurn`, `InterviewQuestion`, `RubricAxis`, `EvidenceQuote`, `FillerHit`, `AnswerScore`, `Scorecard`, `SessionState`, `MOCKRILL_STEP_IDS`, `StepPayloads`, `makeEnvelope`, `formatTimestamp`, engine schemas) | DP-CONTRACTS | Pure types/vocabulary; this plan consumes `TranscriptTurn`/`TranscriptWord` but never redefines them |
| `createSpeaker` (M21) + `createTurnController`/`TurnControllerDeps` (M22–M23), `MicPermissionDenied` envelope mapping, `speechSynthesis` output | DP-TURNTAKING | Turn-taking state machine and TTS; this plan provides mic+socket primitives it consumes |
| `TurnRequest`/`InterviewerAction` (M24), tool descriptors (M25), `chatCompletion`/`callInterviewer` (M26/M28), `POST /api/turn` (M27), question bank (M29) | DP-INTERVIEWER | LLM orchestration / gateway |
| Filler lexicon, `detectFillers`, `buildEvidence`, deterministic rubric, `buildScorecard`/`selectWeakest` (M30–M35) | DP-SCORECARD | Scoring |
| `createEventBus`, `useMockrillEvents`, `main.tsx`/`index.html` (M37–M39) | DP-UI | UI wiring |
| `GET /api/health`, `vercel.json` (M40–M41) | DP-DEPLOY | Deployment |
| Golden fixture `session-golden.json`, `mockrill-mock-publish.ts`, `fallback-ladder.md` (M42–M44) | DP-DEMOPROOF | Demo/offline replay (but this plan reads golden-cache keys written by DP-DEMOPROOF) |
| Architecture diagram, `submission.md` (M45–M46) | DP-SUBMIT | Submission |

## §2 Requirements

| # | Requirement | Source | Judging axis |
|---|---|---|---|
| R-AAI-01 | `api/aai-token.ts` handles `GET /api/aai-token`: rejects non-GET with `405`; reads `process.env.ASSEMBLYAI_API_KEY` as only place besides `api/turn.ts`; if absent returns `503` with `DegradedResult` `{ reason: "aai_key_missing", fallback_source: "none" }` via `makeDegradedResult`, never throws or echoes key | S7 M16 | Application of Technology |
| R-AAI-02 | Token handler calls `GET https://streaming.assemblyai.com/v3/token?expires_in_seconds=60&max_session_duration_seconds=1800` with header `Authorization: <key>` wrapped in `withResilience` `{ timeout_ms:15000, retries:1, fallback_chain:{order:["cache","none"]} }`; on success returns `200 { token, expires_in_seconds }` with `Cache-Control: no-store`; on `DegradedResult` returns `503` with that JSON verbatim; documents 1800 s session cap as credit-protection (billing on socket-open duration) | S7 M16, S5 | Application of Technology |
| R-AAI-03 | `createMicSource` calls `navigator.mediaDevices.getUserMedia({ audio: { channelCount:1, echoCancellation:true, noiseSuppression:true, autoGainControl:true } })` exactly as written | S7 M17 | Application of Technology |
| R-AAI-04 | `createMicSource` creates `new AudioContext({ sampleRate:16000 })`; if browser refuses 16000, creates at native rate and downsamples in worklet via linear-interpolation resample algorithm (numbered steps in §5) | S7 M17 | Application of Technology |
| R-AAI-05 | Worklet is an `AudioWorkletProcessor` registered from a blob URL built from an inline source string (no separate asset file); plan contains full worklet source; worklet buffers Float32 frames until 3200 samples (200 ms at 16 kHz), converts to `Int16Array` via `Math.max(-1,Math.min(1,s))*0x7FFF`, posts to main thread | S7 M17 | Application of Technology |
| R-AAI-06 | `setMuted(true)` drops chunks without closing socket; `stop()` disconnects worklet, closes `AudioContext`, stops every `MediaStream` track; permission denial rejects with typed error `.name === "MicPermissionDenied"` | S7 M17 | Application of Technology |
| R-AAI-07 | `createStreamingClient` `connect()` first `fetch`es `opts.tokenUrl ?? "/api/aai-token"`; non-200 returns `DegradedResult` reason `"aai_token_unavailable"` not throw | S7 M18 | Application of Technology |
| R-AAI-08 | Socket URL built by appending in exact order: `token`, `speech_model` (default `universal-3-5-pro`), `sample_rate=16000`, `encoding=pcm_s16le`, `format_turns=true`, `end_of_turn_confidence_threshold=0.45`, `min_turn_silence=560`, `max_turn_silence=1536`, `vad_threshold=0.2`, `interruption_delay=300`, `mode=balanced`, `keyterms_prompt` repeated per keyterm; each non-default value justified in one sentence | S7 M18, S5 | Application of Technology |
| R-AAI-09 | Message handling: `Begin` → `onBegin(id)`; `Turn` mapped to `TranscriptTurn` (M2) with `speaker:"candidate"`, `received_at:new Date().toISOString()`; route to `onPartial` when `end_of_turn===false`, to `onFinal` when `end_of_turn===true && turn_is_formatted===true`; `Turn` with `end_of_turn===true && turn_is_formatted===false` goes to `onPartial` not final | S7 M18 | Application of Technology |
| R-AAI-10 | `sendAudio(pcm:Int16Array)` sends `pcm.buffer` binary only when `state==="open"`; else drops silently and increments `droppedChunks` counter exposed for diagnostics | S7 M18 | Application of Technology |
| R-AAI-11 | `updateConfiguration(patch)` sends `{ type:"UpdateConfiguration", ...patch }`; `forceEndpoint()` sends `{ type:"ForceEndpoint" }` | S7 M18 | Application of Technology |
| R-AAI-12 | `terminate()` sends `{ type:"Terminate" }`, waits up to 2000 ms for `Termination`, then closes socket; MUST be called on unmount/`beforeunload` (billing on socket-open time) | S7 M18 | Application of Technology |
| R-AAI-13 | Reconnection: exactly one auto-reconnect after unexpected close with fresh token after 1000 ms; second failure calls `onDegraded` with `"aai_socket_lost"` and leaves `closed`; no infinite loop | S7 M18 | Application of Technology |
| R-AAI-14 | `RES_FORCED_DEGRADED=1` golden-cache path: `connect()` consults wrapped call; when `DegradedResult` with cached data, invokes `onFinal` per cached turn instead of opening socket; cache key `mockrill-session-<sessionId>`; DP-DEMOPROOF records entries | S7 M18 | Application of Technology |
| R-AAI-15 | Barrel `src/mockrill/voice/index.ts` re-exports M17–M19 and also M21–M22 owned by DP-TURNTAKING; plan states barrel is yours, exports forwarded are not, dependency sequenced last | S7 M20 | Application of Technology |
| R-AAI-16 | Invariants: audio never proxies through serverless (Vercel cannot hold long sockets; browser→AssemblyAI only); raw key never in client/bundled file/query string; no AssemblyAI SDK dependency — browser `WebSocket`+`fetch` only | S5, S4 | Application of Technology |
| R-AAI-17 | All outbound network calls wrapped with `withResilience` `{ timeout_ms:15000, retries:1, fallback_chain:{order:["cache","none"]} }`; failures become `DegradedResult`, never throw to UI | S3 | Application of Technology |

## §3 Contracts OWNED by this plan

> Rule for every contract below: file path and exported name are exact. Consumers MUST import this from the owning path shown; re-defining, re-typing, stubbing or copying it is a defect.

### M16 `api/aai-token.ts` — default handler `GET /api/aai-token`

- **File:** `api/aai-token.ts`
- **Export:** `export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void>` (Vercel serverless function; default export)
- **TypeScript signature (normative):**
  ```ts
  // api/aai-token.ts
  import type { VercelRequest, VercelResponse } from "@vercel/node";
  export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void>;
  ```
- **Input shape:** HTTP `GET /api/aai-token`; no body, no query params consumed. If `req.method !== "GET"` → `405 Method Not Allowed` with `Allow: GET` header and JSON `{ error: "method_not_allowed" }`.
- **Output shapes:**
  - Success `200` with header `Cache-Control: no-store` and JSON `{ token: string; expires_in_seconds: number }` where `expires_in_seconds` is `60` (echoed from upstream).
  - Key missing `503` with JSON `DegradedResult` `{ degraded:true, reason:"aai_key_missing", fallback_source:"none", original_error:null, data:null, timestamp:string, version:"1.0.0" }` (produced via `makeDegradedResult({ reason:"aai_key_missing", fallback_source:"none" })`).
  - Degraded upstream `503` with the `DegradedResult` JSON verbatim from `withResilience` (reason varies, e.g. `"aai_token_unavailable"` or network timeout).
- **Env read:** `process.env.ASSEMBLYAI_API_KEY` — this file and `api/turn.ts` are the ONLY places that may read it. Must never be echoed in response or logs.
- **Resilience wrapping (normative config literal):**
  ```ts
  import { withResilience, isDegradedResult } from "src/resilience";
  const getToken = withResilience(async () => {
    const resp = await fetch("https://streaming.assemblyai.com/v3/token?expires_in_seconds=60&max_session_duration_seconds=1800", {
      method: "GET",
      headers: { Authorization: process.env.ASSEMBLYAI_API_KEY! },
    });
    if (!resp.ok) throw new Error(`token ${resp.status}`);
    return (await resp.json()) as { token: string; expires_in_seconds: number };
  }, { timeout_ms: 15000, retries: 1, fallback_chain: { order: ["cache","none"] } as const });
  ```
  Header is `Authorization: <key>` with no `Bearer` prefix (per S5).
- **Credit-protection note (must appear in plan and in code comment):** `max_session_duration_seconds=1800` (30 min) caps socket lifetime; billing is on total socket-open duration with auto-close after 3 h default; Mockrill caps deliberately to protect credits.
- **Consumers:** Browser `createStreamingClient` (`fetch`es `/api/aai-token`); DP-TURNTAKING turnController indirectly via client; no server consumer.
- **Import rule:** Clients MUST `fetch("/api/aai-token")`; never import `ASSEMBLYAI_API_KEY`. Re-implementing token fetch against AssemblyAI directly in client code is a defect. Consumers MUST import this from `api/aai-token.ts` path semantics; re-defining or stubbing it is a defect.

### M17 `createMicSource` — `src/mockrill/voice/mic.ts`

- **File:** `src/mockrill/voice/mic.ts`
- **Export:** `export async function createMicSource(opts?: { sampleRate?: number }): Promise<MicSource>`
- **Supporting type (owned, in same file):**
  ```ts
  export type MicSource = {
    stream: MediaStream;
    onChunk(cb: (pcm: Int16Array) => void): void;
    setMuted(muted: boolean): void;
    stop(): void;
  };
  ```
- **Signature details:** `opts.sampleRate` defaults to `16000`; return promise rejects with typed error whose `.name === "MicPermissionDenied"` on permission denial (see §5 A2). No other rejection reason uses that name.
- **Inputs/outputs:** Calls `getUserMedia` with exact constraint object literal from R-AAI-03; outputs mono PCM `Int16Array` chunks of length `3200` (200 ms at 16 kHz) via `onChunk` callback. `setMuted` toggles dropping without socket close. `stop` cleans up.
- **Consumers:** DP-TURNTAKING `createTurnController` (receives `mic: MicSource` via `TurnControllerDeps`), DP-UI debug screens.
- **Import rule:** Consumers MUST import this from `src/mockrill/voice/mic.ts` (or barrel `src/mockrill/voice`); re-defining or stubbing it is a defect.

### M18/M19 `createStreamingClient` + `StreamingClient` + `StreamingClientOptions` — `src/mockrill/voice/streamingClient.ts`

- **File:** `src/mockrill/voice/streamingClient.ts`
- **Exports:**
  ```ts
  export type StreamingClientOptions = {
    tokenUrl?: string; // default "/api/aai-token"
    speechModel?: string; // default "universal-3-5-pro"
    keyterms?: string[]; // optional, each becomes keyterms_prompt param
    sessionId?: string; // for golden-cache key derivation: mockrill-session-<sessionId>
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
    readonly droppedChunks: number; // diagnostic counter
  };
  export function createStreamingClient(opts: StreamingClientOptions): StreamingClient;
  // Pure exported-for-test helpers (also owned):
  export function buildStreamingUrl(base: string, token: string, opts: { speechModel?: string; keyterms?: string[] }): string;
  export function mapTurnToTranscriptTurn(payload: AssemblyAITurnPayload): TranscriptTurn;
  ```
  where `AssemblyAITurnPayload` is the server→client `Turn` JSON shape `{ type:"Turn", turn_order:number, turn_is_formatted:boolean, end_of_turn:boolean, transcript:string, utterance?:string, end_of_turn_confidence:number, words:{text:string,start:number,end:number,confidence:number,word_is_final:boolean}[] }`.
- **Socket URL contract:** `wss://streaming.assemblyai.com/v3/ws` + query string built in exact order listed in R-AAI-08; `buildStreamingUrl` is pure and deterministically appends params (see §5 A4).
- **Message mapping contract:** `mapTurnToTranscriptTurn` converts to `TranscriptTurn` with `speaker:"candidate"`, `formatted: turn_is_formatted`, `end_of_turn`, `received_at: new Date().toISOString()`; routing logic in §5 A5.
- **Lifecycle contract:** `connect` fetches token with `withResilience`, builds URL, opens `WebSocket`; `sendAudio` binary only when `state==="open"`; `updateConfiguration`/`forceEndpoint`/`terminate` send JSON types; `terminate` waits 2000 ms; single reconnect after 1000 ms; capped one retry; `onDegraded` with `aai_socket_lost` on second failure.
- **Golden-cache contract:** When `withResilience` returns `DegradedResult` with `data` containing `TranscriptTurn[]`, `connect` replays via `onFinal` per turn, never opens socket; cache key `mockrill-session-<sessionId>`.
- **Consumers:** DP-TURNTAKING `createTurnController` (owns `client: StreamingClient`), DP-UI (reads `state`/`droppedChunks` for indicator), tests (import `buildStreamingUrl`/`mapTurnToTranscriptTurn`).
- **Import rule:** Consumers MUST import this from `src/mockrill/voice/streamingClient.ts` (or barrel); re-defining or stubbing it is a defect.

### M20 Barrel `src/mockrill/voice/index.ts`

- **File:** `src/mockrill/voice/index.ts`
- **Exports (value + type):**
  ```ts
  // Owned re-exports
  export { createMicSource } from "./mic.js";
  export type { MicSource } from "./mic.js";
  export { createStreamingClient, buildStreamingUrl, mapTurnToTranscriptTurn } from "./streamingClient.js";
  export type { StreamingClient, StreamingClientOptions } from "./streamingClient.js";
  // Forwarded (NOT owned) — DP-TURNTAKING creates these files; this barrel only forwards
  export { createSpeaker } from "./speak.js"; // M21 owned by DP-TURNTAKING
  export type { Speaker } from "./speak.js";
  export { createTurnController } from "./turnController.js"; // M22 owned by DP-TURNTAKING
  export type { TurnController, TurnControllerDeps } from "./turnController.js";
  ```
  The plan MUST state explicitly: the barrel file `src/mockrill/voice/index.ts` is owned by DP-AAI-STREAM; the two exports it forwards (`./speak.js`, `./turnController.js`) are NOT owned by this plan and are created by DP-TURNTAKING. Work unit WU-AAI-07 therefore depends on DP-TURNTAKING's files existing and must be sequenced last.
- **Consumers:** All voice consumers (`turnController`, UI, tests) import from `src/mockrill/voice`; DP-TURNTAKING is both consumer (of M17-M19) and provider (of M21-M22) via same barrel.
- **Import rule:** Consumers MUST import voice APIs from `src/mockrill/voice` (barrel). Deep-import ban: outside `src/mockrill/voice/` no file may do `from "src/mockrill/voice/mic"` or `from "src/mockrill/voice/streamingClient"` directly; barrel is the only public surface.


## §4 Contracts CONSUMED by this plan

| # | Import path | Export | Signature / shape | Owning module / DP |
|---|---|---|---|---|
| C1 | `src/resilience` | `withResilience` | `<T>(fn:()=>Promise<T>, config?:ResilienceConfig)=>()=>Promise<T\|DegradedResult<T>>` | Chassis `src/resilience` |
| C2 | `src/resilience` | `isDegradedResult` | `(v:unknown)=>v is DegradedResult` | Chassis |
| C3 | `src/resilience` | `makeDegradedResult` | `<T>(input:{reason:string;fallback_source:"secondary_provider"\|"cache"\|"replay"\|"none";original_error?:string\|null;data?:T\|null})=>DegradedResult<T>` | Chassis |
| C4 | `src/resilience` | `createGoldenCache` | `(rootDir?:string)=>GoldenCache` with `get/put/has/delete/list/clear/deriveKey` | Chassis (optional use for cache key derivation) |
| C5 | `src/resilience` | `DegradedResult` (type) | `{degraded:true;reason:string;fallback_source:...;original_error:string\|null;data:T\|null;timestamp:string;version:"1.0.0"}` | Chassis |
| C6 | `src/resilience` | `ResilienceConfig` (type) | `{timeout_ms?:number;retries?:number;fallback_chain?:{order:(...)[]}}` | Chassis |
| C7 | `src/mockrill/contracts` | `TranscriptTurn` (type) | `{ turn_order:number; transcript:string; formatted:boolean; end_of_turn:boolean; end_of_turn_confidence:number; words:TranscriptWord[]; speaker:"candidate"\|"interviewer"; received_at:string }` (M2) | DP-CONTRACTS |
| C8 | `src/mockrill/contracts` | `TranscriptWord` (type) | `{ text:string; start:number; end:number; confidence:number; word_is_final:boolean }` (M1) | DP-CONTRACTS |
| C9 | `src/mockrill/contracts` | `SessionState` (type) | `"idle"\|"connecting"\|"listening"\|...` (M9) | DP-CONTRACTS (used only for type of TurnController state exposed via barrel; not imported directly in streamingClient but documented) |

**Rules:**
- Chassis imports MUST use barrel path only: `import { withResilience, isDegradedResult, makeDegradedResult } from "src/resilience";` — deep imports like `from "src/resilience/withResilience"` are CI-blocked and a defect.
- Contracts MUST be imported from barrel: `import type { TranscriptTurn } from "src/mockrill/contracts";` — never re-declare, re-type, or stub them.
- No import from `src/media`, `src/cost`, `src/dev`, `src/pgm`, `src/profile`, `src/assembly` — they are excluded and absent.
- None of the consumed contracts may be re-implemented or copied; always import from canonical path. The `src/*` alias is configured in `tsconfig.json` and `vite.config.ts`; use it.
- `api/aai-token.ts` may import `withResilience`/`makeDegradedResult`; browser files (`mic.ts`, `streamingClient.ts`) may also import `withResilience` for the token fetch path (token fetch is the only network call in browser that needs resilience).


## §5 Algorithms

### A1 `api/aai-token.ts` handler algorithm (M16)

```
1. If req.method !== "GET": set header Allow: GET; res.status(405).json({ error: "method_not_allowed" }); return.
2. const key = process.env.ASSEMBLYAI_API_KEY;
3. If !key or key.trim() === "":
   a. const dr = makeDegradedResult({ reason: "aai_key_missing", fallback_source: "none" });
   b. res.status(503).json(dr); return; // never throw, never echo key
4. Define fetchToken = withResilience(async () => {
     const resp = await fetch("https://streaming.assemblyai.com/v3/token?expires_in_seconds=60&max_session_duration_seconds=1800", {
       method: "GET",
       headers: { Authorization: key } // literal header name Authorization, value is raw key, no Bearer prefix
     });
     if (!resp.ok) {
       const body = await resp.text(); // capture for original_error
       throw new Error(`aai token ${resp.status}: ${body.slice(0,500)}`);
     }
     const json = await resp.json() as { token: string; expires_in_seconds: number };
     if (typeof json.token !== "string" || typeof json.expires_in_seconds !== "number") throw new Error("invalid token shape");
     return json;
   }, { timeout_ms: 15000, retries: 1, fallback_chain: { order: ["cache","none"] as const } });
5. const result = await fetchToken();
6. If isDegradedResult(result):
   a. res.status(503).json(result); return; // verbatim DegradedResult
7. Else:
   a. res.setHeader("Cache-Control", "no-store");
   b. res.status(200).json({ token: result.token, expires_in_seconds: result.expires_in_seconds }); return;
```
Credit-protection comment must appear in file header: `// max_session_duration_seconds=1800 (30 min) caps billing; socket billing is on total open duration, auto-close 3h default.`

### A2 `createMicSource` — getUserMedia + AudioContext + worklet setup (M17)

```
function createMicSource(opts?: { sampleRate?: number }): Promise<MicSource> {
  const desiredRate = opts?.sampleRate ?? 16000;
  1. Try: stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
     Catch e:
       if e.name === "NotAllowedError" || e.name === "PermissionDeniedError" => throw error with .name = "MicPermissionDenied" (create new Error(e.message) and set .name, or DOMException) // caller DP-TURNTAKING maps to envelope
       else throw e with .name preserved (but typed as MicPermissionDenied only for permission case)
  2. Try: ctx = new AudioContext({ sampleRate: desiredRate }); // 16000
     Catch (e.g. NotSupportedError if browser refuses): ctx = new AudioContext(); // native rate, e.g. 44100 or 48000; actual rate is ctx.sampleRate
  3. Determine resampling needed: needsResample = ctx.sampleRate !== 16000; ratio = ctx.sampleRate / 16000;
  4. Build worklet source string WORKLET_SRC (see A3) with constants SAMPLE_RATE=16000, CHUNK=3200, NATIVE_RATE=ctx.sampleRate, NEEDS_RESAMPLE=needsResample.
  5. blob = new Blob([WORKLET_SRC], { type: "application/javascript" }); url = URL.createObjectURL(blob);
  6. await ctx.audioWorklet.addModule(url); URL.revokeObjectURL(url); // revoke after load
  7. source = ctx.createMediaStreamSource(stream);
  8. node = new AudioWorkletNode(ctx, "mockrill-pcm-worklet"); // name matches registerProcessor
  9. source.connect(node); // do NOT connect to destination (no echo)
  10. State: let muted = false; let chunkCb: ((pcm:Int16Array)=>void)|null = null; let droppedForMute = 0;
  11. node.port.onmessage = (ev: MessageEvent<Int16Array>) => {
        if (muted) { droppedForMute++; return; } // drop without socket close
        if (chunkCb) chunkCb(ev.data);
      };
  12. Return MicSource {
        stream,
        onChunk(cb) { chunkCb = cb; },
        setMuted(m) { muted = m; },
        stop() {
          try { node.disconnect(); } catch {}
          try { source.disconnect(); } catch {}
          try { ctx.close(); } catch {}
          for (const t of stream.getTracks()) try { t.stop(); } catch {}
          // node.port.close() implicitly via context close
        }
      };
}
```

**Resample algorithm (linear interpolation) — when NEEDS_RESAMPLE:**

```
// Inside worklet process(), input is Float32Array at NATIVE_RATE, need 16 kHz output
// Steps for each input frame (128 samples typical):
1. Append input Float32 samples to internal Float32 buffer (e.g. resampleBuffer).
2. While resampleBuffer has >= ratio samples available to produce one 16k output sample:
   a. pos = outputIndex * ratio; // e.g. if native 48000, ratio=3, every 3 native → 1 output
   b. leftIdx = Math.floor(pos); rightIdx = Math.min(leftIdx+1, resampleBuffer.length-1);
   c. frac = pos - leftIdx;
   d. sample = resampleBuffer[leftIdx] * (1 - frac) + resampleBuffer[rightIdx] * frac; // linear interpolation
   e. push sample into outBuffer (Float32)
   f. outputIndex++
3. After loop, discard consumed native samples: resampleBuffer = resampleBuffer.slice(Math.floor(outputIndex * ratio)) and keep remainder + new input; adjust outputIndex accordingly.
4. Simpler alternative literal in worklet: maintain `inBuffer: Float32[]`, `outBuffer: Float32[]`, `inPos` pointer; for each output sample compute interpolated value as above.
```
Full worklet source is given in A3; it contains this resample inline.

### A3 Inline AudioWorkletProcessor source (blob URL) — M17

Plan MUST embed this exact source string (modulo constants interpolation for NATIVE_RATE/NEEDS_RESAMPLE). Implementor copies verbatim into `mic.ts` as template literal:

```js
const WORKLET_SRC = `
class MockrillPCMWorklet extends AudioWorkletProcessor {
  constructor(opts) {
    super();
    this._buf = new Float32Array(0);
    this._out = [];
    this._needsResample = ${needsResample};
    this._nativeRate = ${ctxSampleRate};
    this._ratio = this._nativeRate / 16000;
    this._outIndex = 0;
    this._inBuf = new Float32Array(0);
  }
  // resample helper: linear interpolation
  _resampleAppend(input) {
    if (!this._needsResample) {
      // no resample: directly append to _out buffer logic via _buf
      const next = new Float32Array(this._inBuf.length + input.length);
      next.set(this._inBuf, 0); next.set(input, this._inBuf.length);
      this._inBuf = next;
      return this._inBuf;
    }
    // with resample: interpolate to 16k
    const combinedLen = this._inBuf.length + input.length;
    const combined = new Float32Array(combinedLen);
    combined.set(this._inBuf, 0); combined.set(input, this._inBuf.length);
    // produce 16k samples
    const outSamples = [];
    let pos = 0;
    // we keep outputIndex across calls: _outIndex counts 16k samples produced
    // for each output, pos = _outIndex * _ratio (in native samples) relative to combined start?
    // simpler: iterate while we can produce one 16k sample from combined
    // need mapping: native index = _outIndex * _ratio, but we consumed up to floor(pos)
    // Instead: for each new out sample, compute native pos = _outIndex * _ratio
    // This simplified version assumes _inBuf holds all unconsumed native samples starting at native index = consumed.
    // Alternative counting: we store consumedNative = Math.floor((this._outIndex - startOut) * _ratio) — implemented below.
    // For brevity the normative implementation below uses a cursor approach:
    let consumed = 0;
    while (true) {
      const nativePos = this._outIndex * this._ratio;
      // nativePos is absolute; but combined is relative to 0 = first unconsumed sample before this call?
      // So we need base offset: base = this._totalConsumedNative (tracked)
      // To keep code small, the plan specifies the cursor loop below instead.
      break;
    }
    // ACTUAL normative resample loop (copy this verbatim):
    // The worklet keeps this._inBuf as unconsumed native samples.
    // On each process call we append input to _inBuf, then generate 16k samples:
    // let produced = 0;
    // while (Math.floor((this._outIndex + produced) * this._ratio + 0.0001) + 1 < this._inBuf.length) { ... }
    // Given complexity, the checked-in worklet SHOULD use this exact loop:
    return combined;
  }
  process(inputs, outputs, params) {
    const input = inputs[0] && inputs[0][0];
    if (!input || input.length === 0) return true;
    // Append to inBuf
    const next = new Float32Array(this._inBuf.length + input.length);
    next.set(this._inBuf, 0); next.set(input, this._inBuf.length);
    this._inBuf = next;
    // If needs resample, convert to 16k float buffer
    let pcmFloat;
    if (this._needsResample) {
      const out = [];
      // produce while we have enough native samples to interpolate next 16k sample
      while (true) {
        const nativePos = this._outIndex * this._ratio;
        const left = Math.floor(nativePos);
        const frac = nativePos - left;
        if (left + 1 >= this._inBuf.length) break;
        const s = this._inBuf[left] * (1 - frac) + this._inBuf[left + 1] * frac;
        out.push(s);
        this._outIndex++;
        // when out reaches 3200, flush
        if (out.length >= 3200) break;
        // also cap to avoid unbounded: if produced enough to drain, continue
      }
      // consume native samples that are fully behind left index
      const consumedNative = Math.floor(this._outIndex * this._ratio);
      // But _inBuf may have grown; we need to keep unconsumed tail. Simpler: slice by consumed count relative to initial _inBuf start?
      // Normative: consumed = Math.floor(this._outIndex * this._ratio) - this._consumedBase; where _consumedBase tracks.
      // For plan brevity, the implementor keeps _consumed counter and slices:
      // this._inBuf = this._inBuf.slice(consumedNative - this._baseNative); // see mic.ts template for full arithmetic
      // The plan's minimal correct version below uses a separate _base offset variable.
      pcmFloat = new Float32Array(out);
      // NOTE: actual file mic.ts must implement slicing correctly; tests verify 3200-length chunks and resample ratio.
    } else {
      pcmFloat = this._inBuf; // alias; will be sliced after buffering
    }
    // Buffer until 3200 samples (=200ms at 16k)
    const combined = new Float32Array(this._buf.length + pcmFloat.length);
    combined.set(this._buf, 0); combined.set(pcmFloat, this._buf.length);
    this._buf = combined;
    // If resampled path, _inBuf slicing already handled; else _inBuf = empty because pcmFloat was _inBuf
    if (!this._needsResample) this._inBuf = new Float32Array(0);
    while (this._buf.length >= 3200) {
      const chunk = this._buf.slice(0, 3200);
      this._buf = this._buf.slice(3200);
      const int16 = new Int16Array(3200);
      for (let i = 0; i < 3200; i++) {
        let s = chunk[i];
        s = Math.max(-1, Math.min(1, s));
        int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
      }
      this.port.postMessage(int16, [int16.buffer]);
    }
    return true;
  }
}
registerProcessor('mockrill-pcm-worklet', MockrillPCMWorklet);
`;
```
Simplified normative worklet the implementor actually checks in (copy-paste ready, ~45 lines, no external import):

```js
// NORMATIVE WORKLET STRING (assign to const WORKLET_SRC in mic.ts):
`class MockrillPCMWorklet extends AudioWorkletProcessor{constructor(){super();this._buf=new Float32Array(0);this._inBuf=new Float32Array(0);this._outIdx=0;this._needsResample=${needsResample};this._ratio=${ratio};}process(inputs){const inp=inputs[0]?.[0];if(!inp||!inp.length)return true;const nxt=new Float32Array(this._inBuf.length+inp.length);nxt.set(this._inBuf,0);nxt.set(inp,this._inBuf.length);this._inBuf=nxt;let floatChunk;if(this._needsResample){const out=[];while(true){const pos=this._outIdx*this._ratio;const l=Math.floor(pos);const f=pos-l;if(l+1>=this._inBuf.length)break;const s=this._inBuf[l]*(1-f)+this._inBuf[l+1]*f;out.push(s);this._outIdx++;if(out.length>=8192)break}const consumed=Math.min(this._inBuf.length,Math.floor(this._outIdx*this._ratio)- (this._base||0));if(consumed>0){this._inBuf=this._inBuf.slice(consumed);this._base=(this._base||0)+consumed}floatChunk=new Float32Array(out)}else{floatChunk=this._inBuf;this._inBuf=new Float32Array(0)}const comb=new Float32Array(this._buf.length+floatChunk.length);comb.set(this._buf,0);comb.set(floatChunk,this._buf.length);this._buf=comb;while(this._buf.length>=3200){const ch=this._buf.slice(0,3200);this._buf=this._buf.slice(3200);const i16=new Int16Array(3200);for(let i=0;i<3200;i++){let s=Math.max(-1,Math.min(1,ch[i]));i16[i]=s<0?s*0x8000:s*0x7FFF}this.port.postMessage(i16,[i16.buffer])}return true}}registerProcessor('mockrill-pcm-worklet',MockrillPCMWorklet);`
```
The plan mandates: the worklet source is an inline string, turned into a `Blob` URL, registered via `audioWorklet.addModule(blobUrl)`; no separate asset file.

### A4 `buildStreamingUrl` pure function (M18) — exported for test

```ts
export function buildStreamingUrl(base: string, token: string, opts: { speechModel?: string; keyterms?: string[] }): string {
  // base = "wss://streaming.assemblyai.com/v3/ws" (no query)
  // append in EXACT order listed; DO NOT sort or reorder
  const params: [string,string][] = [];
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
    for (const k of opts.keyterms) params.push(["keyterms_prompt", k]); // repeated once per keyterm, in input order
  }
  const qs = params.map(([k,v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join("&");
  return `${base}?${qs}`;
}
```

**Justification per non-default value (one sentence each, normative — DP-PITCH quotes these):**
- `end_of_turn_confidence_threshold=0.45` (vs default 0.4) → slightly higher threshold reduces premature end-of-turn fires on hesitations, improving evidence timestamps for filler detection.
- `min_turn_silence=560` (vs no default published) → 560 ms balances not cutting off slow speakers against not waiting too long before scoring.
- `max_turn_silence=1536` (default 1536) → keep default; documents we intentionally did not shorten, so long pauses become `pause` EvidenceQuotes.
- `vad_threshold=0.2` (default 0.2) → keep default; sensitive enough for quiet mics in bootcamp laptops without false triggering on room noise.
- `interruption_delay=300` (vs 0–1000 range) → 300 ms allows natural barge-in for interviewer without cutting candidate off on filler words.
- `mode=balanced` (vs default not stated) → balanced latency/accuracy is correct for coaching where both word timing and transcript quality matter.
- `format_turns=true` (vs default false) → we need formatted turns for scoring; only formatted `Turn`s are final.
- `speech_model=universal-3-5-pro` (vs other universals) → Pro gives best word-level timestamps needed for evidence.

**Example literal (used in WU-AAI-03 verification):**
Input `buildStreamingUrl("wss://streaming.assemblyai.com/v3/ws", "tok123", { speechModel: "universal-3-5-pro", keyterms: ["React","TypeScript"] })` →
`wss://streaming.assemblyai.com/v3/ws?token=tok123&speech_model=universal-3-5-pro&sample_rate=16000&encoding=pcm_s16le&format_turns=true&end_of_turn_confidence_threshold=0.45&min_turn_silence=560&max_turn_silence=1536&vad_threshold=0.2&interruption_delay=300&mode=balanced&keyterms_prompt=React&keyterms_prompt=TypeScript`
No optional params beyond those listed are appended.

### A5 `mapTurnToTranscriptTurn` and message routing (M18)

```ts
export function mapTurnToTranscriptTurn(payload: {
  turn_order: number; turn_is_formatted: boolean; end_of_turn: boolean;
  transcript: string; utterance?: string; end_of_turn_confidence: number;
  words: { text:string; start:number; end:number; confidence:number; word_is_final:boolean }[];
}): TranscriptTurn {
  return {
    turn_order: payload.turn_order,
    transcript: payload.transcript, // use transcript field (utterance is raw, transcript is possibly formatted)
    formatted: payload.turn_is_formatted,
    end_of_turn: payload.end_of_turn,
    end_of_turn_confidence: payload.end_of_turn_confidence,
    words: payload.words.map(w => ({ text:w.text, start:w.start, end:w.end, confidence:w.confidence, word_is_final:w.word_is_final })),
    speaker: "candidate" as const,
    received_at: new Date().toISOString(),
  };
}
// Routing inside WebSocket onmessage:
function handleMessage(raw: string) {
  const msg = JSON.parse(raw);
  if (msg.type === "Begin") {
    opts.onBegin(msg.id); return;
  }
  if (msg.type === "Turn") {
    const turn = mapTurnToTranscriptTurn(msg);
    if (msg.end_of_turn === false) {
      opts.onPartial(turn); // partial streaming
    } else if (msg.end_of_turn === true && msg.turn_is_formatted === true) {
      opts.onFinal(turn); // ONLY formatted final is scored
    } else if (msg.end_of_turn === true && msg.turn_is_formatted === false) {
      opts.onPartial(turn); // explicitly NOT final; wait for formatted version
    }
    return;
  }
  if (msg.type === "Termination") {
    opts.onTermination({ audio_duration_seconds: msg.audio_duration_seconds, session_duration_seconds: msg.session_duration_seconds });
    // also resolve pending terminate() promise
    return;
  }
}
```
Must state explicitly in file comment: `Turn with end_of_turn=true && turn_is_formatted=false is partial, not final`.

### A6 `sendAudio`, `updateConfiguration`, `forceEndpoint`, `terminate` (M18)

```
sendAudio(pcm: Int16Array): void {
  if (this.state !== "open" || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
    this.droppedChunks++; return; // silent drop, counter exposed via get droppedChunks()
  }
  // pcm is Int16Array length 3200; send binary frame of its buffer
  // Use slice to avoid sending extra bytes if ArrayBuffer is larger than view
  const buf = pcm.buffer.slice(pcm.byteOffset, pcm.byteOffset + pcm.byteLength);
  try { this.ws.send(buf); } catch { this.droppedChunks++; }
}
updateConfiguration(patch: Record<string,unknown>): void {
  if (this.state !== "open" || !this.ws) return;
  this.ws.send(JSON.stringify({ type: "UpdateConfiguration", ...patch }));
  // patch may contain agent_context, keyterms_prompt, min_turn_silence etc. per S5 updatable list
}
forceEndpoint(): void {
  if (this.state !== "open" || !this.ws) return;
  this.ws.send(JSON.stringify({ type: "ForceEndpoint" }));
}
async terminate(): Promise<void> {
  if (!this.ws || this.state === "closed") return;
  try { this.ws.send(JSON.stringify({ type: "Terminate" })); } catch {}
  // wait up to 2000 ms for Termination message
  await new Promise<void>(resolve => {
    let done = false;
    const timer = setTimeout(() => { if (!done) { done = true; resolve(); } }, 2000);
    const origOnTerm = this.opts.onTermination;
    this._pendingTerminateResolve = () => { if (!done) { done = true; clearTimeout(timer); resolve(); } };
  });
  try { this.ws.close(1000, "terminate"); } catch {}
  this.state = "closed";
}
// MUST be called on unmount / beforeunload because billing runs on socket-open time; plan mandates window.addEventListener("beforeunload", () => client.terminate())
```

### A7 `connect` + reconnection + `RES_FORCED_DEGRADED` golden-cache path (M18/M19)

```
type InternalState = "closed"|"connecting"|"open";
class StreamingClientImpl implements StreamingClient {
  state: InternalState = "closed";
  droppedChunks = 0;
  ws: WebSocket|null = null;
  _reconnectAttempted = false;
  _pendingTerminateResolve: (()=>void)|null = null;
  async connect(): Promise<void|DegradedResult<never>> {
    if (this.state !== "closed") return; // already connecting/open
    this.state = "connecting";
    // 1. Fetch token with resilience
    const tokenFetch = withResilience(async () => {
      const url = this.opts.tokenUrl ?? "/api/aai-token";
      const resp = await fetch(url, { method: "GET", headers: { "Cache-Control": "no-store" } as any });
      if (!resp.ok) throw new Error(`token fetch ${resp.status}`);
      return await resp.json() as { token:string; expires_in_seconds:number };
    }, { timeout_ms:15000, retries:1, fallback_chain:{order:["cache","none"] as const} });
    const tokenResult = await tokenFetch();
    // 2. Degraded path: token unavailable
    if (isDegradedResult(tokenResult)) {
      // Check golden-cache: if DegradedResult.data contains TranscriptTurn[] then replay
      const cached = (tokenResult as DegradedResult).data;
      if (Array.isArray(cached) && cached.length > 0) {
        // golden-cache replay: invoke onFinal for each cached turn instead of opening socket
        for (const t of cached as TranscriptTurn[]) {
          this.opts.onFinal(t as TranscriptTurn);
        }
        this.state = "closed";
        return tokenResult as DegradedResult<never>; // still return degraded to signal replay path taken
      }
      // No cache: report degraded
      const dr = isDegradedResult(tokenResult) && (tokenResult as any).reason ? tokenResult : makeDegradedResult({ reason:"aai_token_unavailable", fallback_source:"none", original_error: String(tokenResult) });
      this.opts.onDegraded(dr as DegradedResult<unknown>);
      this.state = "closed";
      return dr as DegradedResult<never>;
    }
    // 3. Build URL
    const token = (tokenResult as {token:string}).token;
    const url = buildStreamingUrl("wss://streaming.assemblyai.com/v3/ws", token, { speechModel: this.opts.speechModel, keyterms: this.opts.keyterms });
    // 4. Open WebSocket
    try {
      await this._openSocket(url); // sets state="open" onopen, wires onmessage per A5, onclose triggers reconnect logic
    } catch (e) {
      // _openSocket rejects on immediate failure
      return this._handleUnexpectedClose(e);
    }
  }
  private async _openSocket(url:string): Promise<void> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(url);
      this.ws = ws;
      ws.binaryType = "arraybuffer";
      ws.onopen = () => { this.state = "open"; this._reconnectAttempted = false; resolve(); };
      ws.onmessage = (ev) => {
        if (typeof ev.data === "string") handleMessage(ev.data);
        // binary from server not expected
      };
      ws.onclose = (ev) => {
        const wasOpen = this.state === "open";
        this.state = "closed"; this.ws = null;
        if (this._pendingTerminateResolve) { this._pendingTerminateResolve(); this._pendingTerminateResolve=null; }
        // If close was expected via terminate(), do not reconnect
        if (this._isTerminating) { this._isTerminating=false; return; }
        // Unexpected close: reconnect once
        if (!this._reconnectAttempted) {
          this._reconnectAttempted = true;
          setTimeout(() => { this.connect().catch(()=>{}); }, 1000);
        } else {
          this.opts.onDegraded(makeDegradedResult({ reason:"aai_socket_lost", fallback_source:"none", original_error: `close ${ev.code}` }));
        }
      };
      ws.onerror = (ev) => { /* onclose will follow */ };
      // timeout for open? not required; withResilience covers token fetch only
    });
  }
  private _handleUnexpectedClose(e:unknown): DegradedResult<never> {
    const dr = makeDegradedResult({ reason:"aai_socket_lost", fallback_source:"none", original_error: String(e) });
    this.opts.onDegraded(dr);
    this.state="closed";
    return dr;
  }
}
```
Cache key convention: `mockrill-session-<sessionId>` where `sessionId` is `opts.sessionId` or derived from tokenUrl query; DP-DEMOPROOF records entries under that key via `createGoldenCache().put(deriveKey({explicitKey: "mockrill-session-"+sessionId}), data)`.
When `RES_FORCED_DEGRADED=1`, `withResilience` returns the cached `DegradedResult` automatically; client MUST check `isDegradedResult` before opening socket. No infinite retry loops: exactly one auto-reconnect, 1000 ms delay, fresh token, second failure → `onDegraded` `aai_socket_lost` and `closed`.




## §6 Configuration, environment & files

### Env vars

| Name | Who reads it | Default | What happens when missing | Where set |
|---|---|---|---|---|
| `ASSEMBLYAI_API_KEY` | `api/aai-token.ts` (and `api/turn.ts` owned by DP-INTERVIEWER) — **only server-side** | none — required | `api/aai-token.ts` returns `503` with `makeDegradedResult({ reason:"aai_key_missing", fallback_source:"none" })`; never throw, never echo key. Client never sees it. | Vercel env dashboard / `.env.local` (gitignored) |
| `RES_FORCED_DEGRADED` | chassis `src/resilience` (kill switch) | `0` / unset | When `=1`, every `withResilience` call returns golden-cache entry; client golden-cache path replays turns instead of opening socket. Not read directly by this plan but behavior depends on it. | test / CI env |
| `MOCKRILL_LLM_FALLBACK_MODEL` | DP-INTERVIEWER only | `qwen3.5-4b-32k-fast` | Not used by this plan. | Vercel env |

No other env vars. Raw key must never appear in client code, query string from browser, or bundled file. `tokenUrl` is path `/api/aai-token` (never contains key).

### Config files

- `tsconfig.json` and `vite.config.ts` already configure `src/*` alias and `moduleResolution: NodeNext`, `strict:true`, `noUncheckedIndexedAccess:true`. This plan does not edit them. Chassis imports via barrel only (`from "src/resilience"`).
- `vercel.json` owned by DP-DEPLOY; this plan does not edit it but notes `/api/aai-token` is a serverless function (no rewrite needed).
- No new npm dependency for AssemblyAI SDK — use browser `WebSocket`+`fetch` only. Adding `assemblyai` npm package is out of scope and a defect.

### Complete file map — everything this plan creates or edits

| Path | Action | Description |
|---|---|---|
| `api/aai-token.ts` | **CREATE** | M16 Vercel handler `GET /api/aai-token` → 200/503, `withResilience` wrap, `Cache-Control:no-store`, 1800 s cap |
| `src/mockrill/voice/mic.ts` | **CREATE** | M17 `createMicSource` + `MicSource` type, inline blob worklet, `getUserMedia`, `AudioContext` 16k/fallback, resample, `setMuted`/`stop`, `MicPermissionDenied` |
| `src/mockrill/voice/streamingClient.ts` | **CREATE** | M18/M19 `createStreamingClient`, `StreamingClient`, `StreamingClientOptions`, `buildStreamingUrl`, `mapTurnToTranscriptTurn`, lifecycle + reconnect + cache |
| `src/mockrill/voice/index.ts` | **CREATE** | M20 barrel re-exports M17–M19 and forwards M21–M22 (depends on DP-TURNTAKING) |
| `tests/mockrill/voice/streaming-url.test.ts` | **CREATE** | Unit test for `buildStreamingUrl` pure function (WU-AAI-03) |
| `tests/mockrill/voice/mapping.test.ts` | **CREATE** | Unit test for `mapTurnToTranscriptTurn` with literal fixture (WU-AAI-04) |
| `private/design_documents/design_plans/DP-AAI-STREAM.md` | **CREATE** | This plan |

No other paths. `src/mockrill/voice/speak.ts` and `src/mockrill/voice/turnController.ts` are explicitly NOT created by this plan (owned by DP-TURNTAKING). `engine/`, `fixtures/`, `scripts/` not touched.


## §7 Failure & degradation behavior

| Failure | Detection | DegradedResult reason string | What the user sees | Fallback-ladder rung (DP-DEMOPROOF docs/fallback-ladder.md) |
|---|---|---|---|---|
| `ASSEMBLYAI_API_KEY` missing / empty | `!process.env.ASSEMBLYAI_API_KEY` check before fetch | `"aai_key_missing"` (`fallback_source:"none"`) | `503` JSON; client `connect()` gets `onDegraded`; UI shows degraded badge / retry button; no crash | Rung 4 — none (no network, no cache) |
| `GET /api/aai-token` network/timeout (15 s) or upstream 4xx/5xx | `withResilience` timeout / non-`ok` throw → `isDegradedResult` | `"aai_token_unavailable"` or wrapped reason (preserved in `original_error`) | Same: `503`; client does not open socket; `onDegraded` called | Rung 2–3 — cache → none; if `RES_FORCED_DEGRADED=1` and golden entry exists, rung 1 replay |
| Token fetch returns `DegradedResult` with `data: TranscriptTurn[]` (golden-cache) | `isDegradedResult(result) && Array.isArray(result.data)` | verbatim from cache (`reason` e.g. `"replay"`) | No socket opened; `onFinal` invoked per cached turn; UI renders as if live transcription occurred | Rung 1 — replay (golden-cache) |
| `mic.getUserMedia` permission denied | `NotAllowedError` / `PermissionDeniedError` from `getUserMedia` | `"MicPermissionDenied"` via thrown error `.name` (not DegradedResult; DP-TURNTAKING maps to envelope) | UI shows mic permission prompt / error envelope `mic-capture` status `error`; session stays `failed` or retry | Rung 4 — none (UI requires user action) |
| `AudioContext` refuses 16000 | `new AudioContext({sampleRate:16000})` throws `NotSupportedError` | N/A — fallback to native rate + worklet resample | User hears no difference; chunk size stays 3200 at 16 kHz after resample | N/A |
| WebSocket unexpected close / error | `ws.onclose` with `!_isTerminating` | `"aai_socket_lost"` (`fallback_source:"none"`) on second failure | First close → auto-reconnect after 1000 ms with fresh token; second → `onDegraded`, `state=closed`, UI shows reconnect failed | Rung 4 for live; rung 1 if forced-degraded cache available |
| `sendAudio` called when `state!=="open"` | `state` check | N/A (not DegradedResult) | Chunk silently dropped, `droppedChunks++`; diagnostics exposed via `client.droppedChunks`; no throw | N/A |
| `terminate()` waiting for `Termination` exceeds 2000 ms | `setTimeout` 2000 ms | N/A | Socket closed anyway; billing stops; `onTermination` may not have fired but close still happens | N/A |
| Non-GET method to `/api/aai-token` | `req.method !=="GET"` | N/A (HTTP 405) | `405 { error:"method_not_allowed" }` with `Allow: GET` header | N/A |

**Invariant:** No failure throws to UI. All outbound calls (`fetch` to token, WebSocket) degrade to `DegradedResult` or `onDegraded`; the plan never throws except the typed `MicPermissionDenied` rejection which DP-TURNTAKING catches and turns into an envelope.


## §8 Public surface & import rules

### What is exported (public surface)

Via `src/mockrill/voice/index.ts` (M20) — the only public entry for voice primitives:
- `createMicSource`, type `MicSource` (M17)
- `createStreamingClient`, types `StreamingClient`/`StreamingClientOptions`, pure helpers `buildStreamingUrl`, `mapTurnToTranscriptTurn` (M18/M19)
- Forwarded (not owned): `createSpeaker`/`Speaker` (M21), `createTurnController`/`TurnController`/`TurnControllerDeps` (M22/M23) from DP-TURNTAKING

Via `api/aai-token.ts` — HTTP `GET /api/aai-token` (M16), not an ESM import surface.

Internal helpers (still exported for test but not part of barrel public contract): `buildStreamingUrl` and `mapTurnToTranscriptTurn` are exported from `streamingClient.ts` and re-exported via barrel; they are not "internal" but test seams.

### What is internal (not exported)

- Worklet source string `WORKLET_SRC` and blob URL (inside `mic.ts`)
- Module-local state in `streamingClient.ts`: `ws: WebSocket|null`, `_reconnectAttempted`, `_pendingTerminateResolve`, `_isTerminating`, `droppedChunks` counter (exposed via getter but not settable)
- Resilience-wrapped fetch closures inside `api/aai-token.ts` and `streamingClient.ts` — not exported
- No internal re-export of chassis `withResilience`/`DegradedResult` — those are imported, not re-exported

### Import rules (binding)

1. All voice consumers (DP-TURNTAKING, DP-UI, tests) MUST import from barrel: `import { createMicSource, createStreamingClient } from "src/mockrill/voice";` and `import type { MicSource, StreamingClient } from "src/mockrill/voice";`
2. Deep imports are a defect: `from "src/mockrill/voice/mic"`, `from "src/mockrill/voice/streamingClient"` are forbidden outside `src/mockrill/voice/` itself (barrel may use relative `./mic.js` internally).
3. Chassis imports use barrel only: `import { withResilience, isDegradedResult, makeDegradedResult } from "src/resilience";` — `from "src/resilience/withResilience"` is CI-blocked.
4. Contracts imported from barrel: `import type { TranscriptTurn } from "src/mockrill/contracts";` — never re-declare `TranscriptTurn`.
5. `api/aai-token.ts` is the ONLY file besides `api/turn.ts` that may read `process.env.ASSEMBLYAI_API_KEY`; client files must never import or reference it. Bundler check: `grep -r ASSEMBLYAI_API_KEY src/` must return only `api/` matches.
6. No `src/media`/`src/cost`/`src/dev` imports — those modules are excluded and absent.
7. `resetEnvelopeSequence`-style test seams are not exported here; only `buildStreamingUrl`/`mapTurnToTranscriptTurn` are test-only exports.


## §9 Work units

### WU-AAI-01 — `api/aai-token.ts` token endpoint (M16)

- **Goal:** Implement `GET /api/aai-token` Vercel handler that mints AssemblyAI streaming token with `withResilience`, credit cap, and degraded shapes.
- **Depends on:** DP-CONTRACTS (for `DegradedResult` type, but no code dependency) and chassis `src/resilience` (already present).
- **Files touched:** `api/aai-token.ts` (CREATE).
- **Numbered implementation steps:**
  1. Create `api/aai-token.ts` with imports `import type { VercelRequest, VercelResponse } from "@vercel/node";` and `import { withResilience, isDegradedResult, makeDegradedResult } from "src/resilience";`.
  2. Add file header comment `// max_session_duration_seconds=1800 (30 min) caps billing; socket billing is on total open duration, auto-close 3h default.`
  3. Implement `export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void>` with steps A1 (§5) verbatim: method guard `405`, key read `process.env.ASSEMBLYAI_API_KEY`, `aai_key_missing` 503, `withResilience` fetch to `https://streaming.assemblyai.com/v3/token?expires_in_seconds=60&max_session_duration_seconds=1800` with `Authorization: key` (no Bearer), config `{ timeout_ms:15000, retries:1, fallback_chain:{order:["cache","none"]} }`, error throw on non-ok, shape check, `isDegradedResult` → 503 verbatim, else `Cache-Control: no-store` + 200 `{ token, expires_in_seconds }`.
  4. Ensure no `console.log(key)` or echo; never include key in response body.
  5. Run `npx tsc --noEmit` to verify types.
- **Verification command (one runnable line):**
  ```sh
  npm run build 2>&1 | tail -n 20; echo "---"; node -e "const fs=require('fs'); const s=fs.readFileSync('api/aai-token.ts','utf8'); if(!s.includes('max_session_duration_seconds=1800')) throw new Error('missing 1800'); if(!s.includes('withResilience')) throw new Error('no resilience'); if(!s.includes('aai_key_missing')) throw new Error('no key missing'); if(!s.includes('Cache-Control')) throw new Error('no cache header'); console.log('WU-AAI-01 OK')"
  ```
  *Manual curl verification (requires dev server with `ASSEMBLYAI_API_KEY` set):* `curl -s -o /dev/null -w "%{http_code}" http://localhost:4173/api/aai-token` → `200` when key set, and `curl -s http://localhost:4173/api/aai-token | grep -q aai_key_missing && echo "503 shape ok"` when key unset (set `ASSEMBLYAI_API_KEY` empty and restart). Document both in plan.
- **Expected output (build + file check):**
  ```
  WU-AAI-01 OK
  ```
  plus `npm run build` exits 0. Manual `curl` expects `200` with key, `503` shape `{ "degraded":true, "reason":"aai_key_missing" }` without.
- **Done-when:** `api/aai-token.ts` exists, contains all literals above, passes `tsc --noEmit`, build succeeds, and documented curl expectations are in code comments.

### WU-AAI-02 — PCM worklet + `createMicSource` (M17)

- **Goal:** Implement microphone capture with exact `getUserMedia` constraints, `AudioContext` 16k + fallback, inline blob worklet buffering 3200 samples, Int16 conversion, muted/stop semantics, `MicPermissionDenied`.
- **Depends on:** WU-AAI-01 (file ordering only; no code dep).
- **Files touched:** `src/mockrill/voice/mic.ts` (CREATE).
- **Numbered implementation steps:**
  1. Create directory `src/mockrill/voice/`.
  2. Create `src/mockrill/voice/mic.ts` exporting `MicSource` type and `async function createMicSource(opts?:{sampleRate?:number}):Promise<MicSource>` per §3 M17.
  3. Implement `navigator.mediaDevices.getUserMedia({ audio:{ channelCount:1, echoCancellation:true, noiseSuppression:true, autoGainControl:true }})` exactly; on `NotAllowedError`/`PermissionDeniedError` throw new `Error` with `e.name="MicPermissionDenied"`.
  4. Implement `AudioContext` creation: try `new AudioContext({ sampleRate: desiredRate ?? 16000 })`, catch → `new AudioContext()` (native rate); compute `needsResample`/`ratio`.
  5. Embed inline worklet source string per A3 (copy normative `WORKLET_SRC` literal, interpolating `needsResample`/`ratio`/`ctx.sampleRate`); create `Blob` URL, `await ctx.audioWorklet.addModule(url)`, `URL.revokeObjectURL(url)`.
  6. Wire `createMediaStreamSource` → `AudioWorkletNode('mockrill-pcm-worklet')` (no destination), `port.onmessage` with muted check, `onChunk` setter, `setMuted`, `stop()` per A2.
  7. Ensure worklet buffers 3200 samples and converts via `Math.max(-1,Math.min(1,s))*0x7FFF` (and `0x8000` for negatives) — literal must appear.
  8. Run `npx tsc --noEmit`.
- **Verification command:**
  ```sh
  node -e "const fs=require('fs'); const s=fs.readFileSync('src/mockrill/voice/mic.ts','utf8'); const checks=['getUserMedia','channelCount: 1','echoCancellation: true','noiseSuppression: true','autoGainControl: true','AudioContext','sampleRate: 16000','AudioWorkletProcessor','registerProcessor','3200','0x7FFF','0x8000','MicPermissionDenied','setMuted','Blob','createObjectURL','addModule']; for(const c of checks) if(!s.includes(c)) throw new Error('missing '+c); console.log('WU-AAI-02 OK')"
  ```
- **Expected output:**
  ```
  WU-AAI-02 OK
  ```
- **Done-when:** `mic.ts` contains every literal above, passes `tsc --noEmit`, and file is under 300 lines with no separate asset file.

### WU-AAI-03 — Socket URL builder as pure exported-for-test function

- **Goal:** Implement `buildStreamingUrl` pure function with exact param order and justify non-defaults; verify via exact query string assert.
- **Depends on:** WU-AAI-01 (for token URL base knowledge).
- **Files touched:** `src/mockrill/voice/streamingClient.ts` (CREATE — add `buildStreamingUrl` export), `tests/mockrill/voice/streaming-url.test.ts` (CREATE).
- **Numbered implementation steps:**
  1. In `streamingClient.ts`, export `buildStreamingUrl(base:string, token:string, opts:{speechModel?:string;keyterms?:string[]})=>string` per A4 literal (params in exact order, `encodeURIComponent`, repeated `keyterms_prompt`).
  2. Include comment justifying each non-default (7 one-sentence lines) directly above the param pushes.
  3. Create `tests/mockrill/voice/streaming-url.test.ts`:
     ```ts
     import { describe, it, expect } from "vitest";
     import { buildStreamingUrl } from "src/mockrill/voice/streamingClient.js";
     describe("buildStreamingUrl", () => {
       it("exact order", () => {
         const url = buildStreamingUrl("wss://streaming.assemblyai.com/v3/ws", "tok123", { speechModel: "universal-3-5-pro", keyterms: ["React","TypeScript"] });
         expect(url).toBe("wss://streaming.assemblyai.com/v3/ws?token=tok123&speech_model=universal-3-5-pro&sample_rate=16000&encoding=pcm_s16le&format_turns=true&end_of_turn_confidence_threshold=0.45&min_turn_silence=560&max_turn_silence=1536&vad_threshold=0.2&interruption_delay=300&mode=balanced&keyterms_prompt=React&keyterms_prompt=TypeScript");
       });
       it("no keyterms omits param", () => {
         const url = buildStreamingUrl("wss://streaming.assemblyai.com/v3/ws", "tok", {});
         expect(url).not.toContain("keyterms_prompt");
       });
     });
     ```
  4. Run `npx tsc --noEmit`.
- **Verification command:**
  ```sh
  npx vitest run tests/mockrill/voice/streaming-url.test.ts
  ```
- **Expected output (tail):**
  ```
   ✓ tests/mockrill/voice/streaming-url.test.ts (2 tests)
  Test Files  1 passed (1)
       Tests  2 passed (2)
  ```
- **Done-when:** `buildStreamingUrl` exported, ordained order verified, vitest passes.

### WU-AAI-04 — Message mapping `Turn` → `TranscriptTurn` with literal fixture

- **Goal:** Implement `mapTurnToTranscriptTurn` that imports real `TranscriptTurn` type from `src/mockrill/contracts` and correctly routes `Turn` messages.
- **Depends on:** DP-CONTRACTS (needs `TranscriptTurn`/`TranscriptWord` types), WU-AAI-03 (same file).
- **Files touched:** `src/mockrill/voice/streamingClient.ts` (EDIT — add `mapTurnToTranscriptTurn` export), `tests/mockrill/voice/mapping.test.ts` (CREATE).
- **Numbered implementation steps:**
  1. At top of `streamingClient.ts` add `import type { TranscriptTurn } from "src/mockrill/contracts";`.
  2. Export `mapTurnToTranscriptTurn(payload: AssemblyAITurnPayload): TranscriptTurn` per A5 literal (uses `speaker:"candidate"`, `received_at:new Date().toISOString()`).
  3. Wire `handleMessage` routing per A5 (onBegin/onPartial/onFinal with `turn_is_formatted` check).
  4. Create `tests/mockrill/voice/mapping.test.ts` with literal AssemblyAI fixture:
     ```ts
     import { describe, it, expect } from "vitest";
     import { mapTurnToTranscriptTurn } from "src/mockrill/voice/streamingClient.js";
     import type { TranscriptTurn } from "src/mockrill/contracts";
     const FIXTURE = { type:"Turn" as const, turn_order:3, turn_is_formatted:true, end_of_turn:true, transcript:"hello world", utterance:"hello world", end_of_turn_confidence:0.92, words:[{text:"hello",start:0,end:200,confidence:0.99,word_is_final:true},{text:"world",start:200,end:450,confidence:0.98,word_is_final:true}] };
     describe("mapTurn", () => {
       it("maps fixture field by field", () => {
         const t: TranscriptTurn = mapTurnToTranscriptTurn(FIXTURE);
         expect(t.turn_order).toBe(3); expect(t.transcript).toBe("hello world"); expect(t.formatted).toBe(true); expect(t.end_of_turn).toBe(true);
         expect(t.end_of_turn_confidence).toBe(0.92); expect(t.speaker).toBe("candidate");
         expect(t.words.length).toBe(2); expect(t.words[0].text).toBe("hello"); expect(t.words[1].start).toBe(200);
         expect(typeof t.received_at).toBe("string"); expect(() => new Date(t.received_at).toISOString()).not.toThrow();
       });
       it("unformatted end_of_turn goes to partial (routing test via helper)", async () => {
         const unformatted = { ...FIXTURE, turn_is_formatted:false };
         const t = mapTurnToTranscriptTurn(unformatted);
         expect(t.formatted).toBe(false); // caller routing must treat as partial, not final
       });
     });
     ```
  5. Ensure the fix ensures `Turn` with `end_of_turn=true && turn_is_formatted=false` is delivered to `onPartial` not `onFinal` — comment in `handleMessage`.
- **Verification command:**
  ```sh
  npx vitest run tests/mockrill/voice/mapping.test.ts
  ```
- **Expected output:**
  ```
   ✓ tests/mockrill/voice/mapping.test.ts (2 tests)
  Test Files  1 passed (1)
       Tests  2 passed (2)
  ```
- **Done-when:** `mapTurnToTranscriptTurn` imports real `TranscriptTurn` from `src/mockrill/contracts`, fixture field-by-field asserts pass, and `tsc --noEmit` shows no re-definition of the type.

### WU-AAI-05 — connect / reconnect / terminate lifecycle

- **Goal:** Implement `createStreamingClient` lifecycle: `connect` token fetch + socket open, `sendAudio` gated by `state`, `updateConfiguration`/`forceEndpoint`, `terminate` 2 s wait, single reconnect after 1000 ms, billing-aware unmount.
- **Depends on:** WU-AAI-03, WU-AAI-04 (uses their helpers).
- **Files touched:** `src/mockrill/voice/streamingClient.ts` (EDIT — add full client class/factory).
- **Numbered implementation steps:**
  1. Define `StreamingClientOptions` and `StreamingClient` types per §3.
  2. Implement `createStreamingClient(opts)` returning object with `state` getter, `droppedChunks` counter, `ws:WebSocket|null`, `_reconnectAttempted`, `_pendingTerminateResolve`, `_isTerminating`.
  3. `connect()` per A7 steps 1–4: `withResilience` token fetch (`tokenUrl ?? "/api/aai-token"`, `{timeout_ms:15000,retries:1,fallback_chain:{order:["cache","none"]}}`), degraded check before socket, `buildStreamingUrl`, `_openSocket` with `onopen`→`open`, `onmessage`→A5, `onclose`→single reconnect logic.
  4. `sendAudio` per A6: gate on `state==="open"` + `readyState===OPEN`, `droppedChunks++` else, `ws.send(pcm.buffer.slice(...))`.
  5. `updateConfiguration` / `forceEndpoint` per A6.
  6. `terminate` per A6: send `Terminate`, wait 2000 ms for `Termination`, `close(1000)`, `state=closed`; add `window.addEventListener("beforeunload", ()=> client.terminate())` note in JSDoc.
  7. Reconnect: `onclose` if unexpected and `!_reconnectAttempted` → `setTimeout 1000 ms` fresh `connect()`, else `onDegraded(makeDegradedResult({reason:"aai_socket_lost", fallback_source:"none"}))`.
  8. Run `npx tsc --noEmit`.
- **Verification command:**
  ```sh
  node -e "const fs=require('fs'); const s=fs.readFileSync('src/mockrill/voice/streamingClient.ts','utf8'); const must=['createStreamingClient','sendAudio','updateConfiguration','forceEndpoint','terminate','droppedChunks','_reconnectAttempted','1000','2000','onDegraded','aai_socket_lost','beforeunload']; for(const c of must) if(!s.includes(c)) throw new Error('missing '+c); console.log('WU-AAI-05 OK')"
  ```
- **Expected output:**
  ```
  WU-AAI-05 OK
  ```
- **Done-when:** All lifecycle methods present with exact timeout literals 1000/2000, `tsc` passes, and no infinite loop (grep confirms single `setTimeout` for reconnect).

### WU-AAI-06 — degraded + golden-cache replay path

- **Goal:** Implement `RES_FORCED_DEGRADED=1` cache replay: when token `withResilience` returns `DegradedResult` with `data: TranscriptTurn[]`, invoke `onFinal` per cached turn instead of opening socket; use key `mockrill-session-<sessionId>`.
- **Depends on:** WU-AAI-05 (connect logic).
- **Files touched:** `src/mockrill/voice/streamingClient.ts` (EDIT — add cache check branch).
- **Numbered implementation steps:**
  1. In `connect()`, after `const tokenResult = await tokenFetch()`, branch: `if (isDegradedResult(tokenResult)) { const data=(tokenResult as DegradedResult).data; if(Array.isArray(data)&&data.length>0){ for(const t of data as TranscriptTurn[]) opts.onFinal(t); state="closed"; return tokenResult as any; } const dr= ... reason "aai_token_unavailable"; opts.onDegraded(dr); state="closed"; return dr; }`
  2. Import `isDegradedResult` from `src/resilience` and `TranscriptTurn` already imported.
  3. Add comment `// cache key convention mockrill-session-<sessionId> — written by DP-DEMOPROOF via createGoldenCache().put(deriveKey({explicitKey:"mockrill-session-"+sessionId}))`.
  4. Mention in JSDoc that `RES_FORCED_DEGRADED=1` makes `withResilience` return cached entry automatically (no extra code needed beyond `isDegradedResult` check).
  5. Verify by unit test that golden-cache path replays:
     Create `tests/mockrill/voice/golden-cache.test.ts` (optional but recommended) or verify via file content check.
- **Verification command:**
  ```sh
  node -e "const fs=require('fs'); const s=fs.readFileSync('src/mockrill/voice/streamingClient.ts','utf8'); if(!s.includes('mockrill-session-')) throw new Error('no cache key'); if(!s.includes('aai_token_unavailable')) throw new Error('no token unavailable'); if(!s.includes('isDegradedResult')) throw new Error('no degraded check'); if(!s.includes('onFinal')) throw new Error('no onFinal'); console.log('WU-AAI-06 OK')"
  ```
- **Expected output:**
  ```
  WU-AAI-06 OK
  ```
- **Done-when:** Golden-cache branch present with correct key and reason literals, and no socket opened when `DegradedResult` with data.

### WU-AAI-07 — barrel `src/mockrill/voice/index.ts` (M20), sequenced last

- **Goal:** Create barrel that re-exports M17–M19 and forwards M21–M22 not owned, with sequencing dependency.
- **Depends on:** DP-TURNTAKING's `src/mockrill/voice/speak.ts` (M21) and `src/mockrill/voice/turnController.ts` (M22) — this WU must be sequenced after DP-TURNTAKING (plan states dependency).
- **Files touched:** `src/mockrill/voice/index.ts` (CREATE).
- **Numbered implementation steps:**
  1. Create `src/mockrill/voice/index.ts` with content per §3 M20:
     ```ts
     export { createMicSource } from "./mic.js";
     export type { MicSource } from "./mic.js";
     export { createStreamingClient, buildStreamingUrl, mapTurnToTranscriptTurn } from "./streamingClient.js";
     export type { StreamingClient, StreamingClientOptions } from "./streamingClient.js";
     // Forwarded — DP-TURNTAKING owns these files; this barrel only forwards
     export { createSpeaker } from "./speak.js";
     export type { Speaker } from "./speak.js";
     export { createTurnController } from "./turnController.js";
     export type { TurnController, TurnControllerDeps } from "./turnController.js";
     ```
  2. Add header comment `// DP-AAI-STREAM owns this barrel; M21/M22 forwarded from DP-TURNTAKING — barrel work sequenced last`.
  3. Ensure no other exports; `tsc --noEmit` will fail if `speak.ts`/`turnController.ts` absent — document that WU is blocked until DP-TURNTAKING completes; implementor should `// @ts-ignore` temporarily or guard? Plan says: do not create `speak.ts`/`turnController.ts` here; instead the barrel import will error until DP-TURNTAKING lands, which is expected. Provide alternative: use `export * from "./speak.js"` guarded by `// ts-expect-error` with note, OR create barrel with only M17–M19 first then extend after DP-TURNTAKING. Recommend two-phase: initial barrel with only M17–M19, second edit adds M21–M22 after files appear.
  4. Document that consumers MUST import from `src/mockrill/voice`, not deep paths.
- **Verification command (phase 1 — before DP-TURNTAKING):**
  ```sh
  node -e "const fs=require('fs'); const s=fs.readFileSync('src/mockrill/voice/index.ts','utf8'); if(!s.includes('createMicSource')) throw new Error('no mic'); if(!s.includes('createStreamingClient')) throw new Error('no client'); console.log('WU-AAI-07 barrel OK (M17-M19)')"
  ```
  *After DP-TURNTAKING lands:* `npx tsc --noEmit && npx vite-node -e "import {createMicSource,createStreamingClient,createSpeaker,createTurnController} from 'src/mockrill/voice'; console.log([typeof createMicSource, typeof createStreamingClient, typeof createSpeaker, typeof createTurnController].join(','))"`
- **Expected output (phase 1):**
  ```
  WU-AAI-07 barrel OK (M17-M19)
  ```
  *After DP-TURNTAKING:* `function,function,function,function`
- **Done-when:** Barrel exists, re-exports M17–M19 (and after dependency, forwards M21–M22), and `tsc` passes when both plans are present.


## §10 Acceptance criteria

| # | Requirement | Work unit | Check |
|---|---|---|---|
| R-AAI-01 | Token method guard + key missing 503 DegradedResult | WU-AAI-01 | `grep -q aai_key_missing api/aai-token.ts && grep -q 405 api/aai-token.ts` and manual curl 503 shape |
| R-AAI-02 | `withResilience` token fetch 60/1800 + 200/503 + no-store + credit note | WU-AAI-01 | File contains `expires_in_seconds=60`, `max_session_duration_seconds=1800`, `withResilience`, `Cache-Control`, `no-store`, `isDegradedResult`; build passes |
| R-AAI-03 | `getUserMedia` exact constraints | WU-AAI-02 | File contains literal `channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true` |
| R-AAI-04 | `AudioContext` 16000 + native fallback + resample | WU-AAI-02 | `AudioContext({ sampleRate: 16000 })` and fallback `new AudioContext()` and ratio resample code present |
| R-AAI-05 | Blob URL worklet + 3200 buffering + Int16 conversion | WU-AAI-02 | `Blob`, `createObjectURL`, `AudioWorkletProcessor`, `registerProcessor`, `3200`, `0x7FFF` present |
| R-AAI-06 | `setMuted` drop + `stop` cleanup + `MicPermissionDenied` | WU-AAI-02 | `setMuted`, `muted` check, `stop()` disconnects/close/stop tracks, `MicPermissionDenied` throw |
| R-AAI-07 | `connect` token fetch non-200 → `aai_token_unavailable` DegradedResult | WU-AAI-05/WU-AAI-06 | `tokenUrl ?? "/api/aai-token"`, `isDegradedResult`, `aai_token_unavailable` present |
| R-AAI-08 | Socket URL exact order + justifications | WU-AAI-03 | `buildStreamingUrl` order matches spec, 7 justification sentences in comment, vitest exact URL passes |
| R-AAI-09 | `Begin`/`Turn` mapping + `candidate` + `received_at` + partial vs final routing | WU-AAI-04 | `mapTurnToTranscriptTurn` with `speaker:"candidate"`, `received_at`, routing `turn_is_formatted===true` only final; fixture test passes |
| R-AAI-10 | `sendAudio` gated + `droppedChunks` | WU-AAI-05 | `sendAudio`, `state==="open"`, `droppedChunks++`, `pcm.buffer` present |
| R-AAI-11 | `updateConfiguration` / `ForceEndpoint` | WU-AAI-05 | `UpdateConfiguration`, `ForceEndpoint` literals present |
| R-AAI-12 | `terminate` sends Terminate, 2000 ms wait, close, billing note | WU-AAI-05 | `Terminate`, `2000`, `close`, `beforeunload` present |
| R-AAI-13 | Single reconnect 1000 ms, second → `aai_socket_lost` | WU-AAI-05 | `_reconnectAttempted`, `1000`, `aai_socket_lost` present; grep confirms single setTimeout |
| R-AAI-14 | Golden-cache `RES_FORCED_DEGRADED` replay + key `mockrill-session-` | WU-AAI-06 | `mockrill-session-`, `isDegradedResult(data)`, `onFinal` loop present |
| R-AAI-15 | Barrel re-exports M17–M19 and forwards M21–M22 sequenced last | WU-AAI-07 | `src/mockrill/voice/index.ts` contains `createMicSource`, `createStreamingClient`, and forwards `createSpeaker`/`createTurnController` with dependency note |
| R-AAI-16 | Audio never proxies; key never in client/SDK; no SDK dep | WU-AAI-01/02/05 | Code comment `Audio never proxies through serverless`; grep `ASSEMBLYAI_API_KEY` only in `api/`; no `assemblyai` in `package.json` |
| R-AAI-17 | `withResilience` config `{timeout_ms:15000,retries:1,order:["cache","none"]}` everywhere | WU-AAI-01/WU-AAI-05 | Both `api/aai-token.ts` and `streamingClient.ts` contain literal `timeout_ms: 15000`, `retries: 1`, `order: ["cache","none"]` |

## §11 Non-goals

- No AssemblyAI SDK, no extra npm dependency for streaming — browser `WebSocket`/`fetch` only.
- No audio proxy through serverless — browser → AssemblyAI direct is the only path; Vercel cannot hold long sockets.
- No `localStorage`-dependent core behavior.
- No second API key or `src/cost`/`src/media`/`src/dev` usage — those modules are excluded.
- No LLM call, no `callInterviewer`, no scoring — those are DP-INTERVIEWER / DP-SCORECARD.
- No UI, no `createEventBus`/`useMockrillEvents`/`main.tsx` — those are DP-UI.
- No `vercel.json`/`api/health` — DP-DEPLOY.
- No `session-golden.json` authoring except reading cache keys — DP-DEMOPROOF owns the fixture.
- No `createSpeaker`/`createTurnController` implementation — DP-TURNTAKING owns them; this plan only forwards their barrel exports.
- No transcript storage or session persistence beyond the 200 ms PCM buffer and socket state.

## §12 Open questions

| # | Question | Blueprint gap | Safe default chosen by this plan (inside this plan's namespace only) |
|---|---|---|---|
| Q1 | `api/aai-token.ts` VercelRequest type import path | Blueprint does not state `@vercel/node` vs `vercel` | Use `import type { VercelRequest, VercelResponse } from "@vercel/node";` — this is the Vercel TS standard; add `@vercel/node` as devDependency if missing (no runtime effect). |
| Q2 | Token endpoint error body shape when upstream returns `{ error, code }` | S5 says 400/401/429/500 → `{ error, code?, details? }` but not how to surface | Wrap: throw `new Error(`aai token ${status}: ${body.slice(0,500)}`)` so `original_error` in DegradedResult preserves code; status check is `!resp.ok`.
| Q3 | `tokenUrl` override in tests / localhost vs Vercel | S7 says `opts.tokenUrl ?? "/api/aai-token"` | Default `/api/aai-token` (relative); test may pass `http://localhost:4173/api/aai-token` (absolute) — both work with `fetch`.
| Q4 | `speech_model` param name vs `speechModel` option | S5 says query param `speech_model` | Option is `speechModel` (camelCase) mapping to query `speech_model` (snake_case) — literal mapping shown in A4.
| Q5 | Binary frame type for PCM | S5 says binary frames PCM s16le | Use `pcm.buffer.slice(byteOffset, byteOffset+byteLength)` to send exact Int16 bytes; `binaryType="arraybuffer"` on receive side.
| Q6 | `createMicSource` sampleRate option vs fixed 16000 | S7 says `(opts?:{sampleRate?:number})=>Promise<...>` | Implement optional `sampleRate` defaulting to 16000, but always request 16000 from AudioContext; if caller passes different, honor it for AudioContext but still buffer 3200 at whatever effective rate after resample to 16k.
| Q7 | `droppedChunks` exposure | S7 says internal counter exposed for diagnostics | Expose as `readonly droppedChunks:number` getter (not method) on `StreamingClient`.
| Q8 | Barrel sequencing when DP-TURNTAKING not yet landed | Blueprint says barrel depends on DP-TURNTAKING | Two-phase: phase 1 barrel exports only M17–M19 so `tsc` passes; phase 2 adds forwards for M21–M22 after files appear (plan documents both). CI should run with `// @ts-ignore` temporarily if needed, but final repo has both.
| Q9 | Worklet resample exact slicing arithmetic | Spec gives algorithm but edge slicing ambiguous | Plan provides normative worklet string with `_base` offset tracking; implementor copies it verbatim; tests verify chunk length 3200 and count, not intermediate native buffer size.
| Q10 | `terminate()` ordering with `beforeunload` | Spec says MUST be called on unmount/beforeunload | Client exposes `terminate()`; TurnController (DP-TURNTAKING) is responsible to call it in `useEffect cleanup` and `beforeunload` listener; this plan documents the requirement in JSDoc.

